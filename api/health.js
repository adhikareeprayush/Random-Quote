const { getQuotes, CSV_FILENAME, resolveCsvPath } = require("../lib/quotesStore");
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
    return res.status(200).json({
      ok: true,
      quotes_loaded: quotes.length,
      csv_file: CSV_FILENAME,
      csv_path: resolveCsvPath(),
    });
  } catch (err) {
    return res.status(503).json({
      ok: false,
      error: err.message,
      csv_file: CSV_FILENAME,
      csv_path: resolveCsvPath(),
    });
  }
};
