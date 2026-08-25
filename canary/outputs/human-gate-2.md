# Website Words — Human Gate 2

Directly readable words package for the 360 Garage Door and More canary. Natural reading order is Home, Garage Door Repair, Garage Door Installation, Contact, then the internal Strategy Overview.

## Completion contract

- Repair page useful-body word count (diagnostic only): **817**
- Installation page useful-body word count (diagnostic only): **574**
- Word count is not the acceptance reason. The former hard 800-word floor is revoked.
- Architect QA Writer 1: **waiting-for-architect** (independent review required; this worker does not accept; Writer 2 is not released; raw quarantined artifact remains unapproved)
- Architect QA Writer 2: **waiting-for-architect** (Home/Contact/header/footer reconciled to claim-corrected Writer 1 pages; not accepted)
- Writer 3 Strategy Overview: internal only
- Whole-site QA: **waiting-for-architect** (writer self-check only; prior accept/pass remain revoked; independent Architect review required)
- Duplicate-quote scan: **writer-self-check-pass** (each quotation displayed once)
- Repetition scan: **writer-self-check-pass** (hours/timing handled once per service page)
- Unsupported-claim scan: **writer-self-check-pass** (six Architect-flagged overclaims removed or narrowed)
- Evidence-fidelity scan: **writer-self-check-pass**
- Merge occurred: **no**
- Deployment occurred: **no**
- Branch: `architect/360-words-canary`
- Reviewed head for this correction packet: `cbe66a21f0b99c27fb4eed946267e378b5d11312`
- Head at render: `c6fb58dc9700dffefeb6dc642b6e2f73d4eb58fa`
- Fresh Writer 1 rendered-words digest: `sha256:3edce1acff28a00b3f0064664f8b1b4d2beab1a0a9fda5f92108442ce4d1460e`
- Rejected padded lineage (not restored): `sha256:165d310ae1e30225b6278cc0fbde7d2cab23a60f186157c59734257519c01f89`
- Hermetic pointer-ledger fixtures: `561e9013f4ca5c5d3055bdbcff34c69b466f7940`
- Sealed Writer 1 recovery/finalization: `0d6284a9aa037dc642669357c86fb02b3b859e3a`
- Safe return to dormant: `778fbc8742038f6c4e4d88ca241bf2a62d8c0c6b`
- Factory strict-validator pass of normalized JSON: `5675de60b9ade7ecb50fd79f0ec43e9601d3b0cb`
- Exact reviewEvidence regression restore: `e7c76770551109efd1827828558e88ede00e4b77`
- Pointer-ledger apply: `56069627ee62dd2f843e2b6a38313b37e7e23a72`
- Factory pointer-ledger normalizer: `52b197fae95ce501c4729813a84751ca16b7278f`
- Fail-closed diagnostic Action: https://github.com/alchemistj/ff-content-demo-factory/actions/runs/32806937751
- Normalize wake (validation-only, fail-closed): https://github.com/alchemistj/ff-content-demo-factory/actions/runs/32808355566
- Dormant return Action (success): https://github.com/alchemistj/ff-content-demo-factory/actions/runs/32808571523
- Pointer-ledger recovery proof Action: https://github.com/alchemistj/ff-content-demo-factory/actions/runs/32810127811
- Pointer-ledger recovery artifact: `360-words-writer1-32810127811`
- Pull request (unmerged): https://github.com/alchemistj/ff-content-demo-factory/pull/6
- Writer 1 Cursor thread: https://cursor.com/agents/bc-30fc8ffa-2005-44b9-8fc7-48ddd9c3bcc8
- Prior correction Cursor thread: https://cursor.com/agents/bc-57cc62dc-de8f-4be0-840b-640662ae56a4
- Fresh Writer 1 copy Cursor thread: https://cursor.com/agents/bc-2486f645-c31c-4532-8145-fbe3af1d45a8
- Claim-correction Cursor thread: https://cursor.com/agents/bc-85fdb5d1-0b22-4892-8943-c9e597607491
- GitHub issue: https://github.com/alchemistj/ff-content-demo-factory/issues/5
- Quarantined source digest: `sha256:ec36da69992dd318e913671763a96e4b838ab747b36e512702f91176155e5eac`
- Prior normalized output digest (pre-quality rewrite): `sha256:c771016e724a49dd41254bde3639de6c1b1c18fc69c23533ed19bd9773f3ef8e`
- Keys removed from reviewEvidence: **62**

