import { computeHandoffDigests, digestOf } from "../src/contracts/index.js";
import type { ApprovedProspectHandoff, ContactPagePrescription, HomepagePrescription, PagePrescription, ReviewGrade, ReviewSuitability } from "../src/contracts/index.js";

const pageFit = (pageId: string, suitability: ReviewSuitability, reason: string) => ({ pageId, suitability, reason });

type PageInput = Omit<PagePrescription, "reviewGrade"> & { reviewGrade?: ReviewGrade };
function makePage(input: PageInput & { reviewGrade: ReviewGrade }): HomepagePrescription;
function makePage(input: PageInput & { reviewGrade?: undefined }): ContactPagePrescription;
function makePage(input: PageInput): PagePrescription {
  const { reviewGrade, ...base } = input;
  return reviewGrade === undefined ? base : { ...base, reviewGrade };
}

const approval = (approvedBy: string) => ({
  status: "approved" as const,
  approvedAt: "2026-08-20",
  approvedBy,
});

const richFixtureBase: Omit<ApprovedProspectHandoff, "sourceCheckpoint" | "digests" | "serviceComparison" | "reviewAnalysisFacts"> = {
  version: "lane-a-review-handoff/v1",
  approval: approval("lane-a-reviewer"),
  prospect: {
    id: "prospect-rich",
    business: { name: "Northline Garage Doors", trade: "garage door service", serviceArea: "Lake County" },
    nap: {
      name: "Northline Garage Doors",
      address: { street: "18 Harbor Avenue", city: "Mason", region: "IL", postalCode: "60000", country: "US" },
      phone: "+1-555-010-1000",
      website: "https://northline.example/",
    },
    confirmedFacts: [
      { id: "fact-rich-1", fact: "The business presents repair and replacement help for residential garage doors.", evidence: [{ kind: "site_evidence", refId: "site-rich-1" }], confirmedAt: "2026-08-20" },
      { id: "fact-rich-2", fact: "The business publishes a direct contact route for service requests.", evidence: [{ kind: "site_evidence", refId: "site-rich-2" }], confirmedAt: "2026-08-20" },
    ],
    siteEvidence: [
      { id: "site-rich-1", url: "https://northline.example/services", pageType: "service-listing", observation: "The page names repair and replacement as separate customer needs.", capturedAt: "2026-08-20", source: "company site evidence supplied for fixture" },
      { id: "site-rich-2", url: "https://northline.example/contact", pageType: "contact", observation: "The page exposes phone and request-a-quote contact paths.", capturedAt: "2026-08-20", source: "company site evidence supplied for fixture" },
    ],
    imageRefs: [
      { id: "image-rich-1", url: "https://northline.example/images/team.jpg", altText: "Northline technician beside a residential garage door", source: "company site evidence supplied for fixture", evidenceUse: "candidate trust image; do not infer work details beyond the caption" },
    ],
    reviewInventory: [
      {
        id: "review-rich-001", reviewer: "Maya R.", exactText: "The technician explained the repair, arrived when promised, and left the area tidy.", rating: 5, date: "2026-07-01",
        provenance: { sourceType: "customer_review", sourceUrl: "https://reviews.example/northline/001", capturedAt: "2026-08-20", sourceLabel: "customer review evidence supplied for fixture" },
        classification: "positive", serviceTopicSignals: ["repair"], concreteWorkSignals: ["explained repair", "arrived when promised", "left area tidy"], negatives: [], suitability: "high", pageSuitability: [pageFit("page-rich-home", "high", "Bounded service-visit account."), pageFit("page-rich-contact", "high", "Clear customer interaction."), pageFit("service-rich-repair", "high", "Direct repair-work account."), pageFit("service-rich-replacement", "not_suitable", "No replacement work is described.")], upstreamAuthorityJudgment: "authoritative",
      },
      {
        id: "review-rich-002", reviewer: "Jon P.", exactText: "They replaced the worn opener and walked me through the new controls.", rating: 5, date: "2026-06-18",
        provenance: { sourceType: "customer_review", sourceUrl: "https://reviews.example/northline/002", capturedAt: "2026-08-20", sourceLabel: "customer review evidence supplied for fixture" },
        classification: "positive", serviceTopicSignals: ["replacement", "opener"], concreteWorkSignals: ["replaced opener", "walked through controls"], negatives: [], suitability: "high", pageSuitability: [pageFit("page-rich-home", "high", "Concrete service account."), pageFit("page-rich-contact", "high", "Clear customer handoff."), pageFit("service-rich-repair", "medium", "Opener work may inform repair context."), pageFit("service-rich-replacement", "high", "Concrete replacement account.")], upstreamAuthorityJudgment: "authoritative",
      },
      {
        id: "review-rich-003", reviewer: "Ari K.", exactText: "The repair solved the noise, although the appointment window ran late.", rating: 4, date: "2026-05-04",
        provenance: { sourceType: "customer_review", sourceUrl: "https://reviews.example/northline/003", capturedAt: "2026-08-20", sourceLabel: "customer review evidence supplied for fixture" },
        classification: "mixed", serviceTopicSignals: ["repair", "noise"], concreteWorkSignals: ["solved noise"], negatives: ["appointment window ran late"], suitability: "medium", pageSuitability: [pageFit("page-rich-home", "medium", "Useful but caveated service signal."), pageFit("page-rich-contact", "medium", "Caveated customer interaction."), pageFit("service-rich-repair", "medium", "Repair signal with a scheduling caveat."), pageFit("service-rich-replacement", "not_suitable", "No replacement work is described.")], upstreamAuthorityJudgment: "partially_authoritative",
      },
      {
        id: "review-rich-004", reviewer: "Sam T.", exactText: "The quote was clear and I decided to schedule after comparing repair and replacement options.", rating: 5, date: "2026-04-11",
        provenance: { sourceType: "customer_review", sourceUrl: "https://reviews.example/northline/004", capturedAt: "2026-08-20", sourceLabel: "customer review evidence supplied for fixture" },
        classification: "positive", serviceTopicSignals: ["quote", "repair", "replacement"], concreteWorkSignals: ["clear quote", "compared options"], negatives: [], suitability: "high", pageSuitability: [pageFit("page-rich-home", "high", "Clear options discussion."), pageFit("page-rich-contact", "high", "Supports a contact decision."), pageFit("service-rich-repair", "medium", "Decision-stage comparison context."), pageFit("service-rich-replacement", "high", "Option-comparison account.")], upstreamAuthorityJudgment: "authoritative",
      },
      {
        id: "review-rich-005", reviewer: "Lee B.", exactText: "I called to ask whether a repair visit was available in my area.", rating: 3, date: "2026-03-20",
        provenance: { sourceType: "customer_review", sourceUrl: "https://reviews.example/northline/005", capturedAt: "2026-08-20", sourceLabel: "customer review evidence supplied for fixture" },
        classification: "neutral", serviceTopicSignals: ["repair", "service area"], concreteWorkSignals: ["asked about visit"], negatives: [], suitability: "low", pageSuitability: [pageFit("page-rich-home", "low", "Inquiry only; no completed work."), pageFit("page-rich-contact", "low", "Inquiry only."), pageFit("service-rich-repair", "low", "Inquiry only; no completed work."), pageFit("service-rich-replacement", "not_suitable", "No replacement work is described.")], upstreamAuthorityJudgment: "unknown",
      },
    ],
    destinations: {
      homepage: makePage({ id: "page-rich-home", url: "https://northline.example/", label: "Northline Garage Doors", purpose: "business Home/logo route", keyword: "garage door service", titleH1Direction: "Garage Door Service for the Next Practical Step", angleCustomerDecision: "orient a homeowner before choosing repair or replacement", inclusionReason: "The business and service topics are confirmed in site evidence.", majorEvidence: [{ kind: "confirmed_fact", refId: "fact-rich-1" }], recommendedFirstReview: "review-rich-001", recommendedFirstReviewReason: "It gives bounded proof of a service visit and customer care.", traps: ["Do not imply every service need has the same fix."], siblingOverlapBoundaries: ["Keep detailed repair and replacement decisions on their prescribed pages."], reviewGrade: "A" }) as never,
      contact: makePage({ id: "page-rich-contact", url: "https://northline.example/contact", label: "Request service", purpose: "move a ready visitor to contact", keyword: "garage door service contact", titleH1Direction: "Contact Northline Garage Doors", angleCustomerDecision: "help a ready visitor choose the next contact step", inclusionReason: "The confirmed contact route is present in site evidence.", majorEvidence: [{ kind: "confirmed_fact", refId: "fact-rich-2" }], recommendedFirstReview: "review-rich-001", recommendedFirstReviewReason: "It models a clear service interaction without adding unsupported promises.", traps: ["Do not promise response times absent from evidence."], siblingOverlapBoundaries: ["Keep service education on Home and service pages."], reviewGrade: "B" }),
      header: [{ id: "nav-rich-repair", url: "https://northline.example/garage-door-repair", label: "Garage door repair", purpose: "primary service path" }, { id: "nav-rich-replacement", url: "https://northline.example/garage-door-replacement", label: "Garage door replacement", purpose: "secondary service path" }],
      footer: [{ id: "nav-rich-contact", url: "https://northline.example/contact", label: "Contact", purpose: "persistent contact path" }, { id: "nav-rich-home", url: "https://northline.example/", label: "Home", purpose: "business Home/logo route" }],
      strategy: { visibility: "internal", label: "Start with the repair decision", decisionPath: "diagnose first, then compare replacement", rationale: "The inventory contains concrete repair evidence and a distinct replacement decision." },
      servicePages: [
        { id: "service-rich-repair", url: "https://northline.example/garage-door-repair", keyword: "garage door repair", titleH1Direction: "Garage Door Repair When the Door Stops Working", angleCustomerDecision: "help a homeowner decide whether the symptom calls for a repair visit", inclusionReason: "Site evidence separates repair from replacement and review-rich repair proof is available.", majorEvidence: [{ kind: "confirmed_fact", refId: "fact-rich-1" }, { kind: "review", refId: "review-rich-001" }], recommendedFirstReview: "review-rich-001", recommendedFirstReviewReason: "It gives concrete repair-process proof without overselling an outcome.", traps: ["Do not imply every noisy door needs the same repair."], siblingOverlapBoundaries: ["Keep replacement financing and product-selection detail on the replacement page."], reviewGrade: "A" },
        { id: "service-rich-replacement", url: "https://northline.example/garage-door-replacement", keyword: "garage door replacement", titleH1Direction: "Garage Door Replacement With Clear Options", angleCustomerDecision: "help a homeowner decide when replacement is more sensible than another repair", inclusionReason: "The site names replacement separately and the inventory includes replacement work plus option comparison.", majorEvidence: [{ kind: "confirmed_fact", refId: "fact-rich-1" }, { kind: "review", refId: "review-rich-002" }, { kind: "review", refId: "review-rich-004" }], recommendedFirstReview: "review-rich-002", recommendedFirstReviewReason: "It records a concrete opener replacement and customer handoff.", traps: ["Do not turn one opener replacement into a universal replacement recommendation."], siblingOverlapBoundaries: ["Keep symptom diagnosis and repair triage on the repair page."], reviewGrade: "B" },
      ],
    },
  },
};

