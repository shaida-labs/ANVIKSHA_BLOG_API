"""Add topics, excerpts, author profiles, likes, and bookmarks.

Revision ID: 0004_engagement_profiles
Revises: 0003_post_cover_image_path
Create Date: 2026-10-29

All new post/user columns are nullable so existing rows remain valid. Likes and
bookmarks are additive tables with uniqueness constraints and cascading deletes.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_engagement_profiles"
down_revision: str | None = "0003_post_cover_image_path"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("display_name", sa.String(length=80), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("bio", sa.String(length=500), nullable=True),
    )

    op.add_column(
        "posts",
        sa.Column("excerpt", sa.String(length=300), nullable=True),
    )
    op.add_column(
        "posts",
        sa.Column("topic", sa.String(length=60), nullable=True),
    )
    op.create_index("ix_posts_topic", "posts", ["topic"], unique=False)

    op.create_table(
        "post_likes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["post_id"],
            ["posts.id"],
            name="fk_post_likes_post_id_posts",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_post_likes_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_post_likes"),
        sa.UniqueConstraint(
            "post_id",
            "user_id",
            name="uq_post_likes_post_id_user_id",
        ),
    )
    op.create_index(
        "ix_post_likes_post_id",
        "post_likes",
        ["post_id"],
        unique=False,
    )
    op.create_index(
        "ix_post_likes_user_id",
        "post_likes",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_post_likes_created_at",
        "post_likes",
        ["created_at"],
        unique=False,
    )

    op.create_table(
        "bookmarks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("collection", sa.String(length=80), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_bookmarks_user_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["post_id"],
            ["posts.id"],
            name="fk_bookmarks_post_id_posts",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_bookmarks"),
        sa.UniqueConstraint(
            "user_id",
            "post_id",
            name="uq_bookmarks_user_id_post_id",
        ),
    )
    op.create_index(
        "ix_bookmarks_user_id",
        "bookmarks",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_bookmarks_post_id",
        "bookmarks",
        ["post_id"],
        unique=False,
    )
    op.create_index(
        "ix_bookmarks_created_at",
        "bookmarks",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_bookmarks_created_at", table_name="bookmarks")
    op.drop_index("ix_bookmarks_post_id", table_name="bookmarks")
    op.drop_index("ix_bookmarks_user_id", table_name="bookmarks")
    op.drop_table("bookmarks")

    op.drop_index("ix_post_likes_created_at", table_name="post_likes")
    op.drop_index("ix_post_likes_user_id", table_name="post_likes")
    op.drop_index("ix_post_likes_post_id", table_name="post_likes")
    op.drop_table("post_likes")

    op.drop_index("ix_posts_topic", table_name="posts")
    op.drop_column("posts", "topic")
    op.drop_column("posts", "excerpt")
    op.drop_column("users", "bio")
    op.drop_column("users", "display_name")
