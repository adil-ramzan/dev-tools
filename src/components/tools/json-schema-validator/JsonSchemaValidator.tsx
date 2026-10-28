"use client";

import { useId, useRef, useState } from "react";
import { ErrorContext, selectPosition } from "@/components/tools/ErrorContext";
import { ActionBar, ShortcutScope, ToolColumns, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Label, Select, Textarea } from "@/components/ui/Field";
import { draftLabels, type DraftOption, type SchemaValidationResult } from "@/lib/tools/json-schema";
import { runInWorker } from "@/lib/worker";

const TIMEOUT_MS = 3000;

const SAMPLE_SCHEMA = `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "User",
  "type": "object",
  "required": ["id", "email", "roles"],
  "properties": {
    "id": { "type": "integer", "minimum": 1 },
    "email": { "type": "string", "format": "email" },
    "name": { "type": "string", "minLength": 1 },
    "roles": {
      "type": "array",
      "items": { "enum": ["admin", "editor", "viewer"] },
      "uniqueItems": true
    },
    "address": {
      "type": "object",
      "properties": {
        "zip": { "type": "string", "pattern": "^[0-9]{5}$" }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}`;

const SAMPLE_DATA = `{
  "id": 0,
  "email": "ada.example.com",
  "roles": ["admin", "owner"],
  "address": { "zip": "9410", "country": "US" },
  "nickname": "ada"
}`;

type View =
  | { kind: "result"; result: SchemaValidationResult }
  | { kind: "timeout" }
  | { kind: "failed" }
  | null;

export function JsonSchemaValidator() {
  const [schema, setSchema] = useState("");
  const [data, setData] = useState("");
  const [draft, setDraft] = useState<DraftOption>("auto");
  const [view, setView] = useState<View>(null);
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const schemaRef = useRef<HTMLTextAreaElement>(null);
  const dataRef = useRef<HTMLTextAreaElement>(null);
  const schemaId = useId();
  const dataId = useId();
  const draftId = useId();

  async function validate() {
    const id = ++request.current;
    setBusy(true);
    const outcome = await runInWorker<SchemaValidationResult>(
      () => new Worker(new URL("./json-schema.worker.ts", import.meta.url)),
      { schema, data, draft },
      TIMEOUT_MS,
    );
    if (id !== request.current) return;
    setBusy(false);
    setView(outcome.ok ? { kind: "result", result: outcome.data } : { kind: outcome.reason === "timeout" ? "timeout" : "failed" });
  }

  function reset() {
    request.current++;
    setBusy(false);
    setView(null);
  }

  const result = view?.kind === "result" ? view.result : null;
  const report =
    result?.ok && !result.valid
      ? result.errors
          .map((e) => [`${e.path}: ${e.message} (${e.schemaPath})`, ...e.details.map((d) => `  - ${d}`)].join("\n"))
          .join("\n")
      : "";

  return (
    <ShortcutScope onSubmit={validate} disabled={!schema.trim() || !data.trim() || busy} className="flex flex-col gap-4">
      <ToolToolbar>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={draftId}>Schema version</Label>
          <Select id={draftId} value={draft} onChange={(e) => setDraft(e.target.value as DraftOption)} className="w-56">
            <option value="auto">Detect from $schema</option>
            {(Object.keys(draftLabels) as Exclude<DraftOption, "auto">[]).map((d) => (
              <option key={d} value={d}>
                {draftLabels[d]}
              </option>
            ))}
          </Select>
        </div>
      </ToolToolbar>

      <ToolColumns>
        <ToolPanel
          label="JSON Schema"
          htmlFor={schemaId}
          actions={
            <Button size="sm" variant="ghost" onClick={() => { setSchema(SAMPLE_SCHEMA); setData(SAMPLE_DATA); reset(); }}>
              Sample
            </Button>
          }
        >
          <Textarea ref={schemaRef} id={schemaId} value={schema} onChange={(e) => setSchema(e.target.value)} placeholder='{"type": "object", "required": ["id"]}' className="min-h-80 lg:min-h-[26rem]" wrap="off" />
        </ToolPanel>
        <ToolPanel label="JSON data" htmlFor={dataId}>
          <Textarea ref={dataRef} id={dataId} value={data} onChange={(e) => setData(e.target.value)} placeholder='{"id": 1}' className="min-h-80 lg:min-h-[26rem]" wrap="off" />
        </ToolPanel>
      </ToolColumns>

      <ActionBar
        shortcut
        primary={
          <Button variant="primary" onClick={validate} disabled={!schema.trim() || !data.trim() || busy}>
                      {busy ? "Validating…" : "Validate"}
                    </Button>
        }
        secondary={
          <>
            <Button variant="ghost" onClick={() => { setSchema(""); setData(""); reset(); }} disabled={!schema && !data}>
              Clear
            </Button>
          </>
        }
      />

      {view?.kind === "timeout" ? (
        <Alert title={`Validation stopped after ${TIMEOUT_MS / 1000} seconds`}>
          The schema took too long to check against this data, usually because a pattern causes catastrophic
          backtracking. Simplify the pattern keywords in the schema and try again.
        </Alert>
      ) : view?.kind === "failed" ? (
        <Alert title="Validation failed">The validator could not run. Reload the page and try again.</Alert>
      ) : result && !result.ok ? (
        <Alert title={`${result.input === "schema" ? "Schema" : "JSON data"} problem${result.error.line ? `: line ${result.error.line}, column ${result.error.column}` : ""}`}>
          <p>{result.error.message.replace(/\.?$/, ".")}</p>
          {result.error.line ? (
            <>
              <ErrorContext input={result.input === "schema" ? schema : data} line={result.error.line} column={result.error.column!} />
              <Button
                size="sm"
                variant="ghost"
                className="mt-1 -ml-3"
                onClick={() => selectPosition(result.input === "schema" ? schemaRef.current : dataRef.current, result.error.line!, result.error.column!)}
              >
                Show in input
              </Button>
            </>
          ) : null}
        </Alert>
      ) : result?.ok && result.valid ? (
        <Alert tone="success" title={`Valid: the data matches the schema (${draftLabels[result.draft]}).`}>
          {result.warnings.length ? result.warnings.join(" ") : null}
        </Alert>
      ) : null}

      {result?.ok && !result.valid ? (
        <section aria-labelledby={`${draftId}-errors`} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id={`${draftId}-errors`} role="status" className="text-sm font-medium text-danger">
              Invalid: {result.errors.length} {result.errors.length === 1 ? "problem" : "problems"} found ({draftLabels[result.draft]})
            </h2>
            <CopyButton text={report} label="Copy report" />
          </div>
          {result.warnings.length ? <p className="text-sm text-muted-foreground">{result.warnings.join(" ")}</p> : null}
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-subtle text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Location in data</th>
                  <th scope="col" className="px-3 py-2 font-medium">Problem</th>
                  <th scope="col" className="px-3 py-2 font-medium">Schema rule</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((error, i) => (
                  <tr key={i} className="border-t border-border align-top">
                    <td className="min-w-32 px-3 py-2 font-mono break-all">{error.path}</td>
                    <td className="min-w-56 px-3 py-2">
                      {error.message}
                      {error.details.length ? (
                        <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-4 text-muted-foreground">
                          {error.details.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                    <td className="min-w-40 px-3 py-2 font-mono text-xs break-all text-muted-foreground">{error.schemaPath}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

    </ShortcutScope>
  );
}
