const { applyCors, handleOptions } = require("../lib/cors");
const { getApiDiscoveryPayload } = require("../lib/apiDiscovery");

module.exports = async (req, res) => {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  return res.status(200).json(getApiDiscoveryPayload());
};
