# Brief: rewrite ONE doc's strategy page in Josh's voice, in place (Sonnet)

Josh, Nov 16: our writers own the strategy page now.

## Read first
- **Voice:** `docs/voice/JOSH-VOICE.md` and `docs/voice/ff2-global-copy-rules.md`.
- **Structure and fixed lines:** `docs/writer-guides/STRATEGY_PAGE_GUIDE.md`. Use every fixed line word for word.
- **Full-build lines:**
  - `docs/writer-guides/FULL_BUILD_LINES.md`. Line 8 is the Homepage card line.
  - The four verified monitoring lines.
- **The approved model:** the ComfortTechs strategy page, Google Doc `1NX5HrJtf2-0DMpbyvpsmZa4HlfinjtT-Wr9bOewksD8`.
  - Read it with `mcp__Google_Drive__read_file_content` and `includeComments: true`.
  - Josh's comments in that doc are rules. Follow them.

## Facts and limits
- **Facts:** the business folder's `inventory.md`, `site/` and `reviews.json`.
  - Use only problems verified on that page.
  - Every fix must be one the demo really makes; check against the doc's own business pages.
- **Length and lines:**
  - ≤1,000 words.
  - Banned: jargon such as "H1", "title tag", "menu", "footer" and "SEO".
  - Required: the "Here's a demo of yours" lead-in, if the guide or model has it.
  - "What we'd confirm" is 3–4 single questions, followed by the CTA.

## Do
1. Load the tools with ToolSearch `select:mcp__Google_Drive__read_file_content,mcp__Google_Docs__update_doc`.
2. Read the target doc.
3. Rewrite only the "Strategy page" section, in place, with `mcp__Google_Docs__update_doc` `replaceAllText`.
   - `containsText` is exact paragraph text from the current doc, with `matchCase: true`.
   - Batch several requests per call.
   - Leave the business pages and Notes untouched, except for the strategy word count in Notes.
4. Re-read the doc. Save the full final text to `outreach/words-2026-11-16/<slug>.gdoc.md`.

## Limits
- Never create a doc.
- Never change sharing.
- Send nothing.
- Run no git.

## Reply
Under 50 words: what changed, and the strategy word count.