const thinFixtureBase: Omit<ApprovedProspectHandoff, "sourceCheckpoint" | "digests" | "serviceComparison" | "reviewAnalysisFacts"> = {
  version: "lane-a-review-handoff/v1",
  approval: approval("thin-fixture-reviewer"),
  prospect: {
    id: "prospect-thin",
    business: { name: "Plainview Door Service", trade: "garage door service", serviceArea: "Plainview" },
    nap: { name: "Plainview Door Service", address: { street: "2 Main Street", city: "Plainview", region: "IL", postalCode: "60001", country: "US" }, phone: "+1-555-010-1001", website: "https://plainview.example/" },
    confirmedFacts: [{ id: "fact-thin-1", fact: "The supplied business brief identifies garage door service as the trade.", evidence: [{ kind: "site_evidence", refId: "site-thin-1" }], confirmedAt: "2026-08-20" }],
    siteEvidence: [{ id: "site-thin-1", url: "https://plainview.example/", pageType: "homepage", observation: "The supplied homepage evidence names the trade and service area.", capturedAt: "2026-08-20", source: "company site evidence supplied for fixture" }],
    imageRefs: [],
    reviewInventory: [
      { id: "review-thin-001", reviewer: "C. D.", exactText: "The technician repaired the door and explained the next step.", rating: 5, date: "2026-07-02", provenance: { sourceType: "customer_review", sourceUrl: "https://reviews.example/plainview/001", capturedAt: "2026-08-20", sourceLabel: "customer review evidence supplied for fixture" }, classification: "positive", serviceTopicSignals: ["repair"], concreteWorkSignals: ["repaired door", "explained next step"], negatives: [], suitability: "high", pageSuitability: [pageFit("page-thin-home", "high", "Bounded service account."), pageFit("page-thin-contact", "high", "Clear customer interaction."), pageFit("service-thin-repair", "high", "Direct repair-work account."), pageFit("service-thin-replacement", "not_suitable", "No replacement work is described.")], upstreamAuthorityJudgment: "authoritative" },
      { id: "review-thin-002", reviewer: "E. F.", exactText: "The business discussed replacing an old door and outlined what would be measured first.", rating: 4, date: "2026-07-05", provenance: { sourceType: "customer_review", sourceUrl: "https://reviews.example/plainview/002", capturedAt: "2026-08-20", sourceLabel: "customer review evidence supplied for fixture" }, classification: "positive", serviceTopicSignals: ["replacement"], concreteWorkSignals: ["discussed replacing door", "outlined measurements"], negatives: [], suitability: "medium", pageSuitability: [pageFit("page-thin-home", "medium", "Thin replacement discussion."), pageFit("page-thin-contact", "medium", "Supports a bounded contact conversation."), pageFit("service-thin-repair", "not_suitable", "No repair work is described."), pageFit("service-thin-replacement", "medium", "Replacement discussion is concrete but thin.")], upstreamAuthorityJudgment: "authoritative" },
    ],
    destinations: {
      homepage: makePage({ id: "page-thin-home", url: "https://plainview.example/", label: "Plainview Door Service", purpose: "business Home/logo route", keyword: "garage door service", titleH1Direction: "Garage Door Service", angleCustomerDecision: "orient a visitor with thin evidence", inclusionReason: "The business trade is confirmed, but evidence remains intentionally sparse.", majorEvidence: [{ kind: "confirmed_fact", refId: "fact-thin-1" }], recommendedFirstReview: "review-thin-001", recommendedFirstReviewReason: "It is the clearest bounded service account available.", traps: ["Do not invent parts or guarantees."], siblingOverlapBoundaries: ["Keep detailed decisions on service pages."], reviewGrade: "C" }) as never, contact: makePage({ id: "page-thin-contact", url: "https://plainview.example/contact", label: "Contact", purpose: "start a service conversation", keyword: "garage door service contact", titleH1Direction: "Contact Plainview Door Service", angleCustomerDecision: "help a visitor ask the next question", inclusionReason: "The contact route is required while evidence is thin.", majorEvidence: [{ kind: "site_evidence", refId: "site-thin-1" }], recommendedFirstReview: "review-thin-001", recommendedFirstReviewReason: "It supplies the only concrete customer interaction account.", traps: ["Do not promise response times."], siblingOverlapBoundaries: ["Keep service education on Home and service pages."], reviewGrade: "C" }), header: [{ id: "nav-thin-repair", url: "https://plainview.example/repair", label: "Repair", purpose: "service path" }], footer: [{ id: "nav-thin-contact", url: "https://plainview.example/contact", label: "Contact", purpose: "persistent contact path" }], strategy: { visibility: "internal", label: "Lead with repair", decisionPath: "repair first", rationale: "Only one concrete service signal is available in this thin fixture." },
      servicePages: [
        { id: "service-thin-repair", url: "https://plainview.example/repair", keyword: "garage door repair", titleH1Direction: "Garage Door Repair", angleCustomerDecision: "decide whether to request a repair visit", inclusionReason: "The thin evidence contains one concrete repair signal.", majorEvidence: [{ kind: "review", refId: "review-thin-001" }], recommendedFirstReview: "review-thin-001", recommendedFirstReviewReason: "It is the only available concrete-work review.", traps: ["Do not invent parts, guarantees, or response times."], siblingOverlapBoundaries: ["Keep any future replacement evidence separate."], reviewGrade: "C" },
        { id: "service-thin-replacement", url: "https://plainview.example/replacement", keyword: "garage door replacement", titleH1Direction: "Garage Door Replacement", angleCustomerDecision: "identify whether replacement should be discussed", inclusionReason: "The contract requires two page prescriptions even when evidence is thin.", majorEvidence: [{ kind: "review", refId: "review-thin-002" }], recommendedFirstReview: "review-thin-002", recommendedFirstReviewReason: "It is the only replacement-specific account and remains explicitly thin.", traps: ["Do not turn a replacement discussion into a completed-installation claim."], siblingOverlapBoundaries: ["Keep repair evidence and diagnosis on the repair page."], reviewGrade: "C" },
      ],
    },
  },
};

