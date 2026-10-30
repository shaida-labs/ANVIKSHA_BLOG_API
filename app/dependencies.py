"""Reusable FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import (
    ExpiredAccessTokenError,
    TokenValidationError,
    decode_access_token,
)
from app.db.session import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(
    bearerFormat="JWT",
    scheme_name="BearerAuth",
    description="Paste the JWT access token returned by POST /login.",
    auto_error=False,
)

DbSession = Annotated[Session, Depends(get_db)]


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _resolve_bearer_user(
    credentials: HTTPAuthorizationCredentials | None,
    db: Session,
) -> User | None:
    if credentials is None:
        return None
    if credentials.scheme.lower() != "bearer":
        raise _unauthorized("Authentication credentials were not provided.")

    try:
        user_id = decode_access_token(credentials.credentials)
    except ExpiredAccessTokenError as exc:
        raise _unauthorized("Token has expired.") from exc
    except TokenValidationError as exc:
        raise _unauthorized(str(exc)) from exc

    user = db.get(User, user_id)
    if user is None:
        raise _unauthorized("User associated with this token no longer exists.")

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    return user


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: DbSession,
) -> User:
    user = _resolve_bearer_user(credentials, db)
    if user is None:
        raise _unauthorized("Authentication credentials were not provided.")
    return user


def get_optional_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: DbSession,
) -> User | None:
    """Resolve a viewer for public endpoints without requiring a token."""
    return _resolve_bearer_user(credentials, db)


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalCurrentUser = Annotated[User | None, Depends(get_optional_current_user)]
