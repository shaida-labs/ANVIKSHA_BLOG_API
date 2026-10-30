"""Centralized application configuration loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings.

    Values are read from environment variables first and the project ``.env``
    file second. Secrets are marked ``repr=False`` so they are not printed when
    the settings object is logged accidentally.
    """

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "ANVIKSHA API"
    environment: Literal["development", "test", "production"] = "development"
    debug: bool = False
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:4173,http://127.0.0.1:4173"
    )

    database_url: str = Field(repr=False)
    database_echo: bool = False

    jwt_secret_key: str = Field(min_length=32, repr=False)
    jwt_algorithm: Literal["HS256", "HS384", "HS512"] = "HS256"
    access_token_expire_minutes: int = Field(default=30, ge=1, le=1440)

    upload_dir: Path = BASE_DIR / "uploads"
    upload_max_size_mb: int = Field(default=5, ge=1, le=50)
    upload_max_image_pixels: int = Field(default=40_000_000, ge=1_000_000)

    @field_validator("upload_dir", mode="before")
    @classmethod
    def normalize_upload_dir(cls, value: object) -> object:
        if isinstance(value, (str, Path)):
            path = Path(value).expanduser()
            return path if path.is_absolute() else BASE_DIR / path
        return value

    @property
    def upload_max_bytes(self) -> int:
        return self.upload_max_size_mb * 1024 * 1024

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        """Normalize common PostgreSQL URLs to the explicit psycopg 3 dialect."""
        value = value.strip()
        if value.startswith("postgres://"):
            value = "postgresql+psycopg://" + value.removeprefix("postgres://")
        elif value.startswith("postgresql://"):
            value = "postgresql+psycopg://" + value.removeprefix("postgresql://")

        if not value.startswith(("postgresql+psycopg://", "sqlite://")):
            raise ValueError(
                "DATABASE_URL must start with postgresql+psycopg:// "
                "(or sqlite:// in the test environment)."
            )
        return value

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.environment == "test":
            return self

        if not self.database_url.startswith("postgresql+psycopg://"):
            raise ValueError(
                "SQLite is only permitted when ENVIRONMENT=test. "
                "Configure PostgreSQL for development and production."
            )

        if self.environment == "production":
            weak_prefixes = (
                "replace_with",
                "replace-with",
                "change_me",
                "change-me",
                "your_secret",
                "your-secret",
                "example",
                "development",
                "dev-secret",
            )
            lowered = self.jwt_secret_key.strip().lower()
            if lowered.startswith(weak_prefixes) or lowered in {
                "secret",
                "changeme",
                "password",
            }:
                raise ValueError(
                    "JWT_SECRET_KEY must be a strong, random value in production."
                )

        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
