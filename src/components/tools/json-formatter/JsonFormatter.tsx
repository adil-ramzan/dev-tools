"use client";

import { useId, useRef, useState } from "react";
import { ActionBar, ShortcutScope, ToolColumns, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatBytes } from "@/lib/format";
import { formatJson, parseJson, type JsonError, type JsonWarning } from "@/lib/tools/json";
import { utf8Length } from "@/lib/tools/unicode";

type Indent = "2" | "4" | "tab";

const indents: Record<Indent, string> = { "2": "  ", "4": "    ", tab: "\t" };

const SAMPLE = `{"name":"Example Store","open":true,"rating":4.7,"orders":12345678901234567890,
"address":{"street":"1 Market St","city":"San Francisco","zip":"94105"},
"tags":["books","coffee"],"manager":null}`;

type Status =
  | { kind: "error"; error: JsonError }
  | { kind: "valid"; message: string; warnings: JsonWarning[] }
  | null;

export function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState<Indent>("2");
  const [sortKeys, setSortKeys] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  const outputId = useId();

  function run(mode: "format" | "minify" | "validate") {
    const result = parseJson(input);
    if (!result.ok) {
      setStatus({ kind: "error", error: result.error });
      if (mode !== "validate") setOutput("");
      return;
    }
    if (mode === "validate") {
      setStatus({ kind: "valid", message: "Valid JSON.", warnings: result.warnings });
      return;
    }
    const text = formatJson(result.value, { indent: mode === "minify" ? "" : indents[indent], sortKeys });
    setOutput(text);
    const sizes = `${formatBytes(utf8Length(input))} → ${formatBytes(utf8Length(text))}`;
    setStatus({
      kind: "valid",
      message: mode === "minify" ? `Valid JSON, minified (${sizes}).` : `Valid JSON, formatted (${sizes}).`,
      warnings: result.warnings,
    });
  }

  function showError(error: JsonError) {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(error.offset, Math.min(error.offset + 1, input.length));
  }

  function clear() {
    setInput("");
    setOutput("");
    setStatus(null);
  }

  return (
    <ShortcutScope onSubmit={() => run("format")} disabled={!input.trim()} className="flex flex-col gap-4">
      <ToolToolbar>
        <SegmentedControl
          label="Indentation"
          value={indent}
          onChange={setIndent}
          options={[
            { value: "2", label: "2 spaces" },
            { value: "4", label: "4 spaces" },
            { value: "tab", label: "Tab" },
          ]}
        />
        <Checkbox label="Sort keys A–Z" checked={sortKeys} onChange={(e) => setSortKeys(e.target.checked)} className="h-9" />
      </ToolToolbar>

      <ToolColumns>
        <ToolPanel
          label="JSON input"
          htmlFor={inputId}
          actions={
            <Button size="sm" variant="ghost" onClick={() => { setInput(SAMPLE); setStatus(null); }}>
              Sample
            </Button>
          }
          footer={input ? `${input.length.toLocaleString()} characters` : null}
          after={
            <ActionBar
              shortcut
              primary={
                <>
                  <Button variant="primary" onClick={() => run("format")} disabled={!input.trim()}>
                    Format
                  </Button>
                  <Button onClick={() => run("minify")} disabled={!input.trim()}>
                    Minify
                  </Button>
                  <Button onClick={() => run("validate")} disabled={!input.trim()}>
                    Validate
                  </Button>
                </>
              }
              secondary={
                <Button variant="ghost" onClick={clear} disabled={!input && !output && !status}>
                  Clear
                </Button>
              }
              status={
                status?.kind === "error" ? (
                  <Alert title={`Invalid JSON: line ${status.error.line}, column ${status.error.column}`}>
                    <p>{status.error.message}.</p>
                    <ErrorContext input={input} error={status.error} />
                    <Button size="sm" variant="ghost" className="mt-1 -ml-3" onClick={() => showError(status.error)}>
                      Show in input
                    </Button>
                  </Alert>
                ) : status?.kind === "valid" ? (
                  <Alert tone={status.warnings.length ? "warning" : "success"} title={status.message}>
                    {status.warnings.length ? (
                      <ul className="flex flex-col gap-0.5">
                        {status.warnings.slice(0, 5).map((w) => (
                          <li key={w.offset}>
                            Line {w.line}, column {w.column}: {w.message}.
                          </li>
                        ))}
                        {status.warnings.length > 5 ? <li>…and {status.warnings.length - 5} more.</li> : null}
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
            placeholder='Paste JSON here, e.g. {"name": "value"}'
            className="min-h-80 lg:min-h-[28rem]"
            wrap="off"
          />
        </ToolPanel>
        <ToolPanel label="Result" htmlFor={outputId} actions={<CopyButton text={output} ariaLabel="Copy result" />}>
          <Textarea
            id={outputId}
            value={output}
            readOnly
            placeholder="Formatted JSON appears here"
            className="min-h-80 bg-subtle lg:min-h-[28rem]"
            wrap="off"
          />
        </ToolPanel>
      </ToolColumns>
    </ShortcutScope>
  );
}

/** The offending line with a caret under the error column. */
function ErrorContext({ input, error }: { input: string; error: JsonError }) {
  const line = input.split("\n")[error.line - 1] ?? "";
  const start = Math.max(0, error.column - 40);
  const snippet = line.slice(start, start + 80).replace(/\t/g, " ");
  return (
    <pre aria-hidden="true" className="mt-1.5 overflow-x-auto font-mono text-xs leading-relaxed text-foreground">
      {snippet}
      {"\n"}
      <span className="text-danger">{" ".repeat(Math.max(0, error.column - 1 - start))}^</span>
    </pre>
  );
}
