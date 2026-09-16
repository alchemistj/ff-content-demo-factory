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

const UNCONFIGURED_ADAPTER = "unconfigured";

function configuredAdapterValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === UNCONFIGURED_ADAPTER) return undefined;
  return trimmed;
}

function effectiveEnvAdapterProvider(
  env: NodeJS.ProcessEnv,
  kind: "research" | "prescription",
): string | undefined {
  if (kind === "research") {
    return configuredAdapterValue(env[FACTORY_RESEARCH_PROVIDER_ENV]);
  }
  return (
    configuredAdapterValue(env[FACTORY_PRESCRIPTION_PROVIDER_ENV]) ??
    configuredAdapterValue(env[FACTORY_RESEARCH_PROVIDER_ENV])
  );
}

function effectiveEnvAdapterModel(
  env: NodeJS.ProcessEnv,
  kind: "research" | "prescription",
): string | undefined {
  if (kind === "research") {
    return configuredAdapterValue(env[FACTORY_RESEARCH_MODEL_ENV]);
  }
  return (
    configuredAdapterValue(env[FACTORY_PRESCRIPTION_MODEL_ENV]) ??
    configuredAdapterValue(env[FACTORY_RESEARCH_MODEL_ENV])
  );
}

export function envAdapterConfigured(
  env: NodeJS.ProcessEnv,
  kind: "research" | "prescription",
): boolean {
  const provider = effectiveEnvAdapterProvider(env, kind);
  const model = effectiveEnvAdapterModel(env, kind);
  const key = configuredAdapterValue(env[FACTORY_MODEL_API_KEY_ENV]);
  return Boolean(provider && model && key);
}

/**
 * Production adapters from FACTORY_* env. Does not load a local filesystem
 * D2D_INTAKE_ADAPTERS_MODULE. Writer is always forbidden before Human Gate 1.
 * Live provider HTTP only runs when research/prescription is invoked with
 * provider, model, and key. Missing model is not ready and fails closed locally.
 */
export function createEnvFactoryAdapters(
  env: NodeJS.ProcessEnv = process.env,
  options?: { readonly completeJson?: EnvAdapterCompleteJson },
): FactoryAdapters {
  const researchProvider = effectiveEnvAdapterProvider(env, "research") ?? UNCONFIGURED_ADAPTER;
  const researchModel = effectiveEnvAdapterModel(env, "research") ?? UNCONFIGURED_ADAPTER;
  const prescriptionProvider = effectiveEnvAdapterProvider(env, "prescription") ?? UNCONFIGURED_ADAPTER;
  const prescriptionModel = effectiveEnvAdapterModel(env, "prescription") ?? UNCONFIGURED_ADAPTER;
  const apiKey = configuredAdapterValue(env[FACTORY_MODEL_API_KEY_ENV]);
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
  const apiKey = configuredAdapterValue(input.apiKey);
  const provider = configuredAdapterValue(input.provider);
  const model = configuredAdapterValue(input.model);
  if (!apiKey || !provider || !model) {
    throw new WorkflowError(
      "FACTORY_ADAPTERS_UNCONFIGURED",
      `${FACTORY_RESEARCH_PROVIDER_ENV}/${FACTORY_RESEARCH_MODEL_ENV}, ${FACTORY_PRESCRIPTION_PROVIDER_ENV}/${FACTORY_PRESCRIPTION_MODEL_ENV} (falling back to research), and ${FACTORY_MODEL_API_KEY_ENV} are required for advanced intake. ${D2D_INTAKE_ADAPTERS_MODULE_ENV} is not used on Vercel.`,
    );
  }
  return input.completeJson({
    kind: input.kind,
    provider,
    model,
    apiKey,
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
