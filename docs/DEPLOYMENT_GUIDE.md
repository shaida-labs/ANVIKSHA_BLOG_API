# ANVIKSHA - Deployment Guide

## Scope

This guide documents a practical deployment path for the verified codebase. It
does **not** claim that a production deployment has been performed. No Docker
image, Compose stack, cloud resource, domain, TLS certificate, or GitHub remote
was created or verified for this submission.

The verified local topology is:

```text
Browser -> Vite dev server (5173) -> FastAPI/Uvicorn (8001) -> PostgreSQL 18
                                      |
                                      +-> local uploads directory
```

For production, use HTTPS and a process supervisor or managed platform.

## Runtime requirements

| Component | Requirement |
|---|---|
| Python | 3.12+ (verified 3.14.7) |
| Node.js | 20.19+, 22.12+, or newer (verified 24.20.0) |
| PostgreSQL | 14+ (verified 18.6) |
| Reverse proxy | HTTPS-capable proxy or managed platform |
| Storage | Persistent volume for `UPLOAD_DIR` |
| Database | Managed PostgreSQL or a backed-up self-hosted instance |

## Environment variables

Set these in the deployment platform's secret manager, not in a committed file.

```dotenv
APP_NAME=ANVIKSHA API
ENVIRONMENT=production
DEBUG=false
CORS_ORIGINS=https://your-frontend.example
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@DB_HOST:5432/DB_NAME
DATABASE_ECHO=false
JWT_SECRET_KEY=<random 32+ character secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
UPLOAD_DIR=/var/lib/anviksha/uploads
UPLOAD_MAX_SIZE_MB=5
UPLOAD_MAX_IMAGE_PIXELS=40000000
```

Production validation rejects:

- SQLite URLs.
- Non-PostgreSQL URLs.
- JWT secrets beginning with placeholder values such as `replace_with`,
  `change_me`, `example`, or `development`.
- Secrets shorter than 32 characters.

`UPLOAD_DIR` must be writable by the API process and must be backed up or placed
on shared/object storage if more than one API instance runs. The current code
writes to local disk.

## 1. Prepare the database

Use a dedicated production role and database. Do not use the test database.

```sql
CREATE ROLE anviksha_app WITH LOGIN PASSWORD '<strong-random-password>';
CREATE DATABASE anviksha OWNER anviksha_app;
```

Run migrations from the release artifact, not from an interactive development
shell:

```bash
python -m alembic upgrade head
python -m alembic current
```

Expected revision: `0005_user_avatar (head)`.

Never run `alembic downgrade base`, `DROP DATABASE`, or a schema reset against a
database containing user data. Back up before any migration.

## 2. Build and start the backend

```bash
python -m venv .venv
source .venv/bin/activate          # Linux/macOS
# .\.venv\Scripts\Activate.ps1    # Windows PowerShell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip check
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
```

On Windows, use the equivalent executable:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

For production, run Uvicorn behind a process supervisor or a platform that
handles restarts and graceful shutdown. Do not use `--reload` in production.

### Health check

```bash
curl -fsS https://api.example.com/health
```

Expected healthy response:

```json
{
  "status": "healthy",
  "database": "reachable",
  "service": "anviksha-api",
  "project_id": "ANVIKSHA"
}
```

If the database is unreachable, the endpoint returns **503**. A 200 response
means the API process and a real `SELECT 1` both succeeded.

## 3. Build the frontend

```bash
cd frontend
npm ci
npm run typecheck
npm test
npm run build
```

Set the API URL at build time:

```dotenv
VITE_API_BASE_URL=https://api.example.com
VITE_MAX_UPLOAD_MB=5
```

Then serve `frontend/dist/` as static files. The app uses client-side routing,
so the static host or reverse proxy must fall back to `index.html` for unknown
non-API paths. Configure the backend CORS allowlist to the exact frontend
origin:

```dotenv
CORS_ORIGINS=https://www.example.com
```

Do not use `*` with authenticated production traffic.

## 4. Reverse proxy and TLS

