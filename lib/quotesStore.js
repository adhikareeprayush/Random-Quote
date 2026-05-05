const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const CSV_FILENAME = "quotes.csv";
const FALLBACK_FILENAME = "quotes.sample.csv";

let cache = null;
let loadPromise = null;

/** Set after a successful load (for /api/health). */
let loadInfo = {
  resolved_primary_path: null,
  loaded_from_path: null,
  fallback_used: false,
  warning: null,
};

function resolveCsvPath() {
  if (process.env.QUOTES_CSV_PATH) {
    const p = process.env.QUOTES_CSV_PATH;
    return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  }
  return path.join(process.cwd(), CSV_FILENAME);
}

function fallbackCsvPath() {
  return path.join(process.cwd(), FALLBACK_FILENAME);
}

/** Real CSV is not committed — repo often has a tiny Git LFS stub instead. */
function fileStartsWithGitLfsPointer(csvPath) {
  try {
    const fd = fs.openSync(csvPath, "r");
    const buf = Buffer.alloc(128);
    const n = fs.readSync(fd, buf, 0, 128, 0);
    fs.closeSync(fd);
    const head = buf.subarray(0, n).toString("utf8");
    return head.startsWith("version https://git-lfs.github.com/spec/v1");
  } catch {
    return false;
  }
}

function csvParseOptions() {
  return {
    mapHeaders: ({ header }) => {
      const h = String(header ?? "")
        .trim()
        .toLowerCase();
      if (h === "text" || h === "quotation" || h === "body") return "quote";
      if (h === "tags" || h === "categories") return "category";
      return h;
    },
  };
}

function normalizeCategories(raw) {
  if (raw == null) return [];
  return String(raw)
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

function parseRow(row) {
  return {
    quote: String(row.quote ?? "").trim(),
    author: String(row.author ?? "Unknown").trim(),
    category: normalizeCategories(row.category),
  };
}

function parseCsvFile(csvPath) {
  return new Promise((resolve, reject) => {
    const quotes = [];
    fs.createReadStream(csvPath)
      .pipe(csv(csvParseOptions()))
      .on("data", (row) => {
        try {
          const q = parseRow(row);
          if (q.quote.length > 0) quotes.push(q);
        } catch {
          /* skip malformed rows */
        }
      })
      .on("end", () => resolve(quotes))
      .on("error", reject);
  });
}

async function attemptLoad(csvPath) {
  if (!fs.existsSync(csvPath)) {
    return { ok: false, reason: "missing", quotes: [] };
  }
  if (fileStartsWithGitLfsPointer(csvPath)) {
    return { ok: false, reason: "lfs_pointer", quotes: [] };
  }
  const quotes = await parseCsvFile(csvPath);
  if (quotes.length === 0) {
    return { ok: false, reason: "empty", quotes: [] };
  }
  return { ok: true, quotes };
}

function primaryLoadError(primaryPath, reason) {
  const base = path.basename(primaryPath);
  switch (reason) {
    case "missing":
      return new Error(
        `Missing quotes CSV at ${primaryPath}. Add quotes.csv, set QUOTES_CSV_PATH (e.g. quotes.sample.csv), or run 'git lfs pull' if the dataset uses Git LFS.`
      );
    case "lfs_pointer":
      return new Error(
        `Quotes file is a Git LFS pointer (${base}), not real CSV data. Run 'git lfs pull', deploy a plain CSV, set QUOTES_CSV_PATH, or rely on ${FALLBACK_FILENAME} (unset DISABLE_QUOTES_FALLBACK if you want automatic fallback).`
      );
    case "empty":
      return new Error(
        `No usable quotes in ${base}. Expected columns include quote (or text), author, category.`
      );
    default:
      return new Error(`Could not load quotes from ${primaryPath}`);
  }
}

function fallbackWarning(primaryPath, reason) {
  const base = path.basename(primaryPath);
  switch (reason) {
    case "missing":
      return `Primary CSV missing (${base}); serving ${FALLBACK_FILENAME} until you add data.`;
    case "lfs_pointer":
      return `${base} is a Git LFS pointer (real file not in deploy); serving ${FALLBACK_FILENAME}. Run git lfs pull before deploy or ship a plain CSV.`;
    case "empty":
      return `Primary CSV had no usable rows (${base}); serving ${FALLBACK_FILENAME}.`;
    default:
      return `Primary CSV unavailable; serving ${FALLBACK_FILENAME}.`;
  }
}

async function loadQuotesFromDisk() {
  const primaryPath = resolveCsvPath();
  const disableFallback = process.env.DISABLE_QUOTES_FALLBACK === "true";

  const primary = await attemptLoad(primaryPath);
  if (primary.ok) {
    loadInfo = {
      resolved_primary_path: primaryPath,
      loaded_from_path: primaryPath,
      fallback_used: false,
      warning: null,
    };
    return primary.quotes;
  }

  if (disableFallback) {
    throw primaryLoadError(primaryPath, primary.reason);
  }

  const fbPath = fallbackCsvPath();
  const fb = await attemptLoad(fbPath);
  if (!fb.ok) {
    throw new Error(
      `Could not load quotes. Primary (${path.basename(primaryPath)}): ${primary.reason}. Fallback (${FALLBACK_FILENAME}): ${fb.reason}. Fix primary CSV or add ${FALLBACK_FILENAME} to the repo.`
    );
  }

  loadInfo = {
    resolved_primary_path: primaryPath,
    loaded_from_path: fbPath,
    fallback_used: true,
    warning: fallbackWarning(primaryPath, primary.reason),
  };
  return fb.quotes;
}

async function getQuotes() {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = loadQuotesFromDisk()
      .then((q) => {
        cache = q;
        return q;
      })
      .catch((err) => {
        loadPromise = null;
        throw err;
      });
  }
  return loadPromise;
}

