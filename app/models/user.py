"""User ORM model."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, String, true
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.bookmark import Bookmark
    from app.models.comment import Comment
    from app.models.post import Post
    from app.models.post_like import PostLike


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("length(username) >= 3", name="ck_users_username_min_length"),
        CheckConstraint("length(username) <= 50", name="ck_users_username_max_length"),
        CheckConstraint("length(email) >= 3", name="ck_users_email_min_length"),
        CheckConstraint("length(email) <= 254", name="ck_users_email_max_length"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(254), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(
        String(80), nullable=True, default=None
    )
    bio: Mapped[str | None] = mapped_column(String(500), nullable=True, default=None)
    avatar_path: Mapped[str | None] = mapped_column(
        String(512), nullable=True, default=None
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )

    posts: Mapped[list["Post"]] = relationship(
        back_populates="author",
        passive_deletes=True,
    )
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="author",
        passive_deletes=True,
    )
    likes: Mapped[list["PostLike"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    bookmarks: Mapped[list["Bookmark"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