Terminate TLS at a reverse proxy or managed platform. The repository does not
include TLS certificates or a proxy configuration. A production proxy should:

- Redirect HTTP to HTTPS.
- Forward `Authorization` and `Content-Type` headers.
- Enforce a request-body limit at least as large as the upload limit.
- Set `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and a strict
  Content-Security-Policy at the edge if the application does not.
- Route `/api/*` (or the chosen API prefix) to Uvicorn and all other paths to the
  static frontend.
- Preserve the `/uploads/` path to the API if uploads are served by the backend.

The current application sets `X-Content-Type-Options`, `X-Frame-Options`, and
`Referrer-Policy`; it does not set HSTS or CSP. Add those at the edge before
exposing the service publicly.

## 5. Upload storage

The default `UPLOAD_DIR` is `./uploads` relative to the project root. In
production:

- Use an absolute path on a persistent volume.
- Restrict filesystem permissions to the API user.
- Back up the directory with the database.
- Do not place it inside a directory that is publicly served by the reverse
  proxy; image access should go through `GET /uploads/{path}` or an equivalent
  controlled route.
- For multiple API instances, replace local storage with shared object storage
  or a shared volume. The current code does not implement S3 or a CDN.

## 6. Migrations during release

Recommended release order:

1. Back up the database.
2. Deploy the new application artifact.
3. Run `python -m alembic upgrade head`.
4. Start/restart the API.
5. Verify `/health`.
6. Smoke-test login, post creation, comment creation, upload, and public reads.
7. Keep the previous artifact available for rollback.

Migrations are additive; do not reset the database to roll back an application
release. If a migration itself must be rolled back, use the reviewed Alembic
downgrade for that revision and restore from backup if necessary.

## 7. Post-deployment smoke test

```bash
curl -fsS https://api.example.com/
curl -fsS https://api.example.com/health
curl -fsS https://api.example.com/openapi.json > /dev/null
```

Then use a disposable account to:

- Register and log in.
- Create a post with a cover image.
- Comment, like, and bookmark it.
- Verify the post in the public feed and the private library.
- Edit and delete the disposable post.
- Confirm another account cannot edit or delete it.

Do not use real user data for smoke tests.

## 8. Monitoring and operations

Minimum production checks:

- HTTP 5xx rate and latency.
- `/health` status and database connectivity.
- Database connection pool saturation.
- Disk usage for `UPLOAD_DIR`.
- Authentication failure rate.
- Backup success and restore drills.
- Dependency advisory scans.

The repository does not include structured audit logging, rate limiting, or
alerting. Add them at the application or platform layer.

## 9. Security follow-ups before public launch

| Item | Required action |
|---|---|
| TLS | Terminate HTTPS at the proxy/platform |
| Rate limiting | Add login and write-endpoint throttling |
| Token revocation | Add refresh-token rotation or a denylist if sessions must be revocable |
| CSP/HSTS | Add strict security headers at the edge |
| Email verification/password reset | Implement if the product requires them |
| Upload malware scanning | Add a scanner before public uploads |
| Object storage | Use shared storage for multi-instance deployments |
| Backups | Automate and test database and upload restoration |
| Dependency scanning | Run current `pip-audit`/OSV and npm advisory checks in CI |

## 10. What was actually verified

| Item | Status |
|---|---|
| Local Uvicorn API | **PASS** |
| Local PostgreSQL migrations | **PASS** on disposable PostgreSQL 18 cluster and configured `5432` database |
| Configured local `5432` app database | **PASS**; `/health` 200; live E2E `49/49` |
| Local frontend production build | **PASS** |
| Local browser E2E | **PASS** with running backend and frontend |
| Docker image/Compose | **NOT IMPLEMENTED / NOT VERIFIED** |
| Cloud deployment | **NOT PERFORMED** |
| TLS/domain | **NOT PERFORMED** |
| GitHub remote/push | **BLOCKED** pending authorization and remote URL |

Do not describe the application as production-deployed until the unverified
items above are completed and evidenced.
