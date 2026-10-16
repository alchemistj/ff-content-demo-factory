const SECRET_PATTERN =
  /(?:sk-ant-[a-z0-9_-]+|sk-[a-zA-Z0-9]{8,}|Bearer\s+[A-Za-z0-9._~+/=-]+|ANTHROPIC_API_KEY\s*=\s*\S+)/gi;

export function redactSecrets(text: string): string {
  return text.replace(SECRET_PATTERN, "[redacted]");
}

export function operatorFacingText(stdout: string, stderr: string, limit = 1500): string {
  const combined = [stderr.trim(), stdout.trim()].filter((part) => part.length > 0).join("\n");
  const redacted = redactSecrets(combined);
  if (redacted.length === 0) return "Claude Code produced no operator-facing output";
  return redacted.length > limit ? `${redacted.slice(0, limit)}…` : redacted;
}
