import assert from "node:assert/strict";
import { negativeFixture, richFixture, syntheticGarageDoorFixture, thinFixture } from "../../../fixtures/representative.js";
import { ContractValidationError, computeHandoffDigests, parseApprovedProspectHandoff, validateApprovedProspectHandoff } from "../index.js";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function errorCodes(value: unknown): string[] {
  return validateApprovedProspectHandoff(value).map((issue) => issue.code);
}

function refreshDigests(value: any): void {
  value.digests = computeHandoffDigests(value);
}

for (const fixture of [richFixture, thinFixture, negativeFixture, syntheticGarageDoorFixture]) {
  assert.doesNotThrow(() => parseApprovedProspectHandoff(fixture));
}

{
  const invalid = clone(richFixture);
  invalid.prospect.destinations.servicePages = [invalid.prospect.destinations.servicePages[0]] as never;
  assert.ok(errorCodes(invalid).includes("SERVICE_PAGE_COUNT"));
}

{
  const invalid = clone(richFixture);
  invalid.prospect.reviewInventory[1]!.id = invalid.prospect.reviewInventory[0]!.id;
  assert.ok(errorCodes(invalid).includes("DUPLICATE_ID"));
}

{
  const invalid = clone(richFixture);
  invalid.prospect.destinations.servicePages[0]!.id = "bad ID";
  assert.ok(errorCodes(invalid).includes("MALFORMED_ID"));
}

{
  const invalid = clone(richFixture);
  invalid.prospect.destinations.servicePages[0]!.reviewGrade = "D" as never;
  assert.ok(errorCodes(invalid).includes("UNSUPPORTED_REVIEW_GRADE"));
}

{
  const invalid = clone(richFixture);
  delete (invalid.prospect.nap as { phone?: string }).phone;
  assert.ok(errorCodes(invalid).includes("MISSING_REQUIRED_FIELD"));
}

{
  const invalid = clone(richFixture);
  invalid.prospect.destinations.servicePages[0]!.recommendedFirstReview = "review-does-not-exist";
  assert.ok(errorCodes(invalid).includes("RECOMMENDED_REVIEW_NOT_FOUND"));
}

{
  const invalid = clone(negativeFixture);
  invalid.prospect.reviewInventory[0]!.classification = "positive";
  assert.ok(errorCodes(invalid).includes("NEGATIVE_AS_POSITIVE"));
}

{
  const invalid = clone(negativeFixture);
  invalid.prospect.destinations.servicePages[0]!.recommendedFirstReview = "review-negative-001";
  const codes = errorCodes(invalid);
  assert.ok(codes.includes("RECOMMENDED_REVIEW_INCONSISTENT"));
  assert.ok(codes.includes("NEGATIVE_AS_POSITIVE"));
}

{
  const invalid = clone(richFixture) as typeof richFixture & { themes: string[] };
  invalid.themes = ["service quality"];
  assert.ok(errorCodes(invalid).includes("SUMMARY_FORBIDDEN"));
}

{
  const invalid = clone(richFixture);
  invalid.prospect.reviewInventory[0]!.pageSuitability = [invalid.prospect.reviewInventory[0]!.pageSuitability[0]!] as never;
  assert.ok(errorCodes(invalid).includes("PAGE_SUITABILITY_INCONSISTENT"));
}

{
  const invalid = clone(richFixture);
  invalid.prospect.destinations.homepage.url = "https://northline.example/home";
  assert.ok(errorCodes(invalid).includes("ROUTING_BOUNDARY"));
}

{
  const invalid = clone(richFixture);
  invalid.prospect.nap.phone = "not supplied";
  assert.ok(errorCodes(invalid).includes("INVALID_VALUE"));
}

{
  const contactGradeOptional = clone(richFixture);
  delete contactGradeOptional.prospect.destinations.contact.reviewGrade;
  refreshDigests(contactGradeOptional);
  assert.deepEqual(errorCodes(contactGradeOptional), []);
}

{
  const reviewDateOptional = clone(richFixture);
  delete (reviewDateOptional.prospect.reviewInventory[0] as { date?: string }).date;
  refreshDigests(reviewDateOptional);
  assert.deepEqual(errorCodes(reviewDateOptional), []);
}

{
  const invalid = clone(richFixture);
  delete (invalid.prospect.destinations.homepage as { reviewGrade?: string }).reviewGrade;
  assert.ok(errorCodes(invalid).includes("UNSUPPORTED_REVIEW_GRADE"));
}

assert.throws(() => parseApprovedProspectHandoff({ prospects: [richFixture.prospect] }), ContractValidationError);