## Test and validation results

- Targeted regression: production `reviewer`+`excerpt` fails `REVIEW_EVIDENCE_CLAIM_TEXT_DUPLICATE` at `/pages/0/reviewEvidence/0/reviewer` with expectedRule `reviewEvidence must not contain any accepted word-bearing key; it is a typed pointer ledger`, then normalizes losslessly.
- Real quarantined bytes: 31 reviewer keys + 31 excerpt keys removed (62), semantic copy / identity / provenance preserved, raw `approved: false`.
- Fresh Writer 1 quality self-check: distinct section jobs, synthesized reviews, one display form per quote, no audit-memo public copy, unsupported-claim scan pass, six Architect-flagged overclaims removed or narrowed, word counts diagnostic only. This is not Architect acceptance.
- `NODE_ENV=test npm run test:all`: 132 passed, 0 failed, 0 skipped.

## Changed-claim reasons

- Repair: removed Jenny parts-arrival scheduling. Sealed evidence supports Jenny customer service/follow-up generally, not a parts-on-the-next-visit process.

- Repair: replaced causal return-because-local/not-a-chain and always-same-person-diagnoses-and-repairs language with named completed-job facts only.

- Installation: replaced 'when the slab is done' with natural homeowner language about needing a new door for the opening you have.

- Installation: removed the Facebook-group discovery recital; it repeated how households found the shop rather than helping the purchase decision.

- Installation: removed evidence-free evening-usability and two-opening staging advice. Kept paint-ready trim and on-site cleanup from named completed installs.

- Home: replaced the awkward H1 with the sealed completed-jobs promise, without availability, speed, warranty, or pricing claims.

## Architect QA — Writer 1

Decision: **waiting-for-architect**. Independent Architect review is required. Word count did not pass the pages. This worker does not accept Writer 1 and does not open Human Gate 2.

### Garage Door Repair section jobs

- `repair-when-to-call` (direct-answer): Tells a homeowner when the door already in the opening is the job, using Chris Keaton’s sagging-door visit as the lead example.

- `repair-whats-in-scope` (confirmed-scope): Keeps springs, seals, tracks, rollers, and wiring on the parent repair page and uses one spring quote instead of reciting each related review.

- `repair-visit` (process): Explains diagnosis first, then a now-versus-later choice, so the homeowner knows what the visit is for before parts are swapped.

- `repair-equipped` (visit-completion): Sets the expectation that work can finish in the visit when the part is already on the truck. Does not invent a Jenny parts-arrival follow-up process.

- `repair-local-crew` (differentiator): Names the Springfield shop, Jenny on the phone, and Will on site from completed jobs, without causal 'callers return because' or always-same-person generalizations.

- `repair-next` (next-step): Handles hours and the weekday call once, without repeating timing caveats through the page.

### Garage Door Installation section jobs

- `install-when` (direct-answer): Defines installation as a new door for the opening you have, led by Marcie Spitzer’s completed job and cleanup, and sends keep-the-door jobs to repair. No slab jargon or Facebook-group discovery recital.

- `install-selection` (selection): Explains Jenny/Will selection help without inventing a model catalog or listing prices.

- `install-opening` (scope-fit): Covers a taller door sized to an opening the homeowner already reframed, without a carpentry claim.

- `install-onsite` (finish-expectation): Sets paint-ready trim and on-site cleanup as the finish standard from named completed installs, without evening-usability or staging advice.

- `install-next` (next-step): Sends the homeowner to call with the opening size they already have, during listed weekday hours.

### Quality scans

