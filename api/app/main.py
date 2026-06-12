from contextlib import asynccontextmanager

import asyncio

import nltk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.supabase import create_supabase_client
from app.routers import auth, interviews
from app.services.nlp_service import init_nlp, preload_keybert


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    nltk.download("vader_lexicon", quiet=True)
    init_nlp()
    asyncio.create_task(asyncio.to_thread(preload_keybert))
    app.state.supabase = await create_supabase_client(settings)
    yield
    app.state.supabase = None


app = FastAPI(lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(interviews.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
