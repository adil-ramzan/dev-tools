"use client";

import { useId, useRef, useState } from "react";
import { ActionBar, ShortcutScope, ToolColumns, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Label, Select, Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatSql, sqlDialects, type SqlDialect, type SqlIndent, type SqlKeywordCase } from "@/lib/tools/sql";

const SAMPLE = `select o.id, c.name as customer, sum(i.quantity * i.unit_price) as total, 'paid' as status
from orders o join customers c on c.id = o.customer_id
left join order_items i on i.order_id = o.id -- include orders without items
where o.created_at >= '2024-01-01' and c.country in ('US', 'CA') and c.name not like 'Test%'
group by o.id, c.name having sum(i.quantity) > 0 order by total desc limit 50;`;

export function SqlFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [dialect, setDialect] = useState<SqlDialect>("sql");
  const [indent, setIndent] = useState<SqlIndent>("2");
  const [keywordCase, setKeywordCase] = useState<SqlKeywordCase>("upper");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const inputId = useId();
  const outputId = useId();
  const dialectId = useId();

  async function run(options = { dialect, indent, keywordCase }) {
    const id = ++request.current;
    setBusy(true);
    try {
      const result = await formatSql(input, options);
      if (id !== request.current) return;
      if (result.ok) {
        setOutput(result.output);
        setError(null);
      } else {
        setOutput("");
        setError(result.error);
      }
    } catch {
      if (id === request.current) setError("The SQL formatter could not be loaded. Check your connection and try again.");
    } finally {
      if (id === request.current) setBusy(false);
    }
  }

  /** Re-format with new options when there is already a result. */
  function update<K extends "dialect" | "indent" | "keywordCase">(key: K, value: { dialect: SqlDialect; indent: SqlIndent; keywordCase: SqlKeywordCase }[K]) {
    const next = { dialect, indent, keywordCase, [key]: value };
    if (key === "dialect") setDialect(value as SqlDialect);
    if (key === "indent") setIndent(value as SqlIndent);
    if (key === "keywordCase") setKeywordCase(value as SqlKeywordCase);
    if (output || error) void run(next);
  }

  function reset() {
    request.current++;
    setOutput("");
    setError(null);
    setBusy(false);
  }

  return (
    <ShortcutScope onSubmit={() => run()} disabled={!input.trim() || busy} className="flex flex-col gap-4">
      <ToolToolbar>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={dialectId}>Dialect</Label>
          <Select id={dialectId} value={dialect} onChange={(e) => update("dialect", e.target.value as SqlDialect)} className="w-56">
            {sqlDialects.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </div>
        <SegmentedControl
          label="Indentation"
          value={indent}
          onChange={(v) => update("indent", v)}
          options={[
            { value: "2", label: "2 spaces" },
            { value: "4", label: "4 spaces" },
            { value: "tab", label: "Tab" },
          ]}
        />
        <SegmentedControl
          label="Keywords"
          value={keywordCase}
          onChange={(v) => update("keywordCase", v)}
          options={[
            { value: "upper", label: "UPPER" },
            { value: "lower", label: "lower" },
            { value: "preserve", label: "As written" },
          ]}
        />
      </ToolToolbar>

      <ToolColumns>
        <ToolPanel
          label="SQL input"
          htmlFor={inputId}
          actions={
            <Button size="sm" variant="ghost" onClick={() => { setInput(SAMPLE); reset(); }}>
              Sample
            </Button>
          }
          after={
            <ActionBar
              shortcut
              primary={
                <Button variant="primary" onClick={() => run()} disabled={!input.trim() || busy} aria-busy={busy}>
                  {busy ? "Formatting…" : "Format SQL"}
                </Button>
              }
              secondary={
                <Button variant="ghost" onClick={() => { setInput(""); reset(); }} disabled={!input && !output}>
                  Clear
                </Button>
              }
              status={
                error ? <Alert title="Could not format this SQL">{error}</Alert> : null
              }
            />
          }
        >
          <Textarea id={inputId} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste one or more SQL statements" className="min-h-80 lg:min-h-[28rem]" wrap="off" />
        </ToolPanel>
        <ToolPanel label="Formatted SQL" htmlFor={outputId} actions={<CopyButton text={output} ariaLabel="Copy formatted SQL" />}>
          <Textarea id={outputId} value={output} readOnly placeholder="Formatted SQL appears here" className="min-h-80 bg-subtle lg:min-h-[28rem]" wrap="off" />
        </ToolPanel>
      </ToolColumns>
    </ShortcutScope>
  );
}
