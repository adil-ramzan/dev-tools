"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { ToolColumns, ToolPanel } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Label, Select, Textarea } from "@/components/ui/Field";
import { codeTargets, generateCode, parseCurl, type CodeTarget } from "@/lib/tools/curl";

const SAMPLE = `curl -X POST 'https://api.example.com/v1/orders?expand=items' \\
  -H 'Content-Type: application/json' \\
  -H "Authorization: Bearer $API_TOKEN" \\
  -d '{"product_id": 42, "quantity": 2, "note": "Gift wrap"}' \\
  --max-time 10 -L --compressed`;

export function CurlToCode() {
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<CodeTarget>("fetch");
  const deferred = useDeferredValue(input);
  const inputId = useId();
  const outputId = useId();
  const targetId = useId();

  const parsed = useMemo(() => (deferred.trim() ? parseCurl(deferred) : null), [deferred]);
  const code = parsed?.ok ? generateCode(parsed.request, target) : "";
  const label = codeTargets.find((t) => t.value === target)!.label;

  return (
    <div className="flex flex-col gap-4">
      <ToolColumns>
        <ToolPanel
          label="curl command"
          htmlFor={inputId}
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={() => setInput(SAMPLE)}>
                Sample
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setInput("")} disabled={!input}>
                Clear
              </Button>
            </>
          }
          footer="Paste a command for bash or zsh, e.g. from your browser's developer tools (Copy as cURL). It is parsed as text and never run."
        >
          <Textarea id={inputId} value={input} onChange={(e) => setInput(e.target.value)} placeholder="curl https://api.example.com -H 'Accept: application/json'" className="min-h-72" wrap="off" />
        </ToolPanel>
        <ToolPanel
          label={label}
          htmlFor={outputId}
          actions={
            <>
              <Label htmlFor={targetId} className="sr-only">
                Language
              </Label>
              <Select id={targetId} value={target} onChange={(e) => setTarget(e.target.value as CodeTarget)} className="w-48">
                {codeTargets.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <CopyButton text={code} ariaLabel={`Copy ${label} code`} />
            </>
          }
        >
          <Textarea id={outputId} value={code} readOnly placeholder="Generated code appears here" className="min-h-72 bg-subtle" wrap="off" />
        </ToolPanel>
      </ToolColumns>

      {parsed && !parsed.ok ? <Alert title="Could not convert this command">{parsed.error}</Alert> : null}
      {parsed?.ok && parsed.request.unsupported.length ? (
        <Alert title="Unsupported options were not converted">
          {parsed.request.unsupported.join(", ")}. The generated code does not reproduce them; add the equivalent setting by hand if you need it.
        </Alert>
      ) : null}
      {parsed?.ok && parsed.request.notes.length ? (
        <Alert tone="warning" title="Notes">
          <ul className="flex list-disc flex-col gap-0.5 pl-4">
            {parsed.request.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {parsed?.ok ? (
        <p className="font-mono text-xs text-muted-foreground" role="status">
          {parsed.request.method} {parsed.request.url} · {parsed.request.headers.length} {parsed.request.headers.length === 1 ? "header" : "headers"}
          {parsed.request.body.kind === "raw" ? " · body" : parsed.request.body.kind === "multipart" ? " · multipart form" : ""}
        </p>
      ) : null}
    </div>
  );
}
