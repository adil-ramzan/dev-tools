"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ActionBar, ToolColumns, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Textarea } from "@/components/ui/Field";

export type ConvertResult = { ok: true; output: string; note?: string } | { ok: false; error: string };

type EncodeDecodeToolProps = {
  /** Options shown in the toolbar (mode switches, checkboxes). */
  options?: ReactNode;
  /** May return a promise, e.g. while a library loads; the result is shown when it settles. */
  encode: (input: string) => ConvertResult | Promise<ConvertResult>;
  decode: (input: string) => ConvertResult | Promise<ConvertResult>;
  sample: string;
  inputPlaceholder: string;
  /** Shown while an asynchronous conversion is pending. */
  pendingMessage?: string;
};

/**
 * Shared interface for text encoders/decoders: an input, Encode and Decode
 * actions, an output with copy, and a swap action to feed the output back in.
 * Conversion only happens on request; the input is never changed by it.
 */
export function EncodeDecodeTool({ options, encode, decode, sample, inputPlaceholder, pendingMessage = "Working…" }: EncodeDecodeToolProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<{ tone: "danger" | "success"; title: string; detail?: string } | null>(null);
  const [pending, setPending] = useState(false);
  // Identifies the latest run, so a slow result never overwrites a newer action or a Clear.
  const runId = useRef(0);
  const inputId = useId();
  const outputId = useId();

  function show(action: "encode" | "decode", result: ConvertResult) {
    if (result.ok) {
      setOutput(result.output);
      setStatus({ tone: "success", title: action === "encode" ? "Encoded." : "Decoded.", detail: result.note });
    } else {
      setOutput("");
      setStatus({ tone: "danger", title: action === "encode" ? "Could not encode" : "Could not decode", detail: result.error });
    }
  }

  function run(action: "encode" | "decode") {
    const id = ++runId.current;
    const result = action === "encode" ? encode(input) : decode(input);
    if (!(result instanceof Promise)) {
      show(action, result);
      return;
    }
    setPending(true);
    setOutput("");
    setStatus(null);
    void result
      .catch((error: unknown): ConvertResult => ({ ok: false, error: error instanceof Error ? error.message : String(error) }))
      .then((settled) => {
        if (id !== runId.current) return;
        setPending(false);
        show(action, settled);
      });
  }

  function clear() {
    runId.current++;
    setPending(false);
    setInput("");
    setOutput("");
    setStatus(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {options ? <ToolToolbar>{options}</ToolToolbar> : null}

      <ToolColumns>
        <ToolPanel
          label="Input"
          htmlFor={inputId}
          actions={
            <Button size="sm" variant="ghost" onClick={() => { setInput(sample); setStatus(null); }}>
              Sample
            </Button>
          }
          after={
            <ActionBar
              primary={
                <>
                  <Button variant="primary" onClick={() => run("encode")} disabled={!input || pending}>
                    Encode
                  </Button>
                  <Button variant="primary" onClick={() => run("decode")} disabled={!input || pending}>
                    Decode
                  </Button>
                </>
              }
              secondary={
                <Button variant="ghost" onClick={clear} disabled={!input && !output && !status && !pending}>
                  Clear
                </Button>
              }
              status={
                pending ? (
                  <p role="status" className="text-sm text-muted-foreground" data-pending>
                    {pendingMessage}
                  </p>
                ) : status ? (
                  <Alert tone={status.tone} title={status.title}>
                    {status.detail}
                  </Alert>
                ) : null
              }
            />
          }
        >
          <Textarea
            id={inputId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={inputPlaceholder}
            className="min-h-64"
          />
        </ToolPanel>
        <ToolPanel
          label="Output"
          htmlFor={outputId}
          actions={
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setInput(output); setOutput(""); setStatus(null); }}
                disabled={!output || pending}
              >
                Use as input
              </Button>
              <CopyButton text={output} ariaLabel="Copy output" />
            </>
          }
        >
          <Textarea id={outputId} value={output} readOnly placeholder="The result appears here" className="min-h-64 bg-subtle" />
        </ToolPanel>
      </ToolColumns>
    </div>
  );
}
