/**
 * Cross-repo D2D → Content Factory intake contract.
 *
 * D2D is source of truth for campaign geography, business identity,
 * upstream qualification, and upstream evidence/provenance.
 * Content Factory owns factory run state from accepted intake forward.
 */

import type { Address, BusinessIdentity, Nap, ProspectSeed } from "../handoff/types.js";
import type { WorkflowSourceCorrelation, WorkflowStage } from "../workflow/state.js";

export const D2D_FACTORY_INTAKE_VERSION = "d2d-factory-intake/v1" as const;

export const D2D_INTAKE_STATUSES = Object.freeze({
  ACCEPTED: "accepted",
  DUPLICATE: "duplicate",
  HELD: "held",
  FAILED: "failed",
  RETRYABLE: "retryable",
} as const);

export type D2dIntakeStatus = (typeof D2D_INTAKE_STATUSES)[keyof typeof D2D_INTAKE_STATUSES];

export const D2D_QUALIFICATION_CLASSIFICATIONS = Object.freeze({
  QUALIFIED: "qualified",
  UNQUALIFIED: "unqualified",
  NEEDS_REVIEW: "needs_review",
} as const);

export type D2dQualificationClassification =
  (typeof D2D_QUALIFICATION_CLASSIFICATIONS)[keyof typeof D2D_QUALIFICATION_CLASSIFICATIONS];

export const D2D_INTAKE_REASON_CODES = Object.freeze({
  AUTH_NOT_CONFIGURED: "AUTH_NOT_CONFIGURED",
  AUTH_MISSING: "AUTH_MISSING",
  AUTH_INVALID: "AUTH_INVALID",
  INVALID_ENVELOPE: "INVALID_ENVELOPE",
  UNSUPPORTED_VERSION: "UNSUPPORTED_CONTRACT_VERSION",
  EMPTY_BATCH: "EMPTY_BATCH",
  MALFORMED_PROSPECT: "MALFORMED_PROSPECT",
  MISSING_D2D_PROSPECT_ID: "MISSING_D2D_PROSPECT_ID",
  MISSING_CAMPAIGN_ID: "MISSING_CAMPAIGN_ID",
  MISSING_CAMPAIGN_RUN_ID: "MISSING_CAMPAIGN_RUN_ID",
  MISSING_EXPORT_ID: "MISSING_EXPORT_ID",
  INVALID_TIMESTAMP: "INVALID_TIMESTAMP",
  NOT_QUALIFIED: "NOT_QUALIFIED",
  MISSING_QUALIFICATION: "MISSING_QUALIFICATION",
  MISSING_PROVENANCE: "MISSING_PROVENANCE",
  MISSING_BUSINESS_NAME: "MISSING_BUSINESS_NAME",
  MISSING_TRADE: "MISSING_TRADE",
  MISSING_SERVICE_AREA: "MISSING_SERVICE_AREA",
  MISSING_NAP_NAME: "MISSING_NAP_NAME",
  MISSING_ADDRESS_STREET: "MISSING_ADDRESS_STREET",
  MISSING_ADDRESS_CITY: "MISSING_ADDRESS_CITY",
  MISSING_ADDRESS_REGION: "MISSING_ADDRESS_REGION",
  MISSING_ADDRESS_POSTAL_CODE: "MISSING_ADDRESS_POSTAL_CODE",
  MISSING_ADDRESS_COUNTRY: "MISSING_ADDRESS_COUNTRY",
  MISSING_PHONE: "MISSING_PHONE",
  MISSING_WEBSITE: "MISSING_WEBSITE",
  INVALID_WEBSITE: "INVALID_WEBSITE",
  EXISTING_FACTORY_RUN: "EXISTING_FACTORY_RUN",
  TRANSIENT_FACTORY_FAILURE: "TRANSIENT_FACTORY_FAILURE",
  FACTORY_ADAPTERS_UNCONFIGURED: "FACTORY_ADAPTERS_UNCONFIGURED",
  WRITER_BEFORE_GATE_FORBIDDEN: "WRITER_BEFORE_GATE_FORBIDDEN",
} as const);

export type D2dIntakeReasonCode = (typeof D2D_INTAKE_REASON_CODES)[keyof typeof D2D_INTAKE_REASON_CODES];

export const D2D_INTAKE_SHARED_SECRET_ENV = "D2D_INTAKE_SHARED_SECRET" as const;
export const D2D_INTAKE_TOKEN_ENV = "D2D_INTAKE_TOKEN" as const;
export const D2D_INTAKE_STATE_DIR_ENV = "D2D_INTAKE_STATE_DIR" as const;
export const D2D_INTAKE_HOST_ENV = "D2D_INTAKE_HOST" as const;
export const D2D_INTAKE_PORT_ENV = "D2D_INTAKE_PORT" as const;
export const D2D_INTAKE_ADAPTERS_MODULE_ENV = "D2D_INTAKE_ADAPTERS_MODULE" as const;

export const D2D_INTAKE_HTTP_PATH = "/d2d-factory-intake/v1" as const;

export interface D2dSourceRef {
  readonly kind: string;
  readonly refId: string;
  readonly url?: string;
  readonly label?: string;
}

export interface D2dQualification {
  readonly classification: string;
  readonly reason: string;
  readonly evidenceRefs: readonly D2dSourceRef[];
}

export interface D2dProvenance {
  readonly sourceRefs: readonly D2dSourceRef[];
  readonly sourceNotes?: string;
}

export interface D2dProspectCandidate {
  readonly d2dProspectId: string;
  readonly business: {
    readonly name?: string;
    readonly trade?: string;
    readonly serviceArea?: string;
    readonly legalName?: string;
  };
  readonly nap: {
    readonly name?: string;
    readonly address?: Partial<Address>;
    readonly phone?: string;
    readonly website?: string;
  };
  readonly qualification: D2dQualification;
  readonly provenance: D2dProvenance;
  readonly createdAt: string;
}

export interface D2dIntakeBatch {
  readonly version: typeof D2D_FACTORY_INTAKE_VERSION;
  readonly campaignId: string;
  readonly campaignRunId: string;
  readonly exportId: string;
  readonly exportedAt: string;
  readonly prospects: readonly D2dProspectCandidate[];
}

export interface D2dProspectReceipt {
  readonly version: typeof D2D_FACTORY_INTAKE_VERSION;
  readonly status: D2dIntakeStatus;
  readonly d2dProspectId: string;
  readonly campaignId: string;
  readonly campaignRunId: string;
  readonly exportId: string;
  readonly correlationId: string;
  readonly factoryProspectId?: string;
  readonly factoryRunId?: string;
  readonly factoryStage?: WorkflowStage;
  readonly reason?: string;
  readonly reasonCode?: D2dIntakeReasonCode;
}

export interface D2dIntakeBatchReceipt {
  readonly version: typeof D2D_FACTORY_INTAKE_VERSION;
  readonly campaignId: string;
  readonly campaignRunId: string;
  readonly exportId: string;
  readonly receipts: readonly D2dProspectReceipt[];
}

export interface MappedD2dProspect {
  readonly seed: ProspectSeed;
  readonly correlation: WorkflowSourceCorrelation;
  readonly business: BusinessIdentity;
  readonly nap: Nap;
}

export function intakeCorrelationId(input: {
  readonly d2dProspectId: string;
  readonly exportId: string;
  readonly version?: string;
}): string {
  const version = input.version ?? D2D_FACTORY_INTAKE_VERSION;
  return `${input.d2dProspectId}::${input.exportId}::${version}`;
}
