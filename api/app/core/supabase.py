from collections.abc import AsyncGenerator

from fastapi import Request
from supabase import AsyncClient, acreate_client

from app.core.config import Settings, get_settings


async def create_supabase_client(settings: Settings | None = None) -> AsyncClient:
    resolved = settings or get_settings()
    return await acreate_client(resolved.supabase_url, resolved.supabase_publishable_key)


async def get_supabase(request: Request) -> AsyncGenerator[AsyncClient, None]:
    yield request.app.state.supabase
