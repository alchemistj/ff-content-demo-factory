# Reference sites: the quality bar

Status: lookup, 2026-11-15. ASSIGNMENT.md (line 72) says the quality bar is "the 16 reference sites (12 Lovable builds Josh QA'd by hand, plus 4 client sites), listed in `docs/reference-sites.md`." This file is that list.

What is confirmed and what is not:

- **Client examples (4): confirmed.** Window Dudes, SRA Roofing & Gutters, Greene Planet and Evolve Exteriors are the four model sites. Evolve's copy is in `examples/approved-copy/evolve-exteriors/homepage.md`, but `examples/approved-copy/README.md` and `SOURCE_MANIFEST.md` list only the first three. Evolve is missing from both.
- **Lovable builds (12): 10 confirmed, 2 open.** Ten repos each carry `docs/demo-standard/upgrade-standard.md`, which says "Josh QA'd the words, Charis QA'd the design." Those ten are listed as confirmed below. No file in any repo or doc lists the exact twelve. The last two slots are open. The candidates are in the section "Open Lovable slots" and none is confirmed.
- **Do not confuse with the approved-copy pages.** `examples/approved-copy/` holds twelve customer-facing pages. Those are four pages for each of the three Springfield sites (Window Dudes, SRA, Greene Planet). They are not twelve Lovable sites.

Paths are relative to the root of each local checkout. The local checkouts are in `/home/user/<repo>`. The `.lovable.app` URLs come from each repo's README where one exists, and otherwise from `ff-content-demo-factory/outreach/lovable-forms-2026-11-13.json` (`demoUrl`). No Vercel preview URL is recorded for any Lovable site.

## The 16

| # | Name | Trade | Group | Local repo | Live or preview URL | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | A&D Mechanical | Plumbing, heating and AC | Lovable | `/home/user/ad-mechanical-services` | https://ad-mechanical-services.lovable.app | Confirmed: `docs/demo-standard/upgrade-standard.md` line 5 ("Josh QA'd the words"); "A&D" in the checklist batch line (`ff-2-demos/docs/josh-demo-checklist.md` line 3); "A&D plumbing" in `ff-astro-demos/docs/demo-definition-of-done.md` |
| 2 | All-Phase Electric | Electrical (Nixa, MO) | Lovable | `/home/user/all-phase-electric` | https://all-phase-electric.lovable.app | Confirmed: `docs/demo-standard/upgrade-standard.md` line 5 ("Josh QA'd the words") |
| 3 | Brown Professional Services | Commercial cleaning (Springfield, MO) | Lovable | `/home/user/brown-professional-services` | https://brown-professional-services.lovable.app (shared host `brown-professional-services.demos.fluidframemarketing.com`, cited but not verified) | Confirmed: `upgrade-standard.md` line 5; named as "the approved Brown demo" in `ff-architect/docs/sop/demo-build-lessons.md` and `ff-astro-demos/docs/demo-definition-of-done.md` |
| 4 | Imperial Landscaping | Landscaping, lawn care, patio | Lovable | `/home/user/imperial-landscaping` | https://imperial-landscaping.lovable.app | Confirmed: `upgrade-standard.md` line 5 |
| 5 | Jon's Plumbing | Plumbing, backflow testing | Lovable | `/home/user/jons-plumbing` | https://jons-plumbing.lovable.app | Confirmed: `upgrade-standard.md` line 5; "Jon's" in the checklist batch line |
| 6 | Stokes Fence Co | Fence contractor | Lovable | `/home/user/stokes-fence-co` | https://stokes-fence-co.lovable.app | Confirmed: `upgrade-standard.md` line 5; "Stokes" in the checklist batch line |
| 7 | Stone Electric | Electrical, commercial, Generac, solar | Lovable | `/home/user/stone-electric-llc` | https://stone-electric-llc.lovable.app | Confirmed: `upgrade-standard.md` line 5; "Stone" in the checklist batch line |
| 8 | SWMO Lawn | Lawn care, landscaping, irrigation | Lovable | `/home/user/swmo-lawn-mockup` | https://swmo-lawn-mockup.lovable.app | Confirmed: `upgrade-standard.md` line 5; "approved Lovable demos (Brown Professional Services, SWMO)" in `ff-astro-demos/docs/demo-definition-of-done.md` |
| 9 | Take A Break Cleaning | Residential and commercial cleaning | Lovable | `/home/user/take-a-break-cleaning` | https://take-a-break-cleaning.lovable.app | Confirmed: `upgrade-standard.md` line 5; "Take A Break" in the checklist batch line |
| 10 | Your Choice Lawncare | Lawn care, fertilization, mosquito control | Lovable | `/home/user/your-choice-lawncare` | https://your-choice-lawncare.lovable.app | Confirmed: `upgrade-standard.md` line 5; "Your Choice" in the checklist batch line |
| 11 | Window Dudes | Windows and doors (Springfield, MO) | Client | `/home/user/window-dudes` | https://www.windowdudesllc.com (live) | Confirmed: `examples/approved-copy/README.md` and `SOURCE_MANIFEST.md` (canonical `main` @ `5a3019ac`) |
| 12 | SRA Roofing & Gutters | Roofing and gutters (Springfield, MO) | Client | `/home/user/sra-roofing-website` | https://sra-roofing-website-mlulb84dr-josh-lenzs-projects.vercel.app (reviewed preview); live www.sraroofs.com | Confirmed: `examples/approved-copy/README.md` and `SOURCE_MANIFEST.md` (preview SHA `fde339ca`) |
| 13 | Greene Planet | Mold inspection and remediation (Springfield, MO) | Client | `/home/user/greene-planet-website` | https://greene-planet-website.vercel.app (canonical render; not the Duda site) | Confirmed: `examples/approved-copy/README.md` and `SOURCE_MANIFEST.md` (`main` @ `f9047501`) |
| 14 | Evolve Exteriors | Exterior remodeling: windows, siding, patio doors (Wichita, KS) | Client | none local (`ff-astro-demos` holds the demo) | none recorded | Confirmed by `ASSIGNMENT.md` line 72 and `examples/approved-copy/evolve-exteriors/homepage.md`. Not listed in the approved-copy README or manifest. |
| 15 | Ozark Chiropractic | Chiropractic (Ozark, MO) | Lovable (candidate) | `/home/user/ozark-chiropractic-mockup` | https://ozark-chiropractic-mockup.lovable.app | Candidate: see "Open Lovable slots" |
| 16 | Shanna Powell Glow | Health coaching, peptide therapy (Springfield, MO) | Lovable (candidate) | `/home/user/shanna-powell-glow` | https://shanna-powell-glow.lovable.app | Candidate: see "Open Lovable slots" |

