const { getQuotes } = require("../lib/quotesStore");
const { applyCors, handleOptions } = require("../lib/cors");

function parseLimit(v, max = 500) {
  if (v == null || v === "") return 100;
  const n = parseInt(String(v), 10);
  if (!Number.isFinite(n)) return 100;
  return Math.min(max, Math.max(1, n));
}

module.exports = async (req, res) => {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const q = req.query?.q ? String(req.query.q).trim() : null;
    const qLower = q ? q.toLowerCase() : null;
    const limit = parseLimit(req.query?.limit);
    const quotes = await getQuotes();
    const authorByKey = new Map();
    for (const row of quotes) {
      const key = row.author.toLowerCase();
      if (!authorByKey.has(key)) authorByKey.set(key, row.author);
    }
    let authors = [...authorByKey.values()].sort((a, b) =>
      a.localeCompare(b)
    );
    if (qLower) {
      authors = authors.filter((a) => a.toLowerCase().includes(qLower));
    }
    const total = authors.length;
    authors = authors.slice(0, limit);
    return res.status(200).json({
      data: authors,
      meta: { total, returned: authors.length, limit },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to load authors",
      message: err.message,
    });
  }
};
