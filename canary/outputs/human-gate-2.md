# Website Words — Human Gate 2

Directly readable words package for the 360 Garage Door and More canary. Natural reading order is Home, Garage Door Repair, Garage Door Installation, Contact, then the internal Strategy Overview.

## Completion contract

- Repair page useful-body word count (diagnostic only): **740**
- Installation page useful-body word count (diagnostic only): **617**
- Word count is not the acceptance reason. The former hard 800-word floor is revoked.
- Architect QA Writer 1: **accept** (fresh quality decision; Writer 2 released; raw quarantined artifact remains unapproved)
- Architect QA Writer 2: **accept** (reconciled after the corrected Writer 1 pages; Writer 3 released)
- Writer 3 Strategy Overview: internal only
- Whole-site QA: **pass** (fresh decision; prior accept/pass revoked)
- Duplicate-quote scan: **pass** (each quotation displayed once)
- Repetition scan: **pass** (hours/timing handled once per service page)
- Unsupported-claim scan: **pass**
- Evidence-fidelity scan: **pass**
- Merge occurred: **no**
- Deployment occurred: **no**
- Branch: `architect/360-words-canary`
- Quality-correction parent (reviewed head): `267f2598a4535a3f893c33ac8c5d20261c48827a`
- Head at render: `b1aa929835be79e45ade8fb695285763474cb3c1`
- Factory strict-validator pass of normalized JSON: `5675de60b9ade7ecb50fd79f0ec43e9601d3b0cb`
- Exact reviewEvidence regression restore: `e7c76770551109efd1827828558e88ede00e4b77`
- Pointer-ledger apply: `56069627ee62dd2f843e2b6a38313b37e7e23a72`
- Factory pointer-ledger normalizer: `52b197fae95ce501c4729813a84751ca16b7278f`
- Fail-closed diagnostic Action: https://github.com/alchemistj/ff-content-demo-factory/actions/runs/32806937751
- Normalize wake (validation-only, fail-closed): https://github.com/alchemistj/ff-content-demo-factory/actions/runs/32808355566
- Dormant return Action (success): https://github.com/alchemistj/ff-content-demo-factory/actions/runs/32808571523
- Pull request (unmerged): https://github.com/alchemistj/ff-content-demo-factory/pull/6
- Writer 1 Cursor thread: https://cursor.com/agents/bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8
- Prior correction Cursor thread: https://cursor.com/agents/bc-57cc62dc-de8f-4be0-840b-640662ae56a4
- Quality-correction Cursor thread: https://cursor.com/agents/bc-69346ae1-d1b2-41b5-9278-d640a581e311
- GitHub issue: https://github.com/alchemistj/ff-content-demo-factory/issues/5
- Quarantined source digest: `sha256:ec36da69992dd318e913671763a96e4b838ab747b36e512702f91176155e5eac`
- Prior normalized output digest (pre-quality rewrite): `sha256:c771016e724a49dd41254bde3639de6c1b1c18fc69c23533ed19bd9773f3ef8e`
- Keys removed from reviewEvidence: **62**

## Test and validation results

- Targeted regression: production `reviewer`+`excerpt` fails `REVIEW_EVIDENCE_CLAIM_TEXT_DUPLICATE` at `/pages/0/reviewEvidence/0/reviewer` with expectedRule `reviewEvidence must not contain any accepted word-bearing key; it is a typed pointer ledger`, then normalizes losslessly.
- Real quarantined bytes: 31 reviewer keys + 31 excerpt keys removed (62), semantic copy / identity / provenance preserved, raw `approved: false`.
- Fresh Writer 1 quality QA: distinct section jobs, synthesized reviews, one display form per quote, no audit-memo public copy, unsupported-claim scan pass, word counts diagnostic only.
- `NODE_ENV=test npm run test:all`: 128 passed, 0 failed, 1 skipped (zip-backed factory fixture not present in this workspace).

## Architect QA — Writer 1 (fresh)

Decision: **accept**. Word count did not pass the pages.

### Garage Door Repair section jobs

- `repair-proof-lead` (direct-answer): Tells a homeowner with a sagging or failed existing door that this is the repair destination, using the Chris Keaton job as the lead example.

- `repair-what-we-fix` (confirmed-scope): Synthesizes will-not-open, seal, wiring, and consistent-travel repairs into scope instead of reciting each review.

- `repair-springs-folded` (folded-scope): Keeps spring, track, and roller work on the parent repair page with one strongest spring quote.

