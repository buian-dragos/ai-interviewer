import asyncio
import logging

from app.schemas.interviews import AnswerDepth, KeywordMatch, SentimentLabel
from app.services.groq_service import (
    AnswerDepthResult,
    default_answer_depth_result,
    get_llm_service,
)
from app.services.nlp_service import extract_keywords, score_sentiment

logger = logging.getLogger(__name__)


async def evaluate_answer_depth(
    *,
    question: str,
    answer: str,
    category: str,
    parent_question: str | None = None,
    parent_answer: str | None = None,
) -> AnswerDepthResult:
    try:
        return await get_llm_service().evaluate_answer_depth(
            question=question,
            answer=answer,
            category=category,
            parent_question=parent_question,
            parent_answer=parent_answer,
        )
    except Exception as exc:
        logger.warning(
            "LLM depth evaluation failed, using shallow fallback: %s",
            exc,
        )
        return default_answer_depth_result()


async def run_nlp_analysis(
    answer: str,
) -> tuple[SentimentLabel, float, list[KeywordMatch]] | None:
    sentiment_task = asyncio.to_thread(score_sentiment, answer)
    keywords_task = asyncio.to_thread(extract_keywords, answer)

    sentiment_result, keywords = await asyncio.gather(
        sentiment_task,
        keywords_task,
        return_exceptions=True,
    )

    if isinstance(sentiment_result, Exception):
        logger.exception("Sentiment scoring failed", exc_info=sentiment_result)
        return None

    if isinstance(keywords, Exception):
        logger.exception("Keyword extraction failed", exc_info=keywords)
        return None

    sentiment_label, sentiment_score = sentiment_result
    return sentiment_label, sentiment_score, keywords
