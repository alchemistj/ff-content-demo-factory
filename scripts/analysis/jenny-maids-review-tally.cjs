// Tally the Jenny Maid's review pull (reviews.json) for facts.md: ratings, topic keyword counts with reviewer
// names and dates, owner-name mentions in reviews and owner replies, and founding/age clues. Read-only.
const fs = require('fs');
const DATA = '/home/user/ff-content-demo-factory/prospects/wichita-cleaning/jenny-maids/reviews.json';
const r = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const text = r.reviews;
const rating = r.ratingOnly;

const dist = {};
for (const x of [...text, ...rating]) dist[x.rating] = (dist[x.rating] || 0) + 1;
console.log('total', text.length + rating.length, 'text', text.length, 'ratingOnly', rating.length, 'dist', JSON.stringify(dist));
const avg = [...text, ...rating].reduce((s, x) => s + x.rating, 0) / (text.length + rating.length);
console.log('avg rating from pull', avg.toFixed(3));
console.log('ratingOnly', JSON.stringify(rating.map((x) => [x.reviewer, x.rating, x.publishedAt.slice(0, 10)])));

const topics = {
  deepClean: /deep clean/i,
  recurringOrRegular: /recurring|regular|every other week|bi-?weekly|weekly|monthly|scheduled basis|continue|since 20|for (?:about )?(?:a|\d+|several|6|couple)|years|months|have been cleaning|cleaning for us|cleaning my home/i,
  oneTimeOrMoveOut: /one-?time|moving out|move in|moving|moved out|before a move|after .*move|move-?out/i,
  airbnb: /airbnb|air b/i,
  pets: /pet|dogs?\b|paw/i,
  detail: /detail|thorough|spotless|shine|immaculate/i,
  onTimeReliable: /on time|prompt|reliable|dependable|show up|showed up|arrived|scheduled|early/i,
  respectKind: /respect|kind|friendly|personable|professional|pleasant|sympathetic|attitude/i,
  priceValue: /price|prices|pricing|reasonable|rates|competitive|quoted|cost|worth/i,
  supplies: /product|supplies|cleaning products/i,
  owner: /jennifer|jenny(?!\s*maid)/i,
};
console.log('\n== topic keyword counts over', text.length, 'text reviews');
for (const [k, re] of Object.entries(topics)) {
  const hits = text.filter((x) => re.test(x.text));
  console.log(k, hits.length, '|', hits.map((x) => x.reviewer + ' ' + x.publishedAt.slice(0, 7)).join('; '));
}

console.log('\n== owner first-name mentions by reviewers');
for (const x of text) if (/jennifer|larkin/i.test(x.text)) console.log(x.reviewer, x.publishedAt.slice(0, 10), '|', x.text.slice(0, 110));

console.log('\n== owner replies: names addressed or signed');
for (const x of text) {
  if (!x.ownerResponse) continue;
  const m = x.ownerResponse.replace(/<br>/g, ' ').match(/(?:Thanks?|Thank you|Hi|Hello|Good evening!?|Linda|Talk soon)[^.!]{0,30}?\b([A-Z][a-z]+)\b/);
  const sig = /Christina|Jenny Maid'?s?|Jennifer|Jenny\b/.exec(x.ownerResponse);
  console.log(x.reviewer.padEnd(14), x.publishedAt.slice(0, 10), '| first name in reply:', m ? m[1] : '-', '| signature:', sig ? sig[0] : '-');
}
const noReply = text.filter((x) => !x.ownerResponse).map((x) => x.reviewer + ' ' + x.publishedAt.slice(0, 10));
console.log('no owner reply (text reviews):', JSON.stringify(noReply));
const repliesCount = text.filter((x) => x.ownerResponse).length;
console.log('text reviews with owner reply', repliesCount, 'of', text.length);

console.log('\n== age and start clues');
for (const x of text) if (/start ?up|since|years|every other week|2017|2015|2012|for (?:about )?\d+/i.test(x.text)) console.log(x.reviewer, x.publishedAt.slice(0, 10), '|', x.text.slice(0, 160));
console.log('earliest published', [...text, ...rating].map((x) => x.publishedAt).sort()[0].slice(0, 10), 'latest', [...text, ...rating].map((x) => x.publishedAt).sort().slice(-1)[0].slice(0, 10));

console.log('\n== towns, claims and price/insurance words in review text');
const towns = /Andover|Augusta|Goddard|Derby|Maize|Park City|Valley Center|Peck|Wellington|Kechi|Mulvane|Haysville|Udall|Benton|Hillsboro|Wichita|town|city/i;
for (const x of text) if (towns.test(x.text)) console.log('town-word', x.reviewer, '|', (x.text.match(towns) || [])[0]);
for (const x of text) if (/insur|bond|background|licens|guarantee|award|warrant|franchise|family[- ]owned|locally/i.test(x.text)) console.log('claim-word', x.reviewer, '|', x.text.slice(0, 140));

console.log('\n== low reviews (text)');
for (const x of text.filter((y) => y.rating <= 2)) console.log(x.reviewer, x.rating, x.publishedAt.slice(0, 10), '|', x.text, '| OWNER:', x.ownerResponse);
console.log('== low reviews (rating only)', JSON.stringify(rating.filter((y) => y.rating <= 3).map((y) => [y.reviewer, y.rating, y.publishedAt.slice(0, 10)])));
