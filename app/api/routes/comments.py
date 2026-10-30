"""Comment endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Path, Query, Response, status

from app.dependencies import CurrentUser, DbSession
from app.models.comment import Comment
from app.schemas.comment import CommentCreate, CommentRead, CommentUpdate
from app.schemas.common import Page
from app.services.comments import (
    create_comment,
    delete_comment,
    get_comment_or_404,
    list_comments,
    update_comment,
)

router = APIRouter(prefix="/comments", tags=["Comments"])

_AUTH_RESPONSE = {401: {"description": "Missing or invalid authentication token."}}
_OWNERSHIP_RESPONSE = {
    403: {"description": "The authenticated user does not own this comment."}
}


@router.get(
    "",
    response_model=Page[CommentRead],
    summary="List comments for a post",
    description=(
        "Public endpoint. post_id is required. Returns comments in chronological "
        "order with pagination metadata."
    ),
    responses={
        404: {"description": "Post not found."},
        422: {"description": "Missing or invalid post_id / pagination parameter."},
    },
)
def read_comments(
    db: DbSession,
    post_id: Annotated[int, Query(gt=0, description="ID of an existing post.")],
    limit: Annotated[int, Query(ge=1, le=100, description="Page size.")] = 20,
    offset: Annotated[int, Query(ge=0, description="Number of comments to skip.")] = 0,
) -> Page[CommentRead]:
    comments, total = list_comments(
        db, post_id=post_id, limit=limit, offset=offset
    )
    return Page[CommentRead](
        items=comments,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post(
    "",
    response_model=CommentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a comment",
    description=(
        "Requires authentication. The post must exist and the author is always "
        "the authenticated user."
    ),
    responses={
        **_AUTH_RESPONSE,
        404: {"description": "Post not found."},
        422: {"description": "Validation error, including author_id in the body."},
    },
)
def create_new_comment(
    payload: CommentCreate, db: DbSession, current_user: CurrentUser
) -> Comment:
    return create_comment(db, payload, current_user)


@router.get(
    "/{comment_id}",
    response_model=CommentRead,
    summary="Get a comment",
    description="Public endpoint. Returns 404 when the comment does not exist.",
    responses={404: {"description": "Comment not found."}},
)
def read_comment(
    comment_id: Annotated[int, Path(gt=0)], db: DbSession
) -> Comment:
    return get_comment_or_404(db, comment_id)


@router.put(
    "/{comment_id}",
    response_model=CommentRead,
    summary="Update an owned comment",
    description=(
        "Requires authentication and ownership. post_id and author_id cannot "
        "be changed; created_at is never changed."
    ),
    responses={
        **_AUTH_RESPONSE,
        **_OWNERSHIP_RESPONSE,
        404: {"description": "Comment not found."},
        422: {"description": "Validation error."},
    },
)
def replace_comment(
    comment_id: Annotated[int, Path(gt=0)],
    payload: CommentUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> Comment:
    return update_comment(db, comment_id, payload, current_user)


@router.delete(
    "/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Delete an owned comment",
    description="Requires authentication and ownership.",
    responses={
        **_AUTH_RESPONSE,
        **_OWNERSHIP_RESPONSE,
        404: {"description": "Comment not found."},
        204: {"description": "Comment deleted; no response body."},
    },
)
def remove_comment(
    comment_id: Annotated[int, Path(gt=0)],
    db: DbSession,
    current_user: CurrentUser,
) -> Response:
    delete_comment(db, comment_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
