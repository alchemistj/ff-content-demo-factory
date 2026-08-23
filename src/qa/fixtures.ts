/** Small adversarial fixtures for deterministic QA regression tests and demos. */
export const richSiteFixture = {
  reviews: [
    { id: "r-lead", reviewer: "Alex R.", exactText: "The team repaired our roof quickly and explained each step clearly.", rating: 5, classification: "positive", suitability: "high" },
    { id: "r-support", reviewer: "Mina K.", exactText: "Excellent workmanship, tidy cleanup, and a fair price.", rating: 5, classification: "positive", suitability: "medium" },
    { id: "r-trust", reviewer: "Sam P.", exactText: "They answered every question and arrived when promised.", rating: 5, classification: "positive", suitability: "medium" },
  ],
  pages: [{
    url: "/roof-repair", pageId: "roof-repair", pageType: "service", seoTitle: "Roof Repair | Example", metaDescription: "Roof repair for local homeowners.", h1: "Roof repair that holds up", reviewGrade: "A",
    text: "Roof repair that holds up. We explain the work and keep the site tidy. The team repaired our roof quickly and explained each step clearly. Excellent workmanship, tidy cleanup, and a fair price. They answered every question and arrived when promised.",
    claims: [{ id: "c-1", text: "We explain the work", wordOffset: 14 }, { id: "c-2", text: "The site stays tidy", wordOffset: 40 }, { id: "c-3", text: "We answer questions", wordOffset: 65 }],
    reviewPlacements: [
      { reviewId: "r-lead", quote: "The team repaired our roof quickly and explained each step clearly.", reviewer: "Alex R.", claimId: "c-1", wordOffset: 20, proofRole: "lead", order: 1 },
      { reviewId: "r-support", quote: "Excellent workmanship, tidy cleanup, and a fair price.", reviewer: "Mina K.", claimId: "c-2", wordOffset: 45, proofRole: "support", order: 3 },
      { reviewId: "r-trust", quote: "They answered every question and arrived when promised.", reviewer: "Sam P.", claimId: "c-3", wordOffset: 70, proofRole: "support", order: 5 },
    ],
  }],
};

export const thinGradeAFixture = {
  ...richSiteFixture,
  pages: [{ ...richSiteFixture.pages[0]!, reviewPlacements: [richSiteFixture.pages[0]!.reviewPlacements[0]!] }],
};

export const negativeProofFixture = {
  ...richSiteFixture,
  reviews: [{ ...richSiteFixture.reviews[0]!, id: "r-negative", negatives: ["late arrival"], classification: "mixed" }],
  pages: [{ ...richSiteFixture.pages[0]!, reviewGrade: "C", reviewPlacements: [{ ...richSiteFixture.pages[0]!.reviewPlacements[0]!, reviewId: "r-negative", proofRole: "positive" }] }],
};

export const crossPageDriftFixture = {
  ...richSiteFixture,
  pages: [richSiteFixture.pages[0], { ...richSiteFixture.pages[0], url: "/roof-repair", h1: "Another service" }],
};

export const topologyFixture = {
  reviews: [],
  pages: [
    { url: "/home", pageType: "homepage", seoTitle: "Home", metaDescription: "Home", h1: "Home", eligibleForReviews: false },
    { url: "/service-one", pageType: "service", seoTitle: "Service One", metaDescription: "Service one", h1: "Service one", eligibleForReviews: false },
    { url: "/service-two", pageType: "service", seoTitle: "Service Two", metaDescription: "Service two", h1: "Service two", eligibleForReviews: false },
    { url: "/contact", pageType: "contact", seoTitle: "Contact", metaDescription: "Contact", h1: "Contact" },
  ],
  header: { navigation: [{ label: "Home", href: "/home" }, { label: "Contact", href: "/contact" }] },
  footer: { text: "Footer" },
  strategyOverview: { url: "/", body: "Strategy" },
};

/** Thinking-QA drift: deterministic topology is valid, prose judgment is not. */
export const crossPageThinkingDriftFixture = {
  ...topologyFixture,
  pages: topologyFixture.pages.map((page) => page.url === "/home" ? { ...page, body: "Service one body repeated word-for-word." } : page.url === "/service-one" ? { ...page, body: "Service one body repeated word-for-word." } : page),
  strategyOverview: { url: "/", body: "See our nonexistent /future-service route for the next step." },
};
