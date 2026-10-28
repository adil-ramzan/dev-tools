export type WorkerOutcome<T> = { ok: true; data: T } | { ok: false; reason: "timeout" | "error" };

/**
 * Runs one task in a fresh Web Worker and terminates it when done, or after
 * `timeoutMs` so a runaway computation (for example a slow regular
 * expression) cannot freeze the page. `create` must call
 * `new Worker(new URL("./x.worker.ts", import.meta.url))` itself so the
 * bundler can find the worker file.
 */
export function runInWorker<T>(create: () => Worker, message: unknown, timeoutMs: number): Promise<WorkerOutcome<T>> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = create();
    } catch {
      resolve({ ok: false, reason: "error" });
      return;
    }
    const finish = (outcome: WorkerOutcome<T>) => {
      window.clearTimeout(timer);
      worker.terminate();
      resolve(outcome);
    };
    const timer = window.setTimeout(() => finish({ ok: false, reason: "timeout" }), timeoutMs);
    worker.onmessage = (event: MessageEvent<T>) => finish({ ok: true, data: event.data });
    worker.onerror = () => finish({ ok: false, reason: "error" });
    worker.postMessage(message);
  });
}
