const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;

function clampInt(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function parseIntParam(v, defaultVal, min, max) {
  if (v == null || v === "") return defaultVal;
  const n = parseInt(String(v), 10);
  if (!Number.isFinite(n)) return defaultVal;
  return clampInt(n, min, max);
}

function optionalInt(v, min, max) {
  if (v == null || v === "") return null;
  const n = parseInt(String(v), 10);
  if (!Number.isFinite(n)) return null;
  return clampInt(n, min, max);
}

function normalizeOrder(order) {
  const o = order ? String(order).toLowerCase() : "random";
  if (["random", "author", "text", "none"].includes(o)) return o;
  return "random";
}

function parseCategoriesParam(raw) {
  if (raw == null || raw === "") return [];
  return String(raw)
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Parse query object for GET /api/quotes (and related routes).
 */
function parseQuoteQuery(query) {
  const category = query.category
    ? String(query.category).toLowerCase().trim()
    : null;

  return {
    author: query.author ? String(query.author) : null,
    authorExact: query.author_exact ? String(query.author_exact) : null,
    excludeAuthor: query.exclude_author ? String(query.exclude_author) : null,
    category,
    categories: parseCategoriesParam(query.categories),
    matchAllCategories:
      query.match_categories === "all" || query.match_all === "true",
    excludeCategory: query.exclude_category
      ? String(query.exclude_category).toLowerCase().trim()
      : null,
    q: query.q ? String(query.q) : null,
    minLen:
      optionalInt(query.min_len, 0, 1_000_000) ??
      optionalInt(query.minLength, 0, 1_000_000),
    maxLen:
      optionalInt(query.max_len, 0, 1_000_000) ??
      optionalInt(query.maxLength, 0, 1_000_000),
    limit: parseIntParam(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT),
    offset: parseIntParam(query.offset, 0, 0, 10_000_000),
    order: normalizeOrder(query.order),
    seed: query.seed != null && query.seed !== "" ? query.seed : null,
    legacy: query.legacy === "true" || query.legacy === "1",
    includeMeta: query.meta !== "false",
  };
}

module.exports = {
  parseQuoteQuery,
  MAX_LIMIT,
  DEFAULT_LIMIT,
};