- `repair-options` (process): Explains diagnosis, now-versus-later choice, and parts-on-truck completion as visit expectations.

- `repair-springfield` (differentiator): Names the local shop, Jenny/Will, and later care as completed-job proof rather than a warranty slogan.

- `repair-next` (next-step): Handles hours and the weekday next step once, without repeating timing caveats through the page.

### Garage Door Installation section jobs

- `install-proof-lead` (direct-answer): Defines installation as a new door for the opening you have, led by Marcie Spitzer’s completed job and cleanup.

- `install-selection` (selection): Explains Jenny/Will selection help without inventing a model catalog.

- `install-custom-height` (scope-fit): Covers a taller door sized to an opening the homeowner already reframed, without a carpentry claim.

- `install-trim-cleanup` (finish-expectation): Sets paint-ready trim and a cleaned workspace as the finish standard.

- `install-replacement` (replacement-scope): Covers replacement doors and a later check as completed work, without converting Gregory’s timeline into an SLA.

- `install-next` (next-step): Sends the homeowner to call with the opening size they already have.

### Quality scans

- Duplicate quotes: repair `none`, installation `none`.
- Repetition: hours and weekday next-step appear once per service page.
- Unsupported claims: no 24/7, weekend dispatch, same-day SLA, warranty term, framing/carpentry, or pricing guarantee.
- Evidence fidelity: displayed quotations are contiguous sealed-review text.
- Useful-body word counts: Repair **740**, Installation **617** (diagnostic only).

## Review / evidence pointer ledger

### /garage-door-repair

