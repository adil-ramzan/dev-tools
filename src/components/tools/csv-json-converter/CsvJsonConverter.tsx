"use client";

import { useId, useState } from "react";
import { ActionBar, ShortcutScope, ToolColumns, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Label, Select, Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { csvToJson, delimiterLabels, jsonToCsv, type Delimiter, type DelimiterOption } from "@/lib/tools/csv";

type Direction = "csv-to-json" | "json-to-csv";

const SAMPLES: Record<Direction, string> = {
  "csv-to-json": `id,name,city,zip,balance,active
1,"Smith, Jane",Boston,02134,1250.50,true
2,"O'Neil, Sam","New York",10001,-20,false
3,"Lee ""Lucky"" Chen",Seattle,98101,0,true`,
  "json-to-csv": `[
  { "id": 1, "name": "Smith, Jane", "tags": ["vip"], "note": "Says \\"hi\\"" },
  { "id": 2, "name": "Sam", "email": "sam@example.com", "note": null }
]`,
};

type Status =
  | { kind: "error"; title: string; detail: string }
  | { kind: "ok"; title: string; warnings: string[] }
  | null;

export function CsvJsonConverter() {
  const [direction, setDirection] = useState<Direction>("csv-to-json");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [inputDelimiter, setInputDelimiter] = useState<DelimiterOption>("auto");
  const [outputDelimiter, setOutputDelimiter] = useState<Delimiter>(",");
  const [header, setHeader] = useState(true);
  const [inferTypes, setInferTypes] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const inputId = useId();
  const outputId = useId();
  const delimiterId = useId();
  const toJson = direction === "csv-to-json";

  function convert() {
    const result = toJson
      ? csvToJson(input, inputDelimiter, { header, inferTypes })
      : jsonToCsv(input, outputDelimiter);
    if (result.ok) {
      setOutput(result.output);
      setStatus({
        kind: "ok",
        title: `Converted ${result.rows.toLocaleString()} ${result.rows === 1 ? "row" : "rows"}.`,
        warnings: result.warnings,
      });
    } else {
      setOutput("");
      const where = result.line ? `line ${result.line}, column ${result.column}` : null;
      setStatus({
        kind: "error",
        title: toJson ? `Invalid CSV${where ? `: ${where}` : ""}` : `Could not convert this JSON${where ? `: ${where}` : ""}`,
        detail: `${result.error.replace(/\.$/, "")}.`,
      });
    }
  }

  function switchDirection(next: Direction, carryOutput = false) {
    setDirection(next);
    setInput(carryOutput ? output : "");
    setOutput("");
    setStatus(null);
  }

  return (
    <ShortcutScope onSubmit={convert} disabled={!input.trim()} className="flex flex-col gap-4">
      <ToolToolbar>
        <SegmentedControl
          label="Direction"
          value={direction}
          onChange={(v) => switchDirection(v)}
          options={[
            { value: "csv-to-json", label: "CSV → JSON" },
            { value: "json-to-csv", label: "JSON → CSV" },
          ]}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={delimiterId}>{toJson ? "CSV delimiter" : "Output delimiter"}</Label>
          {toJson ? (
            <Select id={delimiterId} value={inputDelimiter} onChange={(e) => setInputDelimiter(e.target.value as DelimiterOption)} className="w-40">
              <option value="auto">Detect</option>
              {(Object.keys(delimiterLabels) as Delimiter[]).map((d) => (
                <option key={d} value={d}>
                  {delimiterLabels[d]}
                </option>
              ))}
            </Select>
          ) : (
            <Select id={delimiterId} value={outputDelimiter} onChange={(e) => setOutputDelimiter(e.target.value as Delimiter)} className="w-40">
              {(Object.keys(delimiterLabels) as Delimiter[]).map((d) => (
                <option key={d} value={d}>
                  {delimiterLabels[d]}
                </option>
              ))}
            </Select>
          )}
        </div>
        {toJson ? (
          <div className="flex flex-wrap gap-x-5 gap-y-2 pb-2">
            <Checkbox label="First row is a header" checked={header} onChange={(e) => setHeader(e.target.checked)} />
            <Checkbox label="Convert numbers and true/false" checked={inferTypes} onChange={(e) => setInferTypes(e.target.checked)} />
          </div>
        ) : null}
      </ToolToolbar>

      <ToolColumns>
        <ToolPanel
          label={toJson ? "CSV input" : "JSON input"}
          htmlFor={inputId}
          actions={
            <Button size="sm" variant="ghost" onClick={() => { setInput(SAMPLES[direction]); setOutput(""); setStatus(null); }}>
              Sample
            </Button>
          }
          after={
            <ActionBar
              shortcut
              primary={
                <Button variant="primary" onClick={convert} disabled={!input.trim()}>
                  {toJson ? "Convert to JSON" : "Convert to CSV"}
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
                ) : status?.kind === "ok" ? (
                  <Alert tone={status.warnings.length ? "warning" : "success"} title={status.title}>
                    {status.warnings.length ? (
                      <ul className="flex flex-col gap-0.5">
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
            id={inputId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={toJson ? "Paste CSV, e.g. name,email" : 'Paste a JSON array, e.g. [{"name": "Ada"}]'}
            className="min-h-80 lg:min-h-[28rem]"
            wrap="off"
          />
        </ToolPanel>
        <ToolPanel
          label={toJson ? "JSON output" : "CSV output"}
          htmlFor={outputId}
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={() => switchDirection(toJson ? "json-to-csv" : "csv-to-json", true)} disabled={!output}>
                Convert back
              </Button>
              <CopyButton text={output} ariaLabel="Copy output" />
            </>
          }
        >
          <Textarea id={outputId} value={output} readOnly placeholder="The result appears here" className="min-h-80 bg-subtle lg:min-h-[28rem]" wrap="off" />
        </ToolPanel>
      </ToolColumns>
    </ShortcutScope>
  );
}
