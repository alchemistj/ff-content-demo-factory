import assert from "node:assert/strict";
import test from "node:test";
import { FakeGoogleTransport } from "./fake-google.js";
import { initializeReviewFolder, testGoogleConnection } from "./connection.js";
import type { GoogleDocsConfig } from "./config.js";

test("init-folder creates an app-owned folder rather than assuming an arbitrary ID", async () => {
  const fake = new FakeGoogleTransport();
  const folder = await initializeReviewFolder(fake);
  const create = fake.calls.find((call) => call.method === "POST" && call.url.endsWith("/drive/v3/files"));
  assert.equal((create?.body as { mimeType: string }).mimeType, "application/vnd.google-apps.folder");
  assert.equal(folder.folderId, "id_1");
  const config: GoogleDocsConfig = {
    clientId: "c",
    clientSecret: "s",
    refreshToken: "r",
    folderId: folder.folderId,
    accountEmail: "factory-review@gmail.com",
  };
  const connection = await testGoogleConnection(fake, config);
  assert.equal(connection.ok, true);
  assert.equal(connection.email, "factory-review@gmail.com");
  assert.equal(connection.folderId, folder.folderId);
});
