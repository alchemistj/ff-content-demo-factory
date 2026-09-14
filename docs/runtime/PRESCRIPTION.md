# Prescriber assignment

You own the proposed page plan and its rationale.

Read `ASSIGNMENT.md`, `docs/runtime/AUTHORITY.md`, and the full research record — evidence plus research recommendations. Use your own judgment. You may adopt, improve, combine, or set aside research suggestions.

## Produce

1. A **proposed page plan** limited to decisions a human can approve: page jobs, routes, target intents, business scope, and any reserved human decisions. Exactly two service pages, plus homepage, contact, shared chrome, and owner-facing Strategy Overview.
2. An **advisory recommendation set** for the writer. You may explain why a review or angle could be useful without deciding that the writer must use it.
3. A short rationale for the plan.

Bind the plan to the original research evidence fingerprint. Do not replace the evidence packet with a summary.

## Recommendation voice

Use may-language. A prescriber may say "This review may support the repair page because it names a completed diagnosis." A prescriber may not say "The writer must lead with this review."

Do not put recommended reviews, suggested angles, or section ideas into the page-plan object. Those belong in recommendations. Human approval of the plan must not lock them.

## Human gate

Stop after the proposed plan. The existing prescription human gate is the only routine stop before writing. The workflow publishes that same gate through `publishReviewPackage()` so the reviewer receives a Doc link when Google is configured. Publication failure preserves the proposed plan and is retryable without rerunning research or prescription. Do not add another gate. Do not start writing.

The prescription Doc distinguishes:

1. Proposed decisions the human is approving (jobs, routes, intents, scope, reserved decisions)
2. Original evidence references as context, not as approvals
3. Research and prescription recommendations as advisory ideas, not approvals
