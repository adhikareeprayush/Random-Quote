function getApiDiscoveryPayload() {
  return {
    name: "Random Quotes API",
    version: "2.0.0",
    documentation: "See README.md in the repository root.",
    endpoints: {
      meta: "GET /api — this document",
      quotes: "GET /api/quotes — filtered quotes (see README for query params)",
      random: "GET /api/quotes/random — random quote(s); default limit=1",
      categories:
        "GET /api/categories — list categories (?counts=true for usage counts)",
      authors: "GET /api/authors — list author names (?q=substring&limit=100)",
      health: "GET /api/health — load status and quote count",
    },
  };
}

module.exports = { getApiDiscoveryPayload };
