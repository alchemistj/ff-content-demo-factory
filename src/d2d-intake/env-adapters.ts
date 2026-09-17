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

function adapterPair(
  provider: string | undefined,
  model: string | undefined,
): { readonly provider: string; readonly model: string } | undefined {
  if (!provider || !model) return undefined;
  return { provider, model };
}

function effectiveEnvAdapterPair(
  env: NodeJS.ProcessEnv,
  kind: "research" | "prescription",
): { readonly provider: string; readonly model: string } | undefined {
  const research = adapterPair(
    configuredAdapterValue(env[FACTORY_RESEARCH_PROVIDER_ENV]),
    configuredAdapterValue(env[FACTORY_RESEARCH_MODEL_ENV]),
  );
  if (kind === "research") return research;

  const prescriptionProvider = configuredAdapterValue(env[FACTORY_PRESCRIPTION_PROVIDER_ENV]);
  const prescriptionModel = configuredAdapterValue(env[FACTORY_PRESCRIPTION_MODEL_ENV]);
  if (prescriptionProvider && prescriptionModel) {
    return { provider: prescriptionProvider, model: prescriptionModel };
  }
  if (prescriptionProvider || prescriptionModel) return undefined;
  return research;
}

export function envAdapterConfigured(
  env: NodeJS.ProcessEnv,
  kind: "research" | "prescription",
): boolean {
  const pair = effectiveEnvAdapterPair(env, kind);
  const key = configuredAdapterValue(env[FACTORY_MODEL_API_KEY_ENV]);
  return Boolean(pair && key);
}

/**
 * Production adapters from FACTORY_* env. Does not load a local filesystem
 * D2D_INTAKE_ADAPTERS_MODULE. Writer is always forbidden before Human Gate 1.
 * Live provider HTTP only runs when research/prescription is invoked with
 * provider, model, and key. Missing model is not ready and fails closed locally.
 * Prescription inherits the research provider/model pair only when both
 * prescription overrides are omitted; a partial override is unconfigured.
 */
export function createEnvFactoryAdapters(
  env: NodeJS.ProcessEnv = process.env,
  options?: { readonly completeJson?: EnvAdapterCompleteJson },
): FactoryAdapters {
  const research = effectiveEnvAdapterPair(env, "research");
  const prescription = effectiveEnvAdapterPair(env, "prescription");
  const researchProvider = research?.provider ?? UNCONFIGURED_ADAPTER;
  const researchModel = research?.model ?? UNCONFIGURED_ADAPTER;
  const prescriptionProvider = prescription?.provider ?? UNCONFIGURED_ADAPTER;
  const prescriptionModel = prescription?.model ?? UNCONFIGURED_ADAPTER;
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
      `${FACTORY_RESEARCH_PROVIDER_ENV}/${FACTORY_RESEARCH_MODEL_ENV}, ${FACTORY_PRESCRIPTION_PROVIDER_ENV}/${FACTORY_PRESCRIPTION_MODEL_ENV} (both omitted inherit the research pair; a partial prescription override is unconfigured), and ${FACTORY_MODEL_API_KEY_ENV} are required for advanced intake. ${D2D_INTAKE_ADAPTERS_MODULE_ENV} is not used on Vercel.`,
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
