#!/usr/bin/env node
/**
 * Runs during `npm run build` / Vercel build.
 *
 * 1. If quotes.csv already exists and is real CSV → skip.
 * 2. Else download from QUOTES_CSV_URL, or the default GitHub Release URL below.
 * 3. On failure (or SKIP_REMOTE_QUOTES_DOWNLOAD) → try git lfs pull if applicable.
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { spawnSync } = require("child_process");

const csvPath = path.join(process.cwd(), "quotes.csv");

/** Forks: replace with your release/asset URL, or rely on QUOTES_CSV_URL / committed CSV. */
const DEFAULT_QUOTES_CSV_URL =
  "https://github.com/adhikareeprayush/Random-Quote/releases/download/data-v1/quotes.csv";

function fileStartsWithGitLfsPointer(p) {
  try {
    const fd = fs.openSync(p, "r");
    const buf = Buffer.alloc(128);
    const n = fs.readSync(fd, buf, 0, 128, 0);
    fs.closeSync(fd);
    return buf.subarray(0, n).toString("utf8").startsWith(
      "version https://git-lfs.github.com/spec/v1"
    );
  } catch {
    return false;
  }
}

function downloadWithRedirects(url, dest, redirectsLeft = 8) {
  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new URL(url);
    } catch (e) {
      reject(new Error(`Invalid URL: ${e.message}`));
      return;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      reject(new Error("URL must be http or https"));
      return;
    }

    const lib = u.protocol === "https:" ? https : http;
    const req = lib.get(
      url,
      {
        headers: { "User-Agent": "random-quote-prep/1" },
      },
      (res) => {
        if (
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        ) {
          res.resume();
          if (redirectsLeft <= 0) {
            reject(new Error("Too many redirects"));
            return;
          }
          const next = new URL(res.headers.location, url).href;
          downloadWithRedirects(next, dest, redirectsLeft - 1)
            .then(resolve)
            .catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
        file.on("error", reject);
      }
    );
    req.on("error", reject);
  });
}

function tryGitLfsPull() {
  console.log("[prep-quotes] quotes.csv is a Git LFS pointer; trying git lfs pull...");
  const gitDir = path.join(process.cwd(), ".git");
  if (!fs.existsSync(gitDir)) {
    console.log(
      "[prep-quotes] No .git directory; skipping (e.g. Vercel tarball without LFS)."
    );
    return;
  }
  const r = spawnSync("git", ["lfs", "pull"], {
    cwd: process.cwd(),
    stdio: "inherit",
    encoding: "utf8",
  });
  if (r.status !== 0) {
    console.warn(
      "[prep-quotes] git lfs pull failed or git-lfs unavailable — runtime will fall back to quotes.sample.csv."
    );
  }
}

async function main() {
  if (fs.existsSync(csvPath) && !fileStartsWithGitLfsPointer(csvPath)) {
    console.log("[prep-quotes] quotes.csv already present; skipping download.");
    return;
  }

  const skipRemote = process.env.SKIP_REMOTE_QUOTES_DOWNLOAD === "true";

  if (!skipRemote) {
    const envUrl = process.env.QUOTES_CSV_URL;
    const url =
      envUrl != null && String(envUrl).trim() !== ""
        ? String(envUrl).trim()
        : DEFAULT_QUOTES_CSV_URL;

    console.log("[prep-quotes] Downloading quotes.csv …");
    console.log("[prep-quotes] Source:", url);

    try {
      await downloadWithRedirects(url, csvPath);
      const bytes = fs.statSync(csvPath).size;
      console.log(`[prep-quotes] Wrote quotes.csv (${bytes} bytes)`);
      if (fileStartsWithGitLfsPointer(csvPath)) {
        console.error(
          "[prep-quotes] Downloaded file still looks like a Git LFS pointer — wrong URL?"
        );
        process.exitCode = 1;
        return;
      }
      return;
    } catch (e) {
      console.warn("[prep-quotes] Download failed:", e.message);
    }
  } else {
    console.log(
      "[prep-quotes] SKIP_REMOTE_QUOTES_DOWNLOAD=true — not fetching remote CSV."
    );
  }

  if (!fs.existsSync(csvPath)) {
    console.log(
      "[prep-quotes] quotes.csv missing — runtime will use quotes.sample.csv if needed."
    );
    return;
  }
  if (fileStartsWithGitLfsPointer(csvPath)) {
    tryGitLfsPull();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
