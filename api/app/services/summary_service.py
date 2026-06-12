import logging
from collections import defaultdict
from collections.abc import Awaitable, Callable

from supabase import AsyncClient

from app.schemas.interviews import (
    AnswerSentiment,
    InterviewQuestionResponse,
    KeywordMatch,
    SentimentLabel,
)
from app.services.answer_evaluation_service import run_nlp_analysis
from app.services.groq_service import LLMError, get_llm_service

logger = logging.getLogger(__name__)

TOP_KEYWORDS_COUNT = 8


def format_transcript_for_summary(
    questions: list[InterviewQuestionResponse],
) -> str:
    lines: list[str] = []
    for question in questions:
        if not question.answer:
            continue
        lines.append(f"Interviewer: {question.question}")
        answer_text = question.answer
        if question.answer_depth is not None:
            addressed = (
                "yes"
                if question.answered_question
                else "no"
                if question.answered_question is not None
                else "unknown"
            )
            answer_text = (
                f"{question.answer}\n"
                f"[Evaluation: depth={question.answer_depth}, "
                f"addressed_question={addressed}]"
            )
        lines.append(f"User: {answer_text}")
    return "\n\n".join(lines)


def aggregate_keywords(
    questions: list[InterviewQuestionResponse],
) -> tuple[list[KeywordMatch], list[KeywordMatch]]:
    scores: dict[str, float] = defaultdict(float)
    display_terms: dict[str, str] = {}

    for question in questions:
        if not question.answer or not question.keywords:
            continue
        for keyword in question.keywords:
            normalized = keyword.term.strip().lower()
            if not normalized:
                continue
            scores[normalized] += keyword.score
            display_terms.setdefault(normalized, keyword.term.strip())

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    all_keywords = [
        KeywordMatch(term=display_terms[normalized], score=score)
        for normalized, score in ranked
    ]
    top_keywords = all_keywords[:TOP_KEYWORDS_COUNT]
    return top_keywords, all_keywords


def aggregate_sentiment(
    questions: list[InterviewQuestionResponse],
) -> tuple[SentimentLabel | None, float | None, int]:
    scores = [
        question.sentiment_score
        for question in questions
        if question.answer and question.sentiment_score is not None
    ]
    if not scores:
        return None, None, 0

    average = sum(scores) / len(scores)
    if average >= 0.05:
        label: SentimentLabel = "positive"
    elif average <= -0.05:
        label = "negative"
    else:
        label = "neutral"
    return label, average, len(scores)


def build_answer_sentiments(
    questions: list[InterviewQuestionResponse],
) -> list[AnswerSentiment]:
    sentiments: list[AnswerSentiment] = []
    for question in questions:
        if (
            not question.answer
            or question.sentiment_score is None
            or question.sentiment_label is None
        ):
            continue

        if question.follows_question_id is not None:
            label = f"Q{question.core_sequence} follow-up"
        else:
            label = f"Q{question.core_sequence}"

        sentiments.append(
            AnswerSentiment(
                label=label,
                sequence=question.sequence,
                sentiment_label=question.sentiment_label,
                sentiment_score=question.sentiment_score,
            )
        )
    return sentiments


async def ensure_nlp_complete(
    interview_id: str,
    supabase: AsyncClient,
) -> None:
    result = (
        await supabase.table("interview_questions")
        .select("id, answer, sentiment_label")
        .eq("interview_id", interview_id)
        .execute()
    )

    for row in result.data or []:
        if not row.get("answer") or row.get("sentiment_label") is not None:
            continue

        nlp_result = await run_nlp_analysis(row["answer"])
        if nlp_result is None:
            continue

        sentiment_label, sentiment_score, keywords = nlp_result
        keywords_payload = [keyword.model_dump() for keyword in keywords]
        try:
            await (
                supabase.table("interview_questions")
                .update(
                    {
                        "sentiment_label": sentiment_label,
                        "sentiment_score": sentiment_score,
                        "keywords": keywords_payload,
                    }
                )
                .eq("id", row["id"])
                .eq("interview_id", interview_id)
                .execute()
            )
        except Exception:
            logger.exception(
                "Failed to persist NLP for question %s during summary generation",
                row["id"],
            )


async def generate_summary_from_questions(
    category: str,
    questions: list[InterviewQuestionResponse],
) -> dict:
    sentiment_label, sentiment_score, answers_scored = aggregate_sentiment(questions)
    top_keywords, all_keywords = aggregate_keywords(questions)

    transcript = format_transcript_for_summary(questions)
    llm_result = await get_llm_service().generate_interview_summary(
        category=category,
        transcript=transcript,
    )

    return {
        "summary": llm_result.summary,
        "themes": [theme.model_dump() for theme in llm_result.themes],
        "highlights": llm_result.highlights,
        "strengths": llm_result.strengths,
        "growth_areas": llm_result.growth_areas,
        "overall_sentiment_label": sentiment_label,
        "overall_sentiment_score": sentiment_score,
        "answers_scored": answers_scored,
        "top_keywords": [keyword.model_dump() for keyword in top_keywords],
        "keywords": [keyword.model_dump() for keyword in all_keywords],
    }


async def build_summary_result(
    category: str,
    interview_id: str,
    supabase: AsyncClient,
    refetch_questions: Callable[[], Awaitable[list[InterviewQuestionResponse]]],
) -> dict:
    await ensure_nlp_complete(interview_id, supabase)
    fresh_questions = await refetch_questions()
    return await generate_summary_from_questions(category, fresh_questions)
