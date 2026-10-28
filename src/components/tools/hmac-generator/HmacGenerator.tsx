"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  compareSignature,
  computeHmac,
  formatSignature,
  hmacAlgorithms,
  type HmacAlgorithm,
  type InputEncoding,
} from "@/lib/tools/hmac";

type OutputFormat = "hex" | "base64" | "base64url";

const ENCODINGS: { value: InputEncoding; label: string }[] = [
  { value: "text", label: "Text (UTF-8)" },
  { value: "hex", label: "Hex" },
  { value: "base64", label: "Base64" },
];

export function HmacGenerator() {
  const [key, setKey] = useState("");
  const [keyEncoding, setKeyEncoding] = useState<InputEncoding>("text");
  const [message, setMessage] = useState("");
  const [messageEncoding, setMessageEncoding] = useState<InputEncoding>("text");
  const [algorithm, setAlgorithm] = useState<HmacAlgorithm>("SHA-256");
  const [format, setFormat] = useState<OutputFormat>("hex");
  const [expected, setExpected] = useState("");
  const [result, setResult] = useState<{ signature: Uint8Array; warnings: string[]; keyBytes: number; messageBytes: number } | null>(null);
  const [error, setError] = useState<{ message: string; field?: "key" | "message" } | null>(null);
  const request = useRef(0);
  const keyId = useId();
  const messageId = useId();
  const outputId = useId();
  const expectedId = useId();

  useEffect(() => {
    const id = ++request.current;
    const handle = window.setTimeout(async () => {
      if (key === "") {
        setResult(null);
        setError(null);
        return;
      }
      const outcome = await computeHmac({ key, keyEncoding, message, messageEncoding, algorithm });
      if (id !== request.current) return;
      if (outcome.ok) {
        setResult({ signature: outcome.signature, warnings: outcome.warnings, keyBytes: outcome.keyBytes, messageBytes: outcome.messageBytes });
        setError(null);
      } else {
        setResult(null);
        setError({ message: outcome.error, field: outcome.field });
      }
    }, 120);
    return () => window.clearTimeout(handle);
  }, [key, keyEncoding, message, messageEncoding, algorithm]);

  const output = result ? formatSignature(result.signature, format) : "";
  const comparison = result && expected.trim() ? compareSignature(expected, result.signature) : null;

  function clear() {
    setKey("");
    setMessage("");
    setExpected("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 rounded-md border border-border bg-surface p-4">
        <SegmentedControl
          label="Algorithm"
          value={algorithm}
          onChange={setAlgorithm}
          options={hmacAlgorithms.map((a) => ({ value: a.value, label: a.label }))}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setKey("my-secret-key-that-is-at-least-32-bytes"); setKeyEncoding("text"); setMessage('{"event":"payment.succeeded","id":"evt_123"}'); setMessageEncoding("text"); }}>
            Sample
          </Button>
          <Button size="sm" variant="ghost" onClick={clear} disabled={!key && !message && !expected}>
            Clear
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <Label htmlFor={keyId}>Secret key</Label>
              <SegmentedControl label="Key encoding" hideLabel value={keyEncoding} onChange={setKeyEncoding} options={ENCODINGS} />
            </div>
            <PasswordInput
              id={keyId}
              noun="key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={keyEncoding === "hex" ? "e.g. 0b0b0b0b…" : keyEncoding === "base64" ? "e.g. c2VjcmV0" : "Your shared secret"}
              aria-invalid={error?.field === "key" || undefined}
            />
          </div>
          <ToolPanel
            label="Message"
            htmlFor={messageId}
            actions={<SegmentedControl label="Message encoding" hideLabel value={messageEncoding} onChange={setMessageEncoding} options={ENCODINGS} />}
            footer={result ? `${result.keyBytes.toLocaleString("en-US")}-byte key · ${result.messageBytes.toLocaleString("en-US")}-byte message` : "The signature updates as you type."}
          >
            <Textarea
              id={messageId}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="The exact bytes that were signed, e.g. a webhook body"
              aria-invalid={error?.field === "message" || undefined}
              className="min-h-40"
            />
          </ToolPanel>
        </div>

        <div className="flex flex-col gap-4">
          {error ? <Alert title="Could not compute the HMAC">{error.message}</Alert> : null}
          {result?.warnings.map((w) => <Alert key={w} tone="warning">{w}</Alert>)}
          <ToolPanel
            label="Signature"
            htmlFor={outputId}
            actions={
              <>
                <SegmentedControl
                  label="Output format"
                  hideLabel
                  value={format}
                  onChange={setFormat}
                  options={[
                    { value: "hex", label: "Hex" },
                    { value: "base64", label: "Base64" },
                    { value: "base64url", label: "Base64URL" },
                  ]}
                />
                <CopyButton text={output} ariaLabel="Copy signature" />
              </>
            }
          >
            <Textarea id={outputId} value={output} readOnly placeholder="Enter a key to see the signature" className="min-h-24 bg-subtle break-all" />
          </ToolPanel>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={expectedId}>Compare with an expected signature (optional)</Label>
            <Input
              id={expectedId}
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              placeholder="Hex, Base64 or Base64URL"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
            {comparison === "match" ? (
              <p role="status" className="text-sm text-success">Match: the signatures are identical.</p>
            ) : comparison === "mismatch" ? (
              <p role="status" className="text-sm text-danger">No match. Check the key, the encodings and that the message is byte-for-byte identical.</p>
            ) : comparison === "invalid" ? (
              <p role="status" className="text-sm text-danger">This is not valid hex or Base64.</p>
            ) : null}
          </div>
        </div>
      </div>

      <Notice title="Keep keys secret">
        Anyone with the key can create valid signatures. The key and message are processed in your browser with Web
        Crypto and are never sent, logged or saved. Avoid pasting production secrets into any website you do not control.
      </Notice>
    </div>
  );
}
