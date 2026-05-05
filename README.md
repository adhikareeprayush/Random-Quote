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
├── quotes.sample.csv    # Tiny sample for contributors
├── server.js            # Local Express server
├── vercel.json          # Function memory/duration and API headers
└── package.json
```

---

## Deploy on Vercel

1. Push this repo to GitHub (or GitLab / Bitbucket) and [import the project](https://vercel.com/new) in Vercel.
2. Ensure `quotes.csv` is present in the deployment (see **Large datasets** below).
3. Optional: set **`QUOTES_CSV_PATH`** in Vercel → Project → Settings → Environment Variables if your file lives at a non-default path (relative to project root or absolute).
4. Deploy. Routes live under `/api`, `/api/quotes`, etc.

**Local Vercel emulation:**

```bash
npm install
npx vercel dev
```

---

## Local Express server

```bash
npm install
# If you do not have the full quotes.csv yet:
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
| `PORT` | Local Express port (default: `3000`). |

---

## Endpoints

### `GET /api`

JSON overview of available routes.

### `GET /api/health`

Load status and quote count. Returns `503` if the CSV cannot be read.

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

If `quotes.csv` is tracked with **Git LFS**, run `git lfs pull` before local runs or ensure LFS files are pulled in CI/Vercel (LFS must be available at build/deploy time).

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
