# Writing package interface for the workflow lane

The Google Docs lane consumes a JSON **writing package** and returns a **publication receipt**. The workflow lane (`cursor/content-factory-agent-agency`) should call this interface when a package reaches an existing human gate. This does not add a new gate.

Package: `ff-content-demo-factory/google-docs`  
Schema: `src/google-docs/writing-package.ts` (`schemaVersion: "1.0.0"`)  
Fixture: `fixtures/google-docs/representative-writing-package.json`

## Automatic copy-gate handoff

```ts
import {
  humanQaTaskFromReceipt,
  lifecycleAfterPublish,
  loadGoogleDocsConfig,
  missingConfigPublishResult,
  publishForHumanReview,
  createLiveTransport,
  validateWritingPackage,
} from "ff-content-demo-factory/google-docs";

const pkg = validateWritingPackage(writingPackageJson);
const loaded = loadGoogleDocsConfig();
if (loaded.missing.length > 0) {
  const result = missingConfigPublishResult(loaded.missing);
  // Keep the finished writing. Record publication_failed. Do not rerun the writer.
} else {
  const transport = await createLiveTransport(loaded.config);
  const result = await publishForHumanReview(transport, pkg, loaded.config, previousLifecycle);
  const lifecycle = lifecycleAfterPublish(pkg, result);
  if (result.ok) {
    const task = humanQaTaskFromReceipt(result.receipt);
    // Put task.documentUrl in the existing human-QA task and PR. One obvious link.
  }
}
```

Prescription human gate: send `kind: "prescription"` through the same publisher. Title becomes `[Business Name] — Prescription — Human Review`.

## Package rules the publisher enforces

- `pageId` is the stable identity. Heading text is editable and must not reassign a page.
- `website_copy` reading order: homepage, two service pages, contact, header/footer, strategy overview.
- Customer-facing copy only in those pages. Do not include evidence administration, hashes, QA reports, or raw research.
- Spans carry wording, bold, italic, and link destinations. Quotes keep attribution separately.

## Lifecycle

States: `draft_ready` → `human_review` or `publication_failed` → `approved`.

- Retrying the same publication reuses the same Doc.
- Once the Doc is in `human_review` and the revision has changed, the publisher refuses to overwrite. Use `--new-review-version` only when a replacement review Doc is intended.
- OAuth failure is `publication_failed` with the writing preserved.

## Approval

Authenticated repository action / `npm run google-docs:approve -- --actor <github-user>`.  
Anonymous “APPROVED” text in the public-link Doc is ignored.

Import fails closed on unresolved suggestions or extra content tabs. Comments are not copy.

Later edits to the public-link Doc do not change a stored approval snapshot.
