# Diamond Roof & Gutter: current-site audit

Site: https://www.diamondroofandgutterks.com/ (one page). Checked 2026-11-09 from raw homepage HTML (saved to `/tmp/claude-0/-home-user/9d8118b7-f5b3-5447-8eb5-932524a50e8e/scratchpad/diamond/home.html`) and the rendered text. No Playwright crawl and no screenshots: the bare domain returned errors, and time was short. The contact form does not exist, so none was tested.

## Premise check: a website exists
- The brief said "no website." That is only true of the Google listing (scout data). A live site exists at https://www.diamondroofandgutterks.com/ (the www form loads; the bare domain returned HTTP 503 twice and a connection reset once).
- Directories list it as the business website (https://rooferdirectory.co/contractor/diamond-roof-gutter/).
- A second domain appears in a Facebook search snippet, diamondroofandgutter.com. It returned a connection error and was not read (https://www.facebook.com/diamondroofandgutter/).

## What works
- Every visible phone number is a tappable link. All of them point to `tel:+17817392688` (header, hero, services, process, FAQ, contact, footer, mobile bar). Source: raw HTML, https://www.diamondroofandgutterks.com/.
- Nav links (#services, #about, #contact) go to sections that exist on the page.
- The address links to Google Maps (footer).
- Footer copyright reads 2026.

## What is broken, most costly first
1. **Phone number does not match.** The site uses (781) 739-2688, a 781 area code, not Wichita's 316. Google (scout) and the directory show (316) 640-6056. Facebook and Owens Corning search snippets show (316) 640-8413. Every "call us" button on the site goes to a number we cannot tie to this business.
2. **No email, no contact form, no hours.** Contact is phone only. The FAQ tells visitors "Please call before visiting to discuss availability."
3. **No owner, years, license, insurance, warranty, financing or certification** appears on the site.
4. **Thin service content.** Three cards (Roof repair, Roof replacement, Gutters & downspouts), one line each. Roof replacement has no page. The H1 is "Roofing & Gutter Services in Wichita, KS": it names the city, not roof replacement.
5. **No real project photos.** The hero and about images are labelled illustrative (alt text: "Illustrative home..."; footer: "Architectural imagery is illustrative.").
6. **No inner pages.** /contact returned the homepage content; /about reported "page not found."

## Phone and email, every place shown
| Where | Shown | Link |
| --- | --- | --- |
| Website (all places) | (781) 739-2688 | `tel:+17817392688` (works) |
| Google (scout data) | (316) 640-6056 | not reopened |
| Directory listing | (316) 640-6056 | https://rooferdirectory.co/contractor/diamond-roof-gutter/ |
| Facebook snippet, Owens Corning snippet | (316) 640-8413 | not opened |
| Birdeye | no number shown | https://reviews.birdeye.com/diamond-roof-gutter-165847016657941 |
| Email | none on the site, the directory or Birdeye | not applicable |

## Pages, titles, H1s
| Page | `<title>` | H1 |
| --- | --- | --- |
| / | Diamond Roof & Gutter \| Roofing in Wichita, KS | Roofing & Gutter Services in Wichita, KS |

Only one page exists. Source: https://www.diamondroofandgutterks.com/

## What a customer finds instead
- **Facebook:** two pages. "Diamond Roof and Gutter" (https://www.facebook.com/diamondroofandgutter/) and "Diamond Roof & Gutter" (https://www.facebook.com/p/Diamond-Roof-Gutter-100085573866682/). Both are behind a login wall for our tools; details come from search snippets. Whether they are the same business is not confirmed.
- **Directories:** rooferdirectory.co (5.0, 20 Google reviews; https://rooferdirectory.co/contractor/diamond-roof-gutter/) and Birdeye (28 reviews, unclaimed by the owner, but no reviews shown on the page; https://reviews.birdeye.com/diamond-roof-gutter-165847016657941).
- **Owens Corning directory:** a search snippet lists "Diamond Roof & Gutter LLC" as a Preferred Contractor (https://www.owenscorning.com/en-us/roofing/contractors/contractor-profile/231482). Not confirmed; see facts.md section 14.
- **Not found:** BBB, Yelp, Nextdoor, Angi, HomeAdvisor, Thumbtack, GAF. See facts.md.

## Checks not run
- Playwright crawl, screenshots and mobile-width test (time; the site returns 503 at times).
- Form test: no form exists.
- PageSpeed or Lighthouse score.
- Google profile hours and address (not readable from our tools).