const negativeFixtureBase: Omit<ApprovedProspectHandoff, "sourceCheckpoint" | "digests" | "serviceComparison" | "reviewAnalysisFacts"> = {
  version: "lane-a-review-handoff/v1",
  approval: approval("negative-fixture-reviewer"),
  prospect: {
    id: "prospect-negative",
    business: { name: "Cedar Gate Doors", trade: "garage door service", serviceArea: "Cedar Gate" },
    nap: { name: "Cedar Gate Doors", address: { street: "7 Cedar Lane", city: "Cedar Gate", region: "IL", postalCode: "60002", country: "US" }, phone: "+1-555-010-1002", website: "https://cedargate.example/" },
    confirmedFacts: [{ id: "fact-negative-1", fact: "The supplied evidence names garage door repair as a service topic.", evidence: [{ kind: "site_evidence", refId: "site-negative-1" }], confirmedAt: "2026-08-20" }],
    siteEvidence: [{ id: "site-negative-1", url: "https://cedargate.example/repair", pageType: "service", observation: "The evidence names repair as a service topic.", capturedAt: "2026-08-20", source: "company site evidence supplied for fixture" }],
    imageRefs: [],
    reviewInventory: [
      { id: "review-negative-001", reviewer: "T. N.", exactText: "The repair took two visits and the first appointment was missed.", rating: 2, date: "2026-07-03", provenance: { sourceType: "customer_review", sourceUrl: "https://reviews.example/cedargate/001", capturedAt: "2026-08-20", sourceLabel: "customer review evidence supplied for fixture" }, classification: "negative", serviceTopicSignals: ["repair"], concreteWorkSignals: ["two visits"], negatives: ["missed first appointment", "two visits"], suitability: "not_suitable", pageSuitability: [pageFit("page-negative-home", "not_suitable", "Negative experience retained as a risk signal."), pageFit("page-negative-contact", "not_suitable", "Negative interaction account."), pageFit("service-negative-repair", "not_suitable", "Negative repair experience retained as a risk signal."), pageFit("service-negative-replacement", "not_suitable", "No replacement work is described.")], upstreamAuthorityJudgment: "authoritative" },
      { id: "review-negative-002", reviewer: "R. S.", exactText: "The technician diagnosed the issue and completed the repair on the scheduled visit.", rating: 5, date: "2026-07-04", provenance: { sourceType: "customer_review", sourceUrl: "https://reviews.example/cedargate/002", capturedAt: "2026-08-20", sourceLabel: "customer review evidence supplied for fixture" }, classification: "positive", serviceTopicSignals: ["repair"], concreteWorkSignals: ["diagnosed issue", "completed repair", "scheduled visit"], negatives: [], suitability: "high", pageSuitability: [pageFit("page-negative-home", "high", "Bounded positive service account."), pageFit("page-negative-contact", "high", "Clear customer interaction."), pageFit("service-negative-repair", "high", "Direct repair-work account."), pageFit("service-negative-replacement", "not_suitable", "No replacement work is described.")], upstreamAuthorityJudgment: "authoritative" },
      { id: "review-negative-003", reviewer: "J. L.", exactText: "The replacement estimate explained the available door options before I decided what to do.", rating: 4, date: "2026-07-05", provenance: { sourceType: "customer_review", sourceUrl: "https://reviews.example/cedargate/003", capturedAt: "2026-08-20", sourceLabel: "customer review evidence supplied for fixture" }, classification: "positive", serviceTopicSignals: ["replacement", "estimate"], concreteWorkSignals: ["replacement estimate", "explained options"], negatives: [], suitability: "medium", pageSuitability: [pageFit("page-negative-home", "medium", "Bounded replacement decision account."), pageFit("page-negative-contact", "medium", "Supports a contact conversation."), pageFit("service-negative-repair", "not_suitable", "No repair work is described."), pageFit("service-negative-replacement", "medium", "Replacement decision account with bounded evidence.")], upstreamAuthorityJudgment: "authoritative" },
    ],
    destinations: {
      homepage: makePage({ id: "page-negative-home", url: "https://cedargate.example/", label: "Cedar Gate Doors", purpose: "business Home/logo route", keyword: "garage door service", titleH1Direction: "Garage Door Service With Clear Caveats", angleCustomerDecision: "orient a visitor while preserving risk signals", inclusionReason: "Repair is confirmed, with both positive and negative customer evidence.", majorEvidence: [{ kind: "confirmed_fact", refId: "fact-negative-1" }], recommendedFirstReview: "review-negative-002", recommendedFirstReviewReason: "It is the bounded positive account; the negative review remains in the complete inventory.", traps: ["Do not suppress the missed-appointment complaint."], siblingOverlapBoundaries: ["Keep service-specific decisions on their pages."], reviewGrade: "B" }) as never, contact: makePage({ id: "page-negative-contact", url: "https://cedargate.example/contact", label: "Contact", purpose: "start a service conversation", keyword: "garage door service contact", titleH1Direction: "Contact Cedar Gate Doors", angleCustomerDecision: "help a ready visitor ask the next question", inclusionReason: "The contact route is present while review evidence includes a scheduling risk.", majorEvidence: [{ kind: "confirmed_fact", refId: "fact-negative-1" }], recommendedFirstReview: "review-negative-002", recommendedFirstReviewReason: "It models a bounded successful interaction without erasing the negative review.", traps: ["Do not promise appointment timing."], siblingOverlapBoundaries: ["Keep repair/replacement education on their pages."], reviewGrade: "C" }), header: [{ id: "nav-negative-repair", url: "https://cedargate.example/repair", label: "Repair", purpose: "service path" }], footer: [{ id: "nav-negative-contact", url: "https://cedargate.example/contact", label: "Contact", purpose: "persistent contact path" }], strategy: { visibility: "internal", label: "Lead with repair", decisionPath: "repair first", rationale: "Repair is the only supplied service topic." },
      servicePages: [
        { id: "service-negative-repair", url: "https://cedargate.example/repair", keyword: "garage door repair", titleH1Direction: "Garage Door Repair", angleCustomerDecision: "decide whether to request a repair visit", inclusionReason: "The service topic is confirmed, but review evidence must be screened for negative signals.", majorEvidence: [{ kind: "review", refId: "review-negative-002" }], recommendedFirstReview: "review-negative-002", recommendedFirstReviewReason: "This is the concrete positive repair account; retain the negative review in inventory for risk review, not proof.", traps: ["Do not suppress the missed-appointment complaint from the complete inventory."], siblingOverlapBoundaries: ["Keep replacement decisions separate until evidence exists."], reviewGrade: "B" },
        { id: "service-negative-replacement", url: "https://cedargate.example/replacement", keyword: "garage door replacement", titleH1Direction: "Garage Door Replacement", angleCustomerDecision: "decide whether replacement is actually supported", inclusionReason: "The two-page contract exposes a replacement destination and preserves a bounded replacement estimate account.", majorEvidence: [{ kind: "review", refId: "review-negative-003" }], recommendedFirstReview: "review-negative-003", recommendedFirstReviewReason: "It is the only replacement-specific account and does not convert repair evidence into replacement proof.", traps: ["Do not turn repair language into replacement proof."], siblingOverlapBoundaries: ["Keep all repair-specific evidence on the repair page."], reviewGrade: "C" },
      ],
    },
  },
};

