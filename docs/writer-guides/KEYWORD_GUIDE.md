> Moved here from ff-2-demos `build-prompts/KEYWORD_GUIDE.md` on 2026-11-09. This is now the only copy; other repos link here.

# Fluid Frame — Keyword Selection & Cannibalization Prevention Guide
# Claude Code Build Rules — Automated Overnight Builds
# Version 2026

---

## PURPOSE
Left without guardrails, Claude Code makes two expensive mistakes:
1. **Keyword cannibalization** — homepage and service page target the same phrase
2. **Low-value service selection** — building a seasonal or marginal service page instead of revenue drivers

Follow every rule in sequence. Do not skip steps.

---

## SECTION 1 — THE GOLDEN RULE

Every page owns exactly one primary keyword. No two pages compete for the same phrase. This is non-negotiable.

### The Three-Page Keyword Hierarchy
- **Homepage** → Targets the company-type keyword. NOT a service keyword. NOT a procedure.
- **Service Page 1** → Targets the single highest-revenue, highest-search-volume service.
- **Service Page 2** → Targets the second-most-valuable service that does NOT overlap with SP1.

### The Cannibalization Test — Run Before Every Selection
Ask: Does my homepage H1, title tag, or primary meta description already use this phrase?
If yes → the service page keyword must be more specific.

**WRONG (Cannibalized):**
- Homepage H1: "Roofing Company in Plymouth MA"
- Service Page H1: "Roofing Company in Plymouth MA — Roof Repair"
- Problem: Both pages target "roofing company in Plymouth MA"

**CORRECT (Separated):**
- Homepage H1: "Roofing Company in Plymouth MA"
- Service Page H1: "Roof Repair in Plymouth MA — Kode's Roofing"
- Each page owns one distinct keyword phrase

---

## SECTION 2 — HOMEPAGE KEYWORD RULES

The homepage targets the company type, not a procedure.

### Correct Homepage Keyword Formula
FORMAT: [Company Type] in [City, State] — [Business Name]

Examples:
- "Roofing Company in Plymouth MA — Kode's Roofing"
- "Lawn Care Company in Springfield MO — [Business Name]"
- "Plumber in Kansas City MO — [Business Name]"
- "HVAC Company in Omaha NE — [Business Name]"
- "Cleaning Company in Springfield MO — [Business Name]"
- "Pressure Washing Company in Springfield MO — [Business Name]"

### Homepage Anti-Patterns — NEVER Use These in the Homepage H1
- "Roof Repair in Plymouth MA" — that is a SERVICE PAGE keyword
- "Mosquito Treatment in Springfield MO" — service page keyword
- "AC Repair in Phoenix AZ" — service page keyword
- "House Washing in Springfield MO" — service page keyword
- "Janitorial Services in Springfield MO" — service page keyword

If the prospect's existing site uses a service-specific keyword on the homepage, OVERRIDE IT with the company-type format. This is a selling point — you are showing better SEO than their current vendor.

---

## SECTION 3 — SERVICE PAGE SELECTION FRAMEWORK

Work through each filter in order. The first two services that pass all filters are the two to build.

| Priority | Filter | How to Apply |
|----------|--------|--------------|
| 1 | Year-Round Demand | Service must be in demand 10+ months/year. Seasonal = trap. |
| 2 | Revenue Driver | Would the owner answer the phone at 6am for this call? If yes, build it. |
| 3 | Distinct from Homepage | Keyword must not repeat the homepage company-type phrase. |
| 4 | Non-Overlapping with SP2 | Two service pages must be clearly distinct services. |
| 5 | Geographic Specificity | URL slug must include city and state abbreviation. |

---

## SECTION 4 — THE SEASONALITY TRAP

A service that only exists for 60–90 days per year is a bad demo page.

### How to Identify a Seasonal Trap
Ask: Is this service something the business charges for and actively markets 10+ months per year?
If "only in winter" or "only in summer" → it's a trap. Replace it.

### The Snow Removal Rule
If the business is in a state with less than 3 months of freezing temperatures OR their primary revenue is a warm-weather service → do NOT build a snow/ice page even if it appears on their website.

### Seasonal Trap Reference

| Industry | AVOID (Seasonal) | USE INSTEAD (Perennial) |
|----------|-----------------|------------------------|
| Lawn Care | Snow Removal, Leaf Removal | Lawn Fertilization, Weed Control |
| Roofing | Ice Dam Removal, Snow Load Inspection | Roof Repair, Roof Replacement |
| Plumbing | Frozen Pipe Repair, Boiler Startup | Drain Cleaning, Water Heater Install |
| HVAC | Furnace Startup (fall only) | AC Repair, Furnace Repair |
| Pest Control | Mosquito (summer only in north) | General Pest Control, Termite Treatment |
| Landscaping | Holiday Lighting, Snow Plowing | Mulch Installation, Landscape Design |
| Painting | Exterior (weather-limited in north) | Interior Painting, Cabinet Painting |
| Exterior Cleaning | Roof de-icing | Roof Washing, House Washing |

---

## SECTION 5 — KEYWORD FORMULA REFERENCE BY INDUSTRY

### Roofing
- Homepage H1: "Roofing Company in [City] [State] — [Business Name]"
- SP1 H1: "Roof Repair in [City] [State] — [Business Name]" | Slug: /roof-repair-[city]-[state]
- SP2 H1: "Roof Replacement in [City] [State] — [Business Name]" | Slug: /roof-replacement-[city]-[state]
- Watch out: Avoid 'Storm Damage Repair' (too narrow), 'Emergency Roofing' unless 24/7 confirmed

