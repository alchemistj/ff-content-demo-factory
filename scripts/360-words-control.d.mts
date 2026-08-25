export declare const CONTROL_PATH: string;
export declare const DORMANT_NONCE: string;
export declare const EXPECTED_RECOVERY: Readonly<Record<string, string | number>>;
export declare const EXPECTED_RECOVERY_V2: Readonly<Record<string, string | number>>;
export declare const EXPECTED_RECOVERY_V3: Readonly<Record<string, string | number>>;
export declare const EXPECTED_RECOVERY_V3_FINALIZE: Readonly<Record<string, string | number>>;
export declare const EXPECTED_VERIFIED_CORRECTION: Readonly<Record<string, string | number>>;
export declare function validateControl(control: Record<string, any>, input?: { changedPaths?: string[]; actor?: string; owner?: string; commitSha?: string; beforeSha?: string; parentSha?: string; verifiedLane?: boolean }): { dormant: true; stage: "writer1" } | { dormant: false; stage: "writer1"; sourceSha: string };
