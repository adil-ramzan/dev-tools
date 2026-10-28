"use client";

import { useId, useState, type ReactNode } from "react";
import { ActionBar, ToolColumns, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Textarea } from "@/components/ui/Field";

export type ConvertResult = { ok: true; output: string; note?: string } | { ok: false; error: string };

type EncodeDecodeToolProps = {
  /** Options shown in the toolbar (mode switches, checkboxes). */
  options?: ReactNode;
  encode: (input: string) => ConvertResult;
  decode: (input: string) => ConvertResult;
  sample: string;
  inputPlaceholder: string;
};

/**
 * Shared interface for text encoders/decoders: an input, Encode and Decode
 * actions, an output with copy, and a swap action to feed the output back in.
 * Conversion only happens on request; the input is never changed by it.
 */
export function EncodeDecodeTool({ options, encode, decode, sample, inputPlaceholder }: EncodeDecodeToolProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<{ tone: "danger" | "success"; title: string; detail?: string } | null>(null);
  const inputId = useId();
  const outputId = useId();

  function run(action: "encode" | "decode") {
    const result = action === "encode" ? encode(input) : decode(input);
    if (result.ok) {
      setOutput(result.output);
      setStatus({ tone: "success", title: action === "encode" ? "Encoded." : "Decoded.", detail: result.note });
    } else {
      setOutput("");
      setStatus({ tone: "danger", title: action === "encode" ? "Could not encode" : "Could not decode", detail: result.error });
    }
  }

  function clear() {
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
                  <Button variant="primary" onClick={() => run("encode")} disabled={!input}>
                    Encode
                  </Button>
                  <Button variant="primary" onClick={() => run("decode")} disabled={!input}>
                    Decode
                  </Button>
                </>
              }
              secondary={
                <Button variant="ghost" onClick={clear} disabled={!input && !output && !status}>
                  Clear
                </Button>
              }
              status={
                status ? (
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
                disabled={!output}
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
