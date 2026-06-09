from dataclasses import dataclass

from fastapi import Cookie, Depends, HTTPException, Request, Response, status
from supabase import AsyncClient

from app.core.config import Settings, get_settings
from app.core.cookies import (
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    set_auth_cookies,
)
from app.core.supabase import get_supabase
from app.schemas.auth import UserResponse
from app.services.auth_service import AuthError, AuthService


@dataclass
class AuthenticatedUser:
    user: UserResponse
    access_token: str
    refresh_token: str | None


async def resolve_session(
    request: Request,
    response: Response,
    supabase: AsyncClient = Depends(get_supabase),
    settings: Settings = Depends(get_settings),
    access_token: str | None = Cookie(default=None, alias=ACCESS_TOKEN_COOKIE),
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_TOKEN_COOKIE),
) -> AuthenticatedUser | None:
    if not access_token and not refresh_token:
        return None

    auth = AuthService(supabase)

    if access_token:
        try:
            user = await auth.get_user(access_token)
            return AuthenticatedUser(
                user=UserResponse(id=user.id, email=user.email),
                access_token=access_token,
                refresh_token=refresh_token,
            )
        except AuthError:
            pass

    if refresh_token:
        try:
            session = await auth.refresh_session(refresh_token)
            set_auth_cookies(response, session, settings)
            return AuthenticatedUser(
                user=UserResponse(id=session.user.id, email=session.user.email),
                access_token=session.access_token,
                refresh_token=session.refresh_token,
            )
        except AuthError:
            return None

    return None


async def get_current_user(
    session: AuthenticatedUser | None = Depends(resolve_session),
) -> AuthenticatedUser:
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return session


async def get_optional_user(
    session: AuthenticatedUser | None = Depends(resolve_session),
) -> AuthenticatedUser | None:
    return session
