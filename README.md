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
├── quotes.csv           # Your dataset (not committed if large / LFS)
├── quotes.sample.csv    # Deploy fallback + tiny dataset for contributors
├── scripts/
│   └── prep-quotes.js   # Vercel build: attempts git lfs pull when needed
├── server.js            # Local Express server
├── vercel.json          # buildCommand, function memory/duration, API headers
└── package.json
```

---

## Deploy on Vercel

1. Push this repo to GitHub (or GitLab / Bitbucket) and [import the project](https://vercel.com/new) in Vercel.
2. Deploy runs **`npm run build`** (`scripts/prep-quotes.js`) which tries **`git lfs pull`** when `quotes.csv` is still an LFS pointer. If that cannot run, the API still works using **`quotes.sample.csv`** until you ship real CSV bytes (check **`GET /api/health`**).
3. Optional: set **`QUOTES_CSV_PATH`** or **`DISABLE_QUOTES_FALLBACK`** in Vercel → Project → Settings → Environment Variables.
4. Routes live under `/api`, `/api/quotes`, etc.

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

| Variable | Description |
|----------|-------------|
| `QUOTES_CSV_PATH` | Path to CSV (default: `quotes.csv` in project root). Relative paths resolve from `process.cwd()`. |
| `DISABLE_QUOTES_FALLBACK` | If `true`, do not fall back to `quotes.sample.csv` when the primary CSV is missing, empty, or an LFS pointer (strict errors instead). |
| `PORT` | Local Express port (default: `3000`). |

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

Vercel runs **`npm run build`** before deployment (`vercel.json` → `buildCommand`). That runs **`scripts/prep-quotes.js`**, which attempts **`git lfs pull`** when `quotes.csv` is still an LFS pointer and `.git` exists (so checkout sometimes materializes the real file).

### Why you used to see empty `data`

Committing **`quotes.csv` as LFS** without pulling real bytes meant the parser saw no valid rows. Fallback fixes empty APIs; replace or pull real data when you are ready for production traffic.

**Fix locally**

```bash
git lfs pull
```

Confirm the file is real CSV (starts with a header like `quote,author,category`), not `version https://git-lfs.github.com/spec/v1`.

**Ship full data on Vercel**

- Prefer a **plain CSV** under size limits, **or** ensure **`git lfs pull`** succeeds in CI/build, **or** download the CSV from blob storage during **`npm run build`** into `quotes.csv`.

Very large CSVs increase **cold start time** and **memory** use. Tune `vercel.json` → `functions` → `memory` / `maxDuration` if needed. Vercel plan limits apply to bundle size and function resources.

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
- [express](https://expressjs.com/) — optional local server only

---

## License

See `package.json` (`license` field). Add a `LICENSE` file when you publish if needed.

Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).
