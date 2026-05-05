const express = require("express");
const { buildQuotesResponse } = require("./lib/buildQuotesResponse");
const {
  getQuotes,
  CSV_FILENAME,
  resolveCsvPath,
  getQuotesLoadInfo,
  FALLBACK_FILENAME,
} = require("./lib/quotesStore");
const { applyCors } = require("./lib/cors");
const { getApiDiscoveryPayload } = require("./lib/apiDiscovery");

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  applyCors(req, res);
  next();
});

async function sendQuotes(res, query) {
  const { data, meta, f } = await buildQuotesResponse(query || {});
  if (f.legacy) {
    res.json(data);
    return;
  }
  res.json(f.includeMeta ? { data, meta } : { data });
}

app.get("/api", (req, res) => {
  res.json(getApiDiscoveryPayload());
});

app.get("/api/quotes", async (req, res) => {
  try {
    await sendQuotes(res, req.query);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load quotes", message: err.message });
  }
});

app.get("/api/quotes/random", async (req, res) => {
  try {
    const q = { ...req.query, order: "random" };
    if (q.limit == null && req.query.limit == null) q.limit = "1";
    const { data, meta, f } = await buildQuotesResponse(q);
    if (f.legacy) {
      res.json(data.length === 1 ? data[0] : data);
      return;
    }
    res.json(f.includeMeta ? { data, meta } : { data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load quotes", message: err.message });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const quotes = await getQuotes();
    const counts = new Map();
    for (const q of quotes) {
      for (const c of q.category) {
        counts.set(c, (counts.get(c) || 0) + 1);
      }
    }
    const withCounts = req.query.counts === "true" || req.query.counts === "1";
    const names = [...counts.keys()].sort((a, b) => a.localeCompare(b));
    const payload = withCounts
      ? { data: names.map((name) => ({ name, count: counts.get(name) })) }
      : { data: names };
    res.json({ ...payload, meta: { total_categories: names.length } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load categories", message: err.message });
  }
});

function parseAuthorsLimit(v, max = 500) {
  if (v == null || v === "") return 100;
  const n = parseInt(String(v), 10);
  if (!Number.isFinite(n)) return 100;
  return Math.min(max, Math.max(1, n));
}

app.get("/api/authors", async (req, res) => {
  try {
    const q = req.query.q ? String(req.query.q).trim() : null;
    const qLower = q ? q.toLowerCase() : null;
    const limit = parseAuthorsLimit(req.query.limit);
    const quotes = await getQuotes();
    const authorByKey = new Map();
    for (const row of quotes) {
      const key = row.author.toLowerCase();
      if (!authorByKey.has(key)) authorByKey.set(key, row.author);
    }
    let authors = [...authorByKey.values()].sort((a, b) => a.localeCompare(b));
    if (qLower) authors = authors.filter((a) => a.toLowerCase().includes(qLower));
    const total = authors.length;
    authors = authors.slice(0, limit);
    res.json({ data: authors, meta: { total, returned: authors.length, limit } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load authors", message: err.message });
  }
});

app.get("/api/health", async (req, res) => {
  try {
    const quotes = await getQuotes();
    const info = getQuotesLoadInfo();
    res.json({
      ok: true,
      quotes_loaded: quotes.length,
      csv_file: CSV_FILENAME,
      csv_path: resolveCsvPath(),
      loaded_from: info.loaded_from_path,
      fallback_used: info.fallback_used,
      fallback_file: FALLBACK_FILENAME,
      warning: info.warning,
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      error: err.message,
      csv_file: CSV_FILENAME,
      csv_path: resolveCsvPath(),
      fallback_file: FALLBACK_FILENAME,
    });
  }
});

getQuotes()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to load quotes CSV:", err.message);
    process.exit(1);
  });
