"""
Application settings loaded from environment variables / .env file.
"""
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────
    database_path: str = os.path.join(os.path.dirname(__file__), "padel_stats.db")

    # ── API server ────────────────────────────────────────────────────────
    api_host: str = "0.0.0.0"
    api_port: int = 8001

    # ── CORS (comma-separated list of allowed origins) ────────────────────
    # Example: "http://localhost:5173,https://padel-stats.fr"
    cors_origins_str: str = "http://localhost:5173,http://localhost:3000,https://*.up.railway.app,https://*.vercel.app"

    # ── JWT ───────────────────────────────────────────────────────────────
    # CHANGER ABSOLUMENT en production (générer avec : openssl rand -hex 32)
    secret_key: str = "dev-secret-key-change-in-production-32chars!!"
    access_token_expire_days: int = 7

    # ── Environment ───────────────────────────────────────────────────────
    environment: str = "development"

    # ── GitHub sync (persists imported months across cold starts) ──────────
    github_token: str = ""
    github_repo: str = "AlexandruCodeP/padel-stats"
    github_db_path: str = "backend/padel_stats.db.xz"
    github_branch: str = "master"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins_str.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


settings = Settings()
