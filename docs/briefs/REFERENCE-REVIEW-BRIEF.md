# Brief: reference review of ONE demo (would Josh send this?)

You're the reviewer. You didn't write this demo. Your job isn't a fact audit (that's already done); it's the judgment Josh makes:

**Put each page side by side with the closest of the 16 reference pages, and answer: is this as good as the reference? Would Josh want to send this to the business owner?** Anything weaker fails.

Edit nothing, send nothing, create no sessions, run no git.

## Read
1. **Josh's automatic fails:** `/home/user/ff-content-demo-factory/ASSIGNMENT.md`, section "Demo copy (Josh's standing rules, 2026-11-15)". Any hit is a FAIL.
2. **The references** (listed in `docs/reference-sites.md`). Read in full the ones you compare against:
   - Client sites: `examples/approved-copy/sra/`, `window-dudes/`, `greene-planet/`, `evolve-exteriors/`.
   - Lovable builds:
     - `/home/user/ad-mechanical-services/src/pages/Index.tsx` (HVAC homepage);
     - `/home/user/all-phase-electric/src/routes/` (home and two service pages, with `src/data/site.ts`);
     - `/home/user/jons-plumbing/src/pages/` (Home, SpringfieldPlumber, BackflowTesting);
     - `/home/user/stone-electric-llc/src/pages/` (Home, Generac).
3. **The demo:** `prospects/<folder>/words.json` (every page), `outreach.md`, and `facts.md` and `reviews.json` for spot checks.
4. **If a preview URL is given:** open every page at 390×844 and 1440×900 with Playwright (`require('playwright')`, `chromium.launch()`). Look at every photo: no blank props (blank clipboard, blank sign or paper), no `tech-at-door` or `furnace-hero` image, no text over a face, nothing that looks fake.

## For each page, write
- **The closest reference page**, and one line on what it does well.
- **Verdict: AS GOOD / WEAKER**, with the specific reasons (quote the demo's words). Check:
  - Does the page say in its first lines why to hire this company?
  - Is every claim specific to this business, or could any competitor print it?
  - Are reviews used as exact quotes that prove a point? (Summaries are an automatic fail.)
  - Does every paragraph deliver its heading?
  - Is there filler, explainer or blog content?
  - Any forced metaphor?
  - Is the lead fee-first?
  - Is any advice odd?
  - Would the owner read it and think "that's us"?
- For WEAKER pages, list exactly what to change.

## Also check
- **Scope:** home, 2 service pages, contact and strategy. If either service page can't stand up on real material, say "TOO THIN" rather than "fix".
- **Outreach message:**
  - The link is plain (no `?utm_source`).
  - The customer detail is an exact quote.
  - It reads like Josh.
  - The opt-out line is present.

## Reply
Start with one line: **SEND-READY** or **NOT YET**. Then the per-page table: page, closest reference, verdict, reasons and fixes. Then the outreach verdict. Be strict: Josh rejected a version that passed a fact QA.
