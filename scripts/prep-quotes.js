#!/usr/bin/env node
/**
 * Runs during `npm run build` / Vercel build.
 * If quotes.csv is a Git LFS pointer, attempt `git lfs pull` so real data is present when possible.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const csvPath = path.join(process.cwd(), "quotes.csv");

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

function main() {
  if (!fs.existsSync(csvPath)) {
    console.log("[prep-quotes] quotes.csv missing — runtime will use quotes.sample.csv if needed.");
    return;
  }
  if (!fileStartsWithGitLfsPointer(csvPath)) {
    console.log("[prep-quotes] quotes.csv looks like real CSV; nothing to do.");
    return;
  }
  console.log("[prep-quotes] quotes.csv is a Git LFS pointer; trying git lfs pull...");
  const gitDir = path.join(process.cwd(), ".git");
  if (!fs.existsSync(gitDir)) {
    console.log("[prep-quotes] No .git directory; skipping (e.g. Vercel tarball without LFS).");
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

main();
