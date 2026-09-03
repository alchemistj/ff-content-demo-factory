/**
 * Test-only boundary for the Cursor HTTP/SDK transport seam.
 * Production entry points do not export this module and the factory rejects
 * invocation outside the Node test runner.
 */
export { createCursorWriterExecutorForTest } from "./cursor-writer.js";
export type { CursorTestTransport, CloudAgentRecord } from "./cursor-writer.js";
