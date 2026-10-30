"""Comment business logic."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.time import utc_now
from app.models.comment import Comment
from app.models.post import Post
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentUpdate


def _post_exists(db: Session, post_id: int) -> bool:
    return db.scalar(select(Post.id).where(Post.id == post_id)) is not None


def _with_author():
    return select(Comment).options(joinedload(Comment.author))


def get_comment_or_404(db: Session, comment_id: int) -> Comment:
    comment = db.scalar(_with_author().where(Comment.id == comment_id))
    if comment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found.",
        )
    return comment


def list_comments(
    db: Session,
    *,
    post_id: int,
    limit: int,
    offset: int,
) -> tuple[list[Comment], int]:
    if not _post_exists(db, post_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found.",
        )

    total = (
        db.scalar(
            select(func.count()).select_from(Comment).where(Comment.post_id == post_id)
        )
        or 0
    )
    statement = (
        _with_author()
        .where(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc(), Comment.id.asc())
        .limit(limit)
        .offset(offset)
    )
    comments = list(db.scalars(statement).all())
    return comments, total


def create_comment(db: Session, payload: CommentCreate, author: User) -> Comment:
    if not _post_exists(db, payload.post_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found.",
        )

    comment = Comment(
        content=payload.content,
        post_id=payload.post_id,
        author=author,
    )
    db.add(comment)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found.",
        ) from exc

    return comment


def update_comment(
    db: Session, comment_id: int, payload: CommentUpdate, user: User
) -> Comment:
    comment = get_comment_or_404(db, comment_id)
    if comment.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this comment.",
        )

    comment.content = payload.content
    comment.updated_at = utc_now()
    db.commit()
    return comment


def delete_comment(db: Session, comment_id: int, user: User) -> None:
    comment = get_comment_or_404(db, comment_id)
    if comment.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this comment.",
        )

    db.delete(comment)
    db.commit()
