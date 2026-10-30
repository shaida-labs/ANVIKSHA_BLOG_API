"""Public author profiles and profile updates."""

from __future__ import annotations

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.models.comment import Comment
from app.models.post import Post
from app.models.post_like import PostLike
from app.models.user import User
from app.schemas.user import UserProfileRead, UserProfileUpdate
from app.services.images import delete_uploaded_file, store_uploaded_image


def get_profile_or_404(db: Session, username: str) -> UserProfileRead:
    user = db.scalar(
        select(User).where(func.lower(User.username) == username.strip().lower())
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Author not found.",
        )

    post_count = int(
        db.scalar(
            select(func.count()).select_from(Post).where(Post.author_id == user.id)
        )
        or 0
    )
    comment_count = int(
        db.scalar(
            select(func.count())
            .select_from(Comment)
            .where(Comment.author_id == user.id)
        )
        or 0
    )
    likes_received = int(
        db.scalar(
            select(func.count())
            .select_from(PostLike)
            .join(Post, PostLike.post_id == Post.id)
            .where(Post.author_id == user.id)
        )
        or 0
    )

    return UserProfileRead(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        bio=user.bio,
        avatar_path=user.avatar_path,
        created_at=user.created_at,
        post_count=post_count,
        comment_count=comment_count,
        likes_received=likes_received,
    )


def update_profile(
    db: Session, user: User, payload: UserProfileUpdate
) -> User:
    user.display_name = payload.display_name
    user.bio = payload.bio
    user.updated_at = utc_now()
    db.commit()
    db.refresh(user)
    return user


async def replace_avatar(db: Session, user: User, upload: UploadFile) -> User:
    """Store a validated avatar and point the user at it.

    The previous file is removed only after the database commit succeeds, so a
    failed upload never leaves the profile pointing at a deleted image.
    """
    stored = await store_uploaded_image(upload, folder="avatars")
    previous_path = user.avatar_path
    user.avatar_path = stored.path
    user.updated_at = utc_now()

    try:
        db.commit()
    except Exception:
        db.rollback()
        delete_uploaded_file(stored.path)
        raise

    db.refresh(user)
    if previous_path and previous_path != stored.path:
        delete_uploaded_file(previous_path)
    return user


def remove_avatar(db: Session, user: User) -> User:
    previous_path = user.avatar_path
    if previous_path is None:
        return user

    user.avatar_path = None
    user.updated_at = utc_now()
    db.commit()
    db.refresh(user)
    delete_uploaded_file(previous_path)
    return user
