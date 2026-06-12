import logging
import threading

from nltk.sentiment import SentimentIntensityAnalyzer

from app.core.config import get_settings
from app.schemas.interviews import KeywordMatch, SentimentLabel

logger = logging.getLogger(__name__)

_analyzer: SentimentIntensityAnalyzer | None = None
_keybert = None
_keybert_lock = threading.Lock()


def init_nlp() -> None:
    """Load VADER lexicon-backed analyzer. Call once at app startup."""
    global _analyzer
    if _analyzer is None:
        _analyzer = SentimentIntensityAnalyzer()


def _get_analyzer() -> SentimentIntensityAnalyzer:
    if _analyzer is None:
        init_nlp()
    assert _analyzer is not None
    return _analyzer


def _get_keybert():
    global _keybert
    if _keybert is None:
        with _keybert_lock:
            if _keybert is None:
                from keybert import KeyBERT

                settings = get_settings()
                logger.info("Loading KeyBERT model: %s", settings.keybert_model)
                _keybert = KeyBERT(model=settings.keybert_model)
    return _keybert


def preload_keybert() -> None:
    """Warm KeyBERT model load; safe to call from a background thread."""
    _get_keybert()


def score_sentiment(text: str) -> tuple[SentimentLabel, float]:
    scores = _get_analyzer().polarity_scores(text)
    compound = float(scores["compound"])
    if compound >= 0.05:
        label: SentimentLabel = "positive"
    elif compound <= -0.05:
        label = "negative"
    else:
        label = "neutral"
    return label, compound


def extract_keywords(text: str) -> list[KeywordMatch]:
    settings = get_settings()
    raw = _get_keybert().extract_keywords(
        text,
        keyphrase_ngram_range=(1, 2),
        stop_words="english",
        top_n=settings.keybert_top_n,
    )
    return [
        KeywordMatch(term=term, score=float(score))
        for term, score in raw
        if term.strip()
    ]
