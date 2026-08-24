export declare const CONTROL_PATH: string;
export declare const DORMANT_NONCE: string;
export declare function validateControl(control: Record<string, any>, input?: { changedPaths?: string[]; actor?: string; owner?: string }): { dormant: boolean; stage: "writer1" };
