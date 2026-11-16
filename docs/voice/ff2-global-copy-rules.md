# Global Copy Rules

Rules that apply to **every** page in a copy artifact, regardless of page type. Read this file first; then load the page-specific guideline for the page you are writing.

Homepage, service, and brand sales copy must also follow the [Fluid Frame Demos Writing Style Guide](../demo-factory/FLUID_FRAME_DEMOS_WRITING_STYLE_GUIDE.md) for sentence- and word-level craft.

---

## Source of truth

Use only information from:

- Approved **strategy recipe** (page plan, keywords, tone, audit summary)
- **Confirmed prospect facts** attached to the session (`confirmedFacts`, prospect record, audit sidecar)
- Live website or Google Business Profile data **only when** it appears in approved upstream artifacts

If a detail is not confirmed upstream, **leave it out**, use general wording, or mark as TBD. Never invent to fill space.

---

## Never invent

Do not write as fact:

| Category | Examples |
|----------|----------|
| Contact | Phone numbers, email addresses, physical address, hours (unless in `confirmedFacts`) |
| Proof | Reviews, testimonials, star ratings, review counts, before/after results |
| Credentials | Awards, badges, certifications, licenses, manufacturer status, accreditations |
| Business history | Years in business, founding year, team size, owner/founder stories, team member names |
| Commercial claims | Pricing, financing, warranties, guarantees, free estimates |
| Urgency / availability | Emergency service, same-day service, 24/7, response-time promises |
| Geography | Cities, neighborhoods, service radius beyond confirmed areas |
| Outcomes | Customer results, job counts, "customers served" |

**Phone numbers and emails are not copy-artifact page fields in v1.** Write contact-oriented CTAs ("Call for service," "Contact us") without embedding a number or address in copy strings unless explicitly confirmed upstream.

---

## Banned phrases

Scan every heading, body paragraph, and bullet. Rewrite any match or close paraphrase:

- "quality service," "quality work," "quality results"
- "years of experience," "dedicated to," "committed to excellence," "passionate about"
- "drive real results," "get seen," "proven strategies"
- "competitive pricing," "affordable"
- "family owned and operated" (unless confirmed in upstream facts)
- "state-of-the-art," "industry-leading," "unmatched"
- "customer satisfaction" as a standalone claim
- "Transform your business," "Your trusted partner," lorem ipsum, "Service 1," "Feature 2"
- "Transform your business"–style generic local-service filler

**Confirmed facts do not exempt generic phrasing.** If a business's own site says "quality work," do not repeat it verbatim. Replace with a more specific confirmed detail, or drop it.

### Banned template sentence

Do not use (in any wording):

> "This mockup shows how a focused local [industry] site can answer who they are, what they do, where they serve, and what to do next."

Replace with a sentence naming the **actual demo pages** being built, using confirmed facts.

### Banned meta-referential filler

Do not describe the copy's own compliance with these rules:

- "without filler or invented claims"
- "without claiming results or using generic phrases"
- "built with only real, confirmed facts"

These sentences talk about the writing process, not the business. Delete them.

---

## Name-deletion test

For every `sections[].body` paragraph:

1. Delete the business name and city.
2. If the sentence still reads as a complete, confident claim, it is **generic filler** — rewrite or delete.

**Failure example:** "With years of experience helping businesses grow online, our team is dedicated to delivering quality results." (No business name needed — generic.)

**Pass example:** "This demo adds dedicated heating repair and AC repair pages so Springfield searches land on intent-specific content instead of a single homepage." (Specific to this build.)

---

## Voice and structure

- **Active voice** — prefer "We diagnose the system" over "The system is diagnosed."
- **Short paragraphs** — 3–4 lines maximum; break longer ideas into multiple paragraphs.
- **Answer first** — lead each section with the point; add detail below (reverse pyramid).
- **H2 headings** — may be written as questions when it helps scanability.
- **AP Style capitalization** on headings (Title Case for major words, not ALL CAPS).
- **No italic body text** — bold is the only emphasis tool in body copy.

---

## Schema-aware writing

Copy must validate against `docs/copy-artifact-schema.json` **and** be ready for the build agent to render verbatim.

### Root fields

| Field | Rule |
|-------|------|
| `businessName`, `industry`, `city`, `state` | Must match approved strategy recipe |
| `sourceStrategyRecipeVersion` | Must match recipe `schemaVersion` |
| `pages[]` | One entry per approved recipe page, same `title` values, recipe order |
| `footer` | Required once per artifact (see `footer.md`) — write when generating any page if not yet present |

### Per-page fields

| Field | Rule |
|-------|------|
| `title` | Must match a recipe page `title` exactly |
| `slug` | Route path starting with `/`; service slugs include city-state keyword pattern from recipe |
| `seoTitle` | Browser tab / SEO title — see page-type docs for format |
| `metaDescription` | One sentence; no unconfirmed years, review counts, licenses, or warranties |
| `hero` | `eyebrow`, `heading`, `subheading`, `primaryCta`, `secondaryCta` — use `""` for unused optional strings |
| `sections[]` | `{ heading, body, bullets }` — use `""` for empty body, `[]` for empty bullets |
| `faq` | Optional array of `{ question, answer }` — omit key or use `[]` when no FAQ |

### Alignment with strategy recipe

Honor each page's:

- `purpose`
- `primaryKeyword`
- `brandTone`
- `heroDirection`
- `avoidDuplicateOf` (service pages must not duplicate each other or the homepage)

Do **not** add pages, change the page plan, or rewrite strategy decisions.

---

## Shippable copy, not merely valid JSON

Schema compliance is **necessary but not sufficient**.

Before returning output, confirm:

- [ ] Every paragraph passes the name-deletion test
- [ ] No banned phrases or meta-referential filler remain
- [ ] No invented facts, contact info, or urgency promises
- [ ] Service pages are meaningfully distinct per `avoidDuplicateOf`
- [ ] Copy meets minimum depth for the page type (see page-specific docs)
- [ ] FAQ answers are 2–3 sentences minimum where FAQ is required — not one-line filler
- [ ] CTAs use labels appropriate to confirmed contact paths (call vs contact page)
- [ ] Strings are polished and complete — no placeholders, no TBD in visitor-facing hero/section copy unless upstream explicitly marks the field unknown

Output that validates but fails depth, banned-phrase, or factual checks is **not acceptable**.
