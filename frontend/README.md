# ANVIKSHA Frontend

The React client for **ANVIKSHA**, an editorial knowledge platform for curious
minds. It is built against the real FastAPI API and renders stories, topics,
community activity, author profiles, the private library, and the signed-in
author's personal page from live data. There is no mock content, local fallback
database, or fabricated engagement data.

**Question Deeper. Understand Better.**

## Stack

- React 19 and TypeScript 6
- Vite 8
- Tailwind CSS 4
- React Router 7
- Axios
- Lucide React icons
- React Markdown, remark-gfm, rehype-sanitize, rehype-slug, and highlight.js
- Vitest and Testing Library

## Requirements

- Node.js 20.19+, 22.12+, or newer.
- The ANVIKSHA FastAPI backend running and reachable.
- A backend database initialized with `python -m alembic upgrade head`.
- A backend upload directory configured with `UPLOAD_DIR`.

## Install and run

From this folder:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

The development server runs at <http://127.0.0.1:5173/>. The backend normally
runs at <http://127.0.0.1:8000/> with API documentation at
<http://127.0.0.1:8000/docs>.

## Configure the frontend

`frontend/.env.local` is gitignored. The checked-in template contains:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_MAX_UPLOAD_MB=5
```

- `VITE_API_BASE_URL` is the FastAPI base URL.
- `VITE_MAX_UPLOAD_MB` is the client-side cover and profile-picture limit. Keep
  it in sync with the backend `UPLOAD_MAX_SIZE_MB`; the backend validates the
  actual bytes and remains authoritative.

The backend CORS template allows these frontend origins:

```text
http://localhost:5173
http://127.0.0.1:5173
http://localhost:4173
http://127.0.0.1:4173
```

If you use another origin, add it to `CORS_ORIGINS` in the backend `.env`.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Typecheck the app and create the production build in `dist/`. |
| `npm run preview` | Serve the production build at `http://127.0.0.1:4173/`. |
| `npm run lint` | Lint the source with Oxlint. |
| `npm test` | Run the frontend tests once. |
| `npm run test:watch` | Run the frontend tests in watch mode. |
| `npm run typecheck` | Project-wide TypeScript check. |

## Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Stories homepage with the cover story, topic index, community highlights, search, sorting, and pagination. |
| `/community` | Public | Recent responses, contributors, topic rankings, latest stories, and the local reading trail. |
| `/posts/:id` | Public | Full story with safe Markdown, table of contents, reading progress, engagement, related stories, and comments. |
| `/authors/:username` | Public | Public author profile with avatar, biography, real counts, and author-filtered stories. |
| `/library` | Protected | Private library with collections, filters, search, sorting, and pagination. |
| `/vault` | Redirect | Legacy redirect to `/library`. |
| `/login` | Public | Sign-in page with password visibility and a safe local redirect. |
| `/register` | Public | Account creation with the same auth-only layout. |
| `/my-posts` | Protected | **My page**: the signed-in author's profile, story count, search, refresh, edit, delete, and pagination. |
| `/write` | Protected | Create a Markdown story with an excerpt, topic, and cover image. |
| `/write/:id/edit` | Protected | Edit an owned story. |
| `/account` | Protected | Account details plus public display name, biography, and profile-picture editing. |

Legacy `/dashboard`, `/dashboard/posts`, and related dashboard URLs redirect to
the corresponding current routes. Protected routes wait for authentication to
resolve, then redirect an anonymous user to `/login?next=<requested-path>`. Only
local paths are accepted as redirect targets.

The full API contract, database setup, migrations, and backend test instructions
are in the root [`README.md`](../README.md).

## Authentication and session storage

The JWT is stored in `sessionStorage` under `anviksha.access_token`. The backend
uses bearer-token authentication rather than an HttpOnly cookie flow. This gives
tab-scoped persistence with no backend change. Closing the tab removes the
session.

The storage utility migrates a token from the pre-ANVIKSHA key once, then clears
the legacy key. A cross-site scripting attack could read the token; prefer an
HttpOnly cookie and CSRF protection for a hardened production deployment.

## Design system

- Ivory paper `#F2EEE5`, ink `#171714`, and bronze `#A47A43`.
- Editorial typography with Cormorant Garamond for display and Manrope for
  interface text, restrained rules, and generous whitespace.
- No gradients, glassmorphism, oversized dashboard cards, or generic admin
  styling.
- The official ANVIKSHA lotus-book identity lives in `public/brand/` as
  horizontal, full, symbol, and app-icon assets.
- The homepage is composed as a magazine issue: cover story, issue contents,
  topic index, marginalia from a real comment, most-engaged rail, open question,
  contributors, and archive note.
- Folio numbering, ornamental four-point stars, a colophon footer, and
  single-column authentication pages carry the editorial language through the
  app.
- The authenticated experience uses consistent top navigation rather than a
  permanent sidebar.
- Keyboard-visible focus states, skip-to-content link, semantic landmarks,
  dialogs, and table headers.
- Responsive layouts with a mobile navigation menu and an editorial mobile
  reading layout.

## Testing

The suite covers validation, image-signature checks, API error formatting, cover
rendering and fallback, the cover upload field, post cards, avatar fallback,
password visibility, token storage, and safe Markdown rendering (sanitization,
heading IDs, duplicate headings, external links, and highlighted code).

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

For full project verification, run the backend tests too. See the root
[`README.md`](../README.md).
