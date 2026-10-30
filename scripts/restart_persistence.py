"""Create or verify a PostgreSQL-backed post across an API restart."""

from __future__ import annotations

import base64
import json
import os
import sys
import time
from pathlib import Path

import httpx

BASE_URL = os.environ["E2E_BASE_URL"].rstrip("/")
STATE_PATH = Path(os.environ["E2E_STATE"])
PASSWORD = "RestartPass123!"
PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


def main() -> int:
    mode = sys.argv[1]
    client = httpx.Client(base_url=BASE_URL, timeout=20.0)
    try:
        if mode == "create":
            suffix = str(int(time.time() * 1000))[-10:]
            username = f"restart_{suffix}"
            email = f"{username}@example.com"
            reg = client.post(
                "/register",
                json={"username": username, "email": email, "password": PASSWORD},
            )
            assert reg.status_code == 201, reg.text
            login = client.post("/login", json={"email": email, "password": PASSWORD})
            assert login.status_code == 200, login.text
            headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
            upload = client.post(
                "/uploads/images",
                headers=headers,
                files={"file": ("restart.png", PNG_1X1, "image/png")},
            )
            assert upload.status_code == 201, upload.text
            cover = upload.json()["path"]
            post = client.post(
                "/posts",
                headers=headers,
                json={
                    "title": "Restart persistence story",
                    "content": "This post must survive an API restart.",
                    "cover_image_path": cover,
                },
            )
            assert post.status_code == 201, post.text
            state = {
                "email": email,
                "password": PASSWORD,
                "post_id": post.json()["id"],
                "title": post.json()["title"],
                "cover": cover,
                "cover_url": upload.json()["url"],
            }
            STATE_PATH.write_text(json.dumps(state), encoding="utf-8")
            print("restart_create=PASS")
            return 0

        if mode == "verify":
            state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
            login = client.post(
                "/login",
                json={"email": state["email"], "password": state["password"]},
            )
            assert login.status_code == 200, login.text
            headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
            post = client.get(f"/posts/{state['post_id']}", headers=headers)
            assert post.status_code == 200, post.text
            body = post.json()
            assert body["title"] == state["title"], body
            assert body["cover_image_path"] == state["cover"], body
            cover = client.get(state["cover_url"])
            assert cover.status_code == 200, cover.text
            assert cover.headers["content-type"].startswith("image/"), cover.headers
            print("restart_verify=PASS")
            return 0

        raise SystemExit(f"unknown mode: {mode}")
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
