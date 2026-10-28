"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ActionBar, ShortcutScope, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatBytes } from "@/lib/format";
import {
  MAX_FILE_BYTES,
  checkFileSize,
  decodeBase64File,
  encodeFileBytes,
  sanitizeFileName,
  sniffType,
  suggestFileName,
  type Sniffed,
} from "@/lib/tools/base64-file";

type Mode = "encode" | "decode";

/** A 1×1 PNG. */
const SAMPLE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/** Longer output is previewed: rendering many megabytes in a textarea makes the page sluggish. */
const PREVIEW_CHARS = 200_000;

function readError(error: unknown): string {
  if (error instanceof RangeError) return "The browser ran out of memory while processing this file. Try a smaller file or close other tabs.";
  return "The file could not be read. It may have been moved, deleted or blocked by the browser.";
}

export function Base64FileConverter() {
  const [mode, setMode] = useState<Mode>("encode");
  return (
    <div className="flex flex-col gap-4">
      <ToolToolbar actions={null}>
        <SegmentedControl
          label="Direction"
          value={mode}
          onChange={setMode}
          options={[
            { value: "encode", label: "File → Base64" },
            { value: "decode", label: "Base64 → File" },
          ]}
        />
      </ToolToolbar>
      {mode === "encode" ? <EncodePanel /> : <DecodePanel />}
      <p className="text-sm text-muted-foreground">
        Files are read and converted in your browser and are never uploaded or stored. The limit is {formatBytes(MAX_FILE_BYTES)} per file.
      </p>
    </div>
  );
}

