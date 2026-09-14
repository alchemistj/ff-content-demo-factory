import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  reviewDocumentTitle,
  validateWritingPackage,
  writingPackageContentHash,
} from "./writing-package.js";
import { GoogleDocsError } from "./errors.js";

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures/google-docs/representative-writing-package.json");

test("representative website copy package validates and hashes stably", () => {
  const pkg = validateWritingPackage(JSON.parse(readFileSync(fixturePath, "utf8")));
  assert.equal(pkg.kind, "website_copy");
  assert.equal(pkg.pages.length, 6);
  assert.equal(pkg.pages.map((page) => page.role).join(","), "homepage,service,service,contact,header_footer,strategy_overview");
  assert.equal(writingPackageContentHash(pkg), writingPackageContentHash(pkg));
  assert.equal(reviewDocumentTitle(pkg), "Oak & Iron Plumbing — Website Copy — Human Review");
  assert.equal(reviewDocumentTitle(pkg, 2), "Oak & Iron Plumbing — Website Copy — Human Review (v2)");
});

test("page identity is the slug, not the heading", () => {
  const pkg = validateWritingPackage(JSON.parse(readFileSync(fixturePath, "utf8")));
  const home = pkg.pages[0];
  assert.equal(home?.pageId, "homepage");
  assert.notEqual(home?.pageId, home?.title);
});

test("invalid reading order fails closed", () => {
  const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as { pages: Array<{ role: string }> };
  const contact = raw.pages.find((page) => page.role === "contact");
  const home = raw.pages.find((page) => page.role === "homepage");
  assert.ok(contact && home);
  contact.role = "homepage";
  assert.throws(() => validateWritingPackage(raw), (error: unknown) => {
    assert.ok(error instanceof GoogleDocsError);
    assert.equal(error.code, "invalid_writing_package");
    return true;
  });
});
