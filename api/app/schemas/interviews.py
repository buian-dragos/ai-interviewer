from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

InterviewStatus = Literal["in_progress", "completed", "abandoned"]
AnswerDepth = Literal["shallow", "adequate", "deep"]
SentimentLabel = Literal["positive", "negative", "neutral"]

ANSWER_MAX_LENGTH = 2500
CORE_QUESTIONS_TOTAL = 5


class CreateInterviewRequest(BaseModel):
    category: str = Field(min_length=1, max_length=500)


class InterviewResponse(BaseModel):
    id: UUID
    category: str
    status: InterviewStatus
    started_at: datetime
    completed_at: datetime | None = None


class KeywordMatch(BaseModel):
    term: str
    score: float


class AnswerEvaluation(BaseModel):
    answer_depth: AnswerDepth
    answered_question: bool
    sentiment_label: SentimentLabel | None = None
    sentiment_score: float | None = None
    keywords: list[KeywordMatch] | None = None


class InterviewQuestionResponse(BaseModel):
    id: UUID
    sequence: int
    question: str
    answer: str | None = None
    answered_at: datetime | None = None
    answer_depth: AnswerDepth | None = None
    answered_question: bool | None = None
    follows_question_id: UUID | None = None
    core_sequence: int = Field(ge=1, le=CORE_QUESTIONS_TOTAL)


class UpdateInterviewAnswerRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=ANSWER_MAX_LENGTH)


class SubmitAnswerResponse(BaseModel):
    saved: InterviewQuestionResponse
    questions: list[InterviewQuestionResponse]
    next_question_id: UUID | None = None
    evaluation: AnswerEvaluation | None = None
