from fastapi import APIRouter, Depends, HTTPException, Response, status
from supabase import AsyncClient

from app.core.config import Settings, get_settings
from app.core.cookies import clear_auth_cookies, set_auth_cookies
from app.core.supabase import get_supabase
from app.dependencies.auth import AuthenticatedUser, get_current_user, get_optional_user
from app.schemas.auth import SignInRequest, SignUpRequest, SignUpResponse, UserResponse
from app.services.auth_service import AuthError, AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_response(user_id: str, email: str | None) -> UserResponse:
    return UserResponse(id=user_id, email=email)


@router.post("/signup", response_model=SignUpResponse)
async def signup(
    body: SignUpRequest,
    response: Response,
    supabase: AsyncClient = Depends(get_supabase),
    settings: Settings = Depends(get_settings),
) -> SignUpResponse:
    auth = AuthService(supabase)
    try:
        result = await auth.sign_up(body.email, body.password)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc

    if result.user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create account",
        )

    if result.session is None:
        return SignUpResponse(
            confirmation_required=True,
            message="Check your email to confirm your account before signing in.",
        )

    set_auth_cookies(response, result.session, settings)
    return SignUpResponse(user=_to_user_response(result.user.id, result.user.email))


@router.post("/login", response_model=UserResponse)
async def login(
    body: SignInRequest,
    response: Response,
    supabase: AsyncClient = Depends(get_supabase),
    settings: Settings = Depends(get_settings),
) -> UserResponse:
    auth = AuthService(supabase)
    try:
        result = await auth.sign_in(body.email, body.password)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=exc.message) from exc

    if result.user is None or result.session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    set_auth_cookies(response, result.session, settings)
    return _to_user_response(result.user.id, result.user.email)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    session: AuthenticatedUser | None = Depends(get_optional_user),
    supabase: AsyncClient = Depends(get_supabase),
    settings: Settings = Depends(get_settings),
) -> None:
    if session is not None and session.refresh_token:
        auth = AuthService(supabase)
        try:
            await supabase.auth.set_session(
                session.access_token,
                session.refresh_token,
            )
            await auth.sign_out()
        except Exception:
            pass

    clear_auth_cookies(response, settings)


@router.get("/me", response_model=UserResponse)
async def me(session: AuthenticatedUser = Depends(get_current_user)) -> UserResponse:
    return session.user
