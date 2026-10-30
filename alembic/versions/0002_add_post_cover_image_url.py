"""Add nullable cover image URL to posts.

Revision ID: 0002_post_cover_image
Revises: 0001_initial
Create Date: 2026-10-27

The column is nullable and has no server default, so existing posts remain
valid and are treated as having no cover image.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_post_cover_image"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "posts",
        sa.Column("cover_image_url", sa.String(length=2048), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("posts", "cover_image_url")
