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
    "(No conversation yet — this is Core Question 1. Open naturally: you may skip a "
    "standalone greeting or weave a brief welcome into the question. Ask one focused "
    "opening question that enters the topic from a specific angle — not a generic "
    "'how do you engage with…' prompt.)"
)
OPENING_USER_CONTENT = (
    "Generate Core Question 1. Use a fresh, specific angle into the topic — avoid "
    "formulaic openings like 'how do you usually engage with…' or 'tell me about your "
    "relationship with…'. A short greeting is optional; do not always start with "
    "'To start,' or 'Hi!'. One question only."
)
CORE_QUESTION_USER_CONTENT = (
    "Generate the next core interview question based on the instructions, "
    "current stage, and transcript."
)
FOLLOW_UP_USER_CONTENT = (
    "Generate the single allowed follow-up. No greeting or pleasantries — "
    "output only the follow-up question."
)


def format_follow_up_user_content(
    original_question: str,
    answer_depth: str,
    answered_question: bool,
) -> str:
    lines = [
        "Generate the single allowed follow-up for the core question below.",
        "No greeting, no pleasantries, no acknowledgment — output only the follow-up question.",
        "",
        "<original_core_question>",
        original_question,
        "</original_core_question>",
        "",
        "<evaluation>",
        f"answer_depth: {answer_depth}",
        f"answered_question: {answered_question}",
        "</evaluation>",
        "",
    ]

    if not answered_question:
        lines.append(
            "The answer did not meaningfully address the original question. "
            "Reframe from a different angle or add clearer guidance so the participant "
            "knows what to answer. Do not repeat the same wording verbatim."
        )
    if answer_depth == "shallow":
        lines.append(
            "The answer was too thin. Encourage elaboration — a concrete example, "
            "specific details, or a walkthrough of what happened. Build on what they "
            "already said when possible."
        )

    lines.append("One question only.")
    return "\n".join(lines)
EVALUATE_USER_CONTENT = "Evaluate the answer and return JSON only."

SUMMARY_PROMPT_PATH = (
    Path(__file__).resolve().parents[2] / "prompts" / "generate_summary.md"
)
SUMMARY_PROMPT_TEMPLATE = SUMMARY_PROMPT_PATH.read_text(encoding="utf-8")
SUMMARY_USER_CONTENT = "Generate the interview summary and return JSON only."

Role = str


class ThemeResult(BaseModel):
    title: str
    description: str


class InterviewSummaryLLMResult(BaseModel):
    summary: str
    themes: list[ThemeResult]
    highlights: list[str] = []
    strengths: list[str] = []
    growth_areas: list[str] = []


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
            temperature=0.85,
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

    def _generate_interview_summary_sync(
        self,
        category: str,
        transcript: str,
    ) -> InterviewSummaryLLMResult:
        prompt = SUMMARY_PROMPT_TEMPLATE.format(
            category=category,
            transcript=transcript,
        )

        completion = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": SUMMARY_USER_CONTENT},
            ],
            temperature=0.4,
            response_format={"type": "json_object"},
        )

        text = (completion.choices[0].message.content or "").strip()
        if not text:
            raise LLMError("LLM returned an empty summary response")

        try:
            return InterviewSummaryLLMResult.model_validate(json.loads(text))
        except (json.JSONDecodeError, ValidationError) as exc:
            raise LLMError(f"Invalid summary JSON: {exc}") from exc

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

    async def generate_interview_summary(
        self,
        category: str,
        transcript: str,
    ) -> InterviewSummaryLLMResult:
        try:
            return await asyncio.to_thread(
                self._generate_interview_summary_sync,
                category,
                transcript,
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
