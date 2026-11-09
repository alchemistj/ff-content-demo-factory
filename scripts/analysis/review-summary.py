"""Summarize a reviews.json: counts, service keyword share, names mentioned, owner-reply signatures.
Usage: python3 -I scripts/analysis/review-summary.py prospects/<market>/<slug>/reviews.json
"""
import json, re, sys
from collections import Counter

data = json.load(open(sys.argv[1]))
revs = data["reviews"]
texted = [r for r in revs if (r.get("text") or "").strip()]
five = [r for r in texted if r.get("rating") == 5]
print(f"{data['place']['name']} | {data['place'].get('address')} | {data['place'].get('phone')}")
print(f"total pulled {len(revs)}, with text {len(texted)}, five-star with text {len(five)}")
print("ratings:", dict(Counter(r.get("rating") for r in revs)))

kw = {
    "new roof/replacement": r"new roof|replac|re-?roof|tear ?off",
    "repair/leak": r"repair|leak|fix",
    "hail/storm/wind": r"hail|storm|wind",
    "insurance/claim/adjuster": r"insurance|claim|adjuster",
    "siding": r"siding",
    "gutter": r"gutter",
    "paint": r"paint",
    "window": r"window",
    "commercial": r"commercial|business|church|building",
    "tile/metal/slate": r"\btile|metal|slate|davinci|shake",
    "cleanup/nails": r"clean|nail|magnet",
    "price/fair": r"price|fair|afford|quote|estimate",
}
print("keyword share of text reviews:")
for k, pat in kw.items():
    n = sum(1 for r in texted if re.search(pat, r["text"], re.I))
    print(f"  {k}: {n}")

stop = set("I The We They He She It My Our This That River City Roofing Flawless ICT Douglas Fry Inc Very Great Thank Thanks Highly Would Will Wichita Google Kansas If And So But When After Not Everything Their His Her Very Excellent Best Amazing Awesome Exteriors Co Roof Roofs Also Overall Just Even Had Has All You Your".split())
names = Counter()
for r in texted:
    for m in re.findall(r"\b([A-Z][a-z]{2,})\b", r["text"]):
        if m not in stop:
            names[m] += 1
print("capitalized words (possible names):", names.most_common(30))

sigs = Counter()
for r in revs:
    o = r.get("ownerResponse") or ""
    tail = re.sub(r"<br>", " ", o)[-80:]
    if tail:
        sigs[tail.strip()] += 1
print("owner replies:", sum(1 for r in revs if r.get("ownerResponse")))
for t, n in sigs.most_common(6):
    print(f"  {n}x ...{t}")