- Duplicate quotes: repair `none`, installation `none`.
- Repetition: hours and weekday next-step appear once per service page.
- Unsupported claims: no 24/7, weekend dispatch, same-day SLA, warranty term, framing/carpentry, or pricing guarantee. Forbidden overclaim phrases: none.
- Evidence fidelity: displayed quotations are contiguous sealed-review text.
- Useful-body word counts: Repair **817**, Installation **574** (diagnostic only).
- Role: writer self-check only. Independent Architect QA owns accept/reject.

## Review / evidence pointer ledger

### /garage-door-repair

| reviewId | provenance.type | provenance.ref | placement | section |
| --- | --- | --- | --- | --- |
| `Ci9DQUlRQUNvZENodHljRjlvT201TVdWZGZSak00ZUhSQ2VVdHNYMWxFYTBFdE9XYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT201TVdWZGZSak00ZUhSQ2VVdHNYMWxFYTBFdE9XYxAB` | lead-sagging-door | repair-when-to-call |
| `Ci9DQUlRQUNvZENodHljRjlvT2taQlh6VlZabU5OWjFKc2JISklTa1pXUlVwVGVuYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2taQlh6VlZabU5OWjFKc2JISklTa1pXUlVwVGVuYxAB` | folded-spring-replacement | repair-whats-in-scope |
| `Ci9DQUlRQUNvZENodHljRjlvT2xoRE1HZ3lUMWRpVWt3d1dsVXhjVE5XZEc1VWVuYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2xoRE1HZ3lUMWRpVWt3d1dsVXhjVE5XZEc1VWVuYxAB` | options-without-pressure | repair-visit |
| `ChdDSUhNMG9nS0VQcUM5dGpxNjRxcHJBRRAB` | evidence | `ChdDSUhNMG9nS0VQcUM5dGpxNjRxcHJBRRAB` | parts-on-truck | repair-equipped |
| `Ci9DQUlRQUNvZENodHljRjlvT2t4alNtbDBaVVV4VVRselpIQTJhakpOYURSeE1HYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2t4alNtbDBaVVV4VVRselpIQTJhakpOYURSeE1HYxAB` | authorized-repair-inventory | repair-whats-in-scope |
| `Ci9DQUlRQUNvZENodHljRjlvT25OS09FRkhPRkptVVhoclIwdzRORVp6VTB0R1VIYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT25OS09FRkhPRkptVVhoclIwdzRORVp6VTB0R1VIYxAB` | authorized-repair-inventory | repair-whats-in-scope |
| `Ci9DQUlRQUNvZENodHljRjlvT2xVMWQxVlRXalppVmxoU1NHcG9hUzFtV2pSVmRIYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2xVMWQxVlRXalppVmxoU1NHcG9hUzFtV2pSVmRIYxAB` | authorized-repair-inventory | repair-whats-in-scope |
| `Ci9DQUlRQUNvZENodHljRjlvT2xSSU1YVXhWMDVDZWtWMVZtTm5SbGhHTld4amVGRRAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2xSSU1YVXhWMDVDZWtWMVZtTm5SbGhHTld4amVGRRAB` | authorized-repair-inventory | repair-whats-in-scope |
| `Ci9DQUlRQUNvZENodHljRjlvT25oaE9HeFNXVUUyUmt0VlowSkJPVWRCWmpSTVZYYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT25oaE9HeFNXVUUyUmt0VlowSkJPVWRCWmpSTVZYYxAB` | authorized-repair-inventory | repair-whats-in-scope |
| `Ci9DQUlRQUNvZENodHljRjlvT2t0T04xVlBSMU5oUmprMU9TMXNibmx6WjJ0cldHYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2t0T04xVlBSMU5oUmprMU9TMXNibmx6WjJ0cldHYxAB` | authorized-repair-inventory | repair-whats-in-scope |
| `Ci9DQUlRQUNvZENodHljRjlvT2xSWWMycFZlV3AxTldKcFpVZGxTalpGTUZSV1drRRAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2xSWWMycFZlV3AxTldKcFpVZGxTalpGTUZSV1drRRAB` | authorized-repair-inventory | repair-whats-in-scope |
| `Ci9DQUlRQUNvZENodHljRjlvT21STGNXUk1jMEZ1TmtsYVoyWlhTbEk1TjFsWWRHYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT21STGNXUk1jMEZ1TmtsYVoyWlhTbEk1TjFsWWRHYxAB` | authorized-repair-inventory | repair-whats-in-scope |
| `ChZDSUhNMG9nS0VLeTZocG5jME9qc0t3EAE` | evidence | `ChZDSUhNMG9nS0VLeTZocG5jME9qc0t3EAE` | authorized-repair-inventory | repair-whats-in-scope |
| `ChZDSUhNMG9nS0VQR2ZxNUc5cjZhckdREAE` | evidence | `ChZDSUhNMG9nS0VQR2ZxNUc5cjZhckdREAE` | authorized-repair-inventory | repair-whats-in-scope |
| `ChdDSUhNMG9nS0VJQ0FnTUNZNkplRm5BRRAB` | evidence | `ChdDSUhNMG9nS0VJQ0FnTUNZNkplRm5BRRAB` | authorized-repair-inventory | repair-whats-in-scope |
| `ChdDSUhNMG9nS0VJQ0FnSURmNlBfbXhBRRAB` | evidence | `ChdDSUhNMG9nS0VJQ0FnSURmNlBfbXhBRRAB` | authorized-repair-inventory | repair-whats-in-scope |
| `ChZDSUhNMG9nS0VJQ0FnSUR2cmFTZE93EAE` | evidence | `ChZDSUhNMG9nS0VJQ0FnSUR2cmFTZE93EAE` | authorized-repair-inventory | repair-whats-in-scope |
| `ChdDSUhNMG9nS0VJQ0FnSURQZ2RtWDFnRRAB` | evidence | `ChdDSUhNMG9nS0VJQ0FnSURQZ2RtWDFnRRAB` | authorized-repair-inventory | repair-whats-in-scope |

