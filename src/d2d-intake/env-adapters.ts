import { parseProposedPrescription, parseResearchRecord } from "../handoff/validate.js";
import { WorkflowError, type FactoryAdapters, type WriterAdapter } from "../workflow/types.js";
import {
  D2D_INTAKE_ADAPTERS_MODULE_ENV,
  FACTORY_MODEL_API_KEY_ENV,
  FACTORY_MODEL_BASE_URL_ENV,
  FACTORY_PRESCRIPTION_MODEL_ENV,
  FACTORY_PRESCRIPTION_PROVIDER_ENV,
  FACTORY_RESEARCH_MODEL_ENV,
  FACTORY_RESEARCH_PROVIDER_ENV,
} from "./types.js";

export interface EnvAdapterCompleteInput {
  readonly kind: "research" | "prescription";
  readonly provider: string;
  readonly model: string;
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly payload: unknown;
}

export type EnvAdapterCompleteJson = (input: EnvAdapterCompleteInput) => Promise<unknown>;

export function envAdapterConfigured(
  env: NodeJS.ProcessEnv,
  kind: "research" | "prescription",
): boolean {
  const provider =
    kind === "research"
      ? env[FACTORY_RESEARCH_PROVIDER_ENV]?.trim()
      : (env[FACTORY_PRESCRIPTION_PROVIDER_ENV]?.trim() || env[FACTORY_RESEARCH_PROVIDER_ENV]?.trim());
  const key = env[FACTORY_MODEL_API_KEY_ENV]?.trim();
  return Boolean(provider && key);
}

/**
 * Production adapters from FACTORY_* env. Does not load a local filesystem
 * D2D_INTAKE_ADAPTERS_MODULE. Writer is always forbidden before Human Gate 1.
 * Live provider HTTP only runs when research/prescription is invoked with a key.
 */
export function createEnvFactoryAdapters(
  env: NodeJS.ProcessEnv = process.env,
  options?: { readonly completeJson?: EnvAdapterCompleteJson },
): FactoryAdapters {
  const researchProvider = env[FACTORY_RESEARCH_PROVIDER_ENV]?.trim() || "unconfigured";
  const researchModel = env[FACTORY_RESEARCH_MODEL_ENV]?.trim() || "unconfigured";
  const prescriptionProvider =
    env[FACTORY_PRESCRIPTION_PROVIDER_ENV]?.trim() || env[FACTORY_RESEARCH_PROVIDER_ENV]?.trim() || "unconfigured";
  const prescriptionModel =
    env[FACTORY_PRESCRIPTION_MODEL_ENV]?.trim() || env[FACTORY_RESEARCH_MODEL_ENV]?.trim() || "unconfigured";
  const apiKey = env[FACTORY_MODEL_API_KEY_ENV]?.trim();
  const baseUrl = env[FACTORY_MODEL_BASE_URL_ENV]?.trim() || "https://api.openai.com/v1";
  const completeJson = options?.completeJson ?? openaiCompatibleJsonComplete;

  return {
    researcher: {
      provider: researchProvider,
      model: researchModel,
      async research(assignment) {
        const parsed = parseResearchRecord(
          await completeOrFail({
            kind: "research",
            provider: researchProvider,
            model: researchModel,
            apiKey,
            baseUrl,
            payload: assignment,
            completeJson,
          }),
        );
        return parsed;
      },
    },
    prescriber: {
      provider: prescriptionProvider,
      model: prescriptionModel,
      async prescribe(assignment) {
        const parsed = parseProposedPrescription(
          await completeOrFail({
            kind: "prescription",
            provider: prescriptionProvider,
            model: prescriptionModel,
            apiKey,
            baseUrl,
            payload: assignment,
            completeJson,
          }),
          assignment.research.evidence,
        );
        return parsed;
      },
    },
    writer: forbiddenIntakeWriter(),
  };
}

function forbiddenIntakeWriter(): WriterAdapter {
  return {
    provider: "forbidden",
    model: "forbidden-before-gate-1",
    async writeCompletePackage() {
      throw new WorkflowError(
        "WRITER_BEFORE_GATE_FORBIDDEN",
        "D2D intake stops at Human Gate 1 and must not start the writer",
      );
    },
  };
}

async function completeOrFail(input: {
  readonly kind: "research" | "prescription";
  readonly provider: string;
  readonly model: string;
  readonly apiKey: string | undefined;
  readonly baseUrl: string;
  readonly payload: unknown;
  readonly completeJson: EnvAdapterCompleteJson;
}): Promise<unknown> {
  if (!input.apiKey || input.provider === "unconfigured") {
    throw new WorkflowError(
      "FACTORY_ADAPTERS_UNCONFIGURED",
      `${FACTORY_RESEARCH_PROVIDER_ENV}/${FACTORY_PRESCRIPTION_PROVIDER_ENV} and ${FACTORY_MODEL_API_KEY_ENV} are required for advanced intake. ${D2D_INTAKE_ADAPTERS_MODULE_ENV} is not used on Vercel.`,
    );
  }
  return input.completeJson({
    kind: input.kind,
    provider: input.provider,
    model: input.model,
    apiKey: input.apiKey,
    baseUrl: input.baseUrl,
    payload: input.payload,
  });
}

export async function openaiCompatibleJsonComplete(input: EnvAdapterCompleteInput): Promise<unknown> {
  const url = `${input.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            input.kind === "research"
              ? "Return only a JSON object matching Content Factory factory-research/v1 ResearchRecord."
              : "Return only a JSON object matching Content Factory factory-prescription/v1 ProposedPrescription.",
        },
        { role: "user", content: JSON.stringify(input.payload) },
      ],
    }),
  });
  if (!response.ok) {
    throw new WorkflowError(
      "TRANSIENT_FACTORY_FAILURE",
      `Factory ${input.kind} provider HTTP ${response.status}`,
    );
  }
  const body = (await response.json()) as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new WorkflowError("TRANSIENT_FACTORY_FAILURE", `Factory ${input.kind} provider returned no JSON`);
  }
  return JSON.parse(content) as unknown;
}
