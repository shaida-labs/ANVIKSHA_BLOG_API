"""Public author profiles and current-user profile updates."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, File, Path, UploadFile, status

from app.dependencies import CurrentUser, DbSession
from app.models.user import User
from app.schemas.user import UserProfileRead, UserProfileUpdate, UserRead
from app.services.profiles import (
    get_profile_or_404,
    remove_avatar,
    replace_avatar,
    update_profile,
)

router = APIRouter(prefix="/users", tags=["Authors"])

_AUTH_RESPONSE = {401: {"description": "Missing or invalid authentication token."}}


@router.patch(
    "/me",
    response_model=UserRead,
    summary="Update the authenticated user's public profile",
    description=(
        "Requires authentication. Only the current user can update their display "
        "name and biography. Email and username are not changed by this endpoint."
    ),
    responses={
        401: {"description": "Missing or invalid authentication token."},
        422: {"description": "Validation error."},
    },
)
def edit_current_profile(
    payload: UserProfileUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> User:
    return update_profile(db, current_user, payload)


@router.post(
    "/me/avatar",
    response_model=UserRead,
    summary="Upload or replace the authenticated user's profile picture",
    description=(
        "Requires authentication. Accepts a multipart/form-data image field. "
        "The backend validates the bytes, dimensions, and size, stores the image "
        "server-side, and replaces any previous profile picture."
    ),
    responses={
        **_AUTH_RESPONSE,
        413: {"description": "The image exceeds the configured size limit."},
        415: {"description": "The file is not a supported JPEG, PNG, or WebP image."},
        422: {"description": "The image is empty or has invalid dimensions."},
        500: {"description": "The image could not be stored."},
    },
)
async def upload_current_avatar(
    file: Annotated[UploadFile, File(description="JPEG, PNG, or WebP image.")],
    db: DbSession,
    current_user: CurrentUser,
) -> User:
    return await replace_avatar(db, current_user, file)


@router.delete(
    "/me/avatar",
    response_model=UserRead,
    status_code=status.HTTP_200_OK,
    summary="Remove the authenticated user's profile picture",
    description=(
        "Requires authentication. Clears the stored profile picture and removes "
        "the unused image file from local storage."
    ),
    responses={**_AUTH_RESPONSE},
)
def delete_current_avatar(db: DbSession, current_user: CurrentUser) -> User:
    return remove_avatar(db, current_user)


@router.get(
    "/{username}",
    response_model=UserProfileRead,
    summary="Get a public author profile",
    description=(
        "Public endpoint. Returns only public author information and genuine "
        "counts derived from stored posts, comments, and likes. Email addresses "
        "are never exposed."
    ),
    responses={404: {"description": "Author not found."}},
)
def read_author_profile(
    username: Annotated[str, Path(min_length=3, max_length=50)],
    db: DbSession,
) -> UserProfileRead:
    return get_profile_or_404(db, username)
