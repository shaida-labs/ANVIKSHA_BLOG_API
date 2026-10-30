"""PostgreSQL end-to-end verification for the ANVIKSHA API.

Writes sanitized evidence only. Tokens, passwords, hashes, and database URLs
are never written to the results file or printed.
"""

from __future__ import annotations

import base64
import json
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
import jwt
from sqlalchemy import create_engine, text

BASE_URL = os.environ["E2E_BASE_URL"].rstrip("/")
DATABASE_URL = os.environ["E2E_DATABASE_URL"]
JWT_SECRET = os.environ["E2E_JWT_SECRET"]
UPLOAD_DIR = Path(os.environ["E2E_UPLOAD_DIR"])
RESULTS_PATH = Path(os.environ["E2E_RESULTS"])

PASSWORD = "E2ePass123!"
suffix = str(int(time.time() * 1000))[-10:]
ALICE = f"e2e_alice_{suffix}"
BOB = f"e2e_bob_{suffix}"
ALICE_EMAIL = f"{ALICE}@example.com"
BOB_EMAIL = f"{BOB}@example.com"

PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)

client = httpx.Client(base_url=BASE_URL, timeout=30.0)
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
results: list[dict[str, object]] = []


def record(
    name: str,
    method: str,
    path: str,
    response: httpx.Response,
    expected: int | tuple[int, ...],
    *,
    body: bool = True,
) -> None:
    expected_values = (expected,) if isinstance(expected, int) else expected
    ok = response.status_code in expected_values
    item: dict[str, object] = {
        "kind": "request",
        "name": name,
        "method": method,
        "path": path,
        "expected": list(expected_values),
        "actual": response.status_code,
        "status": "PASS" if ok else "FAIL",
    }
    if body:
        try:
            payload = response.json()
            if isinstance(payload, dict):
                payload = {
                    key: (
                        "<redacted>"
                        if key.lower()
                        in {"access_token", "password", "hashed_password", "token"}
                        else value
                    )
                    for key, value in payload.items()
                }
            item["body"] = payload
        except Exception:
            item["body"] = response.text[:300]
    results.append(item)
    if not ok:
        print(f"FAIL {name}: expected {expected_values}, got {response.status_code}")


def assertion(name: str, ok: bool, evidence: object) -> None:
    results.append(
        {
            "kind": "assertion",
            "name": name,
            "status": "PASS" if ok else "FAIL",
            "evidence": evidence,
        }
    )
    if not ok:
        print(f"FAIL assertion: {name}")


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def db_rows(sql: str, **params: object) -> list[object]:
    with engine.connect() as conn:
        return list(conn.execute(text(sql), params))