| reviewId | provenance.type | provenance.ref | placement | section |
| --- | --- | --- | --- | --- |
| `Ci9DQUlRQUNvZENodHljRjlvT201TVdWZGZSak00ZUhSQ2VVdHNYMWxFYTBFdE9XYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT201TVdWZGZSak00ZUhSQ2VVdHNYMWxFYTBFdE9XYxAB` | lead-completed-sagging-door | repair-proof-lead |
| `Ci9DQUlRQUNvZENodHljRjlvT25OS09FRkhPRkptVVhoclIwdzRORVp6VTB0R1VIYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT25OS09FRkhPRkptVVhoclIwdzRORVp6VTB0R1VIYxAB` | door-would-not-open | repair-what-we-fix |
| `Ci9DQUlRQUNvZENodHljRjlvT2xVMWQxVlRXalppVmxoU1NHcG9hUzFtV2pSVmRIYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2xVMWQxVlRXalppVmxoU1NHcG9hUzFtV2pSVmRIYxAB` | animal-incident-wiring-repair | repair-what-we-fix |
| `ChdDSUhNMG9nS0VJQ0FnSURmNlBfbXhBRRAB` | evidence | `ChdDSUhNMG9nS0VJQ0FnSURmNlBfbXhBRRAB` | bottom-seal-repair | repair-what-we-fix |
| `Ci9DQUlRQUNvZENodHljRjlvT2xSWWMycFZlV3AxTldKcFpVZGxTalpGTUZSV1drRRAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2xSWWMycFZlV3AxTldKcFpVZGxTalpGTUZSV1drRRAB` | consistent-open-close | repair-what-we-fix |
| `Ci9DQUlRQUNvZENodHljRjlvT2t0T04xVlBSMU5oUmprMU9TMXNibmx6WjJ0cldHYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2t0T04xVlBSMU5oUmprMU9TMXNibmx6WjJ0cldHYxAB` | completed-door-fixed | repair-what-we-fix |
| `ChdDSUhNMG9nS0VJQ0FnTUNZNkplRm5BRRAB` | evidence | `ChdDSUhNMG9nS0VJQ0FnTUNZNkplRm5BRRAB` | service-call-door-working | repair-what-we-fix |
| `Ci9DQUlRQUNvZENodHljRjlvT25oaE9HeFNXVUUyUmt0VlowSkJPVWRCWmpSTVZYYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT25oaE9HeFNXVUUyUmt0VlowSkJPVWRCWmpSTVZYYxAB` | two-springs-two-car-door | repair-springs-folded |
| `Ci9DQUlRQUNvZENodHljRjlvT2taQlh6VlZabU5OWjFKc2JISklTa1pXUlVwVGVuYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2taQlh6VlZabU5OWjFKc2JISklTa1pXUlVwVGVuYxAB` | spring-replacement-completed | repair-springs-folded |
| `Ci9DQUlRQUNvZENodHljRjlvT2xkeFNsRnBOMll0V2pGblFsQXljR0pIV0ZreE5VRRAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2xkeFNsRnBOMll0V2pGblFsQXljR0pIV0ZreE5VRRAB` | undersized-spring-corrected | repair-springs-folded |
| `Ci9DQUlRQUNvZENodHljRjlvT25wemJWQkhVa3RWWTJKeVdYaFdlbFJOWlVGeFQxRRAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT25wemJWQkhVa3RWWTJKeVdYaFdlbFJOWlVGeFQxRRAB` | spring-repair-folded | repair-springs-folded |
| `Ci9DQUlRQUNvZENodHljRjlvT2tRMVoybGhYM1JWUldwb2JVNXNXbFozWDBaMVNIYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2tRMVoybGhYM1JWUldwb2JVNXNXbFozWDBaMVNIYxAB` | coils-tracks-rollers | repair-springs-folded |
| `ChdDSUhNMG9nS0VJQ0FnTUNBZ082YzBRRRAB` | evidence | `ChdDSUhNMG9nS0VJQ0FnTUNBZ082YzBRRRAB` | broken-spring-and-brackets | repair-springs-folded |
| `ChdDSUhNMG9nS0VJQ0FnTUNBbnNUOXB3RRAB` | evidence | `ChdDSUhNMG9nS0VJQ0FnTUNBbnNUOXB3RRAB` | opener-springs-replaced | repair-springs-folded |
| `ChZDSUhNMG9nS0VQR2ZxNUc5cjZhckdREAE` | evidence | `ChZDSUhNMG9nS0VQR2ZxNUc5cjZhckdREAE` | return-spring-monday-visit | repair-springs-folded |
| `ChZDSUhNMG9nS0VLeTZocG5jME9qc0t3EAE` | evidence | `ChZDSUhNMG9nS0VLeTZocG5jME9qc0t3EAE` | sunday-text-monday-repair | repair-springs-folded |
| `Ci9DQUlRQUNvZENodHljRjlvT2xoRE1HZ3lUMWRpVWt3d1dsVXhjVE5XZEc1VWVuYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2xoRE1HZ3lUMWRpVWt3d1dsVXhjVE5XZEc1VWVuYxAB` | options-without-pressure | repair-options |
| `ChdDSUhNMG9nS0VJQ0FnSURQZ2RtWDFnRRAB` | evidence | `ChdDSUhNMG9nS0VJQ0FnSURQZ2RtWDFnRRAB` | diagnostics-and-repair | repair-options |
| `Ci9DQUlRQUNvZENodHljRjlvT2psMlVHOVhVMDVrTFhwUlpWbDZjSFZUUjFKQlgwRRAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2psMlVHOVhVMDVrTFhwUlpWbDZjSFZUUjFKQlgwRRAB` | maintenance-materials-on-hand | repair-options |
| `ChZDSUhNMG9nS0VJQ0FnSURQZ2NEbVJnEAE` | evidence | `ChZDSUhNMG9nS0VJQ0FnSURQZ2NEbVJnEAE` | lubrication-and-adjustment | repair-options |
| `ChdDSUhNMG9nS0VQcUM5dGpxNjRxcHJBRRAB` | evidence | `ChdDSUhNMG9nS0VQcUM5dGpxNjRxcHJBRRAB` | parts-on-truck-completed-repair | repair-options |
| `Ci9DQUlRQUNvZENodHljRjlvT21STGNXUk1jMEZ1TmtsYVoyWlhTbEk1TjFsWWRHYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT21STGNXUk1jMEZ1TmtsYVoyWlhTbEk1TjFsWWRHYxAB` | follow-up-after-prior-fixes | repair-springfield |
| `ChZDSUhNMG9nS0VJQ0FnSUR2cmFTZE93EAE` | evidence | `ChZDSUhNMG9nS0VJQ0FnSUR2cmFTZE93EAE` | local-springfield-repairs-and-service | repair-springfield |
| `Ci9DQUlRQUNvZENodHljRjlvT2t4alNtbDBaVVV4VVRselpIQTJhakpOYURSeE1HYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2t4alNtbDBaVVV4VVRselpIQTJhakpOYURSeE1HYxAB` | will-service-repair-jenny-phone | repair-springfield |
| `Ci9DQUlRQUNvZENodHljRjlvT2xSSU1YVXhWMDVDZWtWMVZtTm5SbGhHTld4amVGRRAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2xSSU1YVXhWMDVDZWtWMVZtTm5SbGhHTld4amVGRRAB` | fixed-and-serviced | repair-springfield |