function EncodePanel() {
  const [file, setFile] = useState<{ name: string; type: string; bytes: Uint8Array } | null>(null);
  const [dataUri, setDataUri] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [urlSafe, setUrlSafe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileId = useId();
  const outputId = useId();

  const output = useMemo(() => {
    if (!file) return "";
    try {
      return encodeFileBytes(file.bytes, file.type, { dataUri, wrap, urlSafe });
    } catch (e) {
      return e instanceof RangeError ? null : "";
    }
  }, [file, dataUri, wrap, urlSafe]);

  async function select(selected: File | undefined) {
    setError(null);
    setFile(null);
    if (!selected) return;
    const size = checkFileSize(selected.size);
    if (!size.ok) {
      setError(size.error);
      return;
    }
    setBusy(true);
    try {
      const bytes = new Uint8Array(await selected.arrayBuffer());
      setFile({ name: selected.name, type: selected.type, bytes });
    } catch (e) {
      setError(readError(e));
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setFile(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const text = output ?? "";
  const preview = text.length > PREVIEW_CHARS;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fileId}>File to encode</Label>
          <input
            ref={fileRef}
            id={fileId}
            type="file"
            onChange={(e) => void select(e.target.files?.[0])}
            className="text-sm file:mr-3 file:h-9 file:cursor-pointer file:rounded-sm file:border file:border-border-strong file:bg-surface file:px-3 file:text-sm file:font-medium file:text-foreground hover:file:bg-subtle"
          />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 pb-2">
          <Checkbox label="Data URI (data:…;base64,)" checked={dataUri} onChange={(e) => setDataUri(e.target.checked)} />
          <Checkbox label="Wrap lines at 76 (MIME)" checked={wrap} disabled={dataUri} onChange={(e) => setWrap(e.target.checked)} />
          <Checkbox label="URL-safe (- and _)" checked={urlSafe} disabled={dataUri} onChange={(e) => setUrlSafe(e.target.checked)} />
        </div>
      </div>

      {error ? <Alert title="Could not encode this file">{error}</Alert> : null}
      {output === null ? <Alert title="Could not encode this file">The browser ran out of memory while encoding. Try a smaller file.</Alert> : null}
      {busy ? <p role="status" className="text-sm text-muted-foreground">Reading the file…</p> : null}

      <ToolPanel
        label="Base64 output"
        htmlFor={outputId}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={clear} disabled={!file && !error}>
              Clear
            </Button>
            <DownloadButton data={text} name={file ? `${file.name}.b64.txt` : "base64.txt"} type="text/plain" label="Download .txt" />
            <CopyButton text={text} ariaLabel="Copy Base64 output" />
          </>
        }
        footer={
          file ? (
            <span role="status">
              {file.name} · {file.type || "unknown type"} · {formatBytes(file.bytes.length)} → {text.length.toLocaleString("en-US")} characters
              {preview ? ` · Showing the first ${PREVIEW_CHARS.toLocaleString("en-US")} characters; Copy and Download include everything.` : ""}
            </span>
          ) : null
        }
      >
        <Textarea
          id={outputId}
          value={preview ? `${text.slice(0, PREVIEW_CHARS)}…` : text}
          readOnly
          placeholder="Choose a file to see its Base64 encoding"
          className="min-h-64 bg-subtle break-all"
        />
      </ToolPanel>
    </div>
  );
}

function DecodePanel() {
  const [input, setInput] = useState("");
  const [name, setName] = useState("decoded.bin");
  const [result, setResult] = useState<{ bytes: Uint8Array; type: string; sniffed: Sniffed | null; declared: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const nameId = useId();

  function decode() {
    setResult(null);
    try {
      const decoded = decodeBase64File(input);
      if (!decoded.ok) {
        setError(decoded.error);
        return;
      }
      const sniffed = sniffType(decoded.bytes);
      setResult({ bytes: decoded.bytes, type: decoded.mimeType ?? sniffed?.type ?? "application/octet-stream", sniffed, declared: decoded.mimeType });
      setName(suggestFileName(decoded.mimeType, sniffed));
      setError(null);
    } catch (e) {
      setError(e instanceof RangeError ? "The browser ran out of memory while decoding. Try smaller input." : "The input could not be decoded.");
    }
  }

  function reset(next: string) {
    setInput(next);
    setResult(null);
    setError(null);
  }

  const mismatch = result?.declared && result.sniffed && result.sniffed.type !== "text/plain" && result.sniffed.type !== result.declared;

  return (
    <ShortcutScope onSubmit={decode} disabled={!input.trim()} className="flex flex-col gap-4">
      <ToolPanel
        label="Base64 or data URI"
        htmlFor={inputId}
        actions={
          <Button size="sm" variant="ghost" onClick={() => reset(SAMPLE)}>
            Sample
          </Button>
        }
        footer={input ? `${input.length.toLocaleString("en-US")} characters` : "Whitespace and line breaks are ignored."}
        after={
          <ActionBar
            shortcut
            primary={
              <Button variant="primary" onClick={decode} disabled={!input.trim()}>
                Decode
              </Button>
            }
            secondary={
              <Button variant="ghost" onClick={() => reset("")} disabled={!input && !result && !error}>
                Clear
              </Button>
            }
            status={error ? <Alert title="Could not decode">{error}</Alert> : null}
          />
        }
      >
        <Textarea
          id={inputId}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setResult(null);
          }}
          placeholder="Paste Base64, e.g. aGVsbG8=, or a data URI such as data:image/png;base64,…"
          className="min-h-64 break-all"
        />
      </ToolPanel>

      {result ? (
        <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
          <Alert tone={mismatch ? "warning" : "success"} title={`Decoded ${formatBytes(result.bytes.length)}.`}>
            <ul className="flex flex-col gap-0.5">
              {result.declared ? <li>The data URI declares the type {result.declared}.</li> : null}
              <li>
                {result.sniffed ? `The content looks like: ${result.sniffed.label}.` : "The content type could not be detected from its first bytes."}
              </li>
              {mismatch ? <li>The declared type and the detected content do not match. Check the data before opening it.</li> : null}
            </ul>
          </Alert>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={nameId}>File name</Label>
              <Input id={nameId} value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-64 font-mono" spellCheck={false} />
            </div>
            <DownloadButton data={result.bytes} name={sanitizeFileName(name)} type={result.type} label="Download file" primary />
          </div>
        </div>
      ) : null}
    </ShortcutScope>
  );
}

/** A link to an object URL for the data, revoked when the data changes or the component unmounts. */
function DownloadButton({ data, name, type, label, primary = false }: { data: Uint8Array | string; name: string; type: string; label: string; primary?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const empty = typeof data === "string" ? data === "" : data.length === 0;

  useEffect(() => {
    if (empty) return;
    const blob = new Blob([typeof data === "string" ? data : new Uint8Array(data)], { type });
    const objectUrl = URL.createObjectURL(blob);
    const handle = window.setTimeout(() => setUrl(objectUrl), 0);
    return () => {
      window.clearTimeout(handle);
      URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [data, type, empty]);

  if (empty || !url) {
    return (
      <Button size="sm" variant={primary ? "primary" : "secondary"} disabled>
        {label}
      </Button>
    );
  }
  return (
    <a href={url} download={name} className={buttonClassName({ size: "sm", variant: primary ? "primary" : "secondary" })}>
      {label}
    </a>
  );
}
