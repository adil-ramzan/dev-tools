"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { ToolColumns, ToolPanel } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  defaultListOptions,
  processList,
  type CaseMode,
  type ColumnDelimiter,
  type ItemSeparator,
  type ListMode,
  type ListOptions,
  type OutputSeparator,
  type SortMode,
} from "@/lib/tools/list";

const SAMPLES: Record<ListMode, string> = {
  lines: `banana
  Apple
cherry
apple

item10
item9
banana`,
  columns: `name\tlanguage\tyear
Ada\tJavaScript\t2015
Lin\tPython\t1991
Bo\tGo\t2009`,
};

/** Text field for an optional whole number; empty means "no limit". */
function parseOptional(text: string): number | null | "invalid" {
  if (text.trim() === "") return null;
  const n = Number(text);
  return Number.isInteger(n) && n >= 0 ? n : "invalid";
}

export function ListConverter() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<ListOptions>(defaultListOptions);
  const [limitText, setLimitText] = useState("");
  const [lengthText, setLengthText] = useState("");
  const deferredInput = useDeferredValue(input);
  const ids = { input: useId(), output: useId(), separator: useId(), custom: useId(), delimiter: useId(), sort: useId(), column: useId(), caseMode: useId(), prefix: useId(), suffix: useId(), limit: useId(), length: useId(), join: useId(), customJoin: useId() };

  const set = <K extends keyof ListOptions>(key: K, value: ListOptions[K]) => setOptions((o) => ({ ...o, [key]: value }));

  const limit = parseOptional(limitText);
  const maxLength = parseOptional(lengthText);
  const result = useMemo(() => {
    if (limit === "invalid") return { ok: false as const, error: "Keep first N rows must be a whole number of 0 or more." };
    if (maxLength === "invalid" || maxLength === 0) return { ok: false as const, error: "Maximum item length must be a whole number of 1 or more." };
    return processList(deferredInput, { ...options, limit, maxLength });
  }, [deferredInput, options, limit, maxLength]);
  const output = result.ok ? result.output : "";
  const columns = options.mode === "columns";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <SegmentedControl
            label="Input"
            value={options.mode}
            onChange={(v) => set("mode", v)}
            options={[
              { value: "lines", label: "List" },
              { value: "columns", label: "Columns" },
            ]}
          />
          {columns ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.delimiter}>Column delimiter</Label>
              <Select id={ids.delimiter} value={options.delimiter} onChange={(e) => set("delimiter", e.target.value as ColumnDelimiter)} className="w-36">
                <option value="tab">Tab</option>
                <option value="comma">Comma</option>
                <option value="semicolon">Semicolon</option>
                <option value="pipe">Pipe</option>
              </Select>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={ids.separator}>Items separated by</Label>
                <Select id={ids.separator} value={options.separator} onChange={(e) => set("separator", e.target.value as ItemSeparator)} className="w-36">
                  <option value="newline">New line</option>
                  <option value="comma">Comma</option>
                  <option value="semicolon">Semicolon</option>
                  <option value="tab">Tab</option>
                  <option value="space">Spaces</option>
                  <option value="custom">Custom</option>
                </Select>
              </div>
              {options.separator === "custom" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={ids.custom}>Custom separator</Label>
                  <Input id={ids.custom} value={options.customSeparator} onChange={(e) => set("customSeparator", e.target.value)} className="h-9 w-24 font-mono" />
                </div>
              ) : null}
            </>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.sort}>Sort</Label>
            <Select id={ids.sort} value={options.sort} onChange={(e) => set("sort", e.target.value as SortMode)} className="w-44">
              <option value="none">Keep order</option>
              <option value="alpha">Alphabetical</option>
              <option value="natural">Natural (2 before 10)</option>
              <option value="numeric">Numeric value</option>
              <option value="length">Length</option>
            </Select>
          </div>
          {columns && options.sort !== "none" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.column}>Sort by column</Label>
              <Input
                id={ids.column}
                type="number"
                min={0}
                value={options.sortColumn || ""}
                placeholder="Whole row"
                onChange={(e) => set("sortColumn", Math.max(0, Math.trunc(Number(e.target.value)) || 0))}
                className="h-9 w-28"
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.caseMode}>Case</Label>
            <Select id={ids.caseMode} value={options.caseMode} onChange={(e) => set("caseMode", e.target.value as CaseMode)} className="w-36">
              <option value="none">Unchanged</option>
              <option value="lower">lowercase</option>
              <option value="upper">UPPERCASE</option>
              <option value="title">Title Case</option>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Checkbox label="Trim whitespace" checked={options.trim} onChange={(e) => set("trim", e.target.checked)} />
          <Checkbox label="Remove empty lines" checked={options.removeEmpty} onChange={(e) => set("removeEmpty", e.target.checked)} />
          <Checkbox label="Remove duplicates" checked={options.dedupe} onChange={(e) => set("dedupe", e.target.checked)} />
          <Checkbox label="Ignore case when comparing" checked={options.ignoreCase} onChange={(e) => set("ignoreCase", e.target.checked)} />
          <Checkbox label="Descending" checked={options.descending} disabled={options.sort === "none"} onChange={(e) => set("descending", e.target.checked)} />
          <Checkbox label="Reverse order" checked={options.reverse} onChange={(e) => set("reverse", e.target.checked)} />
          {columns ? <Checkbox label="Transpose rows and columns" checked={options.transpose} onChange={(e) => set("transpose", e.target.checked)} /> : null}
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.prefix}>Prefix</Label>
            <Input id={ids.prefix} value={options.prefix} onChange={(e) => set("prefix", e.target.value)} className="h-9 w-28 font-mono" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.suffix}>Suffix</Label>
            <Input id={ids.suffix} value={options.suffix} onChange={(e) => set("suffix", e.target.value)} className="h-9 w-28 font-mono" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.limit}>Keep first N rows</Label>
            <Input id={ids.limit} type="number" min={0} value={limitText} placeholder="All" onChange={(e) => setLimitText(e.target.value)} aria-invalid={limit === "invalid"} className="h-9 w-28" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.length}>Max item length</Label>
            <Input id={ids.length} type="number" min={1} value={lengthText} placeholder="No limit" onChange={(e) => setLengthText(e.target.value)} aria-invalid={maxLength === "invalid" || maxLength === 0} className="h-9 w-28" />
          </div>
          {columns ? null : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={ids.join}>Join output with</Label>
                <Select id={ids.join} value={options.output} onChange={(e) => set("output", e.target.value as OutputSeparator)} className="w-36">
                  <option value="newline">New line</option>
                  <option value="comma">Comma</option>
                  <option value="comma-space">Comma + space</option>
                  <option value="semicolon">Semicolon</option>
                  <option value="tab">Tab</option>
                  <option value="space">Space</option>
                  <option value="custom">Custom</option>
                </Select>
              </div>
              {options.output === "custom" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={ids.customJoin}>Custom joiner</Label>
                  <Input id={ids.customJoin} value={options.customOutput} onChange={(e) => set("customOutput", e.target.value)} className="h-9 w-24 font-mono" />
                </div>
              ) : null}
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => { setOptions(defaultListOptions); setLimitText(""); setLengthText(""); }}>
            Reset options
          </Button>
        </div>
      </div>

      {!result.ok ? <Alert title="Check the options">{result.error}</Alert> : null}
      {result.ok && result.warnings.length ? (
        <Alert tone="warning" title="Note">
          {result.warnings.join(" ")}
        </Alert>
      ) : null}

      <ToolColumns>
        <ToolPanel
          label="Input"
          htmlFor={ids.input}
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={() => setInput(SAMPLES[options.mode])}>
                Sample
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setInput("")} disabled={!input}>
                Clear
              </Button>
            </>
          }
          footer="Empty lines and whitespace are kept unless you choose to remove them."
        >
          <Textarea id={ids.input} value={input} onChange={(e) => setInput(e.target.value)} placeholder={columns ? "One row per line, cells separated by the delimiter" : "One item per line"} className="min-h-80" wrap="off" />
        </ToolPanel>
        <ToolPanel
          label="Output"
          htmlFor={ids.output}
          actions={<CopyButton text={output} ariaLabel="Copy list output" />}
          footer={
            result.ok && input ? (
              <span role="status">
                {result.stats.inputRows.toLocaleString("en-US")} in → {result.stats.outputRows.toLocaleString("en-US")} out
                {result.stats.removedEmpty ? ` · ${result.stats.removedEmpty.toLocaleString("en-US")} empty removed` : ""}
                {result.stats.removedDuplicates ? ` · ${result.stats.removedDuplicates.toLocaleString("en-US")} duplicates removed` : ""}
                {result.stats.truncated ? ` · ${result.stats.truncated.toLocaleString("en-US")} truncated` : ""}
              </span>
            ) : null
          }
        >
          <Textarea id={ids.output} value={output} readOnly placeholder="The result appears here" className="min-h-80 bg-subtle" wrap="off" />
        </ToolPanel>
      </ToolColumns>
    </div>
  );
}
