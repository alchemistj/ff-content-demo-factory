import { createHash, timingSafeEqual } from "node:crypto";
import { D2dIntakeAuthError } from "./errors.js";
import { D2D_INTAKE_REASON_CODES, D2D_INTAKE_SHARED_SECRET_ENV } from "./types.js";

export function configuredIntakeSecret(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = env[D2D_INTAKE_SHARED_SECRET_ENV];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : undefined;
}

export function presentedBearerToken(header: string | null | undefined): string | undefined {
  if (typeof header !== "string") return undefined;
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match?.[1];
}

export function assertD2dIntakeAuth(input: {
  readonly presentedToken?: string;
  readonly expectedSecret?: string;
}): void {
  const expected = input.expectedSecret?.trim() ? input.expectedSecret : undefined;
  if (!expected) {
    throw new D2dIntakeAuthError(
      D2D_INTAKE_REASON_CODES.AUTH_NOT_CONFIGURED,
      `${D2D_INTAKE_SHARED_SECRET_ENV} is not configured; D2D intake fails closed.`,
      503,
    );
  }
  const presented = input.presentedToken;
  if (typeof presented !== "string" || presented.length === 0) {
    throw new D2dIntakeAuthError(
      D2D_INTAKE_REASON_CODES.AUTH_MISSING,
      "D2D intake authentication token is missing.",
      401,
    );
  }
  if (!tokensMatch(presented, expected)) {
    throw new D2dIntakeAuthError(
      D2D_INTAKE_REASON_CODES.AUTH_INVALID,
      "D2D intake authentication failed.",
      401,
    );
  }
}

function tokensMatch(presented: string, expected: string): boolean {
  const presentedHash = createHash("sha256").update(presented).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(presentedHash, expectedHash);
}