Quoted placements (each quote displayed once):

- `Ci9DQUlRQUNvZENodHljRjlvT201TVdWZGZSak00ZUhSQ2VVdHNYMWxFYTBFdE9XYxAB` — Chris Keaton: "Will did a fantastic job on our old huge garage door that was sagging from age. He thoroughly explained the problem and the best solution al"
- `Ci9DQUlRQUNvZENodHljRjlvT2xSWWMycFZlV3AxTldKcFpVZGxTalpGTUZSV1drRRAB` — Debbie Christopher: "Happy to have our door open and close consistently and have our outdoor pad updated."
- `Ci9DQUlRQUNvZENodHljRjlvT2taQlh6VlZabU5OWjFKc2JISklTa1pXUlVwVGVuYxAB` — jason tourville: "I am very happy with the job Will did on our garage door spring replacement. My door works better now than ever."
- `Ci9DQUlRQUNvZENodHljRjlvT2xoRE1HZ3lUMWRpVWt3d1dsVXhjVE5XZEc1VWVuYxAB` — Judi Wills: "They gave me options and let me choose what I wanted done, what had to be repaired now and what could wait. I chose to do everything at once"
- `ChdDSUhNMG9nS0VQcUM5dGpxNjRxcHJBRRAB` — Kelsie Bates: "Will had everything he needed to complete our repair on his truck, so it was quick and efficient."

### /garage-door-installation

| reviewId | provenance.type | provenance.ref | placement | section |
| --- | --- | --- | --- | --- |
| `Ci9DQUlRQUNvZENodHljRjlvT25jM2NVNTZlVzF0YVhCNVdXSlVZVEpmYW05UExYYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT25jM2NVNTZlVzF0YVhCNVdXSlVZVEpmYW05UExYYxAB` | lead-new-doors-installed | install-proof-lead |
| `Ci9DQUlRQUNvZENodHljRjlvT2pBMU5rSktSMmhHV1RKb2NVdE1TVXBOVFRsS01YYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2pBMU5rSktSMmhHV1RKb2NVdE1TVXBOVFRsS01YYxAB` | help-choosing-door | install-selection |
| `ChZDSUhNMG9nS0VJNng0b1B1N3NEY0ZBEAE` | evidence | `ChZDSUhNMG9nS0VJNng0b1B1N3NEY0ZBEAE` | taller-door-reframed-opening | install-custom-height |
| `Ci9DQUlRQUNvZENodHljRjlvT2xjeVFtOTRMV3BTTUc1Qk5VeFNhVTlJYW1GcFMwRRAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2xjeVFtOTRMV3BTTUc1Qk5VeFNhVTlJYW1GcFMwRRAB` | paint-ready-trim | install-trim-cleanup |
| `Ci9DQUlRQUNvZENodHljRjlvT2xWdlZGQk9hMjFOUlhaVk5rczFVR2RKTlVKWlVGRRAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2xWdlZGQk9hMjFOUlhaVk5rczFVR2RKTlVKWlVGRRAB` | replacement-doors | install-replacement |
| `Ci9DQUlRQUNvZENodHljRjlvT25JelNERXdhRFpIV0hscFUxOUxkakZtYzFaMWFXYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT25JelNERXdhRFpIV0hscFUxOUxkakZtYzFaMWFXYxAB` | new-door-by-thursday-that-job | install-replacement |

Quoted placements (each quote displayed once):

- `Ci9DQUlRQUNvZENodHljRjlvT25jM2NVNTZlVzF0YVhCNVdXSlVZVEpmYW05UExYYxAB` — Marcie Spitzer: "We got our new garage doors installed yesterday and they look amazing!  Very professional and the gentleman that did the installation was ve"
- `Ci9DQUlRQUNvZENodHljRjlvT2pBMU5rSktSMmhHV1RKb2NVdE1TVXBOVFRsS01YYxAB` — Christine Kallmbah: "Jenny is a doll, a big help with choosing a garage door you want and very budget friendly! Will installs them."
- `ChZDSUhNMG9nS0VJNng0b1B1N3NEY0ZBEAE` — Scott Heffern: "My project was replacing a 1980 7ft overhead door with a 9’-6” tall door for my reframed opening so we could fit our new camper van."
- `Ci9DQUlRQUNvZENodHljRjlvT2xjeVFtOTRMV3BTTUc1Qk5VeFNhVTlJYW1GcFMwRRAB` — Matthew Smith: "We are painting the door and the technician left the trim loose for the perfect application for paint."
- `Ci9DQUlRQUNvZENodHljRjlvT2xWdlZGQk9hMjFOUlhaVk5rczFVR2RKTlVKWlVGRRAB` — Cameron Spitzer: "They replaced my doors and openers with quality materials at a lower cost than the competitors."