Quoted placements (each quote displayed once):

- `Ci9DQUlRQUNvZENodHljRjlvT201TVdWZGZSak00ZUhSQ2VVdHNYMWxFYTBFdE9XYxAB` — Chris Keaton: "Will did a fantastic job on our old huge garage door that was sagging from age. He thoroughly explained the problem and the best solution al"
- `Ci9DQUlRQUNvZENodHljRjlvT2taQlh6VlZabU5OWjFKc2JISklTa1pXUlVwVGVuYxAB` — jason tourville: "I am very happy with the job Will did on our garage door spring replacement. My door works better now than ever."
- `Ci9DQUlRQUNvZENodHljRjlvT2xoRE1HZ3lUMWRpVWt3d1dsVXhjVE5XZEc1VWVuYxAB` — Judi Wills: "They gave me options and let me choose what I wanted done, what had to be repaired now and what could wait."
- `ChdDSUhNMG9nS0VQcUM5dGpxNjRxcHJBRRAB` — Kelsie Bates: "His recommendations were mindful to ensure that our garage was not only working properly, but that it was stabilized and safe. Will had ever"

### /garage-door-installation

| reviewId | provenance.type | provenance.ref | placement | section |
| --- | --- | --- | --- | --- |
| `Ci9DQUlRQUNvZENodHljRjlvT25jM2NVNTZlVzF0YVhCNVdXSlVZVEpmYW05UExYYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT25jM2NVNTZlVzF0YVhCNVdXSlVZVEpmYW05UExYYxAB` | lead-new-doors | install-when |
| `Ci9DQUlRQUNvZENodHljRjlvT2pBMU5rSktSMmhHV1RKb2NVdE1TVXBOVFRsS01YYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2pBMU5rSktSMmhHV1RKb2NVdE1TVXBOVFRsS01YYxAB` | selection-help | install-selection |
| `ChZDSUhNMG9nS0VJNng0b1B1N3NEY0ZBEAE` | evidence | `ChZDSUhNMG9nS0VJNng0b1B1N3NEY0ZBEAE` | taller-door-reframed-opening | install-opening |
| `Ci9DQUlRQUNvZENodHljRjlvT2xjeVFtOTRMV3BTTUc1Qk5VeFNhVTlJYW1GcFMwRRAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT2xjeVFtOTRMV3BTTUc1Qk5VeFNhVTlJYW1GcFMwRRAB` | paint-ready-trim | install-onsite |
| `Ci9DQUlRQUNvZENodHljRjlvT25JelNERXdhRFpIV0hscFUxOUxkakZtYzFaMWFXYxAB` | evidence | `Ci9DQUlRQUNvZENodHljRjlvT25JelNERXdhRFpIV0hscFUxOUxkakZtYzFaMWFXYxAB` | authorized-installation-inventory | install-when |

