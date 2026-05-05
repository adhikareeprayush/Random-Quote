const { buildQuotesResponse } = require("../lib/buildQuotesResponse");
const { applyCors, handleOptions } = require("../lib/cors");

module.exports = async (req, res) => {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { data, meta, f } = await buildQuotesResponse(req.query || {});
    if (f.legacy) {
      return res.status(200).json(data);
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
