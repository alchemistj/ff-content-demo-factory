# Outreach sender

One command sends approved outreach messages through each prospect's own website contact form, with a real browser.

```
node scripts/send-outreach.mjs outreach/<queue>.json            # dry run: fill and screenshot, submit nothing
node scripts/send-outreach.mjs outreach/<queue>.json --send     # submit entries marked "approved": true
node scripts/send-outreach.mjs outreach/<queue>.json --send --only rivercity,ict-roofing
```

- **Nothing is submitted without Josh's go.** A send needs both the `--send` flag and `"approved": true` on the entry. Set `approved` only after Josh says go for that prospect.
- **The queue is a list.** Add one entry per prospect: slug, company, prospect folder, form URL, and `frame` when the form is embedded in an iframe (for example `"frame": "powr.io"`).
- **Message:** the `## Message (paste as is)` block of the prospect's `outreach.md`, word for word. When a form caps its length below the message, the sender uses a `## Short message` block if there is one. If there isn't, the entry becomes a hand send.
- **CAPTCHAs are never defeated.** A visible "I'm not a robot", hCaptcha or Turnstile is a hand send. An invisible reCAPTCHA is submitted normally, and if the form doesn't confirm, it becomes a hand send.
- **Spam traps are skipped:** hidden honeypot fields (off-screen, see-through, untabbable) are left empty.
- **A required field we can't honestly fill** (zip code, address, a dropdown) makes the entry a hand send.
- **Output:** `outreach-runs/<date>/<dry-run|send>/` holds:
  - the filled-form screenshot (`<slug>-filled.png`)
  - the page after submit (`<slug>-after-submit.png`)
  - `log.md` and `log.json` (each entry is sent, or a hand send with the reason)
  - `hand-send.md` (Josh's copy-paste pack: form URL, each field's value, the message)
- **After a `--send` run**, log each sent entry in GoHighLevel: the `demo-sent` tag and a "Demo sent" note (Josh's working rules).

Form fields come from the queue's `sender` block: name Josh, email josh@fluidframemarketing.com, phone 4173732773. The last name is "Fluid Frame Marketing" because Josh's own last name isn't in the working rules.