/** Synthetic garage-door contract fixture; not a real business canary. */
const syntheticGarageDoorFixtureBase: Omit<ApprovedProspectHandoff, "sourceCheckpoint" | "digests" | "serviceComparison" | "reviewAnalysisFacts"> = {
  version: "lane-a-review-handoff/v1",
  approval: approval("synthetic-garage-door-reviewer"),
  prospect: {
    id: "prospect-synthetic-garage-door",
    business: { name: "Synthetic Garage Door Fixture", trade: "garage door service", serviceArea: "synthetic fixture area" },
    nap: { name: "Synthetic Garage Door Fixture", address: { street: "1 Fixture Lane", city: "Example City", region: "IL", postalCode: "60003", country: "US" }, phone: "+1-555-010-1003", website: "https://synthetic-garage-door.example/" },
    confirmedFacts: [
      { id: "fact-synthetic-1", fact: "The synthetic fixture names repair and installation as separate garage-door service topics.", evidence: [{ kind: "site_evidence", refId: "site-synthetic-1" }], confirmedAt: "2026-08-20" },
      { id: "fact-synthetic-2", fact: "The synthetic fixture contains bounded customer accounts for the two service topics.", evidence: [{ kind: "site_evidence", refId: "site-synthetic-1" }, { kind: "review", refId: "review-synthetic-001" }], confirmedAt: "2026-08-20" },
    ],
    siteEvidence: [{ id: "site-synthetic-1", url: "https://synthetic-garage-door.example/services", pageType: "synthetic-company-service-page", observation: "Synthetic fixture evidence lists repair and installation topics; it is not evidence about a real company.", capturedAt: "2026-08-20", source: "synthetic fixture evidence" }],
    imageRefs: [{ id: "image-synthetic-1", url: "https://synthetic-garage-door.example/images/service.jpg", altText: "Synthetic garage-door service vehicle image", source: "synthetic fixture evidence", evidenceUse: "synthetic company-context image only" }],
    reviewInventory: [
      { id: "review-synthetic-001", reviewer: "Synthetic Customer A", exactText: "The team repaired the door and explained what they changed before leaving.", rating: 5, date: "2026-06-10", provenance: { sourceType: "customer_review", sourceUrl: "https://reviews.example/synthetic-garage-door/001", capturedAt: "2026-08-20", sourceLabel: "synthetic customer review fixture" }, classification: "positive", serviceTopicSignals: ["repair"], concreteWorkSignals: ["repaired door", "explained change"], negatives: [], suitability: "high", pageSuitability: [pageFit("page-synthetic-home", "high", "Synthetic service account."), pageFit("page-synthetic-contact", "high", "Synthetic customer interaction."), pageFit("service-synthetic-repair", "high", "Synthetic repair-work account."), pageFit("service-synthetic-installation", "not_suitable", "No installation work is described.")], upstreamAuthorityJudgment: "authoritative" },
        { id: "review-synthetic-002", reviewer: "Synthetic Customer B", exactText: "The installation was completed, but the scheduling window changed twice.", rating: 3, date: "2026-05-22", provenance: { sourceType: "customer_review", sourceUrl: "https://reviews.example/synthetic-garage-door/002", capturedAt: "2026-08-20", sourceLabel: "synthetic customer review fixture" }, classification: "mixed", serviceTopicSignals: ["installation"], concreteWorkSignals: ["completed installation"], negatives: ["scheduling window changed twice"], suitability: "medium", pageSuitability: [pageFit("page-synthetic-home", "medium", "Caveated synthetic service signal."), pageFit("page-synthetic-contact", "medium", "Caveated synthetic interaction."), pageFit("service-synthetic-repair", "not_suitable", "No repair work is described."), pageFit("service-synthetic-installation", "medium", "Installation account with scheduling caveat.")], upstreamAuthorityJudgment: "authoritative" },
      { id: "review-synthetic-003", reviewer: "Synthetic Customer C", exactText: "I contacted the business to ask about a repair visit in my area.", rating: 4, date: "2026-04-03", provenance: { sourceType: "customer_review", sourceUrl: "https://reviews.example/synthetic-garage-door/003", capturedAt: "2026-08-20", sourceLabel: "synthetic customer review fixture" }, classification: "neutral", serviceTopicSignals: ["repair", "service area"], concreteWorkSignals: ["asked about repair visit"], negatives: [], suitability: "low", pageSuitability: [pageFit("page-synthetic-home", "low", "Inquiry only; no completed work."), pageFit("page-synthetic-contact", "low", "Inquiry only."), pageFit("service-synthetic-repair", "low", "Inquiry only; no completed work."), pageFit("service-synthetic-installation", "not_suitable", "No installation work is described.")], upstreamAuthorityJudgment: "unknown" },
    ],
    destinations: {
      homepage: makePage({ id: "page-synthetic-home", url: "https://synthetic-garage-door.example/", label: "Synthetic Garage Door Fixture", purpose: "business Home/logo route", keyword: "garage door service", titleH1Direction: "Synthetic Garage Door Service", angleCustomerDecision: "orient a visitor with synthetic evidence", inclusionReason: "Synthetic fixture evidence supports two bounded service topics.", majorEvidence: [{ kind: "confirmed_fact", refId: "fact-synthetic-1" }], recommendedFirstReview: "review-synthetic-001", recommendedFirstReviewReason: "It is the clearest synthetic service account.", traps: ["Do not treat this as a real company packet."], siblingOverlapBoundaries: ["Keep detailed decisions on service pages."], reviewGrade: "A" }) as never, contact: makePage({ id: "page-synthetic-contact", url: "https://synthetic-garage-door.example/contact", label: "Contact synthetic fixture", purpose: "start a service conversation", keyword: "garage door service contact", titleH1Direction: "Contact Synthetic Garage Door Fixture", angleCustomerDecision: "help a visitor choose the next synthetic contact step", inclusionReason: "The synthetic fixture includes a contact route and bounded review evidence.", majorEvidence: [{ kind: "confirmed_fact", refId: "fact-synthetic-2" }], recommendedFirstReview: "review-synthetic-001", recommendedFirstReviewReason: "It models a bounded customer interaction.", traps: ["Do not promise response times."], siblingOverlapBoundaries: ["Keep service education on Home and service pages."], reviewGrade: "B" }), header: [{ id: "nav-synthetic-repair", url: "https://synthetic-garage-door.example/repair", label: "Repair", purpose: "repair decision path" }, { id: "nav-synthetic-installation", url: "https://synthetic-garage-door.example/installation", label: "Installation", purpose: "installation decision path" }], footer: [{ id: "nav-synthetic-contact", url: "https://synthetic-garage-door.example/contact", label: "Contact", purpose: "persistent contact path" }], strategy: { visibility: "internal", label: "Start with evidence-backed repair", decisionPath: "repair first, installation second", rationale: "Synthetic evidence supports two distinct service topics while preserving scheduling caveats." },
      servicePages: [
        { id: "service-synthetic-repair", url: "https://synthetic-garage-door.example/repair", keyword: "garage door repair", titleH1Direction: "Garage Door Repair for the Next Practical Step", angleCustomerDecision: "help a homeowner decide whether to request a repair visit", inclusionReason: "Synthetic company and customer-review evidence names repair and includes a concrete repair account.", majorEvidence: [{ kind: "confirmed_fact", refId: "fact-synthetic-2" }, { kind: "review", refId: "review-synthetic-001" }], recommendedFirstReview: "review-synthetic-001", recommendedFirstReviewReason: "It gives direct synthetic repair-work evidence while keeping the claim bounded to the account.", traps: ["Do not treat this synthetic fixture as a real company packet.", "Do not generalize the scheduling caveat into a universal promise."], siblingOverlapBoundaries: ["Keep installation evidence and decisions on the installation page."], reviewGrade: "A" },
        { id: "service-synthetic-installation", url: "https://synthetic-garage-door.example/installation", keyword: "garage door installation", titleH1Direction: "Garage Door Installation With Clear Scheduling Expectations", angleCustomerDecision: "help a homeowner decide whether to explore installation and what to clarify first", inclusionReason: "The synthetic evidence names installation and preserves one installation account with its scheduling caveat.", majorEvidence: [{ kind: "site_evidence", refId: "site-synthetic-1" }, { kind: "review", refId: "review-synthetic-002" }], recommendedFirstReview: "review-synthetic-002", recommendedFirstReviewReason: "It is relevant installation evidence and remains mixed rather than unqualified praise.", traps: ["Do not hide the scheduling caveat.", "Do not infer product models, warranties, or timelines."], siblingOverlapBoundaries: ["Keep repair diagnosis and repair-only proof on the repair page."], reviewGrade: "B" },
      ],
    },
  },
};

