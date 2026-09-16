import type { IncomingMessage, ServerResponse } from "node:http";
import { handleVercelNode } from "../../src/d2d-intake/vercel.js";

/** Public path is `/d2d-factory-intake/v1` via vercel.json rewrites. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await handleVercelNode(req, res);
}
