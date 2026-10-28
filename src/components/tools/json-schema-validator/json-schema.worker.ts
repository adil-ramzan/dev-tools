import { validateWithSchema, type DraftOption } from "@/lib/tools/json-schema";

type Request = { schema: string; data: string; draft: DraftOption };

type WorkerScope = {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage: (message: unknown) => void;
};

const scope = self as unknown as WorkerScope;

scope.onmessage = (event) => {
  const { schema, data, draft } = event.data;
  scope.postMessage(validateWithSchema(schema, data, draft));
};