function finalizeFixture(base: any, index: number): ApprovedProspectHandoff {
  const servicePages = base.prospect.destinations.servicePages;
  const serviceComparison = servicePages.map((page: any, position: number) => ({
    id: page.id, name: page.keyword, status: "prescribed" as const, evidenceCount: page.majorEvidence.length,
    directEvidenceCount: page.majorEvidence.length, evidence: page.majorEvidence, route: page.url,
    aliases: [page.keyword, `service-${position + 1}`],
  }));
  const handoff = {
    ...base,
    sourceCheckpoint: { runId: `synthetic-${index}`, artifactId: `synthetic-artifact-${index}`, sourceSha: `synthetic-source-${index}`, archiveDigest: `sha256:${"0".repeat(64)}` },
    serviceComparison,
    reviewAnalysisFacts: {
      retrievedWrittenReviewCount: base.prospect.reviewInventory.length,
      reviewRetrievalDate: "2026-08-20",
      reviewBackedServicesWithoutPages: 0,
      reviewBackedServiceNames: [],
    },
  } as ApprovedProspectHandoff;
  const source = handoff.sourceCheckpoint as any;
  source.manifest = [{ path: "checkpoint.json", digest: digestOf({ runId: source.runId, artifactId: source.artifactId, sourceSha: source.sourceSha }) }];
  source.manifestDigest = digestOf(source.manifest);
  source.archiveDigest = digestOf({ sourceSha: source.sourceSha, manifestDigest: source.manifestDigest });
  handoff.digests = computeHandoffDigests(handoff);
  return handoff;
}
export const richFixture = finalizeFixture(richFixtureBase, 1);
export const thinFixture = finalizeFixture(thinFixtureBase, 2);
export const negativeFixture = finalizeFixture(negativeFixtureBase, 3);
export const syntheticGarageDoorFixture = finalizeFixture(syntheticGarageDoorFixtureBase, 4);

export const representativeFixtures = { richFixture, thinFixture, negativeFixture, syntheticGarageDoorFixture } as const;
