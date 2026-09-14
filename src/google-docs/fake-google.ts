import { randomBytes } from "node:crypto";
import { GoogleDocsError } from "./errors.js";
import { mapGoogleHttpError } from "./google-rest.js";
import type {
  BatchUpdateRequest,
  DocsDocument,
  DriveFile,
  DrivePermission,
  GoogleRequest,
  GoogleTransport,
} from "./google-rest.js";

interface MutableDocument {
  documentId: string;
  title: string;
  revisionId: string;
  body: { content: unknown[] };
  namedRanges: Record<string, unknown>;
  lists?: Record<string, unknown>;
  tabs: DocsDocument["tabs"];
}

interface FakeFile {
  file: DriveFile;
  permissions: DrivePermission[];
  document: MutableDocument;
  trashed?: boolean;
}

export class FakeGoogleTransport implements GoogleTransport {
  readonly calls: GoogleRequest[] = [];
  readonly files = new Map<string, FakeFile>();
  email = "factory-review@gmail.com";
  revisionSeq = 1;
  failNext?: { status: number; body: unknown };

  async request<T>(request: GoogleRequest): Promise<T> {
    this.calls.push(request);
    if (this.failNext) {
      const failure = this.failNext;
      delete this.failNext;
      throw mapGoogleHttpError(failure.status, failure.body, "");
    }
    const url = new URL(request.url);
    if (url.pathname === "/drive/v3/about") {
      return { user: { emailAddress: this.email, displayName: "Factory Review" } } as T;
    }
    if (request.method === "POST" && url.pathname === "/drive/v3/files") {
      const body = request.body as { name: string; mimeType: string; parents?: string[]; description?: string };
      const id = `id_${this.files.size + 1}`;
      const file: DriveFile = {
        id,
        name: body.name,
        mimeType: body.mimeType,
        webViewLink: `https://docs.google.com/document/d/${id}/edit`,
        ...(body.parents ? { parents: body.parents } : {}),
        ...(body.description ? { description: body.description } : {}),
      };
      const document: MutableDocument = {
        documentId: id,
        title: body.name,
        revisionId: this.nextRevision(),
        body: { content: [{ endIndex: 1, sectionBreak: {} }] },
        namedRanges: {},
        tabs: [
          {
            tabProperties: { tabId: "t0", title: "Tab 1" },
            documentTab: { body: { content: [{ endIndex: 1, sectionBreak: {} }] } },
          },
        ],
      };
      this.files.set(id, { file, permissions: [], document });
      return file as T;
    }
    const fileMatch = url.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/);
    if (fileMatch?.[1] && request.method === "GET") {
      return this.require(fileMatch[1]).file as T;
    }
    if (fileMatch?.[1] && request.method === "PATCH") {
      const current = this.require(decodeURIComponent(fileMatch[1]));
      const body = request.body as { name?: string; trashed?: boolean };
      if (body.name) current.file = { ...current.file, name: body.name };
      if (body.trashed) current.trashed = true;
      return current.file as T;
    }
    const permMatch = url.pathname.match(/^\/drive\/v3\/files\/([^/]+)\/permissions$/);
    if (permMatch?.[1] && request.method === "POST") {
      const current = this.require(decodeURIComponent(permMatch[1]));
      const body = request.body as DrivePermission;
      const permission = { ...body, id: `perm_${current.permissions.length + 1}` };
      current.permissions.push(permission);
      return permission as T;
    }
    if (permMatch?.[1] && request.method === "GET") {
      return { permissions: this.require(decodeURIComponent(permMatch[1])).permissions } as T;
    }
    const docsMatch = url.pathname.match(/^\/v1\/documents\/([^/:]+)$/);
    if (docsMatch?.[1] && request.method === "GET") {
      const current = this.require(decodeURIComponent(docsMatch[1]));
      return structuredClone(current.document) as T;
    }
    const batchMatch = url.pathname.match(/^\/v1\/documents\/([^/:]+):batchUpdate$/);
    if (batchMatch?.[1] && request.method === "POST") {
      const current = this.require(decodeURIComponent(batchMatch[1]));
      const body = request.body as BatchUpdateRequest;
      if (body.writeControl?.requiredRevisionId && current.document.revisionId !== body.writeControl.requiredRevisionId) {
        throw new GoogleDocsError(
          "human_edits_protected",
          "Google Doc revision no longer matches the published snapshot. Human edits were not overwritten.",
          400,
        );
      }
      applyBatch(current, body);
      current.document.revisionId = this.nextRevision();
      return { documentId: current.file.id, writeControl: { requiredRevisionId: current.document.revisionId } } as T;
    }
    throw new Error(`Unhandled fake Google request: ${request.method} ${request.url}`);
  }

  require(id: string): FakeFile {
    const file = this.files.get(id);
    if (!file) throw mapGoogleHttpError(404, { error: { message: "not found" } }, "");
    return file;
  }

  simulateHumanEdit(documentId: string, extraText = "Human edit\n"): void {
    const current = this.require(documentId);
    current.document.revisionId = this.nextRevision();
    current.document.body.content = [
      ...current.document.body.content,
      {
        startIndex: 99,
        endIndex: 99 + extraText.length,
        paragraph: {
          elements: [{ textRun: { content: extraText, textStyle: {} } }],
          paragraphStyle: { namedStyleType: "NORMAL_TEXT" },
        },
      },
    ];
  }

  editFirstHeading(documentId: string, text: string): DocsDocument {
    const current = this.require(documentId);
    const cloned = structuredClone(current.document) as DocsDocument;
    const heading = cloned.body?.content?.find((element) => element.paragraph?.paragraphStyle?.namedStyleType === "HEADING_1");
    const run = heading?.paragraph?.elements?.[0]?.textRun;
    if (run && "content" in run) {
      (run as { content: string }).content = text;
    }
    current.document = cloned as MutableDocument;
    return cloned;
  }

  deleteNamedRange(documentId: string, name: string): DocsDocument {
    const current = this.require(documentId);
    delete current.document.namedRanges[name];
    return structuredClone(current.document) as DocsDocument;
  }

  replaceParagraphText(documentId: string, find: string, replacement: string): DocsDocument {
    const current = this.require(documentId);
    const cloned = structuredClone(current.document) as DocsDocument;
    for (const element of cloned.body?.content ?? []) {
      for (const el of element.paragraph?.elements ?? []) {
        const run = el.textRun;
        if (run && typeof run.content === "string" && run.content.includes(find)) {
          (run as { content: string }).content = run.content.replace(find, replacement);
        }
      }
    }
    current.document = cloned as MutableDocument;
    return cloned;
  }

  private nextRevision(): string {
    this.revisionSeq += 1;
    return `rev_${this.revisionSeq}_${randomBytes(4).toString("hex")}`;
  }
}

