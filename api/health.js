const {
  getQuotes,
  CSV_FILENAME,
  resolveCsvPath,
  getQuotesLoadInfo,
  FALLBACK_FILENAME,
} = require("../lib/quotesStore");
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
    const info = getQuotesLoadInfo();
    return res.status(200).json({
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
    return res.status(503).json({
      ok: false,
      error: err.message,
      csv_file: CSV_FILENAME,
      csv_path: resolveCsvPath(),
      fallback_file: FALLBACK_FILENAME,
    });
  }
};
