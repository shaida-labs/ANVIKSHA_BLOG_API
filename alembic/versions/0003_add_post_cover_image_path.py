"""Add a relative cover image storage key to posts.

Revision ID: 0003_post_cover_image_path
Revises: 0002_post_cover_image
Create Date: 2026-10-27

New uploads store a relative key such as
``covers/2026/10/<uuid>.jpg``. The previous nullable ``cover_image_url``
column is intentionally retained so older posts remain readable. Any legacy
local ``/uploads/...`` URL is copied into the new column during the upgrade.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_post_cover_image_path"
down_revision: str | None = "0002_post_cover_image"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "posts",
        sa.Column("cover_image_path", sa.String(length=512), nullable=True),
    )
    # Preserve any local uploaded image references created by an intermediate
    # version. Remote legacy URLs stay in cover_image_url and are not fetched.
    op.execute(
        """
        UPDATE posts
        SET cover_image_path = substr(cover_image_url, 10)
        WHERE cover_image_url LIKE '/uploads/%'
        """
    )


def downgrade() -> None:
    op.drop_column("posts", "cover_image_path")
