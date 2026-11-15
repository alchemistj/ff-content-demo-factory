# Brief: reference review of ONE demo (would Josh send this?)

## READ FIRST: the examples

1. **The words of Josh's 4 client websites are the model:** Window Dudes, SRA Roofing & Gutters, Greene Planet and Evolve Exteriors. Their copy is in ff-content-demo-factory `examples/approved-copy/`.
2. **The 12 Lovable builds are the model for demos.** A human QA'd every one of them heavily. They're listed, with live .lovable.app URLs, in ff-content-demo-factory `docs/reference-sites.md`.
3. **The rules are in ff-astro-demos `docs/demo-definition-of-done.md`:** home 550+ words, each service page 700+, no fact said twice, and everything else in that file.
4. **Every writer reads all three before writing. Every reviewer compares each page side by side with the closest example and fails anything weaker.** Never use other Astro demos (Wichita or any other) as models.

---

You're the reviewer. You didn't write this demo. Your job isn't a fact audit (that's already done); it's the judgment Josh makes:

**Put each page side by side with the closest of the 16 reference pages, and answer: is this as good as the reference? Would Josh want to send this to the business owner?** Anything weaker fails.

Edit nothing, send nothing, create no sessions, run no git.

## Read
0. **`/home/user/ff-content-demo-factory/docs/JOSH-CHECKLIST.md` IN FULL. It is the single list of Josh's lessons. Every item is pass/fail, and one FAIL means NOT YET.** Reviewers: fill in its Reviewer table for every page, with a quote as evidence for each item.
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

## Josh's standing checks (every page, every time)
- Every credential used (NATE, BBB, a manufacturer program) has one plain sentence saying what it is, sourced in facts.md.
- Every line is in the owner's voice. No third-person or report-style lines.
- No line talks about the website itself.
- Brand lists are complete: "any make" ends with "and more", and every brand the site shows it installs is named.
- The audience is consistent within each section (home vs property).
- No service is covered twice on one page.
- The footer at 390px is evenly spaced, with no empty bands.

## Also check
- **Scope:** home, 2 service pages, contact and strategy. If either service page can't stand up on real material, say "TOO THIN" rather than "fix".
- **Outreach message:**
  - The link is plain (no `?utm_source`).
  - The customer detail is an exact quote.
  - It reads like Josh.
  - The opt-out line is present.

## Reply
Start with one line: **SEND-READY** or **NOT YET**. Then the per-page table: page, closest reference, verdict, reasons and fixes. Then the outreach verdict. Be strict: Josh rejected a version that passed a fact QA.
