import { runRegex } from "@/lib/tools/regex";

export type RegexWorkerRequest = { id: number; pattern: string; flags: string; text: string };

type WorkerScope = {
  onmessage: ((event: MessageEvent<RegexWorkerRequest>) => void) | null;
  postMessage: (message: unknown) => void;
};

const scope = self as unknown as WorkerScope;

scope.onmessage = (event) => {
  const { id, pattern, flags, text } = event.data;
  scope.postMessage({ id, result: runRegex(pattern, flags, text) });
};