function clearCache() {
  cache = null;
  loadPromise = null;
  loadInfo = {
    resolved_primary_path: null,
    loaded_from_path: null,
    fallback_used: false,
    warning: null,
  };
}

function getQuotesLoadInfo() {
  return {
    ...loadInfo,
    quotes_loaded: cache ? cache.length : null,
  };
}

/** Fisher–Yates; `rng` must return a number in [0, 1). */
function getRandomItems(array, count, rng = Math.random) {
  const shuffled = [...array];
  const rand = typeof rng === "function" ? rng : Math.random;
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s) {
  if (typeof s === "number" && Number.isFinite(s)) return s >>> 0;
  const str = String(s);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function filterQuotes(quotes, f) {
  let out = quotes;

  if (f.authorExact) {
    const a = f.authorExact.toLowerCase();
    out = out.filter((q) => q.author.toLowerCase() === a);
  } else if (f.author) {
    const a = f.author.toLowerCase();
    out = out.filter((q) => q.author.toLowerCase().includes(a));
  }

  if (f.excludeAuthor) {
    const a = f.excludeAuthor.toLowerCase();
    out = out.filter((q) => !q.author.toLowerCase().includes(a));
  }

  const catList =
    f.categories && f.categories.length
      ? f.categories
      : f.category
        ? [f.category]
        : [];

  if (catList.length) {
    if (f.matchAllCategories) {
      out = out.filter((q) => catList.every((c) => q.category.includes(c)));
    } else {
      out = out.filter((q) => catList.some((c) => q.category.includes(c)));
    }
  }

  if (f.excludeCategory) {
    const c = f.excludeCategory.toLowerCase();
    out = out.filter((q) => !q.category.includes(c));
  }

  if (f.q) {
    const t = f.q.toLowerCase();
    out = out.filter((q) => q.quote.toLowerCase().includes(t));
  }

  if (f.minLen != null) out = out.filter((q) => q.quote.length >= f.minLen);
  if (f.maxLen != null) out = out.filter((q) => q.quote.length <= f.maxLen);

  return out;
}

function sortQuotes(quotes, order) {
  const copy = [...quotes];
  if (order === "author") {
    copy.sort(
      (a, b) =>
        a.author.localeCompare(b.author) || a.quote.localeCompare(b.quote)
    );
  } else if (order === "text") {
    copy.sort((a, b) => a.quote.localeCompare(b.quote));
  }
  return copy;
}

module.exports = {
  getQuotes,
  clearCache,
  getRandomItems,
  filterQuotes,
  sortQuotes,
  mulberry32,
  hashSeed,
  normalizeCategories,
  CSV_FILENAME,
  FALLBACK_FILENAME,
  resolveCsvPath,
  getQuotesLoadInfo,
};
