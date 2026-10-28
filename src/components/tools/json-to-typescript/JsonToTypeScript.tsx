"use client";

import { useId, useState } from "react";
import { ActionBar, ShortcutScope, ToolColumns, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { jsonToTypeScript, type TsOptions } from "@/lib/tools/json-to-ts";

const SAMPLE = `{
  "id": 1024,
  "username": "ada",
  "email": "ada@example.com",
  "verified": true,
  "profile": { "displayName": "Ada Lovelace", "avatarUrl": null },
  "roles": ["admin", "editor"],
  "orders": [
    { "id": "A-1", "total": 42.5, "items": [{ "sku": "BOOK-1", "quantity": 1 }] },
    { "id": "A-2", "total": 18, "items": [], "couponCode": "WELCOME" }
  ]
}`;

type Status = { kind: "error"; title: string; detail: string } | { kind: "ok"; warnings: string[] } | null;

export function JsonToTypeScript() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [options, setOptions] = useState<TsOptions>({ rootName: "Root", declaration: "interface", optional: "inferred", exportTypes: true });
  const [status, setStatus] = useState<Status>(null);
  const inputId = useId();
  const outputId = useId();
  const nameId = useId();

  function generate(next: TsOptions = options, json = input) {
    const result = jsonToTypeScript(json, next);
    if (result.ok) {
      setOutput(result.output);
      setStatus({ kind: "ok", warnings: result.warnings });
    } else {
      setOutput("");
      setStatus(
        typeof result.error === "string"
          ? { kind: "error", title: "Could not generate types", detail: result.error }
          : { kind: "error", title: `Invalid JSON: line ${result.error.line}, column ${result.error.column}`, detail: `${result.error.message}.` },
      );
    }
  }

  function update(patch: Partial<TsOptions>) {
    const next = { ...options, ...patch };
    setOptions(next);
    if (output) generate(next);
  }

  return (
    <ShortcutScope onSubmit={() => generate()} disabled={!input.trim()} className="flex flex-col gap-4">
      <ToolToolbar>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={nameId}>Root type name</Label>
          <Input id={nameId} value={options.rootName} onChange={(e) => update({ rootName: e.target.value })} className="h-9 w-40 font-mono" autoComplete="off" spellCheck={false} />
        </div>
        <SegmentedControl
          label="Declare as"
          value={options.declaration}
          onChange={(declaration) => update({ declaration })}
          options={[
            { value: "interface", label: "interface" },
            { value: "type", label: "type" },
          ]}
        />
        <SegmentedControl
          label="Optional properties"
          value={options.optional}
          onChange={(optional) => update({ optional })}
          options={[
            { value: "inferred", label: "When missing" },
            { value: "all", label: "All" },
          ]}
        />
        <Checkbox label="export" checked={options.exportTypes} onChange={(e) => update({ exportTypes: e.target.checked })} className="h-9 font-mono" />
      </ToolToolbar>

      <ToolColumns>
        <ToolPanel
          label="JSON sample"
          htmlFor={inputId}
          actions={
            <Button size="sm" variant="ghost" onClick={() => { setInput(SAMPLE); generate(options, SAMPLE); }}>
              Sample
            </Button>
          }
          after={
            <ActionBar
              shortcut
              primary={
                <Button variant="primary" onClick={() => generate()} disabled={!input.trim()}>
                  Generate types
                </Button>
              }
              secondary={
                <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setStatus(null); }} disabled={!input && !output}>
                  Clear
                </Button>
              }
              status={
                status?.kind === "error" ? (
                  <Alert title={status.title}>{status.detail}</Alert>
                ) : status?.kind === "ok" && status.warnings.length ? (
                  <Alert tone="warning" title="Generated, with notes">
                    <ul className="flex flex-col gap-0.5">
                      {status.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </Alert>
                ) : null
              }
            />
          }
        >
          <Textarea id={inputId} value={input} onChange={(e) => setInput(e.target.value)} placeholder='Paste JSON, e.g. {"id": 1, "name": "Ada"}' className="min-h-80 lg:min-h-[28rem]" wrap="off" />
        </ToolPanel>
        <ToolPanel label="TypeScript" htmlFor={outputId} actions={<CopyButton text={output} ariaLabel="Copy TypeScript" />}>
          <Textarea id={outputId} value={output} readOnly placeholder="TypeScript declarations appear here" className="min-h-80 bg-subtle lg:min-h-[28rem]" wrap="off" />
        </ToolPanel>
      </ToolColumns>
    </ShortcutScope>
  );
}