## Open Lovable slots (the 12th and 11th)

None of these five is confirmed as one of Josh's QA'd builds. None has a `docs/demo-standard/upgrade-standard.md` QA note. Each is a Lovable export with a live `.lovable.app` URL.

| Name | Trade | Local repo | URL | Why it is a candidate | Concern |
| --- | --- | --- | --- | --- | --- |
| Ozark Chiropractic | Chiropractic | `/home/user/ozark-chiropractic-mockup` | https://ozark-chiropractic-mockup.lovable.app | README carries the same "LOVABLE BUILD RULES v2026.7" header as Imperial and Stokes, which are QA'd. Listed in the Lovable outreach batch. | No QA note in the repo or docs. |
| Shanna Powell Glow | Health coaching, peptide therapy | `/home/user/shanna-powell-glow` | https://shanna-powell-glow.lovable.app | Same v2026.7 README header. Listed in the Lovable outreach batch. | No QA note in the repo or docs. |
| B and B Towing | Towing, ASE mechanic | `/home/user/b-and-b-towing` | https://b-and-b-towing.lovable.app | Lovable export. Listed in the outreach batch. | Routes name Westbrook, ME, which does not fit the Missouri set. |
| Second to None Exteriors | Roofing (O'Fallon, MO) | `/home/user/second-to-none-exteriors` | https://second-to-none-exteriors.lovable.app | Lovable export. Listed in the outreach batch. | No QA note. |
| Sims Law | Probate and estate-planning law (Springfield, MO) | `/home/user/sims-law-blueprint` | https://sims-law-blueprint.lovable.app | Lovable export. Listed in the outreach batch. | The outreach file says the demo form is "visual only" and the real site has no form. No QA note. |

Ozark and Shanna are the strongest candidates, on the README header only. Josh needs to name the last two.

## Copy files and routes

Routing: the Vite repos wire routes in the file named under "Route wiring". "/" is the strategy page (`DemoStrategyPage`) unless noted. "/home" is the business homepage. Reviews and trust-bar data sit in `src/data/`.

### 1. A&D Mechanical (`/home/user/ad-mechanical-services`)
- Homepage: `src/pages/Index.tsx` (served at `/home`)
- Strategy: `src/pages/DemoStrategyPage.tsx`, data `src/data/demoStrategyData.ts`
- Reviews: `src/data/reviews.ts`
- Service pages: none built. `src/lib/site.ts` and `src/pages/Index.tsx` link to `/plumbing-services-springfield-mo` and `/heating-ac-service-springfield-mo`, but no route or page file exists for either. Flag this before writing.
- Routes: `/`, `/home`, `*` (404). Route wiring: `src/components/HeroStage.tsx`

### 2. All-Phase Electric (`/home/user/all-phase-electric`, TanStack Router)
- Strategy: `src/routes/index.tsx` (uses `src/components/site/DemoStrategyPage`)
- Homepage: `src/routes/home.tsx`
- Service pages: `src/routes/electrical-panel-upgrade-nixa-mo.tsx`, `src/routes/commercial-electrician-nixa-mo.tsx`
- Contact: `src/routes/contact.tsx`
- Copy data: `src/data/site.ts`, `src/data/reviews.ts`, `src/data/demoStrategyData.ts`
- Routes: `/`, `/home`, `/electrical-panel-upgrade-nixa-mo`, `/commercial-electrician-nixa-mo`, `/contact`. Root layout: `src/routes/__root.tsx`

### 3. Brown Professional Services (`/home/user/brown-professional-services`)
- Strategy: `src/pages/DemoStrategyPage.tsx`, data `src/data/demoStrategyData.ts`
- Homepage: `src/pages/Home.tsx`
- Service pages: `src/pages/WindowCleaning.tsx`, `src/pages/CarpetCleaning.tsx`
- Contact: `src/pages/Contact.tsx`
- Reviews: `src/data/pageReviews.ts`
- Routes: `/`, `/home`, `/commercial-window-cleaning-springfield-mo`, `/commercial-carpet-cleaning-springfield-mo`, `/contact`. Route wiring: `src/routes.tsx`

### 4. Imperial Landscaping (`/home/user/imperial-landscaping`)
- Strategy: `src/pages/DemoStrategyPage.tsx`, data `src/data/demoStrategyData.ts`
- Homepage: `src/pages/Home.tsx`
- Service pages: `src/pages/LawnCare.tsx`, `src/pages/Patio.tsx`
- Contact: `src/pages/Contact.tsx`
- Reviews: `src/data/reviews.ts`
- Routes: `/`, `/home`, `/lawn-care-services-springfield-mo`, `/patio-installation-springfield-mo`, `/contact`. Route wiring: `src/components/PageRoutes.tsx`

### 5. Jon's Plumbing (`/home/user/jons-plumbing`)
- Strategy: `src/pages/DemoStrategyPage.tsx`, data `src/data/demoStrategyData.ts`
- Homepage: `src/pages/Home.tsx`
- Service pages: `src/pages/SpringfieldPlumber.tsx`, `src/pages/BackflowTesting.tsx`
- Contact: `src/pages/Contact.tsx`
- Data: `src/data/trustBar.ts`, `src/data/reviews.ts`
- Routes: `/`, `/home`, `/plumber-springfield-mo`, `/backflow-testing-repair-springfield-mo`, `/contact`. Route wiring: `src/components/HeroStage.tsx`

### 6. Stokes Fence Co (`/home/user/stokes-fence-co`)
- Strategy: `src/pages/DemoStrategyPage.tsx`, data `src/data/demoStrategyData.ts`
- Homepage, service pages and contact are all in one file: `src/pages/StokesPages.tsx` (`HomePage`, `PrivacyFencePage`, `LivestockFencePage`, `ContactPage`)
- Copy data: `src/data/stokesContent.ts`, `src/data/reviews.ts`
- Routes: `/`, `/home`, `/privacy-fence-springfield-mo`, `/livestock-fence-springfield-mo`, `/contact`. Route wiring: `src/components/HeroStage.tsx`

### 7. Stone Electric (`/home/user/stone-electric-llc`)
- Strategy: `src/pages/DemoStrategyPage.tsx`, data `src/data/demoStrategyData.ts`
- Homepage: `src/pages/Home.tsx`
- Service pages: `src/pages/Commercial.tsx`, `src/pages/Generac.tsx`, `src/pages/Solar.tsx`
- Contact: `src/pages/Contact.tsx`
- Reviews: `src/data/siteReviews.ts`
- Routes: `/`, `/home`, `/commercial-electrical-springfield-mo`, `/generac-generator-springfield-mo`, `/solar-installation-springfield-mo`, `/contact`. Route wiring: `src/PageRoutes.tsx`

### 8. SWMO Lawn (`/home/user/swmo-lawn-mockup`)
- Strategy: `src/pages/DemoStrategyPage.tsx`, data `src/data/demoStrategyData.ts`
- Homepage: `src/pages/Index.tsx`
- Service pages: `src/pages/Landscaping.tsx`, `src/pages/Irrigation.tsx`
- Contact: `src/pages/Contact.tsx`
- Reviews: `src/data/reviews.ts`
- Routes: `/`, `/home`, `/landscaping-springfield-mo`, `/irrigation-installation-springfield-mo`, `/contact`. Route wiring: `src/components/HeroStage.tsx`

### 9. Take A Break Cleaning (`/home/user/take-a-break-cleaning`)
- Strategy: `src/pages/DemoStrategyPage.tsx`, data `src/data/demoStrategyData.ts`
- Homepage: `src/pages/Index.tsx`
- Service pages: `src/pages/Residential.tsx`, `src/pages/Commercial.tsx`
- Contact: `src/pages/Contact.tsx`
- Reviews: `src/data/reviews.ts`
- Routes: `/`, `/home`, `/residential-cleaning`, `/commercial-cleaning`, `/contact`. Route wiring: `src/components/HeroStage.tsx`

### 10. Your Choice Lawncare (`/home/user/your-choice-lawncare`)
- Strategy: `src/pages/DemoStrategyPage.tsx`, data `src/data/demoStrategyData.ts`
- Homepage: `src/pages/Home.tsx`
- Service pages: `src/pages/Fertilization.tsx`, `src/pages/Mosquito.tsx`
- Contact: `src/pages/Contact.tsx`
- Reviews: `src/data/reviews.ts`
- Routes: `/`, `/home`, `/fertilization`, `/mosquito-control`, `/contact`. Route wiring: `src/components/HeroStage.tsx`

### 11. Window Dudes (client, `/home/user/window-dudes`, Astro)
- Homepage: `src/pages/index.astro`
- Service pages: `src/pages/springfield/[slug].astro` (dynamic). Copy source: `src/config/contentSource.ts`
- Contact: `src/pages/contact.astro`
- Approved copy (reference, not the repo): `examples/approved-copy/window-dudes/homepage.md`, `springfield-glass-repair.md`, `springfield-replacement-window-installation.md`, `contact.md`
- Routes: `/`, `/springfield/replacement-window-installation/`, `/springfield/glass-repair/`, `/contact/`

### 12. SRA Roofing & Gutters (client, `/home/user/sra-roofing-website`, Astro)
- Springfield homepage: `astro/pages/springfield/index.astro` (a wrapper that renders through `astro/layouts/PublishedRoute.astro`). The copy is not in the wrapper. The likely copy files are `astro/components/pages/SpringfieldCityPage.astro` and `astro/components/pages/HomePage.astro`. I did not trace the render chain, so confirm before relying on either.
- Roof replacement: `astro/pages/springfield/[slug].astro` (dynamic)
- Roof maintenance: `astro/pages/springfield/roof-maintenance.astro`, `astro/components/pages/RoofMaintenancePage.astro`
- Contact: `astro/pages/springfield/contact.astro`
- Approved copy (reference): `examples/approved-copy/sra/springfield-homepage.md`, `springfield-roof-replacement.md`, `springfield-roof-maintenance.md`, `springfield-contact.md`, `_chrome.md`
- Routes: `/springfield/`, `/springfield/roof-replacement/`, `/springfield/roof-maintenance/`, `/springfield/contact/`

### 13. Greene Planet (client, `/home/user/greene-planet-website`, Astro)
- Homepage: `src/pages/index.astro` (renders `HomePage` from `src/views/`). Copy: `src/content/pages/index.ts`
- Service pages: `src/content/pages/mold-inspection-testing.ts`, `src/content/pages/black-mold-remediation.ts`, via the dynamic `src/pages/springfield/[slug].astro`
- Contact: `src/pages/springfield/contact.astro`
- Approved copy (reference): `examples/approved-copy/greene-planet/homepage.md`, `springfield-mold-inspection-testing.md`, `springfield-black-mold-remediation.md`, `springfield-contact.md`, `_chrome.md`
- Routes: `/` (homepage, not `/springfield/`), `/springfield/mold-inspection-testing/`, `/springfield/black-mold-remediation/`, `/springfield/contact/`

### 14. Evolve Exteriors (client, no local repo)
- Homepage (approved copy): `examples/approved-copy/evolve-exteriors/homepage.md`. This is the only Evolve page in the approved set.
- Full words package: `ff-astro-demos/templates/demo/fixtures/evolve.words.json`
- Built demo: `ff-astro-demos/clients/evolve/dist/` (HTML only; the source is not in the checkout)
- Routes (from the built demo): `/`, `/home/`, `/contact/`, `/window-replacement-wichita-ks/`, `/siding-patio-doors-wichita-ks/`

### 15. Ozark Chiropractic (candidate, `/home/user/ozark-chiropractic-mockup`)
- Homepage: `src/pages/Home.tsx`. Service pages: `src/pages/SportsInjury.tsx`, `src/pages/Sciatica.tsx`. Contact: `src/pages/Contact.tsx`.
- Routes (`src/App.tsx`): `/`, `/sports-injury-chiropractor-ozark-mo`, `/sciatica-treatment-ozark-mo`, `/contact`. No strategy page.

### 16. Shanna Powell Glow (candidate, `/home/user/shanna-powell-glow`)
- Homepage: `src/pages/Index.tsx`. Service pages: `src/pages/Peptide.tsx`, `src/pages/HealthCoach.tsx`. Contact: `src/pages/Contact.tsx`.
- Routes (`src/App.tsx`): `/`, `/peptide-therapy-springfield-mo`, `/health-coach-women-springfield-mo`, `/contact`. No strategy page.

### Other candidates (not ranked above the two above)
- B and B Towing (`/home/user/b-and-b-towing`): `src/pages/Index.tsx`; `src/pages/HeavyDutyTowing.tsx`, `src/pages/AseMechanic.tsx`; `src/pages/Contact.tsx`. Routes: `/`, `/heavy-duty-towing-westbrook-me`, `/ase-certified-mechanic-westbrook-me`, `/contact`.
- Second to None Exteriors (`/home/user/second-to-none-exteriors`): `src/pages/Lander.tsx` (`/`), `src/pages/Index.tsx` (`/home`), `src/pages/RoofReplacement.tsx`, `src/pages/StormDamage.tsx`, `src/pages/Contact.tsx`. Routes from `src/lib/site.ts`: `/`, `/home`, `/roof-replacement-ofallon-mo`, `/roof-repair-ofallon-mo`, `/contact`.
- Sims Law (`/home/user/sims-law-blueprint`, TanStack Router): `src/routes/index.tsx` (`/`), `src/routes/home.tsx`, `src/routes/probate-attorney-springfield-mo.tsx`, `src/routes/estate-planning-springfield-mo.tsx`, `src/routes/contact.tsx`.

## Route wiring reference
- A&D Mechanical: `src/components/HeroStage.tsx`
- All-Phase Electric: `src/routes/*.tsx` (TanStack file routes)
- Brown: `src/routes.tsx`
- Imperial: `src/components/PageRoutes.tsx`
- Jon's, Stokes, SWMO, Take A Break, Your Choice: `src/components/HeroStage.tsx`
- Stone: `src/PageRoutes.tsx`
- Ozark, Shanna, B and B: `src/App.tsx`
- Second to None: `src/App.tsx` plus the `ROUTES` constant in `src/lib/site.ts`

## Open items for Josh
1. Name the last two Lovable builds (the QA'd twelve). Ozark and Shanna are the strongest candidates.
2. Add Evolve to `examples/approved-copy/README.md` and `SOURCE_MANIFEST.md`. The Evolve folder exists, but both documents omit it.
3. Confirm the A&D Mechanical service routes. The links point at pages that are not wired.
4. Confirm the SRA Springfield homepage copy file. Only the route wrapper has been traced.
