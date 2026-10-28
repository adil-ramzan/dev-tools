"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatBytes } from "@/lib/format";
import {
  DEFAULT_ALGORITHMS,
  formatDigest,
  hashAlgorithms,
  hashText,
  type HashAlgorithm,
  type HashOutputFormat,
} from "@/lib/tools/hash";

const SAMPLE = "The quick brown fox jumps over the lazy dog";

type Result = { bytes: number; digests: { id: HashAlgorithm; value: Uint8Array }[] };

export function HashGenerator() {
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<HashAlgorithm[]>(DEFAULT_ALGORITHMS);
  const [format, setFormat] = useState<HashOutputFormat>("hex");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const inputId = useId();

  // Hash as you type. Older requests that finish late are ignored.
  useEffect(() => {
    const id = ++request.current;
    const algorithms = hashAlgorithms.map((a) => a.id).filter((a) => selected.includes(a));
    const handle = window.setTimeout(async () => {
      const outcome = await hashText(input, algorithms);
      if (id !== request.current) return;
      if (outcome.ok) {
        setResult({ bytes: outcome.bytes, digests: outcome.digests });
        setError(null);
      } else {
        setResult(null);
        setError(outcome.error);
      }
    }, 120);
    return () => window.clearTimeout(handle);
  }, [input, selected]);

  const toggle = (id: HashAlgorithm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setSelected((current) => (e.target.checked ? [...current, id] : current.filter((a) => a !== id)));

  return (
    <div className="flex flex-col gap-6">
      <ToolPanel
        label="Text to hash"
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
        footer={
          result
            ? `${formatBytes(result.bytes)} of UTF-8 text. Hashes update as you type.`
            : "The text is encoded as UTF-8 before hashing. Hashes update as you type."
        }
      >
        <Textarea
          id={inputId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or paste text. An empty input has a hash too."
          className="min-h-36"
        />
      </ToolPanel>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 rounded-md border border-border bg-surface p-4">
        <fieldset className="min-w-0">
          <legend className="mb-1.5 text-sm font-medium">Algorithms</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {hashAlgorithms.map((a) => (
              <Checkbox key={a.id} label={a.label} checked={selected.includes(a.id)} onChange={toggle(a.id)} />
            ))}
          </div>
        </fieldset>
        <SegmentedControl
          label="Output"
          value={format}
          onChange={setFormat}
          options={[
            { value: "hex", label: "hex" },
            { value: "HEX", label: "HEX" },
            { value: "base64", label: "Base64" },
          ]}
        />
      </div>

      {error ? <Alert title="Could not hash this text">{error}</Alert> : null}

      {result && selected.length > 0 ? (
        <ul className="flex flex-col gap-3" aria-label="Hashes">
          {result.digests.map(({ id, value }) => {
            const info = hashAlgorithms.find((a) => a.id === id)!;
            const text = formatDigest(value, format);
            return (
              <li key={id} className="flex flex-col gap-1.5 rounded-md border border-border bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {info.label}
                    <span className="font-mono text-xs font-normal text-muted-foreground">{info.bits} bits</span>
                    {info.weak ? (
                      <span className="rounded-sm border border-danger px-1.5 py-0.5 text-xs font-normal text-danger">
                        Not for security
                      </span>
                    ) : null}
                  </h2>
                  <CopyButton text={text} ariaLabel={`Copy ${info.label} hash`} />
                </div>
                <output data-algorithm={id} className="font-mono text-sm break-all text-foreground">
                  {text}
                </output>
              </li>
            );
          })}
        </ul>
      ) : null}

      <Notice title="Hashes are not password storage or encryption">
        MD5 and SHA-1 have practical collision attacks: use them only for checksums and legacy compatibility, never for
        signatures or integrity against tampering. None of these algorithms is suitable for storing passwords, because
        they are fast and unsalted; use Argon2id, scrypt or bcrypt instead. A hash cannot be decrypted, but short or
        common inputs can be found by guessing.
      </Notice>
    </div>
  );
}
