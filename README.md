# Random Quotes API

Public HTTP API for **random and filtered quotes** loaded from a CSV. Ships as **Vercel serverless functions** under `/api/*`, with an optional **Express** server for local development and a static **`/`** landing page.

**Response format:** JSON with a `data` array and optional `meta` (totals, pagination). Add **`legacy=true`** for older clients that expect a bare array.

---

## Who this repo is for

- **Contributors** — bugfixes, filters, docs: start with [CONTRIBUTING.md](CONTRIBUTING.md).
- **Fork maintainers** — supply your own dataset (see [Data & deployment](#data--deployment)), adjust **`DEFAULT_QUOTES_CSV_URL`** or **`QUOTES_CSV_URL`** in [Environment variables](#environment-variables).
- **API consumers** — use **`GET /api`** for a route map and the sections below for query parameters.

---

## Quick start (local)

```bash
git clone <repository-url>
cd Random-Quote
npm install
cp .env.example .env   # optional; edit if needed
npm start
```

Open `http://localhost:3000` for the landing page; APIs live under `/api/*`.

If **`quotes.csv`** is missing, empty, or only a **Git LFS pointer**, the app loads **`quotes.sample.csv`** unless **`DISABLE_QUOTES_FALLBACK=true`**. Check **`GET /api/health`** for `quotes_loaded`, `fallback_used`, and `loaded_from`.

---

## Features

- **Serverless routes** — one handler per file under `api/`
- **CORS** — `GET` and `OPTIONS` for browser and third-party clients
- **Filters** — author, exact author, excluded author, category / multi-category (OR or ALL), text search (`q`), min/max quote length
- **Ordering** — `random` (default where applicable), `author`, `text`, or `none` with `offset`
- **Deterministic random** — optional `seed` with `order=random`
- **Discovery & diagnostics** — `/api`, `/api/categories`, `/api/authors`, `/api/health`
- **Build step** — `npm run build` runs `scripts/prep-quotes.js` (download CSV and/or `git lfs pull`)

---

## Project layout

```
.
├── index.html           # Static landing page at /
├── api/
│   ├── discovery.js     # JSON route map; Vercel rewrites /api → /api/discovery
│   ├── quotes.js
│   ├── quotes/random.js
│   ├── categories.js
│   ├── authors.js
│   └── health.js
├── lib/                 # Shared loaders, filters, CORS, response builders
├── scripts/
│   └── prep-quotes.js   # Build: fetch CSV or git lfs pull (see DEFAULT_QUOTES_CSV_URL)
├── server.js            # Express dev server (mirrors API routes)
├── vercel.json          # buildCommand, rewrites, function memory, headers
├── quotes.sample.csv    # Small dataset; also runtime fallback
├── quotes.csv           # Primary dataset (often gitignored or Git LFS — see below)
├── .env.example
└── package.json
```

---

## Data & deployment

### CSV schema

```csv
quote,author,category
"Quote text",Author Name,"category1, category2"
```

- **`category`** — comma-separated; stored and matched in lowercase.
- Rows with an empty **`quote`** are skipped.
- Headers are normalized (aliases like `text`, `body` → `quote`; `tags` → `category`).

### Build (`npm run build`)

On **Vercel**, `vercel.json` runs **`npm run build`** → **`scripts/prep-quotes.js`**:

1. If **`quotes.csv`** already exists and is **not** an LFS pointer → skip download.
2. Otherwise → download from **`QUOTES_CSV_URL`**, or from **`DEFAULT_QUOTES_CSV_URL`** defined at the top of **`scripts/prep-quotes.js`** (upstream sets a release asset URL so CI/deploy does not require env vars; **forks should change this constant or set `QUOTES_CSV_URL`**).
3. If download is skipped (**`SKIP_REMOTE_QUOTES_DOWNLOAD=true`**) or fails → **`git lfs pull`** when `.git` is present.

### Git, LFS, and GitHub size limits

- Tracking **`*.csv`** with **Git LFS** is common for large files. **Clone/checkouts used for deploy often contain only the pointer file**, not the full CSV — the build script or runtime fallback addresses that.
- **GitHub** rejects normal (non-LFS) blobs **roughly over 100 MB** per file. Very large single files usually stay on **LFS**, **releases**, or external storage — not as a plain committed blob.

### Hosting a CSV for `QUOTES_CSV_URL`

The URL must return **raw CSV** on **`GET`** (HTTP 200; first line should be your header, not HTML):

```bash
curl -sSIL "<url>" | head -5
curl -s "<url>" | head -1
```

| Option | Notes |
|--------|--------|
| [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) | Attach `quotes.csv` to a release; use the **`…/releases/download/<tag>/<filename>`** asset URL. |
| [Cloudflare R2](https://developers.cloudflare.com/r2/get-started/) | Public bucket or custom domain; stable HTTPS object URL. |
| [Supabase Storage](https://supabase.com/docs/guides/storage/serving/downloads) | Public bucket + object URL. |
| [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html) | Public file / bucket policy for direct download. |

Avoid generic **Google Drive / Dropbox** share links unless they return a **direct** file body (many return HTML or redirects).

### Runtime memory (large files)

The full CSV is parsed into memory. Very large datasets may need higher **`memory`** (and sometimes **`maxDuration`**) under **`vercel.json`** → **`functions`**, within your Vercel plan limits.

---

## Deploy on Vercel

1. Connect the repo in the [Vercel dashboard](https://vercel.com/new).
2. Ensure **`npm run build`** runs (configured in **`vercel.json`**).
3. Configure **`QUOTES_CSV_URL`** for **Build** if you do not rely on the default URL in **`prep-quotes.js`**.
4. **`/`** is served from **`index.html`** at the repo root; **`vercel.json`** rewrites **`/api`** → **`/api/discovery`** so the discovery handler does not collide with `/`.

```bash
npm install
npx vercel dev
```

---

## Environment variables

Copy **`.env.example`** → **`.env`** for local runs (**`dotenv`** loads it for **`npm start`** and **`npm run build`**). On Vercel, set overrides in **Project → Settings → Environment Variables** (use **Build** vs **Runtime** as indicated).

| Variable | Scope | Description |
|----------|--------|-------------|
| `QUOTES_CSV_URL` | Build | HTTPS URL to download **`quotes.csv`** during build. Overrides **`DEFAULT_QUOTES_CSV_URL`** in **`scripts/prep-quotes.js`** when set. |
| `SKIP_REMOTE_QUOTES_DOWNLOAD` | Build | If `true`, skip HTTP download (e.g. rely on **`git lfs pull`** locally). |
| `QUOTES_CSV_PATH` | Runtime | Path to CSV (default **`quotes.csv`** under project root). |
| `DISABLE_QUOTES_FALLBACK` | Runtime | If `true`, do not fall back to **`quotes.sample.csv`** when the primary file is unusable. |
| `PORT` | Local | Express port (default **`3000`**). |

---

## API reference

### `GET /api`

JSON overview of endpoints (implemented by **`api/discovery.js`**; reachable at **`/api`** via rewrite).

### `GET /api/health`

Load status: **`quotes_loaded`**, **`loaded_from`**, **`fallback_used`**, **`warning`**. Returns **`503`** if neither primary nor fallback CSV can be loaded.

### `GET /api/categories`

- **`counts=true`** — `{ name, count }[]` instead of plain category names.

### `GET /api/authors`

- **`q`** — substring filter on author names.
- **`limit`** — max rows (default **100**, max **500**).

### `GET /api/quotes`

Default **`order=random`**: returns up to **`limit`** random rows from the filtered set (**`offset`** is ignored for **`random`**).

| Parameter | Description |
|-----------|-------------|
| `author` | Substring match (case-insensitive). |
| `author_exact` | Exact author match. |
| `exclude_author` | Exclude matching authors. |
| `category` | Quote must include this category. |
| `categories` | Comma-separated; OR unless **`match_categories=all`**. |
| `match_categories=all` | Require all listed **`categories`**. |
| `exclude_category` | Exclude quotes with this category. |
| `q` | Substring search in quote text. |
| `min_len`, `max_len` | Aliases: **`minLength`**, **`maxLength`**. |
| `limit` | Page size (default **10**, max **100**). |
| `offset` | For **`author`**, **`text`**, **`none`** only. |
| `order` | **`random`** \| **`author`** \| **`text`** \| **`none`**. |
| `seed` | Deterministic shuffle when **`order=random`**. |
| `legacy=true` | Bare JSON array response. |
| `meta=false` | Omit **`meta`**. |

### `GET /api/quotes/random`

Same filters; **`order`** is always **`random`**. Default **`limit=1`**. With **`legacy=true`** and **`limit=1`**, response is a single object.

---

## Troubleshooting

| Symptom | Likely cause | What to check |
|--------|----------------|---------------|
| **`data: []`** or tiny **`meta.total`** | Runtime only has the sample or no usable rows | **`GET /api/health`** — **`fallback_used`**, **`warning`**, **`quotes_loaded`**. |
| **`/` returns 500** | Routing / static vs function mismatch | Repo **`index.html`** at root; **`api/discovery.js`** (not **`api/index.js`**) + **`vercel.json`** rewrites. |
| Build has no full CSV | Pointer-only **`quotes.csv`** in checkout | **`QUOTES_CSV_URL`**, **`DEFAULT_QUOTES_CSV_URL`**, or **`git lfs pull`** before build. |
| Need full corpus in pages | **`limit` caps responses** | **`meta.total`** vs **`returned`**; use **`order=author`** (or **`text`** / **`none`**) with **`offset`** — not **`random`**. |

---

## Example requests

Replace the host with your deployment URL:

```bash
curl -s "https://<deployment>/api/quotes/random?limit=3"
curl -s "https://<deployment>/api/quotes?category=wisdom&limit=5"
curl -s "https://<deployment>/api/quotes?author_exact=Oscar%20Wilde&legacy=true"
curl -s "https://<deployment>/api/quotes?q=journey&order=text&offset=0&limit=20"
curl -s "https://<deployment>/api/categories?counts=true"
curl -s "https://<deployment>/api/authors?q=mark&limit=20"
```

---

## Contributing

Issues and pull requests are welcome. Follow [CONTRIBUTING.md](CONTRIBUTING.md) for branch workflow, CSV conventions, and review expectations.

---

## Dependencies

- [csv-parser](https://www.npmjs.com/package/csv-parser) — CSV streaming
- [dotenv](https://www.npmjs.com/package/dotenv) — optional **`.env`** for local **`npm start`** / **`npm run build`**
- [express](https://expressjs.com/) — local dev server only

---

## License

See **`package.json`** (`license` field). Add a **`LICENSE`** file when publishing if needed.
