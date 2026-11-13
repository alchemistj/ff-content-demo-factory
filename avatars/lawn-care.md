# Trade avatar: Wichita residential lawn care and landscaping

Built once (2026-11-13, ff-architect #651 weekend shift) and reused across Wichita lawn and landscaping demos. Method: `docs/writer-guides/AVATAR-AND-USP.md`, section 1. Structure modeled on `avatars/hvac.md` and `avatars/roofing.md`; no facts carried over.

**Evidence base, and a warning.** Three review files on `review-data`: `your-choice-lawncare` (22 written reviews), `imperial-landscaping` (39) and `swmo-services` (6). **All three are Springfield, Missouri businesses, not Wichita.** The fourth folder, `augi-lawn-and-light`, holds no reviews: its pull failed (Apify HTTP 402, `receipt.json`). So the voice of customer is real but from another city, and the Wichita specifics (seasons, neighborhoods) come from public knowledge and are marked (inferred). I also skimmed `prospects/wichita-lawn-landscaping/` on `origin/claude/wichita-lawn-landscaping`; its four picked prospects all say "reviews not yet pulled." Quotes are word for word. This file describes the buyer, not any one company: never put a quote here on a demo for a business other than the one it came from.

---

## 1. The buyers

**A. The homeowner (primary).** Owns the house, wants the yard to look cared for without spending Saturdays on it. Messaging: it gets done on schedule, it looks sharp, and someone answers.

**B. The landlord or investor.** Doesn't live there and may own several addresses. "Paul has been mowing multiple properties for me." (`review-data/imperial-landscaping, Edward M.`) "Paul took care of me on my investment properties" (`review-data/imperial-landscaping, Alex B.`). Also the owner of a neglected property who is behind on a city notice: "knowing the City may fine us any given day now." (`review-data/imperial-landscaping, Mike T.`) Messaging: one contact, many properties, no excuses, and willingness to take the ugly job.

**C. The referrer.** Neighbors, realtors and property managers. Reviews show neighbors only as an audience ("I regularly get compliments from neighbors and family on my lawn." `review-data/your-choice-lawncare, Jamie W.`). No realtor or manager appears in the reviews. (inferred channel)

## 2. The primary avatar

**"Saturday Dale," 40 to 65, Wichita homeowner** (inferred composite). Ranch or two-story in east Wichita or a suburb like Derby or Andover (inferred), a typical lot with fescue or bluegrass (inferred). He used to mow it himself and is done with that, or he has a lawn that never looked right. He found a company three ways in the reviews: a door hanger ("Originally found Imperial Landscaping from a young man door-knocking in the neighborhood, he politely gave me a door hanger" `review-data/imperial-landscaping, Dennis S.`), a Google listing, or a neighbor's lawn.

## 3. The identity iceberg

- **Says publicly:** "I need someone to take care of the yard." (inferred)
- **Admits privately:** "I've been burned by a lawn company that took my money and stopped answering." (inferred from section 8)
- **Won't admit to anyone:** "I care what the neighbors think of my yard, and I'm embarrassed it got this bad." Dennis S. comes close: "I haven't really cared for the looks of my lawn until they made it beautiful!" (`review-data/imperial-landscaping, Dennis S.`)

## 4. Parking-lot moments

**Moment 1: "The grass got away from me."** (inferred scene) It's late May in Wichita, after a wet spring. The lawn is knee-high at the back fence and a neighbor's mower is running. Dale stands in the driveway looking at the mower that won't start. He's tired of this. He googles, or remembers the door hanger on the fridge.

**Moment 2: "I paid, and nobody called back."** (inferred scene; the fear comes from reviews) It's August. The grass is brown and crabgrass is up through it. He prepaid the season. He's left two voicemails. He sits in the truck and decides nobody is going to call back and that he'll find someone new.

**Moment 3: "Fall is when you fix it."** (inferred scene) It's September. The lawn is thin from the summer heat. He's read that fall is the time to aerate and overseed fescue in Kansas (public knowledge). He wants someone who actually knows what that means.

**Moment 4: "The city sent a letter."** (inferred scene; Mike T.'s review is the real version) A weeds notice is taped to the door, or an inherited house has an acre of overgrowth. He's called three companies and none will touch it.

**Moment 5: "Leaves and the first snow."** (inferred scene) Half an acre of leaves in November, or a driveway of snow before work. Reviews mention leaf removal and snow clearing for one company.

## 5. Top 5 fears, ranked by emotional intensity

1. **Paying, then being ignored.** "Whatever you do, do not pay for an entire season in advance, or you will be sorry." (`review-data/your-choice-lawncare, Shannon M.`) "I've been waiting on a refund for over 6mo" (`review-data/your-choice-lawncare, Kyle M.`) "If you want to be ignored and never get a call or an email, feel free to call Your Choice Lawn Care." (`review-data/your-choice-lawncare, Benny Q.`)
2. **The estimate that goes nowhere.** "Why come out to do an estimate and then not follow through with the actual job." (`review-data/imperial-landscaping, Lori C.`)
3. **Paying for treatment that doesn't work.** "Poor lawn management, didn't stop weeds." (`review-data/your-choice-lawncare, Kyle M.`) "our lawn has barely improved" (`review-data/your-choice-lawncare, Joseph B.`)
4. **A crew that doesn't show.** "Not responsive, were not punctual nor did they notify us most of the time." (`review-data/your-choice-lawncare, Joseph B.`)
5. **Hiring an amateur.** "They ARE NOT some round the block college guy who wants to make a few bucks on the side" (`review-data/swmo-services, Tim F.`) "did not really seem to know much about plants or flowers. Could not answer any of my questions." (`review-data/imperial-landscaping, Lori C.`)

## 6. Top 5 objections (surface, then the fear underneath)

1. **"Do I have to pay for the season up front?"** → "Once you have my money, I'm on my own." (fear 1)
2. **"Can you give me a number, and will you follow up?"** → "You'll look, text me a quote, and vanish." (fear 2)
3. **"Will my lawn actually look better?"** → "I'll pay for weed treatments and the weeds will still be there." (fear 3)
4. **"Will you show up when you say?"** → "I'll take off work for nothing." Dennis S. praised the opposite: "He came out on time within the time window he gave me" (`review-data/imperial-landscaping, Dennis S.`). (fear 4)
5. **"Will you take a small or ugly job?"** → "I'm not worth your time." Mike T.: "I got multiple quotes and no one was willing to do the job because “it would tear up our blades.”" (`review-data/imperial-landscaping, Mike T.`) (inferred underlying fear)

## 7. Top 5 wants

**Practical:** mowing every week that doesn't get skipped; clean edges and lines; a quick estimate that gets followed through; someone who can answer questions about grass; the seasonal jobs (aeration, overseeding, fertilizing, leaves) handled by the same people.

**Emotional:** relief ("I certainly needed a service that was dependable, kept promises and adhered to schedules. What a relief!" `review-data/imperial-landscaping, Mary S.`); pride ("If you want people to look at your lawn then hire this man" `review-data/imperial-landscaping, Erik S.`); being treated well ("how kindly they treat their customers" `review-data/imperial-landscaping, Brian B.`); not having to chase anyone.

## 8. Past bad experiences

- **The prepay trap and the refund that never came.** Shannon M. and Kyle M. (section 5).
- **The ghosted estimate.** Lori C., who agreed to part of an estimate and got no reply to two texts (`review-data/imperial-landscaping, Lori C.`).
- **The overbooked company.** "Incessant backlog of other customers, yet they insisted they could deal with it." (`review-data/your-choice-lawncare, Joseph B.`)
- **Nobody would take the job.** Mike T. (section 6).
- **Dropped by the company.** "Got let go because I said that my time there might be temporary" (`review-data/your-choice-lawncare, Clayton M.`)
- **The crew on the road.** "Doesn’t use a blinker, playing on phone while driving, and trailer and truck break lights not working!" (`review-data/your-choice-lawncare, Allison`) Buyers judge a company by its trucks.
- **A fixable miss.** "I spoke with Mike and he has agreed to fix the problem this season." (`review-data/your-choice-lawncare, Hannah P.`) Fixing it after a complaint earns trust back.

## 9. Their words (voice of customer)

Always write in the left column.

| What customers say | What marketers wrongly say |
| --- | --- |
| "on time without excuse" (`review-data/imperial-landscaping, Edward M.`) | "reliable, punctual service" |
| "didn’t miss a week" (`review-data/imperial-landscaping, Tim K.`) | "consistent weekly maintenance" |
| "the crispiest lines in my yard" (`review-data/imperial-landscaping, Isabella M.`) | "precision edging" |
| "good and fair price" (`review-data/imperial-landscaping, Tim K.`) | "affordable, competitive pricing" |
| "They respond quickly and also completed the work quickly." (`review-data/imperial-landscaping, Kara R.`) | "fast turnaround" |
| "Mike went out of his way to help bring in extra dirt for our bare spots" (`review-data/your-choice-lawncare, Heather W.`) | "going above and beyond" |
| "Simply an honest company who knows their stuff." (`review-data/swmo-services, Tim F.`) | "trusted lawn care experts" |
| "a huge difference in our crab grass and weeds" (`review-data/swmo-services, Nathan B.`) | "a healthier, weed-free lawn" |
| "they were out within a week of my request" (`review-data/swmo-services, Zach A.`) | "prompt response times" |
| "They will work with you to get your needs met!!" (`review-data/imperial-landscaping, Vera M.`) | "customized solutions" |

## 10. Phrases to use and to avoid

**Use:** "we show up when we say" (only if true for the business) · "we call you back" · "pay as you go" (only if true) · "we tell you what the lawn needs and what it doesn't" · "weekly, and we don't skip" · "crisp edges" · "big job, small job, we'll look" (only if true) · the owner's first name where facts.md confirms it.

**Avoid (hard nos):**
- Invented stats, prices ("mowing from $40"), guarantees ("green lawn guaranteed"), or warranties unless the business's facts.md proves them.
- Prepay or billing terms the business hasn't confirmed.
- Licenses, insurance, certifications, awards, years in business or owner backstory not in facts.md. (AUGI's own sources disagree on years.)
- Dollar figures from reviews as the company's price.
- "Weed-free," "lush," "thick" promises about results.
- Corporate filler: "premier," "turf solutions," "curb-appeal experts," "industry-leading."
- Pun headlines ("Mow-ving up"). The reader is annoyed, not amused (inferred).

## 11. Tone and triggers

**Tone:** plain, direct, neighborly. Short sentences. Sounds like the owner on the driveway, not the sales office. Don't lecture on turf science unless asked.

**Triggers that land:** the owner named and reachable; schedule stated as a plain fact; a straight answer on whether a lawn is worth saving; small jobs welcome; a short before-and-after; a calm answer to "do I pay up front?"

## 12. What's thin

- **Wrong city.** All 67 written reviews are Springfield, MO. Fears and wants likely carry over; Wichita climate, grass types, ordinances and prices don't. Verify seasons with a local owner.
- **AUGI has nothing.** Its pull failed (Apify HTTP 402). The other three picked Wichita prospects (Response, Ferry, Bossy Oak) have reviews pending. Re-pull before using this on a demo.
- **Negatives are few.** Only 8 written reviews at 3 stars or below, 7 of them Your Choice. Imperial has 38 of 39 at 5 stars, mostly short praise.
- **Imperial's reviews cluster.** 28 of 39 are dated 2026-02-19 to 02-21, a burst that reads like a review drive. Treat the volume with care.
- **Mowing dominates the voice.** Treatment, aeration and retaining walls have few quotes, and holiday lighting none. Landscaping design and hardscape buyers aren't well covered.
- **Not backed by reviews:** the five parking-lot scenes, Dale's age and neighborhoods, Wichita seasons, the referrer channel, and the iceberg's "admits" and "won't admit" lines.
- **An owner call would sharpen:** how customers pay (prepay vs monthly), how they handle estimate follow-up, what they do with overgrown or distressed properties, what share are landlords, and who sends referrals.
