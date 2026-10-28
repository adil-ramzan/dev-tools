"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Select } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  BIT_WIDTHS,
  bases,
  bitLength,
  formatInteger,
  parseInteger,
  twosComplement,
  type Base,
  type BitWidth,
} from "@/lib/tools/base-convert";

const SAMPLES: Record<Base, string> = {
  2: "0b1111_1111_0000_0001",
  8: "0o755",
  10: "18446744073709551617",
  16: "-0x7FFF_FFFF",
};

export function IntegerBaseConverter() {
  const [input, setInput] = useState("");
  const [base, setBase] = useState<Base>(10);
  const [prefix, setPrefix] = useState(false);
  const [uppercase, setUppercase] = useState(true);
  const [group, setGroup] = useState(false);
  const [width, setWidth] = useState<"off" | `${BitWidth}`>("off");
  const deferred = useDeferredValue(input);
  const inputId = useId();
  const statusId = useId();
  const widthId = useId();

  const parsed = useMemo(() => (deferred.trim() ? parseInteger(deferred, base) : null), [deferred, base]);
  const value = parsed?.ok ? parsed.value : null;
  const twos = value !== null && width !== "off" ? twosComplement(value, Number(width) as BitWidth) : null;

  return (
    <div className="flex flex-col gap-4">
      <ToolToolbar
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setInput(SAMPLES[base])}>
              Sample
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setInput("")} disabled={!input}>
              Clear
            </Button>
          </>
        }
      >
        <SegmentedControl
          label="Input base"
          value={String(base) as `${Base}`}
          onChange={(v) => setBase(Number(v) as Base)}
          options={bases.map((b) => ({ value: String(b.base) as `${Base}`, label: `${b.label} (${b.base})` }))}
        />
      </ToolToolbar>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={inputId}>{bases.find((b) => b.base === base)!.label} integer</Label>
        <Input
          id={inputId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={base === 16 ? "e.g. 0xFF or -1a2b" : base === 2 ? "e.g. 1010 or 0b1111_0000" : base === 8 ? "e.g. 755 or 0o17" : "e.g. 255 or -9007199254740993"}
          autoComplete="off"
          spellCheck={false}
          inputMode={base === 10 || base === 8 || base === 2 ? "numeric" : "text"}
          aria-invalid={parsed ? !parsed.ok : undefined}
          aria-describedby={statusId}
          className="font-mono"
        />
        <p id={statusId} className={parsed && !parsed.ok ? "text-sm text-danger" : "text-sm text-muted-foreground"}>
          {parsed && !parsed.ok
            ? parsed.error
            : value !== null
              ? `${bitLength(value).toLocaleString("en-US")}-bit magnitude${value < BigInt(0) ? ", negative" : ""}. Results are exact for integers of any size.`
              : "Optional: a sign, a matching prefix (0b, 0o, 0x), and _ or spaces between digits."}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex flex-wrap gap-x-5 gap-y-2 pb-2">
          <Checkbox label="Prefixes (0b, 0o, 0x)" checked={prefix} onChange={(e) => setPrefix(e.target.checked)} />
          <Checkbox label="Uppercase hex" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} />
          <Checkbox label="Group digits" checked={group} onChange={(e) => setGroup(e.target.checked)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={widthId}>Two&apos;s complement</Label>
          <Select id={widthId} value={width} onChange={(e) => setWidth(e.target.value as typeof width)} className="w-40">
            <option value="off">Off</option>
            {BIT_WIDTHS.map((w) => (
              <option key={w} value={w}>
                {w}-bit signed
              </option>
            ))}
          </Select>
        </div>
      </div>

      <dl className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
        {bases.map((b) => {
          const text = value === null ? "" : formatInteger(value, b.base, { prefix, uppercase, group });
          return (
            <div key={b.base} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
              <dt className="text-sm font-medium">
                {b.label} <span className="font-mono text-xs font-normal text-muted-foreground">base {b.base}</span>
              </dt>
              <dd data-base={b.base} className="min-w-0 font-mono text-sm break-all">
                {text || <span className="text-muted-foreground">—</span>}
              </dd>
              <dd>
                <CopyButton text={text} ariaLabel={`Copy ${b.label.toLowerCase()} value`} variant="ghost" />
              </dd>
            </div>
          );
        })}
      </dl>

      {twos ? (
        twos.ok ? (
          <dl className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
            <div className="grid gap-1 px-3 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
              <dt className="text-sm font-medium">{width}-bit binary</dt>
              <dd data-twos="binary" className="min-w-0 font-mono text-sm break-all">{twos.binary}</dd>
              <dd><CopyButton text={twos.binary.replace(/ /g, "")} ariaLabel="Copy two's complement binary" variant="ghost" /></dd>
            </div>
            <div className="grid gap-1 px-3 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
              <dt className="text-sm font-medium">{width}-bit hex</dt>
              <dd data-twos="hex" className="min-w-0 font-mono text-sm break-all">{twos.hex}</dd>
              <dd><CopyButton text={twos.hex} ariaLabel="Copy two's complement hex" variant="ghost" /></dd>
            </div>
          </dl>
        ) : (
          <Alert tone="warning" title="Out of range for two's complement">{twos.error}</Alert>
        )
      ) : null}
    </div>
  );
}
