"""Unit tests for password hashing, JWT handling, and settings validation."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
import pytest
from pydantic import ValidationError

from app.core.config import Settings, settings
from app.core.security import (
    ExpiredAccessTokenError,
    TokenValidationError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip_uses_argon2() -> None:
    hashed = hash_password("StrongPass123")

    assert hashed.startswith("$argon2")
    assert hashed != "StrongPass123"
    assert verify_password("StrongPass123", hashed) is True
    assert verify_password("WrongPass123", hashed) is False


def test_verify_password_rejects_malformed_hash() -> None:
    assert verify_password("StrongPass123", "not-a-hash") is False


def test_access_token_roundtrip() -> None:
    token = create_access_token(42)

    assert decode_access_token(token) == 42


def test_expired_access_token_raises_specific_error() -> None:
    token = create_access_token(42, expires_delta=timedelta(seconds=-1))

    with pytest.raises(ExpiredAccessTokenError):
        decode_access_token(token)


def test_token_signed_with_another_key_is_rejected() -> None:
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub": "42",
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=5),
        },
        "another-secret-with-at-least-32-characters-long",
        algorithm="HS256",
    )

    with pytest.raises(TokenValidationError):
        decode_access_token(token)


def test_production_rejects_placeholder_jwt_secret() -> None:
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            environment="production",
            database_url="postgresql+psycopg://user:pass@localhost:5432/blog",
            jwt_secret_key="replace_with_a_random_secret_at_least_32_chars",
        )


def test_non_test_environment_rejects_sqlite() -> None:
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            environment="development",
            database_url="sqlite:///local.db",
            jwt_secret_key="x" * 40,
        )


def test_short_jwt_secret_is_rejected() -> None:
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            environment="development",
            database_url="postgresql+psycopg://user:pass@localhost:5432/blog",
            jwt_secret_key="too-short",
        )


def test_plain_postgresql_url_is_normalized_to_psycopg() -> None:
    configured = Settings(
        _env_file=None,
        environment="development",
        database_url="postgresql://user:pass@localhost:5432/blog",
        jwt_secret_key="x" * 40,
    )

    assert configured.database_url == (
        "postgresql+psycopg://user:pass@localhost:5432/blog"
    )
    assert settings.environment == "test"
