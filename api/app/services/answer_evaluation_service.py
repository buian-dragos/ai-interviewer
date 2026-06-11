import asyncio
import logging

from app.schemas.interviews import AnswerEvaluation
from app.services.gemini_service import (
    default_answer_depth_result,
    get_gemini_service,
)
from app.services.nlp_service import extract_keywords, score_sentiment

logger = logging.getLogger(__name__)


async def evaluate_answer(
    *,
    question: str,
    answer: str,
    category: str,
    parent_question: str | None = None,
    parent_answer: str | None = None,
) -> AnswerEvaluation:
    sentiment_task = asyncio.to_thread(score_sentiment, answer)
    keywords_task = asyncio.to_thread(extract_keywords, answer)
    depth_task = get_gemini_service().evaluate_answer_depth(
        question=question,
        answer=answer,
        category=category,
        parent_question=parent_question,
        parent_answer=parent_answer,
    )

    sentiment_result, keywords, depth_result = await asyncio.gather(
        sentiment_task,
        keywords_task,
        depth_task,
        return_exceptions=True,
    )

    if isinstance(sentiment_result, Exception):
        logger.exception("Sentiment scoring failed", exc_info=sentiment_result)
        raise sentiment_result

    if isinstance(keywords, Exception):
        logger.exception("Keyword extraction failed", exc_info=keywords)
        raise keywords

    if isinstance(depth_result, Exception):
        logger.warning(
            "LLM depth evaluation failed, using shallow fallback: %s",
            depth_result,
        )
        depth_result = default_answer_depth_result()

    sentiment_label, sentiment_score = sentiment_result

    return AnswerEvaluation(
        sentiment_label=sentiment_label,
        sentiment_score=sentiment_score,
        keywords=keywords,
        answer_depth=depth_result.answer_depth,
        answered_question=depth_result.answered_question,
    )