def main() -> int:
    health = client.get("/health")
    record("health", "GET", "/health", health, 200)
    assertion(
        "health reports reachable PostgreSQL",
        health.status_code == 200
        and health.json().get("database") == "reachable",
        health.json() if health.status_code == 200 else health.text[:200],
    )

    openapi = client.get("/openapi.json")
    record("openapi", "GET", "/openapi.json", openapi, 200)

    reg_a = client.post(
        "/register",
        json={"username": ALICE, "email": ALICE_EMAIL, "password": PASSWORD},
    )
    record("register A", "POST", "/register", reg_a, 201)
    alice_id = reg_a.json()["id"]

    reg_b = client.post(
        "/register",
        json={"username": BOB, "email": BOB_EMAIL, "password": PASSWORD},
    )
    record("register B", "POST", "/register", reg_b, 201)
    bob_id = reg_b.json()["id"]

    duplicate = client.post(
        "/register",
        json={"username": ALICE, "email": ALICE_EMAIL, "password": PASSWORD},
    )
    record("duplicate registration", "POST", "/register", duplicate, 409)

    login_a = client.post(
        "/login", json={"email": ALICE_EMAIL, "password": PASSWORD}
    )
    record("login A", "POST", "/login", login_a, 200)
    token_a = login_a.json()["access_token"]
    claims = jwt.decode(token_a, JWT_SECRET, algorithms=["HS256"])
    assertion(
        "JWT claims",
        claims.get("sub") == str(alice_id)
        and claims.get("type") == "access"
        and "iat" in claims
        and "exp" in claims,
        {key: claims.get(key) for key in ("sub", "type", "iat", "exp")},
    )

    login_b = client.post(
        "/login", json={"email": BOB_EMAIL, "password": PASSWORD}
    )
    record("login B", "POST", "/login", login_b, 200)
    token_b = login_b.json()["access_token"]

    bad_login = client.post(
        "/login", json={"email": ALICE_EMAIL, "password": "WrongPass123!"}
    )
    record("invalid login", "POST", "/login", bad_login, 401)

    missing = client.post("/posts", json={"title": "No token", "content": "No"})
    record("missing token create post", "POST", "/posts", missing, 401)

    expired = jwt.encode(
        {
            "sub": str(alice_id),
            "type": "access",
            "iat": datetime.now(timezone.utc) - timedelta(hours=2),
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
        },
        JWT_SECRET,
        algorithm="HS256",
    )
    expired_resp = client.get("/users/me", headers=auth(expired))
    record("expired token", "GET", "/users/me", expired_resp, 401)

    forged = jwt.encode(
        {
            "sub": str(alice_id),
            "type": "access",
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
        },
        "wrong-key-that-is-not-the-app-secret",
        algorithm="HS256",
    )
    forged_resp = client.get("/users/me", headers=auth(forged))
    record("forged token", "GET", "/users/me", forged_resp, 401)

    upload = client.post(
        "/uploads/images",
        headers=auth(token_a),
        files={"file": ("cover.png", PNG_1X1, "image/png")},
    )
    record("upload cover", "POST", "/uploads/images", upload, 201)
    cover_path = upload.json()["path"]
    assertion(
        "upload file persisted",
        (UPLOAD_DIR / cover_path).is_file(),
        {"path": cover_path},
    )
    cover_url = client.get(upload.json()["url"])
    record("serve cover", "GET", upload.json()["url"], cover_url, 200)

    invalid_upload = client.post(
        "/uploads/images",
        headers=auth(token_a),
        files={"file": ("bad.txt", b"not an image", "text/plain")},
    )
    record("invalid upload rejected", "POST", "/uploads/images", invalid_upload, 415)

    traversal = client.get("/uploads/%2e%2e%2f.env")
    record("upload traversal rejected", "GET", "/uploads/%2e%2e%2f.env", traversal, 404)

    create_post = client.post(
        "/posts",
        headers=auth(token_a),
        json={
            "title": "PostgreSQL E2E story",
            "content": "A real PostgreSQL-backed story.",
            "cover_image_path": cover_path,
        },
    )
    record("create post A", "POST", "/posts", create_post, 201)
    post = create_post.json()
    post_id = post["id"]
    assertion("post author from token", post["author_id"] == alice_id, post["author_id"])
    assertion("post cover path", post["cover_image_path"] == cover_path, post["cover_image_path"])

    list_posts = client.get("/posts")
    record("list posts", "GET", "/posts", list_posts, 200)
    assertion(
        "created post appears in list",
        any(item["id"] == post_id for item in list_posts.json()["items"]),
        {"post_id": post_id},
    )

    get_post = client.get(f"/posts/{post_id}")
    record("get post", "GET", f"/posts/{post_id}", get_post, 200)
    assertion(
        "post response excludes author email",
        "email" not in get_post.json()["author"],
        list(get_post.json()["author"]),
    )

    update_post = client.put(
        f"/posts/{post_id}",
        headers=auth(token_a),
        json={"title": "Updated PostgreSQL E2E story", "content": "Updated body."},
    )
    record("update post A", "PUT", f"/posts/{post_id}", update_post, 200)
    assertion(
        "post update persisted",
        update_post.json()["title"] == "Updated PostgreSQL E2E story",
        update_post.json()["title"],
    )

    other_update = client.put(
        f"/posts/{post_id}",
        headers=auth(token_b),
        json={"title": "Hijacked", "content": "Hijacked"},
    )
    record("other user update denied", "PUT", f"/posts/{post_id}", other_update, 403)

    create_comment = client.post(
        "/comments",
        headers=auth(token_a),
        json={"post_id": post_id, "content": "A PostgreSQL comment."},
    )
    record("create comment A", "POST", "/comments", create_comment, 201)
    comment_id = create_comment.json()["id"]

    create_comment_b = client.post(
        "/comments",
        headers=auth(token_b),
        json={"post_id": post_id, "content": "A second user's comment."},
    )
    record("create comment B", "POST", "/comments", create_comment_b, 201)
    comment_b_id = create_comment_b.json()["id"]

    list_comments = client.get(f"/comments?post_id={post_id}")
    record("list comments", "GET", f"/comments?post_id={post_id}", list_comments, 200)
    assertion(
        "comments filtered by post",
        {item["id"] for item in list_comments.json()["items"]} == {comment_id, comment_b_id},
        {"count": len(list_comments.json()["items"])},
    )

    get_comment = client.get(f"/comments/{comment_id}")
    record("get comment", "GET", f"/comments/{comment_id}", get_comment, 200)

    update_comment = client.put(
        f"/comments/{comment_id}",
        headers=auth(token_a),
        json={"content": "Updated PostgreSQL comment."},
    )
    record("update comment A", "PUT", f"/comments/{comment_id}", update_comment, 200)

    other_comment_update = client.put(
        f"/comments/{comment_id}",
        headers=auth(token_b),
        json={"content": "Hijacked comment"},
    )
    record(
        "other user comment update denied",
        "PUT",
        f"/comments/{comment_id}",
        other_comment_update,
        403,
    )

    comment_rows_before_delete = db_rows(
        "SELECT id, post_id, author_id FROM comments WHERE post_id=:id",
        id=post_id,
    )
    assertion(
        "comments persisted before deletion",
        len(comment_rows_before_delete) == 2,
        len(comment_rows_before_delete),
    )

    other_comment_delete = client.delete(
        f"/comments/{comment_b_id}", headers=auth(token_a)
    )
    record(
        "other user comment delete denied",
        "DELETE",
        f"/comments/{comment_b_id}",
        other_comment_delete,
        403,
    )

    delete_comment_b = client.delete(
        f"/comments/{comment_b_id}", headers=auth(token_b)
    )
    record("delete comment B", "DELETE", f"/comments/{comment_b_id}", delete_comment_b, 204)

    delete_comment_a = client.delete(
        f"/comments/{comment_id}", headers=auth(token_a)
    )
    record("delete comment A", "DELETE", f"/comments/{comment_id}", delete_comment_a, 204)

    other_post_delete = client.delete(f"/posts/{post_id}", headers=auth(token_b))
    record("other user post delete denied", "DELETE", f"/posts/{post_id}", other_post_delete, 403)

    # Persistence checks while the post still exists.
    user_rows = db_rows(
        "SELECT id, username, email, hashed_password FROM users WHERE id IN (:a, :b) ORDER BY id",
        a=alice_id,
        b=bob_id,
    )
    assertion("two users persisted", len(user_rows) == 2, len(user_rows))
    assertion(
        "passwords stored as Argon2id hashes",
        all(str(row.hashed_password).startswith("$argon2") for row in user_rows),
        [str(row.hashed_password)[:7] for row in user_rows],
    )
    post_row = db_rows(
        "SELECT id, title, author_id, cover_image_path, created_at, updated_at FROM posts WHERE id=:id",
        id=post_id,
    )
    assertion("post persisted", len(post_row) == 1 and post_row[0].author_id == alice_id, len(post_row))
    if post_row:
        assertion(
            "PostgreSQL timestamps are timezone-aware",
            post_row[0].created_at.tzinfo is not None
            and post_row[0].updated_at.tzinfo is not None,
            {
                "created_tz": str(post_row[0].created_at.tzinfo),
                "updated_tz": str(post_row[0].updated_at.tzinfo),
            },
        )
    comment_rows = db_rows(
        "SELECT id, post_id, author_id FROM comments WHERE post_id=:id",
        id=post_id,
    )
    assertion(
        "comments removed after owner deletes",
        len(comment_rows) == 0,
        len(comment_rows),
    )

    delete_post = client.delete(f"/posts/{post_id}", headers=auth(token_a))
    record("delete post A", "DELETE", f"/posts/{post_id}", delete_post, 204)

    get_deleted = client.get(f"/posts/{post_id}")
    record("deleted post 404", "GET", f"/posts/{post_id}", get_deleted, 404)

    remaining_posts = db_rows("SELECT COUNT(*) AS n FROM posts WHERE id=:id", id=post_id)
    remaining_comments = db_rows(
        "SELECT COUNT(*) AS n FROM comments WHERE post_id=:id", id=post_id
    )
    assertion("post row removed", remaining_posts[0].n == 0, remaining_posts[0].n)
    assertion(
        "comments cascade deleted",
        remaining_comments[0].n == 0,
        remaining_comments[0].n,
    )

    results_path = RESULTS_PATH
    results_path.parent.mkdir(parents=True, exist_ok=True)
    results_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    passed = sum(1 for item in results if item["status"] == "PASS")
    failed = sum(1 for item in results if item["status"] == "FAIL")
    print(f"checks={len(results)} passed={passed} failed={failed}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    finally:
        client.close()
        engine.dispose()
