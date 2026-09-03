type Dict = Record<string, any>;

/**
 * Deterministic structural fixture: IDs and review bindings come from the
 * sealed Writer1 projection supplied by the test; all renderable words are
 * deliberately non-prospect placeholders.
 */
export function buildWriter1PointerLedgerFixture(projection: Dict): { output: Dict; raw: Buffer } {
  const counts = [25, 6] as const;
  const pages = (projection.services || []).slice(0, 2).map((service: Dict, pageIndex: number) => {
    const route = String(service.page.url);
    const sectionId = `${route.slice(1)}-fixture-section`;
    const source = service.reviewEvidence?.[0];
    const reviewId = String(source?.review?.id || source?.review?.reviewId || "");
    const reviewText = String(source?.review?.text || "sealed review text");
    if (!reviewId) throw new Error(`fixture requires a sealed review ID for ${route}`);
    const quote = reviewText.split(/\s+/u).slice(0, 12).join(" ");
    const reviewer = String(source?.review?.author || source?.review?.reviewer || "Sealed reviewer");
    const reviewEvidence = Array.from({ length: counts[pageIndex] || 0 }, (_, index) => ({
      reviewId,
      reviewer: `${reviewer} fixture ${index + 1}`,
      excerpt: `Pointer-ledger placeholder ${index + 1}`,
      provenance: { type: "evidence", ref: reviewId, placement: `fixture pointer ${index + 1}`, section: sectionId },
    }));
    return {
      type: "service",
      url: route,
      prescriptionId: String(service.prescriptionId),
      primaryKeyword: `fixture keyword ${pageIndex + 1}`,
      title: `Fixture service ${pageIndex + 1}`,
      seoTitle: `Fixture SEO ${pageIndex + 1}`,
      metaDescription: `Fixture meta description ${pageIndex + 1}`,
      h1: `Fixture heading ${pageIndex + 1}`,
      body: `Fixture body ${pageIndex + 1}`,
      sections: [{ id: sectionId, heading: `Fixture section ${pageIndex + 1}`, body: `Fixture section body ${pageIndex + 1}` }],
      reviewPlacements: [{ reviewId, quote, attribution: reviewer, provenance: { type: "review", ref: reviewId, placement: "fixture review", section: sectionId } }],
      reviewEvidence,
    };
  });
  if (pages.length !== 2 || pages.some((page: Dict) => !page.prescriptionId)) throw new Error("fixture requires exactly two sealed service pages");
  const output = { schemaVersion: "words-writer1-output/v1", pages };
  return { output, raw: Buffer.from(JSON.stringify(output), "utf8") };
}
