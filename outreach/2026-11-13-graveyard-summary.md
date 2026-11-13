# Overnight rollout, Fri Nov 13 (ff-architect #651)

Seven Wichita demos are rebuilt on the avatar and scored-USP method, with Josh's pilot notes applied. Each one went through three independent QA passes. Integrity v5 was already done. Nothing has been sent: the sender is idle and the factory branch is unmerged.

## The 8 demos

| Demo | Strategy page | Homepage | Lead claim | Score | Score box | Offer card | QA (final) |
|---|---|---|---|---|---|---|---|
| ICT Roofing v2 | https://ictroofing.websitepreview.fluidframemarketing.com/ | …/home/ | We stay in it when insurance offers less | 20 | off* | no | 12/12 PASS |
| River City | https://rivercity.websitepreview.fluidframemarketing.com/ | …/home/ | Finds the real cause before quoting, and checks after the crew leaves | 20 | off* | no | 12/12 PASS |
| Flawless | https://flawless.websitepreview.fluidframemarketing.com/ | …/home/ | Free class 4 upgrade, downspouts and gutter guards included | 20 | off* | no | 12/12 PASS |
| Douglas Fry | https://douglasfry.websitepreview.fluidframemarketing.com/ | …/home/ | No commissioned salespeople | 20 | off* | no | 12/12 PASS |
| Air Capital | https://aircapital.websitepreview.fluidframemarketing.com/ | …/home/ | Same day, with the cause and every option explained first | 20 | off* | no | 12/12 PASS |
| Cook's | https://cooks.websitepreview.fluidframemarketing.com/ | …/home/ | Here fast, and straight about the fix | 15 (below gate) | off | yes: a second opinion before you replace | 12/12 PASS |
| Dream Makers | https://dreammakers.websitepreview.fluidframemarketing.com/ | …/home/ | Text Nate, and he's there in hours | 15 (below gate) | off | yes: text a photo, get a read before a truck rolls | 12/12 PASS |
| Integrity v5 (done before tonight) | https://integrity.websitepreview.fluidframemarketing.com/ | …/home/ | The after-hours price, by phone, before anyone drives out | 16 | off* | no | (pilot) |

\* **The score box is OFF everywhere, which goes against the brief.** The brief asked for it ON for leads of 16 or more. On 11/12, in the build session, the score numbers were removed from the strategy page because they mean nothing to a prospect. The per-demo switch is built (`strategy.lead.showScores`, with the rows already filled in), so turning it on is a one-line change per demo once Josh picks. The pack's variant log has the GHL tags.

## What changed on every demo
- **A sentiment section:** each demo has a section built on its strongest-feeling review, placed early.
  - ICT: Tom B. ("here to stay").
  - River City: Brant C. / Kamden B.
  - Flawless: Diane J.
  - Douglas Fry: Beverly R.
  - Cook's: Matthew L.
  - Air Capital: Carlos F.
  - Dream Makers: Almeta W.
- **The big-ticket service is featured.**
  - HVAC demos get separate New AC Installation and New Furnace Installation cards, and the install pages are named in the full-build line.
  - Roofing demos feature roof replacement first.
- **Outreach:** every message carries the certification question (shingle manufacturers or HVAC brands), the solicitation line, the vibe question and the plain link. All are under 1,500 characters; River City's short message is 580 (limit 600).
- **Josh's photo notes:**
  - The drone photo is gone from ICT and from the roofing pool.
  - The white-polo photo is gone from Cook's and Dream Makers.
  - The blank-screen thermostats are gone.
  - River City's hero no longer shows a roof with no house.
  - Douglas Fry's attic photo is replaced.
  - Flawless's warped porch photo is replaced.
- **Checks:** paragraphs are at most 4 lines at 1440px, measured on every page. Demo-check gives 149 pass / 0 fail on all 7. The words check gives 0 fail.

## Photo notes for Josh (pool quality, not rule breaks)
The pool is generated, so the QA reviewers flagged softer "AI texture" issues. None of them break a rule tonight; they're the list for the next pool pass:
- **Cook's:** the brick condenser with no house in frame, the OSB attic air handler, the plain basement furnace and the very clean burners.
- **Air Capital:** the AC Replacement hero looks 3D-rendered.
- **Douglas Fry:** a staged cracked-tile shot.
- **Flawless:** two shingle close-ups as hero and section (no whole house), a clean attic and a product-like gutter guard.
- **ICT:** the hero framing reads like a garage roof.
- **Every demo:** generic placeholder men stand in for named people.

The real fix is the owners' own job photos.

## Thin (for owner calls)
- **Douglas Fry:** "no commissioned salespeople" is a site-only claim, and a 1-star review mentions a subcontractor. The confirm card asks.
- **Flawless:** the class 4 offer terms, and the shingle brand.
- **River City:** each half of the lead rests on one review, and Anthony's role is unconfirmed.
- **Air Capital:** no owner name, and no warranty or dealer status.
- **Cook's:** no furnace-install review, and no founding year.
- **Dream Makers:** licensing, brands, whether water heaters are core work, and hours.
- **ICT:** how often Juan, Brady or Arturo meets the adjuster.