Quoted placements (each quote displayed once):

- `Ci9DQUlRQUNvZENodHljRjlvT25jM2NVNTZlVzF0YVhCNVdXSlVZVEpmYW05UExYYxAB` — Marcie Spitzer: "We got our new garage doors installed yesterday and they look amazing!  Very professional and the gentleman that did the installation was ve"
- `Ci9DQUlRQUNvZENodHljRjlvT2pBMU5rSktSMmhHV1RKb2NVdE1TVXBOVFRsS01YYxAB` — Christine Kallmbah: "Jenny is a doll, a big help with choosing a garage door you want and very budget friendly! Will installs them."
- `ChZDSUhNMG9nS0VJNng0b1B1N3NEY0ZBEAE` — Scott Heffern: "My project was replacing a 1980 7ft overhead door with a 9’-6” tall door for my reframed opening so we could fit our new camper van."
- `Ci9DQUlRQUNvZENodHljRjlvT2xjeVFtOTRMV3BTTUc1Qk5VeFNhVTlJYW1GcFMwRRAB` — Matthew Smith: "We are painting the door and the technician left the trim loose for the perfect application for paint."

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

# Springfield garage door work backed by completed jobs

360 Garage Door and More is a local Springfield shop. Jenny answers the phone. Will does the on-site work.

If the door you already have is sagging, sticking, or will not open, start with repair. If you need a new door fitted to the opening you have, start with installation.

### A Springfield shop, not a call center

Reviewers keep naming the same people: Jenny on the phone and schedule, Will on the driveway. The shop address is 2035 W Mt Vernon St, Springfield, MO 65802.

### When the door you have is the problem

Repair is for a door that already hangs in the opening. The repair page starts with when to keep that door, then covers springs, seals, tracks, and wiring on the same visit rather than sending you to another shop.

### When you need a new door in the opening you have

Installation is for a new door, or more than one, fitted to the opening you already have. The installation page covers selection help, a taller door sized to a reframed opening, and how the visit is left.

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

SEO title: Garage Door Repair in Springfield, MO | 360 Garage Door and More
Meta description: Springfield garage door repair for doors that sag, stick, or will not open. Call (417) 366-7360, Monday–Friday 8 AM–5 PM.

# Garage door repair for doors that sag, stick, or will not open

The door you already have is the job. If it sags in the opening, sticks on the way up, sits on the floor, or will not open at all, start here. 360 Garage Door and More works from 2035 W Mt Vernon St in Springfield. Jenny is the person homeowners name on the phone. Will is the person they name in the garage. A new door belongs on the installation page. Springs, seals, tracks, rollers, and wiring stay on this page with the door that is already hanging.

### When the door you have is the problem

Call for repair when you intend to keep the door that is already in the opening. The clearest completed example is an old, oversized door that had started to sag with age. Will explained what was wrong, what would actually fix it, and what the work would cost before he started. That is the decision this page is for: get the opening working again, not shop a new door.

If the door is off its usual travel, opening on one side only, or refusing to lift, say that when you call. Homeowners also come in after something has gone wrong in the garage itself — an animal getting into the wiring, a door that suddenly will not move — and need both doors traveling again. The point is the same. The door stays. The hardware that failed gets diagnosed on site.

> Will did a fantastic job on our old huge garage door that was sagging from age. He thoroughly explained the problem and the best solution along with a great estimate, the work was completed quickly.
> — Chris Keaton