function applyBatch(current: FakeFile, body: BatchUpdateRequest): void {
  let text = extractText(current.document);
  for (const request of body.requests) {
    if (request.deleteContentRange) {
      const start = request.deleteContentRange.range.startIndex - 1;
      const end = request.deleteContentRange.range.endIndex - 1;
      text = `${text.slice(0, Math.max(0, start))}${text.slice(Math.max(0, end))}`;
    }
    if (request.insertText) {
      const at = request.insertText.location.index - 1;
      text = `${text.slice(0, at)}${request.insertText.text}${text.slice(at)}`;
    }
  }
  const namedRanges: NonNullable<DocsDocument["namedRanges"]> = {};
  for (const request of body.requests) {
    if (request.createNamedRange) {
      namedRanges[request.createNamedRange.name] = {
        name: request.createNamedRange.name,
        namedRanges: [
          {
            name: request.createNamedRange.name,
            ranges: [request.createNamedRange.range],
          },
        ],
      };
    }
  }
  const { paragraphs, lists } = materializeParagraphs(text, body);
  const docBody = {
    content: [
      { endIndex: 1, sectionBreak: {} },
      ...paragraphs,
    ],
  };
  current.document = {
    ...current.document,
    title: current.file.name,
    body: docBody,
    namedRanges,
    lists,
    tabs: [
      {
        tabProperties: { tabId: "t0", title: "Tab 1" },
        documentTab: { body: docBody },
      },
    ],
  };
}