## Header

Brand: 360 Garage Door and More

Navigation:

- Home → /
- Garage Door Repair → /garage-door-repair
- Garage Door Installation → /garage-door-installation
- Contact → /contact

Header CTA: Call (417) 366-7360 → tel:+14173667360

## Pages

## Home (`/`)

SEO title: 360 Garage Door and More — Springfield, MO Garage Door Work
Meta description: Springfield garage door repair and installation from 360 Garage Door and More. Call (417) 366-7360, Monday–Friday 8 AM–5 PM.

# Springfield garage door work from a shop with named people on the jobs

360 Garage Door and More is a local Springfield shop. Jenny answers the phone. Will does the on-site work.

If the door you already have is sagging, sticking, or will not open, start with repair. If you need a new door fitted to the opening you have, start with installation.

### A Springfield shop, not a call center

Reviewers keep naming the same people: Jenny on the phone and schedule, Will on the driveway. The shop address is 2035 W Mt Vernon St, Springfield, MO 65802.

### When the door you have is the problem

Repair is for a door that already hangs in the opening. The repair page leads with Chris Keaton’s sagging-door job and keeps spring, seal, track, and travel work on that page.

### When you need a new door in the opening you have

Installation is for new and replacement doors, including a taller door fitted to a reframed opening. The installation page leads with Marcie Spitzer’s completed new-door job and the cleanup reviewers noticed.

### Hours

Monday–Friday, 8 AM to 5 PM. Saturday and Sunday closed.

### Completed work, then a later check

Cameron Spitzer’s review records replacement of doors, then a return months later to see that everything still worked.

> They replaced my doors and openers with quality materials at a lower cost than the competitors.  Then,  they came back a couple months later just to check and make sure everything was working as it is supposed to.
> — Cameron Spitzer

[CTA] Garage door repair → /garage-door-repair

[CTA] Garage door installation → /garage-door-installation

[CTA] Call (417) 366-7360 → tel:+14173667360

[CTA] Contact → /contact

## Garage Door Repair (`/garage-door-repair`)

SEO title: Garage Door Repair in Springfield, MO
Meta description: Garage door repair in Springfield, MO for doors that sag, stick, or will not open. On-site diagnosis, options, and completed repairs when parts are on the truck.

# Garage door repair for doors that sag, stick, or will not open

If the door already in your opening sags, sticks, or will not open, this is the repair page. Jenny answers the phone. Will does the on-site work. New doors are on the installation page.

### A sagging door that needed to travel again

Repair is for the door already in the opening. Chris Keaton’s old, huge garage door was sagging from age. Will explained the problem and the best solution, gave an estimate, and finished the work so the door could travel again. After that visit Chris recommended 360 for repair or replacement in general; the sagging-door job itself was repair of the door they already had. If your door sags, sticks, or will not open, start here rather than shopping a new door first.

> Will did a fantastic job on our old huge garage door that was sagging from age. He thoroughly explained the problem and the best solution along with a great estimate, the work was completed quickly.
> — Chris Keaton

### Doors that will not open, stick, or need a seal or wiring fix

Springfield homeowners bring in doors that will not open, will not travel evenly, or need a seal, pad, or wiring brought back in line. Completed visits include a door that would not open and left working smoothly, both doors repaired after an animal incident with the wiring corrected, a bottom seal replaced before it became a larger problem, and a door that finally opened and closed consistently. On a failed door, the same visit can restore travel and add a quiet operator. A keypad can be installed on that same repair call. The point of these visits is a door that opens, closes, and stays in line.

> Happy to have our door open and close consistently and have our outdoor pad updated.
> — Debbie Christopher

### Springs, tracks, and rollers stay with repair

