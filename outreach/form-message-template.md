# Contact-form message template (FOR JOSH'S APPROVAL; nothing is sent until he approves it and the first batch)

This is the shape every contact-form message follows. It's the same structure as the Wichita messages Josh has already seen. The `<slots>` are filled per business from that demo's own folder (reviews.json, facts.md, audit.md, words.json). Nothing in a slot may be invented: the factory gate (`npm run gate`) and a Haiku fact-check run before any message is queued.

```
Hey <Business> team,

Your reviews tell the same story: <the one specific thing several customers say, in plain words>. <One concrete customer detail, as that customer described it>. We build websites for service businesses, so we made you a mockup built around it:

https://<slug>.websitepreview.fluidframemarketing.com/?utm_source=form

Note: It'll look a lot better with your logo and images on it! Lol

The preview walks through why each page is built the way it is. One thing we'd fix: <one real, checkable problem on their current site, from audit.md, re-checked on the live site the day the message is written>.

We built your homepage and your <service> page as examples, and we'd love to build the rest.

How'd we do on your company vibe?

Not interested? Reply "no thanks" and you won't hear from me again.

Josh
Fluid Frame Marketing
```

**Changes on 11/15 (FF Architect, after the independent QA pass):**
- The opt-out line is required in every message.
- The "Which brands or manufacturers are you certified with?" question is removed: it presumes certifications no source states.
- The "our contact form system would have recognized this as a solicitation" line is removed.
- "My daughter and I build websites…" is now **an optional variant only**, used if Josh confirms it. The default is "We build websites for service businesses…". The approval block shows the variant.
- "The preview opens with a recent case study" is removed, because the SRA figures are off the strategy pages until Bailey and Josh OK them.
- Email sends (no form) use the same message with `utm_source=email`.

**Form fields the sender fills (real identity only):** Josh Lenz · josh@fluidframemarketing.com · (417) 373-2773 · Fluid Frame Marketing. Subject, if the form asks: "A website mockup for <Business>".

**Short version** (only for forms that cap the message length, usually 600 characters): the greeting, the one specific, the link, the "logo and images" note, the one fix, the opt-out line, and the sign-off.

## Rules the sender enforces (`scripts/send-outreach.mjs`, tested end to end by `scripts/test-send-outreach.mjs`)
- **One submission per business, ever.** `outreach/sent-ledger.json` is keyed by the site's domain and checked before every attempt.
- **Stop means stop.** Any "stop", "not interested" or "remove me" reply goes into `outreach/do-not-contact.json` that day, and that business is never contacted again.
- **Never bypass a CAPTCHA.** A visible check is always a hand send for Josh.
- **Skip any site that says no solicitations.**
- **Log every submission:** business, URL, time, the exact message, and screenshots before and after submit.
- **Sends only entries marked `"approved": true`**, and only with `--send`. The default is a dry run that fills the form and submits nothing.

## Proposed first batch (needs Josh's yes on this template, then on these 5)
A dry run on 11/15 filled each form but submitted nothing. Results:
- **Sender-ready (3):** Ballinger (an invisible reCAPTCHA; submits normally, and becomes a hand send if blocked), Yoke's, Plumb Crazy.
- **Hand send (2):** Enegren (the form requires a street address and a residential/commercial choice), Creekmore (the homepage quote form has no message box the sender can find).

So the first batch of 5 is 3 by the sender and 2 by Josh's hand, with fields and message in `outreach-runs/.../hand-send.md`. Bybee was dropped because its form has a reCAPTCHA. Queue: `outreach/queue-wichita-first5.json` (every entry `"approved": false` until Josh says go).
