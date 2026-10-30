"""Password hashing and JWT helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

password_hash = PasswordHash.recommended()

TOKEN_TYPE = "access"


class TokenValidationError(Exception):
    """Raised when an access token is invalid."""


class ExpiredAccessTokenError(TokenValidationError):
    """Raised when an access token has expired."""


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password without leaking which part of the check failed."""
    try:
        return password_hash.verify(plain_password, hashed_password)
    except Exception:
        # Unknown or malformed hashes must be treated as failed authentication.
        return False


def create_access_token(
    subject: int | str,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token for a user id."""
    now = datetime.now(timezone.utc)
    expires_at = now + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": TOKEN_TYPE,
        "iat": now,
        "exp": expires_at,
    }
    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> int:
    """Decode and validate a token, returning the user id from its subject."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["exp", "iat", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise ExpiredAccessTokenError("Token has expired.") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenValidationError("Invalid authentication token.") from exc

    if payload.get("type") != TOKEN_TYPE:
        raise TokenValidationError("Invalid token type.")

    subject = payload.get("sub")
    if not isinstance(subject, str):
        raise TokenValidationError("Invalid token subject.")

    try:
        user_id = int(subject)
    except (TypeError, ValueError) as exc:
        raise TokenValidationError("Invalid token subject.") from exc

    if user_id <= 0:
        raise TokenValidationError("Invalid token subject.")

    return user_id
