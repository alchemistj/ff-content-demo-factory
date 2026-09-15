/** GitHub Actions YAML helpers used by static workflow-trust tests. */

const RUN_KEY = /^(\s*)(?:-\s+)?run:\s*(.*?)\s*$/;
const BLOCK_SCALAR = /^[|>][+-]?$/;

export function extractGithubActionsRunBodies(yaml: string): string[] {
  const lines = yaml.split(/\r?\n/);
  const bodies: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i]?.match(RUN_KEY);
    if (!match) continue;
    const indent = match[1]?.length ?? 0;
    const rest = match[2] ?? "";
    if (BLOCK_SCALAR.test(rest)) {
      const bodyLines: string[] = [];
      let j = i + 1;
      for (; j < lines.length; j += 1) {
        const line = lines[j] ?? "";
        if (line.trim() === "") {
          bodyLines.push(line);
          continue;
        }
        const indentMatch = line.match(/^(\s*)/);
        const lineIndent = indentMatch?.[1]?.length ?? 0;
        if (lineIndent <= indent) break;
        bodyLines.push(line);
      }
      bodies.push(bodyLines.join("\n"));
      i = j - 1;
    } else {
      bodies.push(rest);
    }
  }
  return bodies;
}

export function runBodiesContainWorkflowInputs(yaml: string): boolean {
  return extractGithubActionsRunBodies(yaml).some((body) => body.includes("${{ inputs."));
}