function extractText(document: MutableDocument): string {
  const content = document.body.content as Array<{
    paragraph?: { elements?: Array<{ textRun?: { content?: string } }> };
  }>;
  return content.flatMap((element) => element.paragraph?.elements ?? []).map((el) => el.textRun?.content ?? "").join("");
}

function materializeParagraphs(text: string, body: BatchUpdateRequest) {
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  const paragraphs = [];
  const lists: NonNullable<DocsDocument["lists"]> = {};
  let index = 1;
  let listSeq = 0;
  for (const line of lines) {
    const start = index;
    const end = start + line.length + 1;
    const style = body.requests.find(
      (request) =>
        request.updateParagraphStyle &&
        request.updateParagraphStyle.range.startIndex === start &&
        request.updateParagraphStyle.range.endIndex === end,
    );
    const bullet = body.requests.find(
      (request) =>
        request.createParagraphBullets &&
        request.createParagraphBullets.range.startIndex === start &&
        request.createParagraphBullets.range.endIndex === end,
    );
    let listId: string | undefined;
    if (bullet?.createParagraphBullets) {
      listSeq += 1;
      listId = `kix.list${listSeq}`;
      const ordered = bullet.createParagraphBullets.bulletPreset.includes("NUMBERED");
      lists[listId] = {
        listProperties: {
          nestingLevels: [{ glyphType: ordered ? "DECIMAL" : "DISC" }],
        },
      };
    }
    const textRuns = [];
    let cursor = start;
    const styleRuns = body.requests.filter(
      (request) =>
        request.updateTextStyle &&
        request.updateTextStyle.range.startIndex >= start &&
        request.updateTextStyle.range.endIndex <= end - 1 &&
        request.updateTextStyle.textStyle,
    );
    if (styleRuns.length === 0) {
      textRuns.push({ startIndex: start, endIndex: end, textRun: { content: `${line}\n`, textStyle: {} } });
    } else {
      const points = new Set<number>([start, end - 1]);
      for (const run of styleRuns) {
        if (run.updateTextStyle) {
          points.add(run.updateTextStyle.range.startIndex);
          points.add(run.updateTextStyle.range.endIndex);
        }
      }
      const sorted = [...points].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length - 1; i += 1) {
        const from = sorted[i] ?? start;
        const to = sorted[i + 1] ?? end - 1;
        if (from >= to) continue;
        const matching = styleRuns.find(
          (request) =>
            request.updateTextStyle &&
            request.updateTextStyle.range.startIndex <= from &&
            request.updateTextStyle.range.endIndex >= to,
        );
        const slice = line.slice(from - start, to - start);
        textRuns.push({
          startIndex: from,
          endIndex: to,
          textRun: {
            content: slice,
            textStyle: matching?.updateTextStyle?.textStyle ?? {},
          },
        });
        cursor = to;
      }
      textRuns.push({
        startIndex: end - 1,
        endIndex: end,
        textRun: { content: "\n", textStyle: {} },
      });
      void cursor;
    }
    paragraphs.push({
      startIndex: start,
      endIndex: end,
      paragraph: {
        elements: textRuns,
        paragraphStyle: { namedStyleType: style?.updateParagraphStyle?.paragraphStyle.namedStyleType ?? "NORMAL_TEXT" },
        ...(listId ? { bullet: { listId } } : {}),
      },
    });
    index = end;
  }
  return { paragraphs, lists };
}
