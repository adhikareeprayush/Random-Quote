const { getQuotes } = require("../lib/quotesStore");
const { applyCors, handleOptions } = require("../lib/cors");

module.exports = async (req, res) => {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const quotes = await getQuotes();
    const counts = new Map();
    for (const q of quotes) {
      for (const c of q.category) {
        counts.set(c, (counts.get(c) || 0) + 1);
      }
    }
    const withCounts = req.query?.counts === "true" || req.query?.counts === "1";
    const names = [...counts.keys()].sort((a, b) => a.localeCompare(b));
    const payload = withCounts
      ? { data: names.map((name) => ({ name, count: counts.get(name) })) }
      : { data: names };
    return res.status(200).json({
      ...payload,
      meta: { total_categories: names.length },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to load categories",
      message: err.message,
    });
  }
};
