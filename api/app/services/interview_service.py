from datetime import UTC, datetime
import logging
from uuid import UUID

from supabase import AsyncClient

from app.schemas.interviews import (
    AnswerEvaluation,
    InterviewQuestionResponse,
    InterviewResponse,
    SubmitAnswerResponse,
)
from app.services.answer_evaluation_service import evaluate_answer
from app.services.gemini_service import (
    GeminiError,
    CORE_QUESTION_USER_CONTENT,
    FOLLOW_UP_USER_CONTENT,
    OPENING_USER_CONTENT,
    format_current_stage,
    get_gemini_service,
)

logger = logging.getLogger(__name__)

CORE_QUESTION_TEMPLATES = [
    "What experience do you have related to {category}?",
    "Describe a specific situation where you applied skills relevant to {category}. What was the outcome?",
    "What challenges have you faced in the context of {category}, and how did you overcome them?",
    "How do you stay current with developments in {category}?",
    "Where do you see the biggest opportunity to grow your expertise in {category}?",
]

FOLLOW_UP_TEMPLATE = (
    "Could you go into more detail? What specific actions did you take, and what was the outcome?"
)

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

    def _core_sequence(self, row: dict) -> int:
        if row.get("follows_question_id") is None:
            return row["sequence"]
        return row["sequence"] // 100

    def _is_follow_up(self, row: dict) -> bool:
        return row.get("follows_question_id") is not None

    def _follow_up_sequence(self, core_sequence: int) -> int:
        return core_sequence * 100 + 1

    def _to_question_response(self, row: dict) -> InterviewQuestionResponse:
        return InterviewQuestionResponse(
            id=row["id"],
            sequence=row["sequence"],
            question=row["question"],
            answer=row.get("answer"),
            answered_at=row.get("answered_at"),
            answer_depth=row.get("answer_depth"),
            answered_question=row.get("answered_question"),
            follows_question_id=row.get("follows_question_id"),
            core_sequence=self._core_sequence(row),
        )

    def _build_first_question_row(
        self, interview_id: str, first_question: str
    ) -> dict:
        return {
            "interview_id": interview_id,
            "sequence": 1,
            "question": first_question,
        }

    async def _generate_first_question(self, category: str) -> str:
        fallback = CORE_QUESTION_TEMPLATES[0].format(category=category)
        try:
            return await get_gemini_service().generate_interview_turn(
                category=category,
                current_stage=format_current_stage(is_follow_up=False, core_sequence=1),
                history=[],
                user_content=OPENING_USER_CONTENT,
            )
        except GeminiError as exc:
            logger.warning("Gemini failed to generate Q1, using template: %s", exc.message)
            return fallback
        except Exception:
            logger.exception("Unexpected error generating Q1, using template")
            return fallback

    def _should_create_follow_up(
        self,
        question_row: dict,
        evaluation: AnswerEvaluation | None,
    ) -> bool:
        if evaluation is None or self._is_follow_up(question_row):
            return False
        return (
            evaluation.answer_depth == "shallow"
            or not evaluation.answered_question
        )

    def _build_transcript_history(
        self, questions: list[InterviewQuestionResponse]
    ) -> list[tuple[str, str]]:
        history: list[tuple[str, str]] = []
        for question in questions:
            if not question.answer:
                continue
            history.append(("model", question.question))
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
            history.append(("user", answer_text))
        return history

    async def _generate_core_question(
        self,
        category: str,
        core_sequence: int,
        history: list[tuple[str, str]],
    ) -> str:
        fallback = CORE_QUESTION_TEMPLATES[core_sequence - 1].format(
            category=category
        )
        try:
            return await get_gemini_service().generate_interview_turn(
                category=category,
                current_stage=format_current_stage(
                    is_follow_up=False, core_sequence=core_sequence
                ),
                history=history,
                user_content=CORE_QUESTION_USER_CONTENT,
            )
        except GeminiError as exc:
            logger.warning(
                "Gemini failed to generate core Q%s, using template: %s",
                core_sequence,
                exc.message,
            )
            return fallback
        except Exception:
            logger.exception(
                "Unexpected error generating core Q%s, using template",
                core_sequence,
            )
            return fallback

    async def _generate_follow_up_question(
        self,
        category: str,
        core_sequence: int,
        history: list[tuple[str, str]],
    ) -> str:
        try:
            return await get_gemini_service().generate_interview_turn(
                category=category,
                current_stage=format_current_stage(
                    is_follow_up=True, core_sequence=core_sequence
                ),
                history=history,
                user_content=FOLLOW_UP_USER_CONTENT,
            )
        except GeminiError as exc:
            logger.warning(
                "Gemini failed to generate follow-up, using template: %s",
                exc.message,
            )
            return FOLLOW_UP_TEMPLATE
        except Exception:
            logger.exception("Unexpected error generating follow-up, using template")
            return FOLLOW_UP_TEMPLATE

    def _should_generate_next_core(
        self, question_row: dict, follow_up_created: bool
    ) -> bool:
        core_sequence = self._core_sequence(question_row)
        if core_sequence >= 5:
            return False
        if self._is_follow_up(question_row):
            return True
        return not follow_up_created

    async def _core_question_exists(
        self, interview_id: str, sequence: int
    ) -> bool:
        result = (
            await self.supabase.table("interview_questions")
            .select("id")
            .eq("interview_id", interview_id)
            .eq("sequence", sequence)
            .is_("follows_question_id", "null")
            .limit(1)
            .execute()
        )
        return bool(result.data)

    async def _persist_answer_evaluation(
        self,
        interview_id: str,
        question_id: str,
        evaluation: AnswerEvaluation,
    ) -> None:
        keywords_payload = [keyword.model_dump() for keyword in evaluation.keywords]
        try:
            await (
                self.supabase.table("interview_questions")
                .update(
                    {
                        "sentiment_label": evaluation.sentiment_label,
                        "sentiment_score": evaluation.sentiment_score,
                        "keywords": keywords_payload,
                        "answer_depth": evaluation.answer_depth,
                        "answered_question": evaluation.answered_question,
                    }
                )
                .eq("id", question_id)
                .eq("interview_id", interview_id)
                .execute()
            )
        except Exception as exc:
            raise InterviewError(str(exc)) from exc

    def _order_question_timeline(
        self, questions: list[InterviewQuestionResponse]
    ) -> list[InterviewQuestionResponse]:
        """Place each follow-up immediately after its parent core question."""
        core_questions = sorted(
            (question for question in questions if question.follows_question_id is None),
            key=lambda question: question.sequence,
        )
        follow_ups_by_parent = {
            follow_up.follows_question_id: follow_up
            for follow_up in questions
            if follow_up.follows_question_id is not None
        }

        ordered: list[InterviewQuestionResponse] = []
        for core in core_questions:
            ordered.append(core)
            follow_up = follow_ups_by_parent.get(core.id)
            if follow_up is not None:
                ordered.append(follow_up)
        return ordered

    async def _fetch_all_questions(
        self, interview_id: str
    ) -> list[InterviewQuestionResponse]:
        result = (
            await self.supabase.table("interview_questions")
            .select(
                "id, sequence, question, answer, answered_at, "
                "answer_depth, answered_question, follows_question_id"
            )
            .eq("interview_id", interview_id)
            .order("sequence")
            .execute()
        )
        questions = [self._to_question_response(row) for row in result.data or []]
        return self._order_question_timeline(questions)

    async def _get_question_by_id(
        self, interview_id: str, question_id: str
    ) -> dict | None:
        result = (
            await self.supabase.table("interview_questions")
            .select("id, question, answer, follows_question_id")
            .eq("interview_id", interview_id)
            .eq("id", question_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None
        return result.data[0]

    async def _get_follow_up_for_parent(
        self, interview_id: str, parent_question_id: str
    ) -> dict | None:
        result = (
            await self.supabase.table("interview_questions")
            .select("id")
            .eq("interview_id", interview_id)
            .eq("follows_question_id", parent_question_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None
        return result.data[0]

    def _next_question_id_after_submit(
        self,
        questions: list[InterviewQuestionResponse],
        saved: InterviewQuestionResponse,
    ) -> UUID | None:
        ids = [question.id for question in questions]
        try:
            saved_index = ids.index(saved.id)
        except ValueError:
            return None

        if saved_index + 1 < len(ids):
            return ids[saved_index + 1]
        return None

    async def _complete_interview(self, interview_id: str) -> None:
        completed_at = datetime.now(UTC).isoformat()
        try:
            await (
                self.supabase.table("interviews")
                .update({"status": "completed", "completed_at": completed_at})
                .eq("id", interview_id)
                .execute()
            )
        except Exception as exc:
            raise InterviewError(str(exc)) from exc

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

        first_question = await self._generate_first_question(category)

        try:
            await (
                self.supabase.table("interview_questions")
                .insert(self._build_first_question_row(interview_id, first_question))
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
            return await self._fetch_all_questions(str(interview_id))
        except Exception as exc:
            raise InterviewError(str(exc)) from exc

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

    async def submit_answer(
        self,
        interview_id: UUID,
        question_id: UUID,
        user_id: str,
        answer: str,
        access_token: str,
        refresh_token: str | None,
    ) -> SubmitAnswerResponse | None:
        interview = await self.get_by_id(
            interview_id=interview_id,
            user_id=user_id,
            access_token=access_token,
            refresh_token=refresh_token,
        )
        if interview is None:
            return None

        await self._bind_session(access_token, refresh_token)
        interview_id_str = str(interview_id)
        question_id_str = str(question_id)

        try:
            existing = (
                await self.supabase.table("interview_questions")
                .select(
                    "id, sequence, question, answer, answered_at, "
                    "answer_depth, answered_question, follows_question_id"
                )
                .eq("id", question_id_str)
                .eq("interview_id", interview_id_str)
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise InterviewError(str(exc)) from exc

        if not existing.data:
            return None

        question_row = existing.data[0]
        answered_at = datetime.now(UTC).isoformat()
        stripped = answer.strip()

        try:
            update_result = (
                await self.supabase.table("interview_questions")
                .update({"answer": stripped, "answered_at": answered_at})
                .eq("id", question_id_str)
                .eq("interview_id", interview_id_str)
                .execute()
            )
        except Exception as exc:
            raise InterviewError(str(exc)) from exc

        if not update_result.data:
            raise InterviewError("Failed to save answer")

        saved = self._to_question_response(update_result.data[0])

        evaluation: AnswerEvaluation | None = None
        parent_question: str | None = None
        parent_answer: str | None = None
        if self._is_follow_up(question_row):
            parent_id = question_row.get("follows_question_id")
            if parent_id:
                parent_row = await self._get_question_by_id(
                    interview_id_str, str(parent_id)
                )
                if parent_row:
                    parent_question = parent_row["question"]
                    parent_answer = parent_row.get("answer")

        try:
            evaluation = await evaluate_answer(
                question=question_row["question"],
                answer=stripped,
                category=interview.category,
                parent_question=parent_question,
                parent_answer=parent_answer,
            )
            await self._persist_answer_evaluation(
                interview_id_str,
                question_id_str,
                evaluation,
            )
            saved = saved.model_copy(
                update={
                    "answer_depth": evaluation.answer_depth,
                    "answered_question": evaluation.answered_question,
                }
            )
        except Exception:
            logger.exception(
                "Answer evaluation failed for question %s; answer saved without analysis",
                question_id_str,
            )

        follow_up_created = False
        if self._should_create_follow_up(question_row, evaluation):
            existing_follow_up = await self._get_follow_up_for_parent(
                interview_id_str, question_id_str
            )
            if existing_follow_up is None:
                core_sequence = self._core_sequence(question_row)
                questions_for_history = await self._fetch_all_questions(
                    interview_id_str
                )
                history = self._build_transcript_history(questions_for_history)
                follow_up_question = await self._generate_follow_up_question(
                    category=interview.category,
                    core_sequence=core_sequence,
                    history=history,
                )
                try:
                    await (
                        self.supabase.table("interview_questions")
                        .insert(
                            {
                                "interview_id": interview_id_str,
                                "sequence": self._follow_up_sequence(core_sequence),
                                "question": follow_up_question,
                                "follows_question_id": question_id_str,
                            }
                        )
                        .execute()
                    )
                    follow_up_created = True
                except Exception as exc:
                    raise InterviewError(str(exc)) from exc

        if self._should_generate_next_core(question_row, follow_up_created):
            completed_core = self._core_sequence(question_row)
            next_sequence = completed_core + 1
            if not await self._core_question_exists(
                interview_id_str, next_sequence
            ):
                questions_for_history = await self._fetch_all_questions(
                    interview_id_str
                )
                history = self._build_transcript_history(questions_for_history)
                next_question = await self._generate_core_question(
                    category=interview.category,
                    core_sequence=next_sequence,
                    history=history,
                )
                try:
                    await (
                        self.supabase.table("interview_questions")
                        .insert(
                            {
                                "interview_id": interview_id_str,
                                "sequence": next_sequence,
                                "question": next_question,
                            }
                        )
                        .execute()
                    )
                except Exception as exc:
                    raise InterviewError(str(exc)) from exc

        questions = await self._fetch_all_questions(interview_id_str)
        next_question_id = self._next_question_id_after_submit(questions, saved)

        if next_question_id is None and all(
            question.answered_at is not None for question in questions
        ):
            await self._complete_interview(interview_id_str)

        return SubmitAnswerResponse(
            saved=saved,
            questions=questions,
            next_question_id=next_question_id,
            evaluation=evaluation,
        )