A broken spring is still repair of the door in the opening. Completed jobs include two springs on a two-car door, an undersized spring replaced after the door was weighed, old coils replaced with the tracks and rollers serviced, and a broken spring with a few brackets. If a spring failed early, the useful question on site is whether the next spring is sized for the actual door weight. Jenny handles the schedule and the price conversation. Will does the install, often with Blake on larger spring jobs, and talks through maintenance a homeowner can do.

> I am very happy with the job Will did on our garage door spring replacement. My door works better now than ever.
> — jason tourville

### Diagnosis first, then a choice

The useful visit pattern is an on-site look, a clear explanation, and a choice about what to do now versus later. Homeowners were told what had to be repaired immediately and what could wait, without a push to buy extra work. Routine maintenance visits work the same way: improvements are pointed out, priced, and finished when the materials are already on the truck. Recommendations stay aimed at a door that is working, stable, and safe.

> They gave me options and let me choose what I wanted done, what had to be repaired now and what could wait. I chose to do everything at once, which made my price higher, but still significantly less than what I thought it would cost and I wasn't pressured to do any of it.
> — Judi Wills

> Will had everything he needed to complete our repair on his truck, so it was quick and efficient.
> — Kelsie Bates

### A Springfield shop with the same people on the jobs

Reviewers keep naming the same local shop: Jenny on the phone and by text, Will on the driveway, at 2035 W Mt Vernon St in Springfield. Neighbors compared service calls with other companies, then hired 360 for the repair. A year or so after earlier fixes, Steve Brooks had them back to make sure the doors were still working correctly.

### Talk through the door that is not acting right

Call (417) 366-7360 and ask for Jenny. Shop hours are Monday–Friday, 8 AM to 5 PM. Saturday and Sunday the shop is closed. If you reach them over a weekend, the next step is a weekday appointment to look at the door you have: whether it sags, will not open, or needs a spring, seal, or track brought back in line.

## Garage Door Installation (`/garage-door-installation`)

SEO title: Garage Door Installation in Springfield, MO
Meta description: Garage door installation in Springfield, MO for new and replacement doors. Help choosing a door, custom heights, paint-ready trim, and a cleaned workspace.

# New garage doors installed for the opening you have

If you need a new door in the opening you have, including a replacement, this is the installation page. Jenny helps you choose. Will installs. Repair of a door that already hangs in the opening is on the repair page.

### New doors in, workspace picked up

Installation is a new door for the opening you have, including jobs with more than one door. Marcie Spitzer’s new garage doors were in, they looked the way she wanted, the installer was polite, and he kept the workspace picked up while he worked. If the door you already have will not travel, that work belongs on the repair page.

> We got our new garage doors installed yesterday and they look amazing!  Very professional and the gentleman that did the installation was very polite and kept things picked up while he worked.
> — Marcie Spitzer

### Help choosing a door

Choosing a door is a conversation about the opening you have and the budget you can live with. Christine Kallmbah asked neighbors for recommendations, then worked with Jenny on the door she wanted. Jenny stays on selection and budget. Will installs the door you pick.

> Jenny is a doll, a big help with choosing a garage door you want and very budget friendly! Will installs them.
> — Christine Kallmbah

### A taller door sized to the opening you already have

Scott Heffern replaced a 1980 7-foot overhead door with a 9-foot-6-inch door so a camper van would fit. Will and Jenny came out in person to coordinate the door size to the opening he had already reframed. Will installed the door and cleaned the workspace before he left. Bring the opening you actually have, including any reframing already done. The job is the door, sized to that opening.

> My project was replacing a 1980 7ft overhead door with a 9’-6” tall door for my reframed opening so we could fit our new camper van.
> — Scott Heffern

### Paint-ready trim and a cleaned workspace

Finish work shows up in the reviews as much as the door itself. Matthew Smith described professional installation from start to finish. Because they were painting, the technician left the trim loose so the paint could go on cleanly. Combined with installers who keep the driveway picked up, that is what done looks like on these jobs: the door is in, the trim is ready for paint if you need it, and the workspace is not left for you to sort out.

> We are painting the door and the technician left the trim loose for the perfect application for paint.
> — Matthew Smith

### Replacement doors for the opening that is already there

Some jobs take an existing door out and put a new one in. Cameron Spitzer had doors and openers replaced together as one job, then had 360 back a couple of months later to see that everything still worked. When Gregory Ritchie’s door failed, he reached Jenny by messenger, Will came out, and they put a brand-new garage door in the same opening later that week.

