import type { IncomingMessage, ServerResponse } from "node:http";
import { handleVercelNode } from "../src/d2d-intake/vercel.js";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await handleVercelNode(req, res);
}
