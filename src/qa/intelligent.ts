import type { QaFinding } from "./types.js";

/** Thinking QA is intentionally a structured contract, not a regex linter. */
export const INTELLIGENT_DIMENSIONS = [
  "specificity",
  "strongest-review-choice",
  "persuasive-flow",
  "voice-drift",
  "cross-page-distinctness",
  "homepage-complementarity",
  "contact-leanness",
  "strategy-truthfulness",
  "unsupported-claims",
  "generic-ai-filler",
] as const;

export type IntelligentDimension = (typeof INTELLIGENT_DIMENSIONS)[number];

export interface IntelligentFinding {
  dimension: IntelligentDimension;
  severity: "hard-fail" | "warning" | "note";
  summary: string;
  rationale: string;
  route?: string | undefined;
  reviewId?: string | undefined;
  evidence?: string[] | undefined;
  repair?: string | undefined;
}

export interface IntelligentAssessment {
  independent: true;
  dimensionsReviewed: IntelligentDimension[];
  findings: IntelligentFinding[];
  assessedAt?: string | undefined;
  assessor?: string | undefined;
}

export interface RepairAttempt {
  attempt: number;
  findingsBefore: IntelligentFinding[];
  repairInstruction: string;
  output: unknown;
  findingsAfter?: IntelligentFinding[] | undefined;
  accepted: boolean;
}

export interface RepairLoopResult {
  output: unknown;
  attempts: RepairAttempt[];
  pass: boolean;
  finalAssessment: IntelligentAssessment;
}

export type IntelligentAssessor = (snapshot: Readonly<unknown>) => Promise<IntelligentAssessment> | IntelligentAssessment;
export type IntelligentRepairer = (output: unknown, findings: readonly IntelligentFinding[], attempt: number) => Promise<unknown> | unknown;

function immutableSnapshot(value: unknown): unknown {
  return value !== null && (typeof value === "object" || typeof value === "function") ? Object.freeze(value) : value;
}

function isDimension(value: unknown): value is IntelligentDimension {
  return typeof value === "string" && (INTELLIGENT_DIMENSIONS as readonly string[]).includes(value);
}

/** Validate assessor output so thinking remains inspectable and actionable. */
export function validateIntelligentAssessment(value: unknown): IntelligentAssessment {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (candidate.independent !== true) throw new Error("Independent structured QA assessment must set independent: true");
  if (!Array.isArray(candidate.dimensionsReviewed)) throw new Error("Independent structured QA assessment must list dimensionsReviewed");
  const dimensionsReviewed = [...new Set(candidate.dimensionsReviewed.filter(isDimension))];
  if (dimensionsReviewed.length !== candidate.dimensionsReviewed.length) throw new Error("Independent structured QA assessment contains an invalid or duplicate reviewed dimension");
  const raw = Array.isArray(candidate.findings) ? candidate.findings : [];
  const findings: IntelligentFinding[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const finding = item as Record<string, unknown>;
    if (!isDimension(finding.dimension) || typeof finding.summary !== "string" || typeof finding.rationale !== "string") continue;
    const severity = finding.severity === "hard-fail" || finding.severity === "warning" || finding.severity === "note" ? finding.severity : "note";
    findings.push({
      dimension: finding.dimension,
      severity,
      summary: finding.summary,
      rationale: finding.rationale,
      ...(typeof finding.route === "string" ? { route: finding.route } : {}),
      ...(typeof finding.reviewId === "string" ? { reviewId: finding.reviewId } : {}),
      ...(Array.isArray(finding.evidence) ? { evidence: finding.evidence.filter((x): x is string => typeof x === "string") } : {}),
      ...(typeof finding.repair === "string" ? { repair: finding.repair } : {}),
    });
  }
  return {
    independent: true,
    dimensionsReviewed,
    findings,
    ...(typeof candidate.assessedAt === "string" ? { assessedAt: candidate.assessedAt } : {}),
    ...(typeof candidate.assessor === "string" ? { assessor: candidate.assessor } : {}),
  };
}

/** Run a bounded repair loop. The writer/repairer is never allowed to grade its own output. */
export async function runIntelligentRepairLoop(
  initialOutput: unknown,
  assess: IntelligentAssessor,
  repair: IntelligentRepairer,
  maxAttempts = 2,
): Promise<RepairLoopResult> {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 0) throw new RangeError("maxAttempts must be a non-negative integer");
  let output = initialOutput;
  const attempts: RepairAttempt[] = [];
  let finalAssessment = validateIntelligentAssessment(await assess(immutableSnapshot(output) as Readonly<unknown>));
  for (let attempt = 1; attempt <= maxAttempts && finalAssessment.findings.some((item) => item.severity === "hard-fail"); attempt += 1) {
    const hardFindings = finalAssessment.findings.filter((item) => item.severity === "hard-fail");
    const repairInstruction = hardFindings.map((item) => item.repair ?? item.summary).join(" ");
    const next = await repair(output, hardFindings, attempt);
    const after = validateIntelligentAssessment(await assess(immutableSnapshot(next) as Readonly<unknown>));
    const accepted = !after.findings.some((item) => item.severity === "hard-fail");
    attempts.push({ attempt, findingsBefore: hardFindings, repairInstruction, output: next, findingsAfter: after.findings, accepted });
    output = next;
    finalAssessment = after;
    if (accepted) break;
  }
  return { output, attempts, pass: !finalAssessment.findings.some((item) => item.severity === "hard-fail"), finalAssessment };
}

/** Convert structured thinking findings into the common site report shape. */
export function intelligentFindingsAsQa(findings: readonly IntelligentFinding[]): QaFinding[] {
  return findings.map((item) => ({
    code: `intelligent-${item.dimension}`,
    severity: item.severity === "hard-fail" ? "hard-fail" : item.severity === "warning" ? "warning" : "info",
    message: `${item.summary} ${item.rationale}`.trim(),
    ...(item.route ? { route: item.route } : {}),
    ...(item.reviewId ? { reviewId: item.reviewId } : {}),
    details: { dimension: item.dimension, evidence: item.evidence ?? [], repair: item.repair },
  }));
}
