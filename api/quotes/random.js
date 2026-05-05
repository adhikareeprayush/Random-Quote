const { buildQuotesResponse } = require("../../lib/buildQuotesResponse");
const { applyCors, handleOptions } = require("../../lib/cors");

module.exports = async (req, res) => {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const q = { ...(req.query || {}), order: "random" };
    if (q.limit == null && (req.query == null || req.query.limit == null)) {
      q.limit = "1";
    }
    const { data, meta, f } = await buildQuotesResponse(q);
    if (f.legacy) {
      return res.status(200).json(data.length === 1 ? data[0] : data);
    }
    const body = f.includeMeta ? { data, meta } : { data };
    return res.status(200).json(body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to load quotes",
      message: err.message,
    });
  }
};
