# HVAC and roofing qualify: Fort Wayne IN, Lincoln NE, Peoria IL (2026-11-16)

Method: QUALIFY-BRIEF four tests, rendered in Playwright (Chromium, 1440px; homepage at 390px not separately checked). Internal crawl of up to 14 pages per site. Nothing submitted, no forms, no logins, no CAPTCHAs attempted. Scout data from `scout-data` (places.json). Per-site detail: `prospects/<city>-<trade>/<slug>/qualify.md`.

Exclusion list applied (none of the 20 checked were on it). Stop rule: 20 checks reached before 8 PASSes.

## PASS (3)

| Business | City | Website | Google place ID | Phone (places.json) | Money service 1 | Money service 2 | Flags |
|---|---|---|---|---|---|---|---|
| Poormans Heating & Air | Fort Wayne, IN (HVAC) | https://www.poormansheating.com/ | ChIJdX8QGPbkFYgR8hFwq7XmSFM | (260) 422-3534 | Residential furnace and AC repair/replacement | AC and furnace maintenance agreements | Has a commercial section; keep demo to residential. |
| 4Ever Metal Roofing | Fort Wayne, IN (roofing) | https://www.4evermetalroofing.com/ | ChIJ__8LEvXmFYgRl_IGjtzTIug | (260) 234-2252 | Standing seam metal roofing | Metal shingle and stone-coated steel roofing | Site also lists an 866 toll-free and a 317 number; confirm the live line. |
| Faze Roofing and Construction | Fort Wayne, IN (roofing) | https://www.fazeconstruction.com/fort-wayne-roofing | ChIJ8z_1XXgZXSURy2XDVYya1aM | (260) 226-8800 | Roof replacement and repair | Siding installation | Multi-state (Indiana and Ohio) remodeler; confirm trade fit. |

## SKIP (17)

| Business | City / trade | Reason |
|---|---|---|
| Ro-Mech Mechanical | Fort Wayne HVAC | Agency build: "Select On Site, LLC" credit in footer |
| Coe Heating & Air | Fort Wayne HVAC | Agency build: same Select On Site credit |
| Titan Heating & Air | Fort Wayne HVAC | Test 3: 4 pages, no real service detail |
| Graber Roofing & Gutters | Fort Wayne roofing | National RoofAid USA network branding (logo and footer); Josh to override if local only |
| Schmucker Roofing | Fort Wayne roofing | Agency build: "King Contractor Agency" credit |
| Perfect Steel Solutions | Fort Wayne roofing | Agency credit: "Powered by MediaFox Creative" |
| Home Pride Contractors | Lincoln roofing | Multi-city, multi-state network (NE and IA) |
| Home Solutions of Nebraska | Lincoln roofing | Roofing pages already name Lincoln in H1 |
| Champ Roofing & Exteriors | Lincoln roofing | Multi-state chain; Springfield MO office (excluded market) |
| Murray Roofing | Lincoln roofing | National chain (LA, TX, CO, NE) |
| Rubicon Roofing & Exteriors | Lincoln roofing | Test 3: no service pages, blog-heavy |
| Bill's Heating & Air | Lincoln HVAC | Agency credit: "Marketing by A2 Online Marketing"; city H1s present |
| Harley's Heating & Air | Lincoln HVAC | Agency credit: "Designed by mta360" |
| All Pro Heating & Air | Lincoln HVAC | Source has "Website by" and web.com; no service pages reached |
| Chuck's Heating and Cooling | Peoria HVAC | Most services already have "in Peoria, IL" H1s |
| SNS Roofing | Peoria roofing | Homepage 403 (bot block); not judged |
| Gavlinski Roofing & Construction | Peoria roofing | Test 3: one services page only |

Summary: 20 checked, 3 PASS, 17 SKIP. The batch falls short of 8 PASSes; most candidates were stopped by agency credits or by thin sites. Pending Josh: Graber (RoofAid network) and Faze (multi-state). The unrendered sites (SNS, All Pro's services pages, Perfect Steel's metal pages) would need a manual look.
