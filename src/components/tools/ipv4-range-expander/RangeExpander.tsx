"use client";

import { useDeferredValue, useId, useState } from "react";
import { ActionBar, ShortcutScope, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { downloadText } from "@/lib/download";
import { DEFAULT_EXPAND_LIMIT, MAX_EXPAND_LIMIT, expandRange, formatIpv4, parseRange } from "@/lib/tools/ipv4";

const SEPARATORS = { newline: "\n", comma: ", ", space: " " } as const;

type Output = { text: string; count: number; shown: number; truncated: boolean };

export function RangeExpander() {
  const [input, setInput] = useState("");
  const [limitText, setLimitText] = useState(String(DEFAULT_EXPAND_LIMIT));
  const [hostsOnly, setHostsOnly] = useState(false);
  const [separator, setSeparator] = useState<keyof typeof SEPARATORS>("newline");
  const [output, setOutput] = useState<Output | null>(null);
  const deferred = useDeferredValue(input);
  const ids = { input: useId(), limit: useId(), separator: useId(), output: useId() };

  const limit = Number(limitText);
  const limitValid = Number.isInteger(limit) && limit >= 1 && limit <= MAX_EXPAND_LIMIT;
  const parsed = deferred.trim() ? parseRange(deferred) : null;

  /** The addresses to list, after optionally skipping the network and broadcast address of a CIDR block. */
  const bounds = parsed?.ok
    ? hostsOnly && parsed.source === "cidr" && parsed.end - parsed.start >= 3
      ? { start: parsed.start + 1, end: parsed.end - 1 }
      : { start: parsed.start, end: parsed.end }
    : null;
  const count = bounds ? bounds.end - bounds.start + 1 : 0;

  function expand() {
    const current = parseRange(input);
    if (!current.ok || !limitValid) return;
    const b = hostsOnly && current.source === "cidr" && current.end - current.start >= 3 ? { start: current.start + 1, end: current.end - 1 } : current;
    const result = expandRange(b.start, b.end, limit);
    setOutput({ text: result.addresses.join(SEPARATORS[separator]), count: result.count, shown: result.addresses.length, truncated: result.truncated });
  }

  function clear() {
    setInput("");
    setOutput(null);
  }

  const ready = Boolean(parsed?.ok) && limitValid;

  return (
    <ShortcutScope onSubmit={expand} disabled={!ready} className="flex flex-col gap-4">
      <ToolToolbar>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.limit}>Output limit</Label>
          <Input id={ids.limit} type="number" min={1} max={MAX_EXPAND_LIMIT} value={limitText} onChange={(e) => setLimitText(e.target.value)} aria-invalid={!limitValid || undefined} className="h-9 w-32" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.separator}>Separate with</Label>
          <Select id={ids.separator} value={separator} onChange={(e) => setSeparator(e.target.value as keyof typeof SEPARATORS)} className="w-36">
            <option value="newline">New lines</option>
            <option value="comma">Commas</option>
            <option value="space">Spaces</option>
          </Select>
        </div>
        <Checkbox label="Skip network and broadcast addresses (CIDR)" checked={hostsOnly} onChange={(e) => setHostsOnly(e.target.checked)} className="pb-2" />
      </ToolToolbar>
      {!limitValid ? <p className="-mt-2 text-sm text-danger">The output limit must be a whole number from 1 to {MAX_EXPAND_LIMIT.toLocaleString("en-US")}.</p> : null}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-end justify-between gap-2">
          <Label htmlFor={ids.input}>CIDR block or address range</Label>
          <Button size="sm" variant="ghost" onClick={() => { setInput("192.168.1.0/28"); setOutput(null); }}>
            Sample
          </Button>
        </div>
        <Input
          id={ids.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="10.0.0.0/24 or 10.0.0.10 - 10.0.0.50"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={parsed ? !parsed.ok : undefined}
          className="font-mono"
        />
        <ActionBar
          shortcut
          primary={
            <Button variant="primary" onClick={expand} disabled={!ready}>
              Expand
            </Button>
          }
          secondary={
            <Button variant="ghost" onClick={clear} disabled={!input && !output}>
              Clear
            </Button>
          }
          status={
            parsed && !parsed.ok ? (
              <Alert title="Check the range">{parsed.error}</Alert>
            ) : bounds ? (
              <p role="status" className="text-sm text-muted-foreground" data-estimate>
                {formatIpv4(bounds.start)} – {formatIpv4(bounds.end)}: {count.toLocaleString("en-US")} {count === 1 ? "address" : "addresses"}
                {limitValid && count > limit ? `. Only the first ${limit.toLocaleString("en-US")} will be listed.` : "."}
              </p>
            ) : null
          }
        />
      </div>

      {output?.truncated ? (
        <Alert tone="warning" title={`Showing ${output.shown.toLocaleString("en-US")} of ${output.count.toLocaleString("en-US")} addresses`}>
          The list stops at the output limit so the page stays responsive. Raise the limit (up to {MAX_EXPAND_LIMIT.toLocaleString("en-US")}) or split the range into smaller blocks.
        </Alert>
      ) : null}

      <ToolPanel
        label={output ? `${output.shown.toLocaleString("en-US")} ${output.shown === 1 ? "address" : "addresses"}` : "Addresses"}
        htmlFor={ids.output}
        actions={
          <>
            <Button size="sm" variant="ghost" disabled={!output} onClick={() => output && downloadText("ip-addresses.txt", output.text)}>
              Download
            </Button>
            <CopyButton text={output?.text ?? ""} ariaLabel="Copy addresses" />
          </>
        }
      >
        <Textarea id={ids.output} value={output?.text ?? ""} readOnly placeholder="Expanded addresses appear here" className="min-h-64 bg-subtle" />
      </ToolPanel>
    </ShortcutScope>
  );
}
