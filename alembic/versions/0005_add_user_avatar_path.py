"""Add a nullable profile picture path to users.

Revision ID: 0005_user_avatar
Revises: 0004_engagement_profiles
Create Date: 2026-10-29

The column is nullable so existing accounts remain valid and keep their
initials-based avatar until they choose to upload a picture.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_user_avatar"
down_revision: str | None = "0004_engagement_profiles"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("avatar_path", sa.String(length=512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "avatar_path")
