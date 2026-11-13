# Avatar and scored USP (Ted's method, Josh 2026-11-12)

Brief: ff-architect issue #651. This method comes from Ted, Josh's copywriter, and is modeled on his SRA Positioning Brief. **Copy the structure of Ted's documents, never their facts.** His drafts were chatbot-assisted and include invented stats and guarantees. Josh's hard nos still apply: no invented licenses, certifications, awards, years, family history, prices, guarantees or warranties, and nothing about legal or insurance outcomes.

## 1. Trade avatar (`avatars/<trade>.md`, built once and reused across prospects)
Format adapted from Ted's Ben Davis avatar analysis and the SRA brief.
- **The buyers.** Usually 2 or 3: the primary homeowner, a landlord or property manager, and a referrer such as an insurance agent or realtor. Each one is messaged differently.
- **The primary avatar.** Give them a name and a short description: age, home, situation, and how they found you.
- **The identity iceberg.** What they say publicly, what they admit privately, and what they won't admit to anyone.
- **Parking-lot moments.** One short scene for each trigger, the moment they decide to call. Use plain, specific, local details.
- **Top 5 fears, ranked by emotional intensity.** Each has a one-line explanation.
- **Top 5 objections.** Write each as the surface objection, then the underlying fear.
- **Top 5 wants.** Practical and emotional.
- **Past bad experiences.** What happened with the last contractor.
- **Their words.** A voice-of-customer table: what customers say vs. how marketers wrongly put it. Quote real reviews word for word and cite the source: `prospect/reviews.json, Reviewer X.`.
- **Phrases to use and phrases to avoid.**
- **Tone and triggers.**
- **What's thin.** Where the sourcing is weak, and what an owner call would sharpen.

## 2. USP table (`prospects/<trade>/<slug>/usp.md`)
Ted's SRA table: **Claim | Appeal | Exclusivity | Score | Evidence**. Score = Appeal × Exclusivity, and **16 or more = primary USP**.

- **Claims.** List 8 to 10 claims drawn from facts.md, the reviews and the prospect's own site. Each claim must be true for this business. Bold inference from reviews is fine, for example "came out on a holiday" supports "weekend and holiday calls".
- **Appeal** is tied to the trade avatar's ranked fears and wants:
  - 5 = hits the #1 or #2 fear or want directly.
  - 4 = a top-5 fear or want.
  - 3 = nice to have.
  - 2 = rarely considered.
  - 1 = they don't care.
- **Exclusivity** is checked against the top 5 local competitors in `competitors/wichita-<trade>.md`. Name them in Evidence.
  - 5 = no competitor offers it.
  - 4 = competitors claim it, but not this specifically or this strongly.
  - 3 = some claim it, few prove it.
  - 2 = one or two named competitors also hold it.
  - 1 = every competitor offers it (table stakes).
- **Braids.** A claim can braid two true things into one ownable position, as SRA did with "Documented Before. Defended After." Score the braid as its own row only if both halves are true.

**The gate.** The hero, the method section and the outreach message may lead only with a claim scoring 16 or more. If no honest claim reaches 16:
- Lead with the best honest claim.
- Mark the demo "below gate".
- Propose one offer the business could adopt, scored the same way. It appears on the strategy page only, in a card titled "The offer we'd build with you", never in the hero.

Each `usp.md` also includes:
- Three USP statements, written as Option A (pain point), Option B (method) and Option C (emotional outcome).
- The pick and why.
- A brand short form of 3 to 6 words.
- A promise ladder: General > Specific > Cinematic > Emotional > Core transformation. The ladder sets the hero subline and the section order.

## 2b. Three patterns from Ted's Window Dudes USP (gold-standard site)
Source: Google Drive folder `1gcScBTJ5d6Y96ch1ak-Ov2FeYAeG6qGn`, "Window Dudes USP". Its final copy is in Webpage Content.
1. **Write the core customer insight first, in three lines, before the USP statement.**
   - What the buyer doesn't know.
   - What most companies do.
   - What this one does instead.
   Window Dudes: "Most customers do not actually know what is causing their window issue. Most companies sell replacement. Window Dudes can diagnose root cause first."
