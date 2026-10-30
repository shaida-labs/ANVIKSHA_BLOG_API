"""Persistent saved stories for the personal library."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.post import Post
    from app.models.user import User


class Bookmark(TimestampMixin, Base):
    __tablename__ = "bookmarks"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "post_id",
            name="uq_bookmarks_user_id_post_id",
        ),
        Index("ix_bookmarks_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # A lightweight, user-defined shelf label. Null means "Unsorted".
    collection: Mapped[str | None] = mapped_column(
        String(80), nullable=True, default=None
    )

    post: Mapped["Post"] = relationship(back_populates="bookmarks")
    user: Mapped["User"] = relationship(back_populates="bookmarks")
