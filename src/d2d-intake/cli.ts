#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { FactoryAdapters } from "../workflow/types.js";
import { WorkflowError } from "../workflow/types.js";
import { acceptD2dIntake } from "./accept.js";
import { configuredIntakeSecret } from "./auth.js";
import { createD2dIntakeServer } from "./http.js";
import { createFileIntakeRegistry } from "./registry.js";
import {
  D2D_INTAKE_ADAPTERS_MODULE_ENV,
  D2D_INTAKE_HOST_ENV,
  D2D_INTAKE_PORT_ENV,
  D2D_INTAKE_SHARED_SECRET_ENV,
  D2D_INTAKE_STATE_DIR_ENV,
  D2D_INTAKE_TOKEN_ENV,
} from "./types.js";

const USAGE = `Usage:
  npm run d2d-intake -- --payload <path> [--receipt-out <path>] [--token <token>]
  npm run d2d-intake -- --status --prospect-id <d2dProspectId>
  npm run d2d-intake -- --status --run-id <factoryRunId>
  npm run d2d-intake -- serve

Authenticated D2D intake. Fails closed without ${D2D_INTAKE_SHARED_SECRET_ENV}.
See docs/d2d-intake/OPERATOR_SETUP.md.
`;

async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;
  if (command === "help" || command === "--help" || argv.length === 0) {
    process.stdout.write(USAGE);
    return;
  }
  const flags = parseFlags(command?.startsWith("--") ? argv : rest);
  const expectedSecret = configuredIntakeSecret();
  const presentedToken =
    (typeof flags.token === "string" ? flags.token : undefined) ?? process.env[D2D_INTAKE_TOKEN_ENV];
  const registry = createFileIntakeRegistry(process.env[D2D_INTAKE_STATE_DIR_ENV] ?? ".d2d-intake-state");
  const adapters = await loadAdapters();

  if (command === "serve" || flags.serve === true) {
    const host = process.env[D2D_INTAKE_HOST_ENV] ?? "127.0.0.1";
    const port = Number(process.env[D2D_INTAKE_PORT_ENV] ?? "8787");
    createD2dIntakeServer(
      {
        ...(expectedSecret !== undefined ? { expectedSecret } : {}),
        adapters,
        registry,
      },
      { host, port },
    );
    process.stderr.write(`D2D intake listening on http://${host}:${port}/d2d-factory-intake/v1\n`);
    return;
  }

  if (flags.status === true) {
    const prospectId = optionalFlag(flags, "prospect-id");
    const runId = optionalFlag(flags, "run-id");
    const receipt = prospectId
      ? await registry.getReceiptByProspect(prospectId)
      : runId
        ? await registry.getReceiptByRunId(runId)
        : null;
    if (!receipt) {
      throw new Error("No D2D intake receipt found for that prospect or run");
    }
    process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
    return;
  }

  const payloadPath = requireFlag(flags, "payload");
  const payload = JSON.parse(readFileSync(resolve(payloadPath), "utf8"));
  const receipt = await acceptD2dIntake({
    payload,
    ...(presentedToken !== undefined ? { presentedToken } : {}),
    ...(expectedSecret !== undefined ? { expectedSecret } : {}),
    adapters,
    registry,
  });
  const out = optionalFlag(flags, "receipt-out");
  if (out) {
    mkdirSync(dirname(resolve(out)), { recursive: true });
    writeFileSync(resolve(out), `${JSON.stringify(receipt, null, 2)}\n`);
  }
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}

async function loadAdapters(): Promise<FactoryAdapters> {
  const modulePath = process.env[D2D_INTAKE_ADAPTERS_MODULE_ENV];
  if (modulePath) {
    const loaded = (await import(pathToFileURL(resolve(modulePath)).href)) as {
      createFactoryAdapters?: () => FactoryAdapters | Promise<FactoryAdapters>;
      default?: () => FactoryAdapters | Promise<FactoryAdapters>;
    };
    const factory = loaded.createFactoryAdapters ?? loaded.default;
    if (typeof factory !== "function") {
      throw new Error(`${D2D_INTAKE_ADAPTERS_MODULE_ENV} must export createFactoryAdapters()`);
    }
    return factory();
  }
  return unconfiguredAdapters();
}

function unconfiguredAdapters(): FactoryAdapters {
  const fail = async (): Promise<never> => {
    throw new WorkflowError(
      "FACTORY_ADAPTERS_UNCONFIGURED",
      `${D2D_INTAKE_ADAPTERS_MODULE_ENV} is not set; research and prescription adapters are required for accepted intake.`,
    );
  };
  return {
    researcher: { provider: "unconfigured", model: "unconfigured", research: fail },
    prescriber: { provider: "unconfigured", model: "unconfigured", prescribe: fail },
    writer: { provider: "unconfigured", model: "forbidden-before-gate-1", writeCompletePackage: fail },
  };
}

function parseFlags(argv: string[]): Record<string, string | true> {
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token?.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i += 1;
    }
  }
  return flags;
}

function requireFlag(flags: Record<string, string | true>, name: string): string {
  const value = flags[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing --${name}`);
  }
  return value;
}

function optionalFlag(flags: Record<string, string | true>, name: string): string | undefined {
  const value = flags[name];
  return typeof value === "string" ? value : undefined;
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
