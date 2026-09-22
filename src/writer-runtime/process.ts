import { spawn } from "node:child_process";
import type { ProcessResult, RunProcessInput } from "./types.js";

const KILL_GRACE_MS = 2000;

export async function runProcess(input: RunProcessInput): Promise<ProcessResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    let cancelled = false;
    let killTimer: ReturnType<typeof setTimeout> | undefined;

    const child = spawn(input.command, [...input.args], {
      cwd: input.cwd,
      env: input.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const finish = (result: ProcessResult): void => {
      if (settled) return;
      settled = true;
      input.signal?.removeEventListener("abort", onAbort);
      clearTimeout(timeout);
      if (killTimer) clearTimeout(killTimer);
      resolve(result);
    };

    const killChild = (signal: NodeJS.Signals): void => {
      if (child.killed) return;
      child.kill(signal);
      killTimer = setTimeout(() => {
        if (!settled) child.kill("SIGKILL");
      }, KILL_GRACE_MS);
    };

    const onAbort = (): void => {
      cancelled = true;
      killChild("SIGTERM");
    };

    const timeout = setTimeout(() => {
      timedOut = true;
      killChild("SIGTERM");
    }, input.timeoutMs);

    if (input.signal) {
      if (input.signal.aborted) {
        onAbort();
      } else {
        input.signal.addEventListener("abort", onAbort, { once: true });
      }
    }

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });

    if (input.stdin !== undefined) {
      child.stdin?.write(input.stdin);
    }
    child.stdin?.end();

    child.on("error", (error: NodeJS.ErrnoException) => {
      finish({
        exitCode: null,
        stdout,
        stderr: error.message,
        timedOut,
        cancelled,
        signal: null,
        spawnError: error.code ?? error.name,
      });
    });

    child.on("close", (exitCode, signal) => {
      finish({
        exitCode,
        stdout,
        stderr,
        timedOut,
        cancelled,
        signal,
      });
    });
  });
}
