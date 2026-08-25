export declare const ARCHITECT_APPROVAL_PUBLIC_KEY_PATH: "qa/architect/architect-ed25519-v1-public.pem";
export declare const ARCHITECT_APPROVAL_PUBLIC_KEY_SHA256: "b0c4c57d7f905c215b6f8555d8abca81f7ea034319bc665dc920b50546b6e0f9";
export declare function validatePinnedArchitectPublicKeyBytes(bytes: Buffer): string;
export declare function loadPinnedArchitectPublicKey(root?: string): string;
