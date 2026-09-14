import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildNativeDocument, looksLikeMarkdownDump } from "./document-builder.js";
import { importPagesFromDocument, importedPackageFromReadback } from "./document-reader.js";
import { FakeGoogleTransport } from "./fake-google.js";
import { validateWritingPackage } from "./writing-package.js";

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures/google-docs/representative-writing-package.json");

test("native document requests use heading styles, lists, quotes, and links instead of Markdown", async () => {
  const pkg = validateWritingPackage(JSON.parse(readFileSync(fixturePath, "utf8")));
  const built = buildNativeDocument(pkg);
  assert.equal(looksLikeMarkdownDump(built.insertText), false);
  assert.equal(built.insertText.includes("**"), false);
  assert.equal(built.insertText.includes("# "), false);
  assert.ok(built.requests.some((request) => request.updateParagraphStyle?.paragraphStyle.namedStyleType === "HEADING_1"));
  assert.ok(built.requests.some((request) => request.createParagraphBullets?.bulletPreset === "BULLET_DISC_CIRCLE_SQUARE"));
  assert.ok(built.requests.some((request) => request.createParagraphBullets?.bulletPreset === "NUMBERED_DECIMAL_NESTED"));
  assert.ok(built.requests.some((request) => request.updateTextStyle?.textStyle.link?.url === "/leak-repair"));
  assert.ok(built.requests.some((request) => request.updateTextStyle?.textStyle.bold === true));
  assert.ok(built.requests.some((request) => request.updateTextStyle?.textStyle.italic === true));
  assert.ok(built.requests.some((request) => request.createNamedRange?.name === "ffcf_page_homepage"));
  const headingBold = built.requests.filter(
    (request) => request.updateTextStyle?.fields === "bold" && request.updateTextStyle.textStyle.bold === false,
  );
  assert.ok(headingBold.length > 0);
});

test("published native document round-trips page identity after an H1 change", async () => {
  const pkg = validateWritingPackage(JSON.parse(readFileSync(fixturePath, "utf8")));
  const fake = new FakeGoogleTransport();
  const created = await fake.request<{ id: string }>({
    method: "POST",
    url: "https://www.googleapis.com/drive/v3/files",
    body: { name: "doc", mimeType: "application/vnd.google-apps.document", parents: ["folder"] },
  });
  const built = buildNativeDocument(pkg);
  await fake.request({
    method: "POST",
    url: `https://docs.googleapis.com/v1/documents/${created.id}:batchUpdate`,
    body: { requests: built.requests },
  });
  const document = fake.editFirstHeading(created.id, "Edited homepage heading");
  const imported = importPagesFromDocument(document, pkg.pages);
  assert.equal(imported.pages[0]?.pageId, "homepage");
  assert.equal(imported.pages[0]?.title, "Edited homepage heading");
  assert.equal(imported.pages[0]?.role, "homepage");
  const leak = imported.pages.find((page) => page.pageId === "leak-repair");
  assert.equal(leak?.route, "/leak-repair");
  const quote = imported.pages[0]?.blocks.find((block) => block.type === "quote");
  assert.ok(quote && quote.type === "quote");
  assert.equal(quote.attribution, "Dana M., Springfield");
  const restored = importedPackageFromReadback(pkg, imported);
  assert.equal(restored.pages[1]?.pageId, "leak-repair");
});
