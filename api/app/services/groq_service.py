import asyncio
import json
import logging
from pathlib import Path

from groq import Groq
from pydantic import BaseModel, ValidationError

from app.core.config import get_settings
from app.schemas.interviews import AnswerDepth

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).resolve().parents[2] / "prompts" / "interviewer.md"
PROMPT_TEMPLATE = PROMPT_PATH.read_text(encoding="utf-8")

EVALUATE_PROMPT_PATH = (
    Path(__file__).resolve().parents[2] / "prompts" / "evaluate_answer.md"
)
EVALUATE_PROMPT_TEMPLATE = EVALUATE_PROMPT_PATH.read_text(encoding="utf-8")

EMPTY_HISTORY_SENTINEL = (
    "(No conversation yet — open with a brief greeting, then ask one general but "
    "focused opening question about the topic. Do not make it very broad.)"
)
OPENING_USER_CONTENT = (
    "Generate your opening response: a brief greeting and one general but "
    "focused opening question."
)
CORE_QUESTION_USER_CONTENT = (
    "Generate the next core interview question based on the instructions, "
    "current stage, and transcript."
)
FOLLOW_UP_USER_CONTENT = (
    "The participant's last answer was shallow or did not fully address the question. "
    "Generate a brief acknowledgment and one probing follow-up based on the transcript."
)
EVALUATE_USER_CONTENT = "Evaluate the answer and return JSON only."

Role = str


class AnswerDepthResult(BaseModel):
    answer_depth: AnswerDepth
    answered_question: bool


def format_current_stage(is_follow_up: bool, core_sequence: int) -> str:
    if is_follow_up:
        return f"Follow-up to Core Question {core_sequence}"
    return f"Core Question {core_sequence}"


class LLMError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


def format_evaluation_exchange(
    question: str,
    answer: str,
    parent_question: str | None = None,
    parent_answer: str | None = None,
) -> str:
    if parent_question and parent_answer:
        return (
            "# Task\n"
            "This is a follow-up turn. Judge how well the participant addressed "
            "the **original core question**, using **both** their initial answer "
            "and their follow-up answer together.\n\n"
            "# Follow-up rules\n"
            "- Combine insight from both answers. Detail split across turns still counts.\n"
            "- Be generous when the combined answers substantively cover the topic; prefer **adequate** or **deep**.\n"
            "- A thin initial answer can still have been **answered_question: true**; judge slot depth from both answers together.\n"
            "- Upgrade depth when the follow-up adds specificity, examples, or explanation missing from the first answer.\n"
            "- Keep slot depth **shallow** only if both answers together remain too thin, off-topic, or non-responsive.\n"
            "- **answered_question:** true if the **original core question** was addressed at least partially "
            "across both answers. Prefer true when in doubt.\n\n"
            "<original_question>\n"
            f"{parent_question}\n"
            "</original_question>\n\n"
            "<original_answer>\n"
            f"{parent_answer}\n"
            "</original_answer>\n\n"
            "<follow_up_question>\n"
            f"{question}\n"
            "</follow_up_question>\n\n"
            "<follow_up_answer>\n"
            f"{answer}\n"
            "</follow_up_answer>"
        )

    return (
        "<question>\n"
        f"{question}\n"
        "</question>\n\n"
        "<answer>\n"
        f"{answer}\n"
        "</answer>"
    )


class GroqService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.groq_api_key:
            raise LLMError("GROQ_API_KEY is not configured")
        self._client = Groq(api_key=settings.groq_api_key)
        self._model = settings.groq_model

    def _format_history(self, history: list[tuple[Role, str]]) -> str:
        if not history:
            return EMPTY_HISTORY_SENTINEL

        lines: list[str] = []
        for role, content in history:
            label = "Interviewer" if role == "model" else "User"
            lines.append(f"{label}: {content}")
        return "\n".join(lines)

    def _build_system_instruction(
        self,
        category: str,
        tone: str,
        current_stage: str,
        history: list[tuple[Role, str]],
    ) -> str:
        return PROMPT_TEMPLATE.format(
            category=category,
            tone=tone,
            current_stage=current_stage,
            history=self._format_history(history),
        )

    def _generate_sync(
        self,
        category: str,
        current_stage: str,
        history: list[tuple[Role, str]],
        tone: str,
        user_content: str | None = None,
    ) -> str:
        system_instruction = self._build_system_instruction(
            category, tone, current_stage, history
        )
        if user_content is None:
            user_content = (
                OPENING_USER_CONTENT if not history else FOLLOW_UP_USER_CONTENT
            )

        completion = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_content},
            ],
            temperature=0.7,
        )

        text = (completion.choices[0].message.content or "").strip()
        if not text:
            raise LLMError("LLM returned an empty response")
        return text

    def _evaluate_answer_depth_sync(
        self,
        question: str,
        answer: str,
        category: str,
        parent_question: str | None = None,
        parent_answer: str | None = None,
    ) -> AnswerDepthResult:
        prompt = EVALUATE_PROMPT_TEMPLATE.format(
            category=category,
            evaluation_exchange=format_evaluation_exchange(
                question,
                answer,
                parent_question,
                parent_answer,
            ),
        )

        completion = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": EVALUATE_USER_CONTENT},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        text = (completion.choices[0].message.content or "").strip()
        if not text:
            raise LLMError("LLM returned an empty evaluation response")

        try:
            return AnswerDepthResult.model_validate(json.loads(text))
        except (json.JSONDecodeError, ValidationError) as exc:
            raise LLMError(f"Invalid evaluation JSON: {exc}") from exc

    async def generate_interview_turn(
        self,
        category: str,
        current_stage: str,
        history: list[tuple[Role, str]] | None = None,
        tone: str = "friendly and conversational",
        user_content: str | None = None,
    ) -> str:
        return await asyncio.to_thread(
            self._generate_sync,
            category,
            current_stage,
            history or [],
            tone,
            user_content,
        )

    async def evaluate_answer_depth(
        self,
        question: str,
        answer: str,
        category: str,
        parent_question: str | None = None,
        parent_answer: str | None = None,
    ) -> AnswerDepthResult:
        try:
            return await asyncio.to_thread(
                self._evaluate_answer_depth_sync,
                question,
                answer,
                category,
                parent_question,
                parent_answer,
            )
        except LLMError:
            raise
        except Exception as exc:
            raise LLMError(str(exc)) from exc


def default_answer_depth_result() -> AnswerDepthResult:
    return AnswerDepthResult(answer_depth="shallow", answered_question=False)


_llm_service: GroqService | None = None


def get_llm_service() -> GroqService:
    global _llm_service
    if _llm_service is None:
        _llm_service = GroqService()
    return _llm_service
