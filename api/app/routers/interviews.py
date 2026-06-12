from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import AsyncClient

from app.core.supabase import get_supabase
from app.dependencies.auth import AuthenticatedUser, get_current_user
from app.schemas.interviews import (
    CreateInterviewRequest,
    InterviewQuestionResponse,
    InterviewResponse,
    InterviewSummaryResponse,
    SubmitAnswerResponse,
    UpdateInterviewAnswerRequest,
)
from app.services.interview_service import InterviewError, InterviewService

router = APIRouter(prefix="/interviews", tags=["interviews"])


@router.post("", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
async def create_interview(
    body: CreateInterviewRequest,
    session: AuthenticatedUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_supabase),
) -> InterviewResponse:
    service = InterviewService(supabase)
    try:
        return await service.create(
            user_id=session.user.id,
            category=body.category,
            access_token=session.access_token,
            refresh_token=session.refresh_token,
        )
    except InterviewError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
        ) from exc


@router.get("", response_model=list[InterviewResponse])
async def list_interviews(
    session: AuthenticatedUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_supabase),
) -> list[InterviewResponse]:
    service = InterviewService(supabase)
    try:
        return await service.list_for_user(
            user_id=session.user.id,
            access_token=session.access_token,
            refresh_token=session.refresh_token,
        )
    except InterviewError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
        ) from exc


@router.get("/{interview_id}", response_model=InterviewResponse)
async def get_interview(
    interview_id: UUID,
    session: AuthenticatedUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_supabase),
) -> InterviewResponse:
    service = InterviewService(supabase)
    try:
        interview = await service.get_by_id(
            interview_id=interview_id,
            user_id=session.user.id,
            access_token=session.access_token,
            refresh_token=session.refresh_token,
        )
    except InterviewError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
        ) from exc

    if interview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )

    return interview


@router.get("/{interview_id}/questions", response_model=list[InterviewQuestionResponse])
async def list_interview_questions(
    interview_id: UUID,
    session: AuthenticatedUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_supabase),
) -> list[InterviewQuestionResponse]:
    service = InterviewService(supabase)
    try:
        questions = await service.list_questions(
            interview_id=interview_id,
            user_id=session.user.id,
            access_token=session.access_token,
            refresh_token=session.refresh_token,
        )
    except InterviewError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
        ) from exc

    if questions is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )

    return questions


@router.patch(
    "/{interview_id}/questions/{question_id}",
    response_model=InterviewQuestionResponse,
)
async def update_interview_answer(
    interview_id: UUID,
    question_id: UUID,
    body: UpdateInterviewAnswerRequest,
    session: AuthenticatedUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_supabase),
) -> InterviewQuestionResponse:
    service = InterviewService(supabase)
    try:
        question = await service.update_answer(
            interview_id=interview_id,
            question_id=question_id,
            user_id=session.user.id,
            answer=body.answer,
            access_token=session.access_token,
            refresh_token=session.refresh_token,
        )
    except InterviewError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
        ) from exc

    if question is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview or question not found",
        )

    return question


@router.post(
    "/{interview_id}/questions/{question_id}/submit",
    response_model=SubmitAnswerResponse,
)
async def submit_interview_answer(
    interview_id: UUID,
    question_id: UUID,
    body: UpdateInterviewAnswerRequest,
    session: AuthenticatedUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_supabase),
) -> SubmitAnswerResponse:
    service = InterviewService(supabase)
    try:
        result = await service.submit_answer(
            interview_id=interview_id,
            question_id=question_id,
            user_id=session.user.id,
            answer=body.answer,
            access_token=session.access_token,
            refresh_token=session.refresh_token,
        )
    except InterviewError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
        ) from exc

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview or question not found",
        )

    return result


@router.get("/{interview_id}/summary", response_model=InterviewSummaryResponse)
async def get_interview_summary(
    interview_id: UUID,
    session: AuthenticatedUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_supabase),
) -> InterviewSummaryResponse:
    service = InterviewService(supabase)
    try:
        summary = await service.get_summary(
            interview_id=interview_id,
            user_id=session.user.id,
            access_token=session.access_token,
            refresh_token=session.refresh_token,
        )
    except InterviewError as exc:
        if "not completed" in exc.message.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=exc.message,
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.message,
        ) from exc

    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )

    return summary