### What stays on this repair visit

Repair covers the door that is already hanging and the hardware that makes it travel. Completed jobs include sagging doors, doors that would not open, broken springs, bottom seals, tracks and rollers, and wiring put back after it was disturbed. If a spring is why the door will not lift, it is still a repair visit.

Spring replacement is the most common related failure homeowners describe. Will replaced the spring, and the door worked better afterward. You do not need a different shop for that work.

> I am very happy with the job Will did on our garage door spring replacement. My door works better now than ever.
> — jason tourville

### Diagnosis, options, then the work you choose

The useful part of a repair visit is the conversation before anyone starts swapping parts. One homeowner was given a split: what had to be repaired now, and what could wait. She chose to do everything at once. Nobody pushed her into that choice, and the work was explained as it happened.

That same visit shape shows up when the door simply needs to open and close consistently. Homeowners notice the crew does not load the appointment with extras they did not ask for. Ask for the split — now versus later — before you agree to a longer list of parts.

> They gave me options and let me choose what I wanted done, what had to be repaired now and what could wait.
> — Judi Wills

### What they can finish while they are there

When the needed part is already on the truck, the repair can finish in that visit. One homeowner’s recommendations were about a door that would stay stable and safe, and Will already had what he needed with him. On a routine maintenance stop, he has also spotted a couple of areas that would help the door run, explained the recommendation with pricing, and had the materials on hand.

> His recommendations were mindful to ensure that our garage was not only working properly, but that it was stabilized and safe. Will had everything he needed to complete our repair on his truck, so it was quick and efficient.
> — Kelsie Bates

### A Springfield shop with named people

Homeowners keep naming the same two people. Jenny handles the call, the text, and the schedule. Will does the on-site work; a spring install also names Blake on the job with him. One completed job names Will for the diagnosis and the repair, and Jenny for the customer-service follow-up. Another names the company as a local Springfield business, not a chain.

The shop address is 2035 W Mt Vernon St. If you already know you need a new door rather than a repair, use the installation page. This page stays with the door you have.

### Call with what the door is doing

Reach Jenny at (417) 366-7360. Shop hours are Monday through Friday, 8 AM to 5 PM. Saturday and Sunday the shop is closed. Tell her whether the door will not open, sags in the opening, sticks, or needs a spring or seal. If a door they already repaired starts acting up later, call the same shop.

## Garage Door Installation (`/garage-door-installation`)

SEO title: Garage Door Installation in Springfield, MO | 360 Garage Door and More
Meta description: New garage doors installed for the opening you have in Springfield, MO. Call (417) 366-7360, Monday–Friday 8 AM–5 PM.

# New garage doors installed for the opening you have

This page is for a new door, or more than one, fitted to the opening you already have. It is not the troubleshooting page for a door you intend to keep. Jenny helps homeowners choose. Will installs. The shop is 360 Garage Door and More at 2035 W Mt Vernon St, Springfield.

### When you need a new door, not a repair

Choose installation when you need a new garage door for the opening you have, not a repair of the door already hanging. The straightforward completed example is new garage doors — more than one on the same visit — installed, looking the way they should, with the installer keeping the site picked up while he worked.

If the door you have still belongs in that opening and just will not travel, start on the repair page instead. This page stays with a new door in the opening you have.

> We got our new garage doors installed yesterday and they look amazing!  Very professional and the gentleman that did the installation was very polite and kept things picked up while he worked.
> — Marcie Spitzer

### Choosing a door you can live with

Selection is a considered purchase, not a parts swap. One homeowner asked around, then worked with Jenny on the door she actually wanted. Will installed it. That split — Jenny on selection and schedule, Will on the install — is how completed jobs describe the company.

Budget comes up in those conversations because Jenny is the person who walks the choice. This page does not list prices. Bring the look you want, the opening size if you know it, and whether you are replacing one door or more than one.

> Jenny is a doll, a big help with choosing a garage door you want and very budget friendly! Will installs them.
> — Christine Kallmbah

