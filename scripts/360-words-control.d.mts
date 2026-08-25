export declare const CONTROL_PATH: string;
export declare const DORMANT_NONCE: string;
export declare const EXPECTED_RECOVERY: Readonly<Record<string, string | number>>;
export declare function validateControl(control: Record<string, any>, input?: { changedPaths?: string[]; actor?: string; owner?: string }): { dormant: true; stage: "writer1" } | { dormant: false; stage: "writer1"; sourceSha: string };
