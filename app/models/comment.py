"""Comment ORM model."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.post import Post
    from app.models.user import User


class Comment(TimestampMixin, Base):
    __tablename__ = "comments"
    __table_args__ = (
        CheckConstraint("length(trim(content)) > 0", name="ck_comments_content_not_blank"),
        CheckConstraint("length(content) <= 2000", name="ck_comments_content_max_length"),
        Index("ix_comments_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str] = mapped_column(String(2000), nullable=False)
    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    post: Mapped["Post"] = relationship(back_populates="comments")
    author: Mapped["User"] = relationship(back_populates="comments")
