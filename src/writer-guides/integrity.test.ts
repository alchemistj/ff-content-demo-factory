import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { defaultRepoRoot, loadCanonicalGuideCatalog, loadWriterStageGuides } from "./index.js";

const SRC_DIR = fileURLToPath(new URL(".", import.meta.url));
const PRODUCTION_FILES = readdirSync(SRC_DIR)
  .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
  .map((name) => join(SRC_DIR, name));

const FORBIDDEN = [
  "docs.google.com",
  "drive.google.com",
  "googleapis.com/drive",
  "googleusercontent.com",
  "GUIDE_SOURCES",
];

test("production loader sources never mention Drive or the old Google Doc catalog", () => {
  for (const file of PRODUCTION_FILES) {
    const source = readFileSync(file, "utf8");
    for (const needle of FORBIDDEN) {
      assert.equal(source.includes(needle), false, `${file} contains forbidden ${needle}`);
    }
    assert.equal(/\bfetch\s*\(/.test(source), false, `${file} calls fetch`);
    assert.equal(/https\s*\.\s*request/.test(source), false, `${file} uses https.request`);
    assert.equal(/http\s*\.\s*request/.test(source), false, `${file} uses http.request`);
  }
});

test("Writer 1/2/3 load while HTTP, HTTPS, and fetch are disabled", async () => {
  const originalHttp = http.request;
  const originalHttps = https.request;
  const originalFetch = globalThis.fetch;
  const block = () => {
    throw new Error("network is disabled for writer-guide loading");
  };
  http.request = block as typeof http.request;
  https.request = block as typeof https.request;
  globalThis.fetch = block as typeof fetch;
  try {
    const catalog = loadCanonicalGuideCatalog();
    const writer1 = loadWriterStageGuides("writer1");
    const writer2 = loadWriterStageGuides("writer2");
    const writer3 = loadWriterStageGuides("writer3");
    assert.equal(catalog.guides.length, 6);
    assert.equal(writer1.guides.length, 2);
    assert.equal(writer2.guides.length, 4);
    assert.equal(writer3.guides.length, 1);
    assert.equal(catalog.repoRoot, defaultRepoRoot());
  } finally {
    http.request = originalHttp;
    https.request = originalHttps;
    globalThis.fetch = originalFetch;
  }
});
