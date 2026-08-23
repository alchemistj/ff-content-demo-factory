# Migration map

This repository is the Stage 1/2 extraction from `alchemistj/ff-2-demos` and intentionally stops at Human Gate 1.

| Upstream surface | Stage 1/2 treatment |
| --- | --- |
| Apify discovery | Extracted behind `DiscoveryAdapter`; capped at seven cheap candidates. |
| Candidate audit | Extracted behind `WebsiteAuditAdapter`; Architect makes the qualification decision. |
| Exact-place finalist retrieval | Extracted behind `FinalistEnrichmentAdapter`; one finalist, up to 50, no date window, empty-text sidecar. |
| Review retrieval gate | Preserved as sidecar envelope `kind=factory-review-inventory`, `schemaVersion=2.0.0`; discovery samples cannot prescribe. |
| Review model judgment | Injected through `ReviewJudgeAdapter`; every retained written review is judged and persisted before prescription. |
| Review inventory / Recipe v2 | Kept as compact `reviews`, `emptyTextReviews`, `classified`, and `anchorEvidence` fields. |
| Prescription / value hierarchy | Extracted and simplified into `prescription.js`; services are compared before pages are selected. |
| Collision validation | Reused semantically for URL, keyword, title, and H1 uniqueness. |
| Step A human-readable prescription | Rendered as the compact `renderGate1` Markdown artifact. |
| Run state / recovery | Replaced with a small durable state contract in `run-one.js`; state is written after each paid boundary. |

## Deliberately not migrated

- GitHub Actions cron, workflow dispatch, and push triggers: Architect owns the production wake-up.
- Service/home/contact copy generation and the three-agent writing pipeline.
- Client React builds, shared hosting, Vercel, outreach, Lemlist, and all later human gates.
- Historical xAI, Composer-era, OpenAI, Anthropic, and unrelated credentials.
- Full component-level outlines or a separate build-prescription contract.

Adapter seams are the integration contract: lane 2 may supply the authoritative review inventory/classifier as long as it preserves the v2 sidecar fields and returns authoritative judgments before `prescribe` is called.
