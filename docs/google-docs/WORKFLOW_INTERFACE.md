# Writing package interface for the workflow lane

The Google Docs lane **consumes** the canonical writing-package contract owned by the workflow lane (PR #30). It does not define a second package schema.

Canonical module: `src/writing-package/` at PR #30 head `2b2ce4e75edd37d96e2b898efeddd125464c3329`.

Package exports:

- `ff-content-demo-factory/writing-package` — types, `parseWritingPackage`, `buildWritingPackage`, `hashWritingPackage`, `publisherPayload`, review title
- `ff-content-demo-factory/google-docs` — native Docs publish/import plus `createGoogleDocsPublisher().publishReviewPackage()`

Required package fields: `schemaVersion: "writing-package/v1"`, `packageId`, `prospectId`, `runId`, `businessName`, `pages`, stored `packageHash`. There is no top-level `version` field and no top-level `readingOrder` array. Quote `attribution` is required. Optional quote `reviewId` is a lowercase slug.

## Publisher boundary

Call the existing human gates (prescription and website copy) through one implementation. This does not add a gate.

```ts
import {
  createGoogleDocsPublisher,
  parseWritingPackage,
} from "ff-content-demo-factory/google-docs";

const pkg = parseWritingPackage(writingPackageJson);
const result = await createGoogleDocsPublisher().publishReviewPackage(pkg);
if (result.status === "setup-required" || result.status === "failed") {
  // Keep the finished writing. Record publication_failed. Do not rerun the writer.
} else {
  // Put result.url in the existing human-QA task. One obvious link.
}
```

Lower-level helpers (`publishForHumanReview`, `lifecycleAfterPublish`) remain available for tests and CLI.

Prescription human gate: send `kind: "prescription"` through the same publisher. Title becomes `[Business Name] — Prescription — Human Review`.

## Package rules the publisher enforces

- `pageId` is the stable identity. Heading text is editable and must not reassign a page.
- `website_copy` reading order: homepage, two service pages, contact, header/footer, strategy overview.
- Customer-facing copy only in those pages. Do not include evidence administration, hashes, QA reports, or raw research.
- Spans carry wording, bold, italic, and link destinations. Quotes keep attribution (required) separately.
- Optional quote `reviewId` is preserved through the Doc as a named range (`ffcf_rev_…`). It is never inserted as visible text. If a human removes the quotation or its named range, import does not invent a review mapping.

## Trusted execution

Secret-bearing jobs `.github/workflows/google-docs-publish.yml` and `.github/workflows/google-docs-approve.yml` are `workflow_dispatch` only. They fail closed unless `github.ref` is `refs/heads/main`, then they check out `main` explicitly.

- Publish uses `contents: read` and does not persist credentials.
- Approve uses `contents: write` only to commit under `approved-copy/<prospect-id>/` and push to `main`. Workflow inputs cannot choose an arbitrary `git add` path.

## Lifecycle

States: `draft_ready` → `human_review` or `publication_failed` → `approved`.

- Retrying the same publication reuses the same Doc.
- Once the Doc is in `human_review` and the revision has changed, the publisher refuses to overwrite. Use `--new-review-version` only when a replacement review Doc is intended.
- OAuth failure is `publication_failed` with the writing preserved.

## Approval

Authenticated repository action:

```bash
npm run google-docs:approve -- --package <draft.json> --receipt <receipt.json> --prospect-id <slug> --actor <github-user>
```

Anonymous “APPROVED” text in the public-link Doc is ignored.

Import fails closed on unresolved suggestions or extra content tabs. Comments are not copy.

Later edits to the public-link Doc do not change a stored approval snapshot.
