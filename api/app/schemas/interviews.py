from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

InterviewStatus = Literal["in_progress", "completed", "abandoned"]

ANSWER_MAX_LENGTH = 2500


class CreateInterviewRequest(BaseModel):
    category: str = Field(min_length=1, max_length=500)


class InterviewResponse(BaseModel):
    id: UUID
    category: str
    status: InterviewStatus
    started_at: datetime
    completed_at: datetime | None = None


class InterviewQuestionResponse(BaseModel):
    id: UUID
    sequence: int
    question: str
    answer: str | None = None
    answered_at: datetime | None = None


class UpdateInterviewAnswerRequest(BaseModel):
    answer: str = Field(min_length=1, max_length=ANSWER_MAX_LENGTH)
