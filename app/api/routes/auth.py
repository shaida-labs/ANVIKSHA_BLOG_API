"""Registration, login, and current-user endpoints."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.core.config import settings
from app.core.security import create_access_token
from app.dependencies import CurrentUser, DbSession
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserRead
from app.services.auth import authenticate_user, register_user

router = APIRouter(tags=["Authentication"])

_AUTH_ERROR_RESPONSES = {
    401: {"description": "Incorrect credentials or missing/invalid token."},
    403: {"description": "The user account is inactive."},
}


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description=(
        "Create an account. Usernames and emails are normalized to lowercase "
        "and must be unique. Passwords are hashed with Argon2id."
    ),
    responses={
        409: {"description": "Username or email is already registered."},
        422: {"description": "Validation error."},
    },
)
def register(payload: UserCreate, db: DbSession) -> User:
    return register_user(db, payload)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in and obtain a JWT access token",
    description="Authenticate with email and password. Use the returned token as a Bearer token.",
    responses=_AUTH_ERROR_RESPONSES,
)
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    user = authenticate_user(db, str(payload.email), payload.password)
    return TokenResponse(
        access_token=create_access_token(user.id),
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.get(
    "/users/me",
    response_model=UserRead,
    summary="Get the authenticated user",
    responses={
        401: {"description": "Missing, malformed, expired, or invalid token."},
        403: {"description": "The user account is inactive."},
    },
)
def read_current_user(current_user: CurrentUser) -> User:
    return current_user
