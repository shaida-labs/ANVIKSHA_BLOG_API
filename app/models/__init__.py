"""Import all models so SQLAlchemy and Alembic see complete metadata."""

from app.models.bookmark import Bookmark
from app.models.comment import Comment
from app.models.post import Post
from app.models.post_like import PostLike
from app.models.user import User

__all__ = ["Bookmark", "Comment", "Post", "PostLike", "User"]
