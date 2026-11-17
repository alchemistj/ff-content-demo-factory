# Audit-and-ask contact-form message (Josh approved the wording, 2026-11-17)

Goal: only spend demo time on businesses that say they want one. The message names two real problems on their current site, offers a free homepage mockup, and asks one question. No demo link: a "yes" gets the demo (an existing one after a quick check, or a homepage mockup built in about 20 minutes).

Josh's decisions (this session, 2026-11-17):
- Wording below approved. Smiley at the very end, after the P.S. (Josh, 11/17).
- No opt-out line: this is a contact form, not a cold email. (Overrides the 11/15 FF rule for this message.) The do-not-contact list still applies to anyone who replies stop.
- The P.S. is true on every client site today: spam filter plus Claude reads every lead; solicitations never get through.
- Only businesses with a working contact form. No form, or a visible CAPTCHA, means skip or a hand send for Josh.
- Who: every non-Lovable prospect that already has a strategy page (words.json). Runs in this Claude Code session.

```
Hey <Business> team,

I looked at your website and noticed two things: <problem 1, plain words>, and <problem 2, plain words>. <One sentence tying it to them, e.g. "Your Google reviews are strong, so your site is hiding your best selling point.">

We build websites for service businesses. If you'd like, we'll make you a free mockup of your homepage that fixes both<optional: " and <one short benefit>">. Want me to send you one?

Josh, Fluid Frame Marketing

P.S. If you were on our website system, you wouldn't even be seeing this message. We flag every solicitation, so they never get through. :)
```

Rules for the two problems:
- Each one is on the live site the day the message is written (checked by a browser, not from audit.md alone), and a business owner would understand it without a web glossary (no "H1", "schema", "meta", "Lighthouse", "Core Web Vitals").
- Good: tap-to-call missing on phones, an empty or missing reviews section, no page for a main service, no way to request service except a phone number, a broken link or form, the site says a different phone or city than Google, copyright years ago, text that is hard to read on a phone, a page that takes many seconds to show anything on a phone.
- The tie-in sentence uses only facts in that prospect's folder (reviews.json, facts.md). Never invent numbers.

Each prospect gets `ask.md` with `## Message (paste as is)` (and `## Short message` if the form caps length) plus `## Checks` (evidence for each problem, the form URL, CAPTCHA type, required fields, any no-solicitation text). The sender sends it with `--message-file ask.md`.