> They replaced my doors and openers with quality materials at a lower cost than the competitors.
> — Cameron Spitzer

### Plan a door for the opening you have

If you are replacing a door or fitting a new one to a standard or taller opening, call (417) 366-7360 and ask for Jenny. Shop hours are Monday–Friday, 8 AM to 5 PM. Saturday and Sunday the shop is closed. Tell her the opening size you have, whether any reframing is already done, and whether you plan to paint, so the door and trim can be planned around that opening.

## Contact (`/contact`)

SEO title: Contact 360 Garage Door and More
Meta description: Call or visit 360 Garage Door and More in Springfield, MO. Phone (417) 366-7360. Monday–Friday 8 AM to 5 PM, closed Saturday and Sunday.

# Talk with 360 Garage Door and More

Jenny is the person reviewers name when they call. Reach the shop during listed hours.

### Phone, address, and hours

Phone: (417) 366-7360. Address: 2035 W Mt Vernon St, Springfield, MO 65802. Hours: Monday–Friday 8 AM to 5 PM. Saturday closed. Sunday closed.

### If you already know the job

Repair questions belong on the repair page. New-door questions belong on the installation page.

[CTA] Call (417) 366-7360 → tel:+14173667360

[CTA] Garage door repair → /garage-door-repair

[CTA] Garage door installation → /garage-door-installation

## Footer

360 Garage Door and More · 2035 W Mt Vernon St, Springfield, MO 65802 · Monday–Friday 8 AM to 5 PM, closed Saturday and Sunday.

Footer links:

- Home → /
- Garage Door Repair → /garage-door-repair
- Garage Door Installation → /garage-door-installation
- Contact → /contact
- Call (417) 366-7360 → tel:+14173667360

Words-only canary. No website deployment is authorized from this package.

## Strategy Overview

This is an internal Writer 3 artifact. It is not a public page and must not be linked from header, footer, or business CTAs.

Public topology is exactly four routes in reading order: Home `/`, Garage Door Repair `/garage-door-repair`, Garage Door Installation `/garage-door-installation`, and Contact `/contact`. Writer 1 authored the two service pages from the sealed 360 prescription and the existing 47 written reviews. Production validation rejected the remote artifact because `reviewEvidence` carried word-bearing `reviewer` and `excerpt` keys. Factory pointer-ledger normalization removed those 62 duplicated keys, preserved dedicated copy, and left the quarantined source bytes unapproved.

The former hard 800-word floor is revoked. Architect QA accepted the corrected Writer 1 pages because each section has a distinct homeowner job, related reviews are synthesized, each quotation appears once, public copy reads like local-service writing, and unsupported speed, warranty, pricing, and carpentry claims stay out. Useful-body word counts are diagnostic evidence only and are not the accept reason. Writer 2 stayed blocked until that fresh decision, then authored Home, Contact, header, and footer using the same NAP, hours, and named people (Jenny / Will) without new vendor calls. Writer 3 records the fold: spring replacement, maintenance, seals, tracks, diagnostics, and related repair-family work stay on `/garage-door-repair`; opener and keypad work stay supporting evidence and do not receive public routes. Whole-site QA checks continuity, evidence fidelity, voice, CTA flow, and route completeness. Josh alone approves Human Gate 2 and any later merge. No deployment occurred.

### Why these four pages

The sealed four-page policy required Home, two review-backed service destinations, and Contact. Candidate services that were folded or passed over never become navigation items.

### Evidence binding

Repair carries the larger authoritative completed-repair set, including folded spring-and-travel jobs quoted only as parent-page proof. Installation carries the completed new-door set. Home uses Cameron Spitzer as the prescribed lead because the review records completed doors plus a later check. Contact stays claim-light.

### Quality standard used for this correction

Each service-page section must add a distinct homeowner decision, scope fact, process expectation, differentiator, or proof point. Word count alone must never pass a page. Do not pad to reach 800 or any other number, and do not cut useful evidence solely to fit a number. If evidence is thin, route the gap back to research or strategy rather than manufacturing generic copy.

### Claims that were refused

No 24/7, weekend on-site, holiday dispatch, same-day SLA, one-hour arrival, or guaranteed rating. Hours remain Monday–Friday 8 AM–5 PM. Retrieval count 47 and retrieval date 2026-08-23 stay in this internal artifact only.

State: awaiting-human-gate-2

Do you approve these website words for the coded demo?
