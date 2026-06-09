from fastapi import Response
from supabase_auth.types import Session

from app.core.config import Settings

ACCESS_TOKEN_COOKIE = "sb-access-token"
REFRESH_TOKEN_COOKIE = "sb-refresh-token"


def set_auth_cookies(response: Response, session: Session, settings: Settings) -> None:
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=session.access_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
        max_age=session.expires_in,
    )
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=session.refresh_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
        max_age=60 * 60 * 24 * 30,
    )


def clear_auth_cookies(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=ACCESS_TOKEN_COOKIE,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
