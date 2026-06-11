from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    supabase_url: str
    supabase_publishable_key: str
    gemini_api_key: str
    gemini_model: str = "gemini-2.5-flash"
    keybert_model: str = "all-MiniLM-L6-v2"
    keybert_top_n: int = 5
    cors_origins: str = "http://localhost:3000"
    cookie_secure: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
