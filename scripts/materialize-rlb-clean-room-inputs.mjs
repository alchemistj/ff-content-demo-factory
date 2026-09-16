import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runDir = join(repoRoot, "writer-runs", "rlb-electric-remodel-repair");
const manifestPath = join(runDir, "INPUT_MANIFEST.json");
const outputDir = join(runDir, "inputs");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (manifest?.schemaVersion !== "rlb-clean-room-inputs/v1" || !Array.isArray(manifest.inputs)) {
  throw new Error("Invalid RLB clean-room input manifest");
}

await mkdir(outputDir, { recursive: true });

const receipts = [];
for (const input of manifest.inputs) {
  const url = `https://raw.githubusercontent.com/${input.repository}/${input.ref}/${input.path}`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "ff-content-demo-factory-clean-room-materializer",
      accept: "application/vnd.github.raw",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${input.name}: ${response.status} ${response.statusText}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const actualSha256 = createHash("sha256").update(bytes).digest("hex");
  if (actualSha256 !== input.sha256) {
    throw new Error(
      `SHA-256 mismatch for ${input.name}: ${actualSha256} !== ${input.sha256}. ` +
        "Do not continue with unverified RLB inputs.",
    );
  }

  const destination = join(outputDir, input.name);
  await writeFile(destination, bytes);
  receipts.push({
    name: input.name,
    repository: input.repository,
    ref: input.ref,
    path: input.path,
    sha256: actualSha256,
    bytes: bytes.length,
    destination: `writer-runs/rlb-electric-remodel-repair/inputs/${input.name}`,
  });
}

const receipt = {
  schemaVersion: "rlb-clean-room-materialization-receipt/v1",
  prospectId: manifest.prospectId,
  factorySourceHead: manifest.factoryBase?.sourceHead ?? null,
  generatedAt: new Date().toISOString(),
  inputs: receipts,
};

await writeFile(
  join(outputDir, "MATERIALIZATION_RECEIPT.json"),
  `${JSON.stringify(receipt, null, 2)}\n`,
);

console.log(JSON.stringify({ ok: true, outputDir, inputs: receipts }, null, 2));
