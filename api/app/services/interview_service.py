from datetime import UTC, datetime
from uuid import UUID

from supabase import AsyncClient

from app.schemas.interviews import InterviewQuestionResponse, InterviewResponse

CORE_QUESTION_TEMPLATES = [
    "What experience do you have related to {category}?",
    "Describe a specific situation where you applied skills relevant to {category}. What was the outcome?",
    "What challenges have you faced in the context of {category}, and how did you overcome them?",
    "How do you stay current with developments in {category}?",
    "Where do you see the biggest opportunity to grow your expertise in {category}?",
]


class InterviewError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class InterviewService:
    def __init__(self, supabase: AsyncClient) -> None:
        self.supabase = supabase

    async def _bind_session(
        self, access_token: str, refresh_token: str | None
    ) -> None:
        await self.supabase.auth.set_session(access_token, refresh_token or "")

    def _to_response(self, row: dict) -> InterviewResponse:
        return InterviewResponse(
            id=row["id"],
            category=row["category"],
            status=row["status"],
            started_at=row["started_at"],
            completed_at=row.get("completed_at"),
        )

    def _to_question_response(self, row: dict) -> InterviewQuestionResponse:
        return InterviewQuestionResponse(
            id=row["id"],
            sequence=row["sequence"],
            question=row["question"],
            answer=row.get("answer"),
            answered_at=row.get("answered_at"),
        )

    def _build_core_questions(self, interview_id: str, category: str) -> list[dict]:
        return [
            {
                "interview_id": interview_id,
                "sequence": sequence,
                "question": template.format(category=category),
                "answer_depth": "core",
            }
            for sequence, template in enumerate(CORE_QUESTION_TEMPLATES, start=1)
        ]

    async def create(
        self,
        user_id: str,
        category: str,
        access_token: str,
        refresh_token: str | None,
    ) -> InterviewResponse:
        await self._bind_session(access_token, refresh_token)
        category = category.strip()
        try:
            result = (
                await self.supabase.table("interviews")
                .insert(
                    {
                        "user_id": user_id,
                        "category": category,
                        "status": "in_progress",
                    }
                )
                .execute()
            )
        except Exception as exc:
            raise InterviewError(str(exc)) from exc

        if not result.data:
            raise InterviewError("Failed to create interview")

        interview_row = result.data[0]
        interview_id = interview_row["id"]

        try:
            await (
                self.supabase.table("interview_questions")
                .insert(self._build_core_questions(interview_id, category))
                .execute()
            )
        except Exception as exc:
            raise InterviewError(str(exc)) from exc

        return self._to_response(interview_row)

    async def list_for_user(
        self,
        user_id: str,
        access_token: str,
        refresh_token: str | None,
    ) -> list[InterviewResponse]:
        await self._bind_session(access_token, refresh_token)
        try:
            result = (
                await self.supabase.table("interviews")
                .select("id, category, status, started_at, completed_at")
                .eq("user_id", user_id)
                .order("started_at", desc=True)
                .execute()
            )
        except Exception as exc:
            raise InterviewError(str(exc)) from exc

        return [self._to_response(row) for row in result.data or []]

    async def get_by_id(
        self,
        interview_id: UUID,
        user_id: str,
        access_token: str,
        refresh_token: str | None,
    ) -> InterviewResponse | None:
        await self._bind_session(access_token, refresh_token)
        try:
            result = (
                await self.supabase.table("interviews")
                .select("id, category, status, started_at, completed_at")
                .eq("id", str(interview_id))
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise InterviewError(str(exc)) from exc

        if not result.data:
            return None

        return self._to_response(result.data[0])

    async def list_questions(
        self,
        interview_id: UUID,
        user_id: str,
        access_token: str,
        refresh_token: str | None,
    ) -> list[InterviewQuestionResponse] | None:
        interview = await self.get_by_id(
            interview_id=interview_id,
            user_id=user_id,
            access_token=access_token,
            refresh_token=refresh_token,
        )
        if interview is None:
            return None

        await self._bind_session(access_token, refresh_token)
        try:
            result = (
                await self.supabase.table("interview_questions")
                .select("id, sequence, question, answer, answered_at")
                .eq("interview_id", str(interview_id))
                .eq("answer_depth", "core")
                .order("sequence")
                .execute()
            )
        except Exception as exc:
            raise InterviewError(str(exc)) from exc

        return [self._to_question_response(row) for row in result.data or []]

    async def update_answer(
        self,
        interview_id: UUID,
        question_id: UUID,
        user_id: str,
        answer: str,
        access_token: str,
        refresh_token: str | None,
    ) -> InterviewQuestionResponse | None:
        interview = await self.get_by_id(
            interview_id=interview_id,
            user_id=user_id,
            access_token=access_token,
            refresh_token=refresh_token,
        )
        if interview is None:
            return None

        await self._bind_session(access_token, refresh_token)
        try:
            existing = (
                await self.supabase.table("interview_questions")
                .select("id")
                .eq("id", str(question_id))
                .eq("interview_id", str(interview_id))
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise InterviewError(str(exc)) from exc

        if not existing.data:
            return None

        answered_at = datetime.now(UTC).isoformat()
        try:
            result = (
                await self.supabase.table("interview_questions")
                .update({"answer": answer.strip(), "answered_at": answered_at})
                .eq("id", str(question_id))
                .eq("interview_id", str(interview_id))
                .execute()
            )
        except Exception as exc:
            raise InterviewError(str(exc)) from exc

        if not result.data:
            raise InterviewError("Failed to save answer")

        return self._to_question_response(result.data[0])
