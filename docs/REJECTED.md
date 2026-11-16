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

## Mined from Josh's ComfortTechs comments and JOSH-CHECKLIST.md (Nov 16)
Sources: CT = Josh's comments on the ComfortTechs approved doc (1NX5HrJtf2-0DMpbyvpsmZa4HlfinjtT-Wr9bOewksD8). CL = `docs/JOSH-CHECKLIST.md` item number. `level: warn` prints WARN, not FAIL: a person or the taste check decides.

### R7: Efficiency numbers that mean nothing to a customer
"60% efficiency", "up to 98%": Josh: "efficiency numbers that doesn't even mean anything to me". (CT; CL 6)
- pages: business
- where: body
- regex: \b(up to )?\d{2}(\.\d)?\s?%\s*(efficien\w*|afue)|\bafue\b|\bseer2?\b|\bhspf\b

### R8: Hedged after-hours lines
"No 24/7 promise": say plainly that they come out after hours. (CT, Contact card)
- pages: all
- where: body
- regex: \bno 24/7 promise\b|\bnot a 24/7\b|\bwithout a 24/7\b

### R9: Talking about the website on business pages
"each has its own page", "on this page", "the form asks", "send the form any hour". (CL 17, 89)
- pages: business
- where: body
- regex: \b(each has its own page|on this page|our site lists|check out our|learn more (on|about)|the form asks|send (us )?the form)\b

### R10: Filler, even when it's lifted from their site
"years of experience", "good hands", "finish the job right", "is part of what we do", "when it comes to". (CL 94, 17)
- pages: business
- where: body
- regex: \byears of experience\b|\bgood hands\b|\bfinish(ing)? the job right\b|\bis (all )?part of what we do\b|\bis all about\b|\bwhen it comes to\b

### R11: Notes to the owner on business pages
"to be confirmed", "on our onboarding call", "posted hours are X, but…": conflicts belong on the strategy page. (CL 16, 97)
- pages: business
- where: body
- regex: \bto be confirmed\b|\bonboarding call\b|\bwe'?d confirm\b|\bposted hours (are|say)\b

### R12: Curt or grudging lines
"we deal with it", "Judge us by the reviews", "can't lean on a reputation". Be warm and promise something. (CL 15)
- pages: business
- where: body
- regex: \bwe deal with it\b|\bjudge us by\b|\bcan'?t lean on a reputation\b

### R13: Legal suffix in the business name
"Dream Makers LLC Heating and Cooling" → "Dream Makers Heating and Cooling". (CL 7)
- pages: business
- where: body
- regex: \b(LLC|L\.L\.C\.|Inc\.)(?=[\s,.)]|$)

### R14: Leftover template or placeholder text
(CL 34, 36)
- pages: business
- where: body
- regex: \blorem ipsum\b|\bplaceholder\b|\bcoming soon\b|\byour text here\b|\bTBD\b

### R15: Unnamed awards and credentials
"many other customer service awards", "award-winning": name each one and say what it means. (CT; CL 8)
- pages: business
- where: body
- level: warn
- regex: \bmany other (customer service )?awards?\b|\baward[- ]winning\b

### R16: Unexplained trade jargon
tear-off, decking, flashing, ACV, RTUs, TPO, EPDM, coping, soffit, fascia: a plain word or a one-line explanation. (CL 80, 88)
- pages: home, service
- where: body
- level: warn
- regex: \b(tear-?off|decking|flashing|ACV|RTUs?|TPO|EPDM|coping|soft metals?|soffit|fascia)\b

### Judgment only (taste check and DOC-CHECK, no regex)
- Vague "What the demo fixes" / "Current site problem" bullets; fixes that don't move the needle (CT).
- A vague keyword line where a search-volume number exists (CT).
- A speed-score line without the mobile reason (CT).
- A thin home page ending in a one-line FAQ and a bare "Call us" (CT; CL 84, 93).
- Copy that retells the review next to it (CL 46). Two quotes back to back, or three sections in a row ending in a quote (CL 77, 93).
- A service sold twice on one page (CL 32). "Home" wording under a "home or business" heading (CL 23).
- Advice that ignores how the trade works (CL 20). A paragraph that doesn't cover its heading (CL 21). Forced metaphors (CL 18).
- Opening on after-hours cost before the plan is explained (CL 19). DIY step-by-step instructions (CL 91).
