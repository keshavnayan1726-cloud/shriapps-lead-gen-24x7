"""
config.py — Pydantic settings loaded from .env
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    GEMINI_API_KEY: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./leads.db"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://localhost:8000"
    COMPANY_NAME: str = "Shri Apps and Web"

    # 24/7 Autonomous Scraper Settings
    AUTO_SCRAPE_ENABLED: bool = True
    AUTO_SCRAPE_INTERVAL_MINUTES: int = 60
    AUTO_SCRAPE_MAX_RESULTS: int = 15
    DEFAULT_LOCATION: str = "Gurugram"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
