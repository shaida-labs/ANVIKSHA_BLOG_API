"""Persistent one-per-user likes on posts."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.post import Post
    from app.models.user import User


class PostLike(TimestampMixin, Base):
    __tablename__ = "post_likes"
    __table_args__ = (
        UniqueConstraint(
            "post_id",
            "user_id",
            name="uq_post_likes_post_id_user_id",
        ),
        Index("ix_post_likes_user_id", "user_id"),
        Index("ix_post_likes_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    post: Mapped["Post"] = relationship(back_populates="likes")
    user: Mapped["User"] = relationship(back_populates="likes")
