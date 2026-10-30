"""Blog post ORM model."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.bookmark import Bookmark
    from app.models.comment import Comment
    from app.models.post_like import PostLike
    from app.models.user import User


class Post(TimestampMixin, Base):
    __tablename__ = "posts"
    __table_args__ = (
        CheckConstraint("length(trim(title)) > 0", name="ck_posts_title_not_blank"),
        CheckConstraint("length(trim(content)) > 0", name="ck_posts_content_not_blank"),
        Index("ix_posts_created_at", "created_at"),
        Index("ix_posts_topic", "topic"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    excerpt: Mapped[str | None] = mapped_column(
        String(300), nullable=True, default=None
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    topic: Mapped[str | None] = mapped_column(String(60), nullable=True, default=None)
    # New uploads store a relative storage key here. ``cover_image_url`` is
    # retained only for posts created before the upload workflow existed.
    cover_image_path: Mapped[str | None] = mapped_column(
        String(512), nullable=True, default=None
    )
    cover_image_url: Mapped[str | None] = mapped_column(
        String(2048), nullable=True, default=None
    )
    author_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    author: Mapped["User"] = relationship(back_populates="posts")
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    likes: Mapped[list["PostLike"]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    bookmarks: Mapped[list["Bookmark"]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
