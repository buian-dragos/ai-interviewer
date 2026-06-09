from supabase import AsyncClient
from supabase_auth.types import AuthResponse, Session, User


class AuthError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class AuthService:
    def __init__(self, supabase: AsyncClient) -> None:
        self.supabase = supabase

    async def sign_up(self, email: str, password: str) -> AuthResponse:
        try:
            return await self.supabase.auth.sign_up(
                {"email": email, "password": password}
            )
        except Exception as exc:
            raise AuthError(str(exc)) from exc

    async def sign_in(self, email: str, password: str) -> AuthResponse:
        try:
            return await self.supabase.auth.sign_in_with_password(
                {"email": email, "password": password}
            )
        except Exception as exc:
            raise AuthError("Invalid email or password") from exc

    async def sign_out(self) -> None:
        await self.supabase.auth.sign_out()

    async def get_user(self, access_token: str) -> User:
        response = await self.supabase.auth.get_user(jwt=access_token)
        if response.user is None:
            raise AuthError("Invalid session")
        return response.user

    async def refresh_session(self, refresh_token: str) -> Session:
        response = await self.supabase.auth.refresh_session(refresh_token)
        if response.session is None:
            raise AuthError("Invalid refresh token")
        return response.session
