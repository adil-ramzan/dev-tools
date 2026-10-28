"use client";

import { useDeferredValue, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Select } from "@/components/ui/Field";
import { addressType, formatIpv4, parseAnyIpv4, toBinary, toHex, type Representation } from "@/lib/tools/ipv4";

const SAMPLES = ["192.168.1.1", "3232235777", "0xC0A80101", "11000000.10101000.00000001.00000001"];

const LABELS: Record<Representation, string> = { dotted: "Dotted decimal", integer: "Integer", hex: "Hexadecimal", binary: "Binary" };

export function Ipv4Converter() {
  const [input, setInput] = useState("");
  const [as, setAs] = useState<Representation | "auto">("auto");
  const [sample, setSample] = useState(0);
  const deferred = useDeferredValue(input);
  const ids = { input: useId(), as: useId(), status: useId() };

  const result = deferred.trim() ? parseAnyIpv4(deferred, as) : null;
  const value = result?.ok ? result.value : null;
  const rows: [Representation, string][] =
    value === null
      ? []
      : [
          ["dotted", formatIpv4(value)],
          ["integer", String(value)],
          ["hex", toHex(value)],
          ["binary", toBinary(value)],
        ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor={ids.input}>IPv4 address in any form</Label>
            <Input
              id={ids.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="192.168.1.1, 3232235777, 0xC0A80101 or binary"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={result ? !result.ok : undefined}
              aria-describedby={ids.status}
              className="font-mono"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.as}>Read as</Label>
            <Select id={ids.as} value={as} onChange={(e) => setAs(e.target.value as Representation | "auto")} className="w-44">
              <option value="auto">Detect</option>
              {(Object.keys(LABELS) as Representation[]).map((r) => (
                <option key={r} value={r}>{LABELS[r]}</option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setInput(SAMPLES[sample % SAMPLES.length]); setSample((s) => s + 1); }}>
              Sample
            </Button>
            <Button variant="ghost" onClick={() => { setInput(""); setAs("auto"); }} disabled={!input && as === "auto"}>
              Clear
            </Button>
          </div>
        </div>
        <p id={ids.status} role="status" className={result && !result.ok ? "text-sm text-danger" : "text-sm text-muted-foreground"}>
          {result && !result.ok ? result.error : result?.ok ? `Read as ${LABELS[result.detected].toLowerCase()} · ${addressType(result.value).label} address` : "Results update as you type."}
        </p>
      </div>

      {rows.length ? (
        <dl className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
          {rows.map(([kind, text]) => (
            <div key={kind} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">{LABELS[kind]}</dt>
              <dd data-format={kind} className="col-start-1 font-mono text-base break-all">{text}</dd>
              <dd className="col-start-2 row-span-2 row-start-1">
                <CopyButton text={text} ariaLabel={`Copy ${LABELS[kind].toLowerCase()}`} variant="ghost" />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
