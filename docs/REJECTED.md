# Rejected lines (Josh's guardrail 4, Nov 16)

Every line or pattern Josh has rejected in demo copy lives here, as a test. `scripts/check-rejected.py` runs every rule with a `regex` against a words file before anyone reads it, and the doc can't be called ready while any FAIL remains. Rules without a regex are checked by the taste check (`docs/briefs/TASTE-CHECK-BRIEF.md`).

**Every rejection Josh gives from now on gets a new entry here, in the same commit as any brief change.**

How to read a rule:
- `pages` is which pages it applies to: home, service, contact, strategy or all business pages (`business` = home, service and contact).
- `where` says which part of the page:
  - `hero` is the text above the first section heading;
  - `heading` covers section headings only;
  - `body` is everything except review quotes.
- `regex` is a Python regex, matched case-insensitively.

### R1: "Customers describe" / "customers say" above the fold
State the business's claims as theirs. Review proof goes in a quote, not hedged prose in the hero.
Example: "Customers describe a technician within a day, often the same day." (K&W furnace hero, Nov 16)
- pages: business
- where: hero
- regex: \b(customers|clients|homeowners|people|reviewers)\s+(describe|say|tell us|mention|report|write)\b

### R2: How-to, trade-tip and "what usually fails" sections on service pages
A service page sells this business. It is not a blog post. At most one short trade section, and only if it gets someone to call.
Examples: "Furnace Problems and What Usually Causes Them", "Before You Call", "Gas Smell or Carbon Monoxide Alarm: What to Do First" (K&W, Pro Comfort, Nov 16)
- pages: service
- where: heading
- regex: what usually|usually causes|problems and what|before you call|what to do first|how to\b|tips?\b|signs (you|that|of)|what (usually )?fails|troubleshoot|diy|what to check

### R3: Hedges on the business's own claims
Say what the business does with confidence. Hedge only general trade facts, never "we" or "our".
Examples: "We usually come out the same day", "our crew often finishes in one day"
- pages: business
- where: body
- regex: \b(we|we're|we'll|our|us)\b[^.!?\n]{0,60}\b(usually|often|in most cases|typically|generally|tend to|most of the time)\b

### R4: Keyword stuffing
The "<Service> in <City>" phrase belongs in the H1 and maybe once more. Repeating it in the copy reads like it was written for Google, not people.
- pages: business
- where: body
- check: keyword-stuffing (any "<words> in <City>, <ST>" phrase used more than twice in one page's copy, H1 and header line excluded)

### R5: Filling pages to a word count
Length follows the real material. Never pad toward a number. (Withdrawn Nov 16: "fill service pages to 700+ with hedged general trade knowledge".)
- taste check only

### R6: Speed claims at one-review strength
A speed claim is said plainly when the business's site or several reviews back it, or it's left out. Never "customers describe…". (Withdrawn Nov 16: "speed claims at one-review strength".)
- taste check only (R1 and R3 catch the usual wording)
