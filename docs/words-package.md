# Words package (`words-package/v1`)

The words package is the contract between the two demo repos. The factory writes one `words.json` per prospect. The demo template in ff-astro-demos renders it exactly and writes no copy of its own. If the template needs a word, the word belongs in this file.

Location: `prospects/<market>/<slug>/words.json`, for example `prospects/wichita-windows/evolve/words.json`. Its research sits beside it: `qualify.md`, `audit.md`, `facts.md`, `reviews.json` and `plan.md`.

Check it with `node scripts/check-words-package.mjs prospects/<market>/<slug>`. A package that fails the check does not go to the build.

## Shape

```jsonc
{
  "schema": "words-package/v1",
  "business": {
    "name": "Evolve Exteriors",
    "slug": "evolve",
    "city": "Wichita", "state": "KS",
    "companyType": "Exterior Remodeling Company",        // the homepage keyword: company type, never a service
    "owners": ["Colton", "Riley"],                       // first names; the checker flags third-person owner sentences
    "phones": [                                          // every office's number; first is the main one (matches Google)
      { "label": "Wichita", "display": "(316) 435-8009", "tel": "+13164358009" },
      { "label": "Oklahoma City", "display": "(405) 363-2294", "tel": "+14053632294" }
    ],
    "email": "info@evolve-exteriors.com",                // or null
    "hours": "Monday to Friday, 9:00 AM to 5:00 PM",     // or null
    "address": null,                                     // only when confirmed and wanted
    "serviceArea": { "summary": "Wichita and towns within 150 miles", "towns": ["Wichita", "Derby"] }
  },
  "trustBar": ["Free Estimates", "Lifetime Warranty on Windows", "Locally Owned & Operated"],
  "services": [                                          // the FULL confirmed service list; built pages get a route
    { "name": "Window Replacement", "route": "/window-replacement-wichita-ks/", "blurb": "One window or the whole house, measured and installed by our crew." },
    { "name": "Soffit and Fascia", "route": null, "blurb": "Replaced along with siding so the whole edge of the roof matches." }
  ],
  "pages": [
    {
      "role": "home",                                    // home | service | contact
      "route": "/home/",
      "navLabel": "Home",
      "keyword": "exterior remodeling company Wichita KS",
      "seo": null,                                       // optional { "title", "description" }; demos don't need it
      "hero": {
        "eyebrow": "Locally owned in Wichita",           // optional
        "h1": "Exterior Remodeling Company in Wichita, KS — Evolve Exteriors",
        "sub": "Two or three specific trust sentences.",
        "primaryCta": { "label": "Call (316) 435-8009", "action": "call" },        // call | contact
        "secondaryCta": { "label": "Get a Free Estimate", "action": "contact" },
        "image": { "slot": "home-hero", "alt": "…", "brief": "new black-framed windows on a tan brick ranch house, house on the right, clear sky on the left" }
      },
      "sections": [
        { "type": "review", "quote": "…", "name": "Tammy A." },
        { "type": "split", "heading": "…", "body": ["paragraph", "paragraph"], "list": ["…"],
          "image": { "slot": "home-windows", "alt": "…", "brief": "…" }, "imageSide": "right" },
        { "type": "services", "heading": "Everything We Do", "intro": "…" },       // renders business.services
        { "type": "prose", "heading": "…", "body": ["…"] },
        { "type": "steps", "heading": "…", "items": [{ "title": "…", "text": "…" }] },
        { "type": "faq", "heading": "…", "items": [{ "q": "…", "a": "…" }] },
        { "type": "callBand", "heading": "…", "text": "…" }
      ]
    }
  ],
  "footer": {
    "about": "One or two sentences: who the business is, from confirmed facts.",
    "why": ["Owner on every job", "Price-beat promise", "Lifetime window warranty"]
  },
  "strategy": {
    "whyHeading": "Why we built this site",
    "why": ["paragraph", "paragraph", "paragraph"],
    "cardsHeading": "Be The Window Company People Find on Google",
    "cardsIntro": "…",
    "cards": [
      { "route": "/home/", "title": "Homepage", "why": "…", "problems": ["…"], "fixes": ["…"], "alsoAdd": "one line from full-build-lines.md" }
    ],
    "reportCardHeading": "What great window company websites get right, and how yours measures up.",
    "reportCard": [{ "label": "Headline says what you do and where", "status": "Needs work" }],
    "closing": { "heading": "Want a website like this for your business?", "text": "…" }
  },
  "onboardingQuestions": ["…"]
}
```

### Text rules inside the file
- Body strings may use `**bold**` and `[link text](/route/)`. Write phone numbers as plain text; the template turns every `business.phones` number into a tap-to-call link wherever it appears.
- No HTML, and no text the template is expected to make up.
- The template supplies only fixed chrome. The full chrome list: "← See why we built this site", the nav labels from `pages[].navLabel`, the footer column headings ("Services", "Service area", "Contact", "Why choose us"), the copyright line, and on the strategy page the Fluid Frame header, the SRA Roofing case study, the full-build list from `full-build-lines.md`, and the phone bar.

## What the checker enforces
1. **Shape.** Every required field is present, with one home page, at least one service page and one contact page.
2. **Quotes.** Every `review` quote appears word for word in `reviews.json` from a five-star review, attributed as first name plus last initial, and each review is used once.
3. **Keywords.** The homepage H1 starts with `business.companyType in <City>, <ST>` and names one city. Service page H1s do not contain the company-type phrase. No two pages share a `keyword`.
4. **Voice.**
   - No "customers tell us / customers say / most people notice / one customer / your reviews" sentences on business pages.
   - No "The crew… They…" narration.
   - No website-quality claims ("professional website", "mobile-friendly experience", "this mockup").
5. **Every number.** Every `business.phones` entry has a valid `tel`.
6. **Lengths.** Words are counted the way the rendered page will count them: page words plus trust bar, footer and fixed chrome. The ranges are home 580–700, service 750–900, contact 250–450 and strategy 1,000 or fewer. The rendered `qa/demo-check.mjs` in ff-astro-demos stays the final gate.
7. **Repetition.** No sentence of 8 or more words appears on more than two business pages (trust bar and footer excepted).