### Fitted to the opening you have

Not every opening is a catalog size. One completed job replaced a 1980 7-foot door with a 9-foot-6 door so a camper van would clear. The opening had already been reframed. Will and Jenny came out to size the door to that opening; they did not build the framing.

If your opening is taller, shorter, or simply not a standard size, the useful next step is that same on-site size conversation before anyone orders a door.

> My project was replacing a 1980 7ft overhead door with a 9’-6” tall door for my reframed opening so we could fit our new camper van.
> — Scott Heffern

### How the install visit is left

On a considered purchase, the last hour of the visit matters as much as the first. One household was going to paint, so the technician left the trim loose for that work. Cleanup during the install shows up in completed jobs, not as a separate add-on.

> We are painting the door and the technician left the trim loose for the perfect application for paint.
> — Matthew Smith

### Start with the opening you have

Call (417) 366-7360 during Monday through Friday, 8 AM to 5 PM hours. The shop is closed Saturday and Sunday. Have the opening width and height if you know them, say whether you are replacing one door or more than one, and mention if the opening was reframed or will be painted after the door is in. Repair for a door you intend to keep is on the repair page.

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

Public topology is exactly four routes in reading order: Home `/`, Garage Door Repair `/garage-door-repair`, Garage Door Installation `/garage-door-installation`, and Contact `/contact`. Writer 1 authored a new pair of service pages from the sealed 360 prescription and the existing 47 written reviews, then applied a copy-only claim correction on the same lineage. The rejected padded copy lineage (`sha256:165d310ae1e30225b6278cc0fbde7d2cab23a60f186157c59734257519c01f89`) was not restored. Production validation still rejects the quarantined remote artifact because `reviewEvidence` carried word-bearing `reviewer` and `excerpt` keys. Factory pointer-ledger normalization removed those 62 duplicated keys, preserved dedicated copy, and left the quarantined source bytes unapproved.

The former hard 800-word floor is revoked. Word counts are diagnostic only. This head is returned as waiting-for-architect: Writer 1 is not Architect-accepted, Writer 2 is not released, and Human Gate 2 is not opened. The claim-correction pass removed Jenny parts-arrival process language, causal local/not-a-chain and always-same-person generalizations, installation slab jargon, Facebook-group discovery recital, and evidence-free evening-usability/staging advice, and revised the Home H1 to the sealed completed-jobs promise. Writer 2 Home, Contact, header, and footer were reconciled to that corrected Writer 1 copy using the same NAP, hours, and named people (Jenny / Will) without new vendor calls. Writer 3 records the fold: spring replacement, maintenance, seals, tracks, diagnostics, and related repair-family work stay on `/garage-door-repair`; opener and keypad work stay supporting evidence and do not receive public routes. Independent Architect QA owns accept/reject. Josh alone approves Human Gate 2 and any later merge. No deployment occurred.

### Why these four pages

The sealed four-page policy required Home, two review-backed service destinations, and Contact. Candidate services that were folded or passed over never become navigation items.

### Evidence binding

Repair carries the larger authoritative completed-repair set, including folded spring-and-travel jobs quoted only as parent-page proof. Installation carries the completed new-door set. Home uses Cameron Spitzer as the prescribed lead because the review records completed doors plus a later check. Contact stays claim-light.

### Quality standard used for this correction

Each service-page section must add a distinct homeowner decision, scope fact, process expectation, differentiator, or proof point. Word count alone must never pass a page. Do not pad to reach 800 or any other number, and do not cut useful evidence solely to fit a number. If evidence is thin, route the gap back to research or strategy rather than manufacturing generic copy.

### Claims that were refused

No 24/7, weekend on-site, holiday dispatch, same-day SLA, one-hour arrival, or guaranteed rating. Hours remain Monday–Friday 8 AM–5 PM. Retrieval count 47 and retrieval date 2026-08-23 stay in this internal artifact only.

State: waiting-for-architect

Independent Architect review is required. This package is not awaiting Human Gate 2 and is not a merge or deployment authorization.
