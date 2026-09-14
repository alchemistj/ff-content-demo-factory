# Writing package interface for the workflow lane

The Google Docs lane **consumes** the canonical writing-package contract owned by the workflow lane (PR #30). It does not define a second package schema.

Canonical module: `src/writing-package/` (`schemaVersion: "writing-package/v1"`).

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

Manual `workflow_dispatch` inputs are passed through job `env:` and referenced as quoted shell variables. They are never interpolated with `${{ inputs.* }}` inside a `run:` script.

- Publish uses `contents: read` plus `actions: write` to upload the receipt/lifecycle artifact. It does not `git push` or otherwise write the repository.
- Approve uses `contents: write` only to commit under `approved-copy/<prospect-id>/` and push to `main`, plus `actions: read` to download that trusted publish artifact. Workflow inputs cannot choose an arbitrary `git add` path.

## GitHub-native publish → review → approve

1. On `main`, run **Google Docs publish** with `package_path` (repo-relative writing-package JSON). Optional `lifecycle_path` reuses an existing Doc; `new_review_version` only when a replacement Doc is intended.
2. Open the job **Summary** and click the Google Doc URL. Copy the numeric run id from the publish URL (`…/actions/runs/<id>`). The receipt and lifecycle are the `google-docs-publish` artifact on that run — do not commit them, and do not rerun the writer.
3. Edit the Doc in place.
4. On `main`, run **Google Docs approve copy** with the same `package_path`, the publish `publish_run_id`, and `prospect_id`. The job verifies the run is this repo’s successful `google-docs-publish.yml` on `main`, downloads the artifact, imports the Doc, and commits only under `approved-copy/<prospect-id>/`.

Local CLI (not the GitHub-native handoff) still takes a receipt file:

```bash
npm run google-docs:approve -- --package <draft.json> --receipt <receipt.json> --prospect-id <slug> --actor <github-user>
```

## Lifecycle

States: `draft_ready` → `human_review` or `publication_failed` → `approved`.

- Retrying the same publication reuses the same Doc.
- Once the Doc is in `human_review` and the revision has changed, the publisher refuses to overwrite. Use `--new-review-version` only when a replacement review Doc is intended.
- OAuth failure is `publication_failed` with the writing preserved.

## Approval

Anonymous “APPROVED” text in the public-link Doc is ignored. GitHub-native approval always uses `publish_run_id` (see above). The local CLI `--receipt` path is for machines that already have the receipt file.

Import fails closed on unresolved suggestions or extra content tabs. Comments are not copy.

Later edits to the public-link Doc do not change a stored approval snapshot.
