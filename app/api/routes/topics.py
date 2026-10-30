"""Topic discovery endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.dependencies import DbSession
from app.schemas.post import TopicRead
from app.services.posts import list_topics

router = APIRouter(prefix="/topics", tags=["Topics"])


@router.get(
    "",
    response_model=list[TopicRead],
    summary="List real topics with post counts",
    description=(
        "Public endpoint. Returns only topics that currently have published "
        "posts, plus a General entry for posts without a topic. Counts are "
        "derived from stored posts, not fabricated trending metrics."
    ),
)
def read_topics(db: DbSession) -> list[TopicRead]:
    return list_topics(db)