2. **A two-sided moat line,** where the business stands between two kinds of competitor and beats each on the other's ground. Window Dudes: "We know homes better than window companies, and windows better than inspectors."
3. **A real credential beats a trait, every time.** When scanning facts.md, look first for something the owner can name: a credential, a program or a method. Examples: Window Dudes has Vince, a certified home inspector; SRA has its pre-storm documentation program; LRE has its Efficiency Maine Qualified Partner status. A named, checkable thing scores higher on exclusivity than any adjective. Use only credentials facts.md confirms (Josh's hard nos).

The Window Dudes short form, "Inspect First. Fix Right.", is the model for the 3-to-6-word brand line.

## 3. How the copy uses it
- **Hero:** says the USP.
- **Problem section:** the avatar's #1 fear, in their words.
- **Method section:** shows how the USP works.
- **FAQ:** answers the avatar's top objections.
- **Outreach message:** leads with the USP. It keeps the form's limits, the plain link and the solicitation line.
- **Strategy page:** adds a plain "Why we led with X" paragraph. Never show the score table or any numbers to the prospect (Josh 2026-11-12: scores mean nothing to them). The table stays internal, in `usp.md`.

## 4. Words step: voice reference, then a fact-check (Josh, 2026-11-13)
A copy test (ICT, Nov 13) found that Sonnet working with full live model copy wrote with better voice and rhythm, but invented facts. The factory pipeline was safer. From now on, every new demo's words step uses both:
1. **Voice reference.** Before writing, the writer reads these approved pages IN FULL. They are **voice reference only; never use their facts.**
   - `examples/approved-copy/sra/springfield-homepage.md`
   - `examples/approved-copy/sra/springfield-roof-replacement.md`
   - `examples/approved-copy/sra/springfield-roof-maintenance.md` (SRA's repair-type page)
   - `examples/approved-copy/window-dudes/homepage.md`

   Match their rhythm, plain confidence and specificity, not their claims.
2. **Every factory rule still applies:** facts only from the business's own folder (facts.md, reviews.json, audit.md), the keyword H1, Josh's hard nos, and the USP's "What's thin" limits. A claim that rests on one review is written as what that customer saw, not as a standing practice.
3. **Fact-check before build.** A separate Haiku pass checks every line of `words.json` and `outreach.md` against the folder's facts and reviews. It lists each claim that is unsupported, overstated (one review stated as routine), a years, response-time or crew claim, or a hard no. The writer fixes them, and only then does the demo get built.

## 5. Unverified facts: show them as placeholders, never guess (Josh, 2026-11-13)
"I don't want to flat out lie." A strong trade site states years in business, a license number, a warranty, the towns it serves and its hours. When the business's folder can't back one up (facts.md says "Unverified", shows a "Conflict:", or lacks it), the demo never makes up a believable number. There are two ways to handle it:

- **v-unverified-off (the default):** leave the fact out of the copy and list it in `strategy.confirm`.
- **v-unverified-on (the test):** show where the fact would go, as an obvious placeholder, and explain it on the strategy page.
  - **In the copy:** `[[confirm: [XX] years serving Wichita]]` renders as a yellow chip tagged "to confirm". The text inside must look like a placeholder (`[XX]`, `[X]-year`, `#[XXXX]`, `[towns]`, `[days and hours]`). Use 2 to 4 chips per demo, where a real site would say the fact (trust bar, hero sub, a short section line). Never put one in a quote, an H1 or the SEO title.
  - **On the strategy page:** a `strategy.unverified` section appears below the fold, `{heading, intro, items: [{fact, why}], closing}`, with one item per chip. Each item has a one-line "why it matters to the homeowner", and the closing line is "This is what our onboarding call nails down."

The weekend Wichita 12 split this about half and half, balanced across trades and score box on/off. Tag the GHL contact `v-unverified-on` or `v-unverified-off` along with the box tag. Brief: the writer adds chips only after the fact-check passes, and the checker must still give 0 fail.
