"use client";

import { useId, useRef, useState } from "react";
import { ErrorContext, selectPosition } from "@/components/tools/ErrorContext";
import { ActionBar, ShortcutScope, ToolColumns, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Label, Select, Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { convertData, dataFormats, type DataFormat } from "@/lib/tools/data-format";

const SAMPLES: Record<DataFormat, string> = {
  json: `{
  "name": "web-app",
  "version": 2,
  "debug": false,
  "ratio": 1.0,
  "server": { "host": "0.0.0.0", "ports": [8080, 8443] },
  "owners": [{ "name": "Ada", "email": "ada@example.com" }]
}`,
  yaml: `# Service configuration
name: web-app
version: 2
debug: false
defaults: &defaults
  timeout: 30
  retries: 3
production:
  <<: *defaults
  host: example.com
tags: [api, "yes"]`,
  toml: `title = "web-app"
version = 2

[server]
host = "0.0.0.0"
ports = [8080, 8443]
started = 2024-03-15T14:30:00Z

[[owners]]
name = "Ada"`,
};

type Status =
  | { kind: "error"; message: string; line?: number; column?: number }
  | { kind: "ok"; warnings: string[] }
  | null;

export function DataFormatConverter() {
  const [from, setFrom] = useState<DataFormat>("json");
  const [to, setTo] = useState<DataFormat>("yaml");
  const [indent, setIndent] = useState<"2" | "4">("2");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  const outputId = useId();
  const fromId = useId();
  const toId = useId();

  const label = (f: DataFormat) => dataFormats.find((d) => d.value === f)!.label;

  async function run() {
    const id = ++request.current;
    setBusy(true);
    try {
      const result = await convertData(input, from, to, { indent: Number(indent) });
      if (id !== request.current) return;
      if (result.ok) {
        setOutput(result.output);
        setStatus({ kind: "ok", warnings: result.warnings });
      } else {
        setOutput("");
        setStatus({ kind: "error", message: result.error, line: result.line, column: result.column });
      }
    } catch {
      if (id === request.current) setStatus({ kind: "error", message: "The converter could not be loaded. Check your connection and try again." });
    } finally {
      if (id === request.current) setBusy(false);
    }
  }

  function reset(nextInput: string) {
    request.current++;
    setInput(nextInput);
    setOutput("");
    setStatus(null);
    setBusy(false);
  }

  function swap() {
    setFrom(to);
    setTo(from);
    reset(output);
  }

  return (
    <ShortcutScope onSubmit={run} disabled={!input.trim() || busy} className="flex flex-col gap-4">
      <ToolToolbar>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fromId}>From</Label>
          <Select id={fromId} value={from} onChange={(e) => { setFrom(e.target.value as DataFormat); setStatus(null); setOutput(""); }} className="w-32">
            {dataFormats.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </Select>
        </div>
        <Button variant="ghost" size="sm" onClick={swap} aria-label="Swap source and target formats" className="mb-0.5">
          ⇄
        </Button>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={toId}>To</Label>
          <Select id={toId} value={to} onChange={(e) => { setTo(e.target.value as DataFormat); setStatus(null); setOutput(""); }} className="w-32">
            {dataFormats.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </Select>
        </div>
        <SegmentedControl
          label="Indentation"
          value={indent}
          onChange={setIndent}
          options={[
            { value: "2", label: "2 spaces" },
            { value: "4", label: "4 spaces" },
          ]}
        />
      </ToolToolbar>

      <ToolColumns>
        <ToolPanel
          label={`${label(from)} input`}
          htmlFor={inputId}
          actions={
            <Button size="sm" variant="ghost" onClick={() => reset(SAMPLES[from])}>
              Sample
            </Button>
          }
          after={
            <ActionBar
              shortcut
              primary={
                <Button variant="primary" onClick={run} disabled={!input.trim() || busy} aria-busy={busy}>
                  {busy ? "Converting…" : `Convert to ${label(to)}`}
                </Button>
              }
              secondary={
                <Button variant="ghost" onClick={() => reset("")} disabled={!input && !output}>
                  Clear
                </Button>
              }
              status={
                status?.kind === "error" ? (
                  <Alert title={`Could not convert${status.line ? `: line ${status.line}, column ${status.column}` : ""}`}>
                    <p>{status.message}</p>
                    {status.line && status.column ? (
                      <>
                        <ErrorContext input={input} line={status.line} column={status.column} />
                        <Button size="sm" variant="ghost" className="mt-1 -ml-3" onClick={() => selectPosition(inputRef.current, status.line!, status.column!)}>
                          Go to error
                        </Button>
                      </>
                    ) : null}
                  </Alert>
                ) : status?.kind === "ok" ? (
                  <Alert tone={status.warnings.length ? "warning" : "success"} title={status.warnings.length ? "Converted, with changes to note:" : `Converted ${label(from)} to ${label(to)}.`}>
                    {status.warnings.length ? (
                      <ul className="flex list-disc flex-col gap-0.5 pl-4">
                        {status.warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    ) : null}
                  </Alert>
                ) : null
              }
            />
          }
        >
          <Textarea
            ref={inputRef}
            id={inputId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Paste ${label(from)}`}
            className="min-h-80 lg:min-h-[28rem]"
            wrap="off"
          />
        </ToolPanel>
        <ToolPanel
          label={`${label(to)} output`}
          htmlFor={outputId}
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={swap} disabled={!output}>
                Use as input
              </Button>
              <CopyButton text={output} ariaLabel={`Copy ${label(to)} output`} />
            </>
          }
        >
          <Textarea id={outputId} value={output} readOnly placeholder="The result appears here" className="min-h-80 bg-subtle lg:min-h-[28rem]" wrap="off" />
        </ToolPanel>
      </ToolColumns>

      <p className="text-sm text-muted-foreground">
        The formats do not have identical data models, so a round trip is not always exact: comments and formatting are
        not kept, TOML has no null, JSON has no dates, and YAML aliases are expanded. Anything that changes is listed
        after converting. Conversion happens in your browser.
      </p>
    </ShortcutScope>
  );
}
