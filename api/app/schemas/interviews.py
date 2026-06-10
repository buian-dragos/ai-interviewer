from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

InterviewStatus = Literal["in_progress", "completed", "abandoned"]


class CreateInterviewRequest(BaseModel):
    category: str = Field(min_length=1, max_length=500)


class InterviewResponse(BaseModel):
    id: UUID
    category: str
    status: InterviewStatus
    started_at: datetime
    completed_at: datetime | None = None
