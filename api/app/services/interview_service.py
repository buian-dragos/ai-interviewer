from uuid import UUID

from supabase import AsyncClient

from app.schemas.interviews import InterviewResponse


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

    async def create(
        self,
        user_id: str,
        category: str,
        access_token: str,
        refresh_token: str | None,
    ) -> InterviewResponse:
        await self._bind_session(access_token, refresh_token)
        try:
            result = (
                await self.supabase.table("interviews")
                .insert(
                    {
                        "user_id": user_id,
                        "category": category.strip(),
                        "status": "in_progress",
                    }
                )
                .execute()
            )
        except Exception as exc:
            raise InterviewError(str(exc)) from exc

        if not result.data:
            raise InterviewError("Failed to create interview")

        return self._to_response(result.data[0])

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
