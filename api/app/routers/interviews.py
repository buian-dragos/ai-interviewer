from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from supabase import AsyncClient

from app.core.supabase import get_supabase
from app.dependencies.auth import AuthenticatedUser, get_current_user
from app.schemas.interviews import CreateInterviewRequest, InterviewResponse
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
