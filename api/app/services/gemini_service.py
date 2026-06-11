import asyncio
import logging
from pathlib import Path

from google import genai
from google.genai import types

from app.core.config import get_settings

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).resolve().parents[2] / "prompts" / "interviewer.md"
PROMPT_TEMPLATE = PROMPT_PATH.read_text(encoding="utf-8")

EMPTY_HISTORY_SENTINEL = (
    "(No conversation yet — open with a brief greeting, then ask one general but "
    "focused opening question about the topic. Do not make it very broad.)"
)
OPENING_USER_CONTENT = (
    "Generate your opening response: a brief greeting and one general but "
    "focused opening question."
)
FOLLOW_UP_USER_CONTENT = (
    "Generate your next response based on the instructions, current stage, and transcript."
)

Role = str
AnswerDepth = str


def format_current_stage(answer_depth: AnswerDepth, core_sequence: int) -> str:
    if answer_depth == "follow_up":
        return f"Follow-up to Core Question {core_sequence}"
    return f"Core Question {core_sequence}"


class GeminiError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class GeminiService:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise GeminiError("GEMINI_API_KEY is not configured")
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._model = settings.gemini_model

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
    ) -> str:
        system_instruction = self._build_system_instruction(
            category, tone, current_stage, history
        )
        user_content = (
            OPENING_USER_CONTENT
            if not history
            else FOLLOW_UP_USER_CONTENT
        )

        response = self._client.models.generate_content(
            model=self._model,
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
            ),
        )

        text = (response.text or "").strip()
        if not text:
            raise GeminiError("Gemini returned an empty response")
        return text

    async def generate_interview_turn(
        self,
        category: str,
        current_stage: str,
        history: list[tuple[Role, str]] | None = None,
        tone: str = "friendly and conversational",
    ) -> str:
        return await asyncio.to_thread(
            self._generate_sync,
            category,
            current_stage,
            history or [],
            tone,
        )


_gemini_service: GeminiService | None = None


def get_gemini_service() -> GeminiService:
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
