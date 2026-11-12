# Apify budget: Josh's call

Status (Nov 9): every review pull fails with Apify HTTP 402, "Your remaining usage of $0.435205 this billing cycle isn't enough for this run", even at 30 reviews. Run: https://github.com/alchemistj/ff-content-demo-factory/actions/runs/42677576420

What this demo set needs: 4 pulls, about 170 reviews in all (AUGI 30, Response 9, Bossy Oak 28, Ferry 102). At Apify's pay-per-result pricing that is well under $1 of actual usage; the block is the plan's monthly cap, not the cost of these pulls. Other architects share the same account and hit the same wall.

Prices below are approximate, from Apify's public plans as I know them; check the billing page before choosing.

1. **Upgrade to Apify Starter, about $39/month (my pick).** Raises the monthly cap well past what all the trade architects need for review pulls. Unblocks every demo set today, not just this one.
2. **Stay on the free plan and wait for the cycle reset (free $5/month credit).** $0, but the next reset date is on Apify's billing page, and one busy day of pulls across architects can use it up again.
3. **One-off pay-as-you-go top-up, if the account allows it, about $5–10.** Enough for this set and a few more, but it comes back next time several architects pull at once.

Without reviews, pages can't be written: reviews are the only source of quotes, and owner names for Bossy Oak and Ferry are expected to come from owner replies.