### Lawn Care / Landscaping
- Homepage H1: "Lawn Care Company in [City] [State] — [Business Name]"
- SP1 H1: "Lawn Fertilization in [City] [State] — [Business Name]" | Slug: /lawn-fertilization-[city]-[state]
- SP2 H1: "Weed Control in [City] [State] — [Business Name]" | Slug: /weed-control-[city]-[state]
- Watch out: Avoid snow removal (seasonal), leaf cleanup (seasonal)

### HVAC
- Homepage H1: "HVAC Company in [City] [State] — [Business Name]"
- SP1 H1: "AC Repair in [City] [State] — [Business Name]" | Slug: /ac-repair-[city]-[state]
- SP2 H1: "Furnace Repair in [City] [State] — [Business Name]" | Slug: /furnace-repair-[city]-[state]
- Watch out: Don't build both 'AC Installation' and 'AC Replacement' — too similar, pick one

### Plumbing
- Homepage H1: "Plumber in [City] [State] — [Business Name]"
- SP1 H1: "Drain Cleaning in [City] [State] — [Business Name]" | Slug: /drain-cleaning-[city]-[state]
- SP2 H1: "Water Heater Installation in [City] [State] — [Business Name]" | Slug: /water-heater-installation-[city]-[state]
- Watch out: Avoid frozen pipe repair (seasonal)

### Pest Control
- Homepage H1: "Pest Control Company in [City] [State] — [Business Name]"
- SP1 H1: "Termite Treatment in [City] [State] — [Business Name]" | Slug: /termite-treatment-[city]-[state]
- SP2 H1: "Rodent Control in [City] [State] — [Business Name]" | Slug: /rodent-control-[city]-[state]
- Watch out: Avoid mosquito control unless southern market (year-round)

### Commercial Cleaning / Janitorial
- Homepage H1: "Commercial Cleaning Company in [City] [State] — [Business Name]"
- SP1 H1: "Janitorial Services in [City] [State] — [Business Name]" | Slug: /janitorial-services-[city]-[state]
- SP2 H1: "Carpet Cleaning in [City] [State] — [Business Name]" | Slug: /carpet-cleaning-[city]-[state]
- Watch out: Don't use "Commercial Janitorial" on SP1 when homepage already says "Commercial Cleaning"

### Pressure Washing / Exterior Cleaning
- Homepage H1: "Pressure Washing Company in [City] [State] — [Business Name]"
- SP1 H1: "House Washing in [City] [State] — [Business Name]" | Slug: /house-washing-[city]-[state]
- SP2 H1: "Driveway Cleaning in [City] [State] — [Business Name]" | Slug: /driveway-cleaning-[city]-[state]
- Watch out: Don't use "Pressure Washing Services" as SP1 — it cannibalizes the homepage

### Painting
- Homepage H1: "Painting Company in [City] [State] — [Business Name]"
- SP1 H1: "Interior Painting in [City] [State] — [Business Name]" | Slug: /interior-painting-[city]-[state]
- SP2 H1: "Cabinet Painting in [City] [State] — [Business Name]" | Slug: /cabinet-painting-[city]-[state]
- Watch out: Avoid exterior painting as SP1 in northern climates (weather-limited)

---

## SECTION 6 — PRE-BUILD DECISION CHECKLIST

Run silently before generating any page. If any item fails, resolve it using the rules above.

### Homepage Checks
- [ ] H1 uses company-type keyword — format: [Company Type] in [City, State]
- [ ] H1 includes business name after em dash
- [ ] H1 does NOT use a procedure or service word
- [ ] H1 does NOT match any planned service page keyword

### Service Page 1 Checks
- [ ] Service is year-round (10+ months)
- [ ] Service is revenue-driving (owner takes 6am calls for this)
- [ ] Keyword is distinct from homepage H1
- [ ] URL slug includes city and state abbreviation
- [ ] Service keyword is NOT seasonal or weather-dependent

### Service Page 2 Checks
- [ ] Service is different from SP1 — not a sub-variant
- [ ] Service is year-round and revenue-driving
- [ ] Keyword is distinct from homepage AND from SP1
- [ ] URL slug includes city and state abbreviation
- [ ] Keyword does NOT overlap significantly with SP1

---

## SECTION 7 — CONFLICT RESOLUTION RULES

### Rule 7.1 — Brief Provides Only Seasonal Services
Use the broadest company-type service as the second page before building anything seasonal.

### Rule 7.2 — Prospect's Site Uses Cannibalized Keywords
Do not replicate their mistakes. Override with company-type format. This is a selling point.

### Rule 7.3 — Two Services Are Too Similar
Consolidate into one page targeting the broader keyword. Find a genuinely different SP2 from the full service list.

### Rule 7.4 — Industry Not Listed in Section 5
Apply universal formula: Homepage = [Company Type] in [City, State]. SP1 = highest-volume procedure. SP2 = second-highest procedure that does not semantically overlap SP1.

### Rule 7.5 — City Not Explicitly Named
Do NOT invent a city. Mark as TBD and flag for human review. A wrong city is worse than a missing one.

---

Fluid Frame Marketing | Keyword Selection & Cannibalization Prevention Guide | Version 2026
