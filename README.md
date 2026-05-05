# Random Quotes API

A **serverless** HTTP API that serves quotes from a CSV file. Deploy to [Vercel](https://vercel.com/) as Node.js functions, or run the included Express server locally.

**Default response shape:** JSON objects with a `data` array and optional `meta` (pagination and totals). Pass `legacy=true` for the older “bare array” responses.

---

## Features

- **Vercel-native:** one function per route under `/api/*`
- **CORS enabled** for browser and public API clients (`GET` and `OPTIONS`)
- **Filtering:** author, exact author, exclude author, category, multiple categories (OR or ALL), full-text `q`, quote length bounds
- **Ordering:** random (default for filtered quotes), sorted by author or text, or raw slice (`none`) with `offset`
- **Reproducible random:** optional `seed` (string or number) for deterministic samples
- **Discovery:** `/api`, `/api/categories`, `/api/authors`, `/api/health`
- **Local dev:** Express mirror of the same routes (`npm start`)
- **Deploy-safe fallback:** if `quotes.csv` is missing, empty, or a Git LFS pointer, **`quotes.sample.csv`** is served automatically (disable with `DISABLE_QUOTES_FALLBACK=true`)

---

## Project layout

```
.
├── api/                 # Vercel serverless handlers
│   ├── index.js         # GET /api — API map
│   ├── quotes.js        # GET /api/quotes
│   ├── quotes/random.js # GET /api/quotes/random
│   ├── categories.js
│   ├── authors.js
│   └── health.js
├── lib/                 # Shared loading, filters, CORS
├── public/
│   └── index.html       # Landing page at /
├── quotes.csv           # Your dataset (not committed if large / LFS)
├── quotes.sample.csv    # Deploy fallback + tiny dataset for contributors
├── scripts/
│   └── prep-quotes.js   # Vercel build: attempts git lfs pull when needed
├── server.js            # Local Express server
├── vercel.json          # buildCommand, function memory/duration, API headers
├── .env.example         # Documented env vars (copy to `.env` locally)
└── package.json
```

---

## Deploy on Vercel

1. Push this repo to GitHub (or GitLab / Bitbucket) and [import the project](https://vercel.com/new) in Vercel.
2. Deploy runs **`npm run build`** (`scripts/prep-quotes.js`) which tries **`git lfs pull`** when `quotes.csv` is still an LFS pointer. If that cannot run, the API still works using **`quotes.sample.csv`** until you ship real CSV bytes (check **`GET /api/health`**).
3. **Full dataset:** `npm run build` downloads **`quotes.csv`** from a **default GitHub Release URL** in `scripts/prep-quotes.js` (no Vercel env required). Set **`QUOTES_CSV_URL`** only to use a different file. Optional: **`QUOTES_CSV_PATH`**, **`DISABLE_QUOTES_FALLBACK`**.
4. Routes live under `/api`, `/api/quotes`, etc. The site root **`/`** serves **`public/index.html`** (API overview + live sample).

**Local Vercel emulation:**

```bash
npm install
npx vercel dev
```

---

## Local Express server

```bash
npm install
npm start
```

If `quotes.csv` is still an LFS pointer, the server automatically uses **`quotes.sample.csv`** (see `/api/health`). To use only your real file:

```bash
git lfs pull
```

Or point at the sample explicitly:

```bash
export QUOTES_CSV_PATH=quotes.sample.csv
npm start
```

Server listens on `http://localhost:3000` (override with `PORT`).

---

## CSV format

```csv
quote,author,category
"Quote text",Author Name,"category1, category2"
```

- **`category`** may be comma-separated; values are normalized to lowercase for matching.
- Rows with an empty `quote` are skipped.

---

## Environment variables

Copy **`.env.example`** to **`.env`** for local work. The **`dotenv`** package loads **`.env`** when you run **`npm start`** or **`npm run build`**. On **Vercel**, you only need to set variables below if you want to **override** defaults; production builds already download the default release CSV.

| Variable | Where | Description |
|----------|--------|-------------|
| `QUOTES_CSV_URL` | **Build** (optional) | HTTPS URL to download **`quotes.csv`** during `npm run build`. If unset, **`scripts/prep-quotes.js`** uses the **default GitHub Release** URL for this project. |
| `SKIP_REMOTE_QUOTES_DOWNLOAD` | **Build** (optional) | If `true`, skip the default/env download (e.g. use **`git lfs pull`** locally instead). |
| `QUOTES_CSV_PATH` | Runtime | Path to CSV (default: `quotes.csv` in project root). Relative paths resolve from `process.cwd()`. |
| `DISABLE_QUOTES_FALLBACK` | Runtime | If `true`, do not fall back to `quotes.sample.csv` when the primary CSV is missing, empty, or an LFS pointer (strict errors instead). |
| `PORT` | Local | Express port (default: `3000`). |

---

## Endpoints

### `GET /api`

JSON overview of available routes.

### `GET /api/health`

Load status and quote count. When **`quotes.csv`** is missing, empty, or a **Git LFS pointer**, the API automatically loads **`quotes.sample.csv`** instead (unless **`DISABLE_QUOTES_FALLBACK=true`**). Response fields:

- **`loaded_from`** — path of the file actually read  
- **`fallback_used`** — `true` if the sample file was used  
- **`warning`** — human-readable hint when fallback applies  

Returns **`503`** only if both primary and fallback fail.

### `GET /api/categories`

- **`counts=true`** — include `{ name, count }` per category instead of plain strings.

### `GET /api/authors`

- **`q`** — filter authors whose name contains this substring (case-insensitive).
- **`limit`** — max authors returned (default `100`, max `500`).

### `GET /api/quotes`

Returns quotes matching filters. Default **`order=random`**: picks up to **`limit`** random rows from the filtered set (`offset` is ignored for random order).

| Parameter | Description |
|-----------|-------------|
| `author` | Substring match on author (case-insensitive). |
| `author_exact` | Exact author match (case-insensitive). |
| `exclude_author` | Exclude if author contains this substring. |
| `category` | Quote must include this category. |
| `categories` | Comma-separated categories; default OR semantics. |
| `match_categories=all` | Quote must include **all** listed categories (use with `categories`). |
| `exclude_category` | Exclude quotes that have this category. |
| `q` | Substring search in quote text. |
| `min_len`, `max_len` | Also accepted: `minLength`, `maxLength` — character length of quote body. |
| `limit` | Page size / sample size (default `10`, max `100`). |
| `offset` | Skip rows (for `order=author`, `order=text`, or `order=none`). |
| `order` | `random` (default), `author`, `text`, `none`. |
| `seed` | Deterministic random shuffle when `order=random`. |
| `legacy=true` | Response is a bare JSON array (old behavior). |
| `meta=false` | Omit `meta` object from the response. |

### `GET /api/quotes/random`

Same filters as `/api/quotes`, but **`order` is always random**. Default **`limit=1`**.

With **`legacy=true`** and **`limit=1`**, response is a single object instead of an array.

---

## Large datasets and Git LFS

### Automatic fallback (`quotes.sample.csv`)

If **`quotes.csv`** is **missing**, **empty**, or a **Git LFS pointer**, the runtime loads **`quotes.sample.csv`** so deploys (including Vercel) still return real quotes. Check **`GET /api/health`**: `fallback_used`, `warning`, and `loaded_from` tell you what happened.

Set **`DISABLE_QUOTES_FALLBACK=true`** when you want failures instead of the sample (e.g. strict production checks).

### Build hook (`npm run build`)

Vercel runs **`npm run build`** before deployment (`vercel.json` → `buildCommand`). That runs **`scripts/prep-quotes.js`**, which:

1. If **`quotes.csv`** is missing or a Git LFS pointer → **download** from **`QUOTES_CSV_URL`**, or the **default GitHub Release** URL in **`scripts/prep-quotes.js`** (works on Vercel with **no env vars**).
2. If download is skipped (**`SKIP_REMOTE_QUOTES_DOWNLOAD=true`**) or fails → try **`git lfs pull`** when possible.

### Where to host the CSV for free (`QUOTES_CSV_URL`)

You need an **`https://`** URL where **`GET`** returns **raw CSV bytes** (HTTP **200**, body starts with your header row, not an HTML page). Quick check:

```bash
curl -sSIL "<your-url>" | head -5
curl -s "<your-url>" | head -1
```

| Option | Notes |
|--------|--------|
| [**GitHub Releases**](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) | On your repo: **Releases** → **Draft a release** → attach **`quotes.csv`** as a binary → publish → copy the **asset download** URL (`…/releases/download/<tag>/quotes.csv`). Works well for **public** repos and large files. |
| [**Cloudflare R2**](https://developers.cloudflare.com/r2/get-started/) | S3-compatible storage with a **free tier**; upload the CSV and expose it via a **public bucket** / custom domain so you get a stable **HTTPS** object URL. |
| [**Supabase Storage**](https://supabase.com/docs/guides/storage/serving/downloads) | Free tier includes storage; use a **public** bucket and the **public URL** for the object. |
| [**Backblaze B2**](https://www.backblaze.com/b2/cloud-storage.html) | Cloud storage with a free allowance; create a **public** file URL or bucket policy so **`curl`** gets the file directly. |

**Avoid** plain **Google Drive / Dropbox share links** unless you know they return a **direct** file response — many links serve HTML sign-in or redirects, and the build will save garbage instead of CSV.

### Can I push `quotes.csv` to GitHub?

Your LFS pointer metadata is about **138 MB**. **GitHub blocks normal pushes over ~100 MB per file**, so you usually **cannot** drop LFS and commit one file that large.

**Practical options:**

| Approach | When to use |
|----------|-------------|
| **Default download** (no env) | **`scripts/prep-quotes.js`** uses the project’s **GitHub Release** URL; Vercel runs **`npm run build`** and gets **`quotes.csv`** automatically. |
| **`QUOTES_CSV_URL`** override | Use another HTTPS URL (object storage, different release, etc.). |
| **Smaller CSV in Git** | If you shrink or split the file **under ~100 MB**, adjust **`.gitattributes`** and commit it **without** LFS. |
| **Keep Git LFS** | Keeps history on GitHub; **build still pulls real bytes** via the default (or overridden) download URL. |

`quotes.sample.csv` is excluded from LFS in **`.gitattributes`** so the fallback always ships with the repo.

### Memory on Vercel

Huge CSVs load into RAM — slow cold starts and possible **OOM**. Increase **`vercel.json`** → **`functions`** → **`memory`** if deploys fail at runtime (within your plan limits).

### Why you used to see empty `data` or tiny `meta.total`

Deploys often only had a **Git LFS pointer** in git; **`npm run build`** now downloads the release CSV by default. Confirm with **`GET /api/health`** (`quotes_loaded`, **`fallback_used`**). Override the URL with **`QUOTES_CSV_URL`** if you host the file elsewhere.

**Fix locally**

```bash
git lfs pull
```

Confirm the file is real CSV (starts with a header like `quote,author,category`), not `version https://git-lfs.github.com/spec/v1`.

### Pagination vs full corpus

Each response returns at most **`limit`** rows (max **100**). **`meta.total`** is how many quotes matched your filters in the **loaded** dataset. To walk everything, use **`order=author`**, **`text`**, or **`none`** with **`offset`** + **`limit`** (not **`order=random`**, which ignores **`offset`**).

---

## Example requests

```bash
curl -s "https://YOUR_DEPLOYMENT.vercel.app/api/quotes/random?limit=3"
curl -s "https://YOUR_DEPLOYMENT.vercel.app/api/quotes?category=wisdom&limit=5"
curl -s "https://YOUR_DEPLOYMENT.vercel.app/api/quotes?author_exact=Oscar%20Wilde&legacy=true"
curl -s "https://YOUR_DEPLOYMENT.vercel.app/api/quotes?q=journey&order=text&offset=0&limit=20"
curl -s "https://YOUR_DEPLOYMENT.vercel.app/api/categories?counts=true"
curl -s "https://YOUR_DEPLOYMENT.vercel.app/api/authors?q=mark&limit=20"
```

---

## Dependencies

- [csv-parser](https://www.npmjs.com/package/csv-parser) — streaming CSV parse
- [dotenv](https://www.npmjs.com/package/dotenv) — load **`.env`** for local **`npm start`** / **`npm run build`**
- [express](https://expressjs.com/) — optional local server only

---

## License

See `package.json` (`license` field). Add a `LICENSE` file when you publish if needed.

Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).
