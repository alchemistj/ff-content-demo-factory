import type { D2dIntakeReasonCode } from "./types.js";

export class D2dIntakeAuthError extends Error {
  readonly code: D2dIntakeReasonCode;
  readonly httpStatus: number;

  constructor(code: D2dIntakeReasonCode, message: string, httpStatus: number) {
    super(message);
    this.name = "D2dIntakeAuthError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export class D2dIntakeEnvelopeError extends Error {
  readonly code: D2dIntakeReasonCode;

  constructor(code: D2dIntakeReasonCode, message: string) {
    super(message);
    this.name = "D2dIntakeEnvelopeError";
    this.code = code;
  }
}

export function isD2dIntakeAuthError(value: unknown): value is D2dIntakeAuthError {
  return value instanceof D2dIntakeAuthError;
}

export function isD2dIntakeEnvelopeError(value: unknown): value is D2dIntakeEnvelopeError {
  return value instanceof D2dIntakeEnvelopeError;
}
