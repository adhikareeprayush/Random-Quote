# Contributing

Thanks for helping improve the Random Quotes API. This document describes how to propose changes in a way that stays easy to review and deploy.

## Getting started

1. Clone the repository.
2. Install dependencies: `npm install`.
3. Copy **`cp .env.example .env`** and adjust variables if needed (optional for basic dev).
4. Provide quote data:
   - Copy the sample: `cp quotes.sample.csv quotes.csv`, or  
   - Use your own `quotes.csv`, or  
   - Set `QUOTES_CSV_PATH` in `.env` to point at a CSV file (see README).
5. Run locally:
   - **Express:** `npm start`
   - **Vercel-like:** `npx vercel dev`

If your checkout uses **Git LFS** for `quotes.csv`, run `git lfs pull` so the real CSV is present. Until then, the app loads **`quotes.sample.csv`** automatically (unless **`DISABLE_QUOTES_FALLBACK=true`**).

For **Vercel** builds, **`scripts/prep-quotes.js`** can download **`quotes.csv`** from **`QUOTES_CSV_URL`** or from **`DEFAULT_QUOTES_CSV_URL`** (forks should replace that constant or set **`QUOTES_CSV_URL`** in project settings). Use **`SKIP_REMOTE_QUOTES_DOWNLOAD`** when you intentionally skip the HTTP step (see README → Data & deployment).

## Project conventions

- **Shared logic** belongs in `lib/`. Handlers in `api/` should stay thin (CORS, method check, call lib, JSON response).
- **Match existing style:** CommonJS (`require` / `module.exports`), minimal dependencies, no unrelated refactors in the same PR as a feature fix.
- **Public API behavior:** Avoid breaking changes to query parameters and JSON shapes without a version bump or clear migration note in the PR. Prefer optional parameters and `legacy=true` when preserving old clients matters.

## CSV data

- Keep the header row: `quote,author,category`.
- Use double quotes around fields that contain commas.
- Prefer sensible, reusable categories (lowercase storage is automatic).

If you add large datasets, mention approximate file size and any **Vercel** memory/duration tweaks you applied in `vercel.json`.

## Pull requests

1. **One focused change per PR** when possible (e.g. “add filter X” separate from “rewrite README”).
2. Describe **what** changed and **why** in the PR body.
3. Manually exercise affected routes (`curl` or browser) and note what you tested.
4. Ensure `npm start` boots and `/api/health` reports `ok: true` with your CSV.

## Issues

When reporting bugs, include:

- Deployment target (Vercel vs local Express)
- Request URL (without secrets) and response status/body snippet
- Whether `quotes.csv` / `QUOTES_CSV_PATH` is available and approximate row count

## Code of conduct

Be respectful and constructive. Assume good intent; focus feedback on the work, not the person.
