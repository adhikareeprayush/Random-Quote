const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const CSV_FILENAME = "quotes.csv";

let cache = null;
let loadPromise = null;

function resolveCsvPath() {
  if (process.env.QUOTES_CSV_PATH) {
    const p = process.env.QUOTES_CSV_PATH;
    return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  }
  return path.join(process.cwd(), CSV_FILENAME);
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

function loadQuotesFromDisk() {
  const csvPath = resolveCsvPath();
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(csvPath)) {
      reject(
        new Error(
          `Missing quotes CSV at ${csvPath}. Add quotes.csv, set QUOTES_CSV_PATH (e.g. quotes.sample.csv), or run \`git lfs pull\` if the dataset uses Git LFS.`
        )
      );
      return;
    }
    const quotes = [];
    fs.createReadStream(csvPath)
      .pipe(csv())
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

async function getQuotes() {
  if (cache) return cache;
  if (!loadPromise) {
    loadPromise = loadQuotesFromDisk().then((q) => {
      cache = q;
      return q;
    });
  }
  return loadPromise;
}

function clearCache() {
  cache = null;
  loadPromise = null;
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
  resolveCsvPath,
};
