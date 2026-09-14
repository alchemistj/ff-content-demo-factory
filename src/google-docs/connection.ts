import { GoogleDocsError } from "./errors.js";
import type { GoogleDocsConfig } from "./config.js";
import {
  driveAboutUser,
  driveCreateFile,
  driveGetFile,
  driveTrashFile,
  type GoogleTransport,
} from "./google-rest.js";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const DOC_MIME = "application/vnd.google-apps.document";

export interface ConnectionTestResult {
  readonly ok: true;
  readonly email?: string;
  readonly folderId?: string;
  readonly folderName?: string;
}

export async function testGoogleConnection(
  transport: GoogleTransport,
  config: GoogleDocsConfig,
): Promise<ConnectionTestResult> {
  const user = await driveAboutUser(transport);
  if (config.accountEmail && user.emailAddress && user.emailAddress.toLowerCase() !== config.accountEmail.toLowerCase()) {
    throw new GoogleDocsError(
      "reauthorization_required",
      `Authorized Google account ${user.emailAddress} does not match GOOGLE_ACCOUNT_EMAIL. Reauthorize with the configured @gmail.com account.`,
    );
  }
  const result: ConnectionTestResult = { ok: true };
  const withEmail = user.emailAddress ? { ...result, email: user.emailAddress } : result;
  if (!config.folderId) return withEmail;
  const folder = await driveGetFile(transport, config.folderId);
  return { ...withEmail, folderId: folder.id, folderName: folder.name };
}

export async function initializeReviewFolder(
  transport: GoogleTransport,
  name = "Content Factory Human Review",
): Promise<{ folderId: string; name: string }> {
  const folder = await driveCreateFile(transport, {
    name,
    mimeType: FOLDER_MIME,
    description: "Created by ff-content-demo-factory under drive.file. Review Docs live here; the folder itself is not shared as anyone-editor.",
  });
  return { folderId: folder.id, name: folder.name };
}

export async function createLabeledTestDocument(
  transport: GoogleTransport,
  folderId: string,
): Promise<{ documentId: string; name: string }> {
  const created = await driveCreateFile(transport, {
    name: "[TEST] Content Factory connection check — not a prospect review",
    mimeType: DOC_MIME,
    parents: [folderId],
    description: "Temporary live-verification document created by ff-content-demo-factory.",
  });
  return { documentId: created.id, name: created.name };
}

export async function trashLabeledTestDocument(transport: GoogleTransport, documentId: string): Promise<void> {
  await driveTrashFile(transport, documentId);
}
