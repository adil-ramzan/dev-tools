"use client";

import { useEffect, useId, useState } from "react";
import { ShortcutScope, ToolPanel } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { COMMON_PORTS, DEFAULT_SETTINGS, MAX_PORT, MAX_PORTS, RANGES, commonPortName, generatePorts, planPorts, type PortSettings } from "@/lib/tools/ports";

type Form = { min: string; max: string; count: string; unique: boolean; excludeWellKnown: boolean; excludeCommon: boolean; excludeDynamic: boolean; custom: string };

const DEFAULT_FORM: Form = { ...DEFAULT_SETTINGS, min: String(DEFAULT_SETTINGS.min), max: String(DEFAULT_SETTINGS.max), count: String(DEFAULT_SETTINGS.count) };

const PRESETS: { label: string; range: [number, number] }[] = [
  { label: "Registered", range: RANGES.registered },
  { label: "Dynamic", range: RANGES.dynamic },
  { label: "All", range: [0, MAX_PORT] },
];

function toSettings(f: Form): PortSettings {
  const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
  return { ...f, min: num(f.min), max: num(f.max), count: num(f.count) };
}

export function PortGenerator() {
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const [ports, setPorts] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const ids = { min: useId(), max: useId(), count: useId(), custom: useId(), output: useId(), status: useId() };

  const plan = planPorts(toSettings(form));
  const output = ports.join("\n");
  const common = ports.filter((p) => commonPortName(p) !== null);

  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  function apply(result: ReturnType<typeof generatePorts>) {
    if (result.ok) {
      setPorts(result.ports);
      setError(null);
    } else {
      setError(result.error);
    }
  }

  const generate = () => apply(generatePorts(toSettings(form)));

  // Draw the first ports in the browser after hydration, never on the server.
  useEffect(() => {
    const handle = window.setTimeout(() => apply(generatePorts(toSettings(DEFAULT_FORM))), 0);
    return () => window.clearTimeout(handle);
  }, []);

  const isDefault = JSON.stringify(form) === JSON.stringify(DEFAULT_FORM);

  return (
    <ShortcutScope onSubmit={generate} disabled={!plan.ok} className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.min}>Lowest port</Label>
            <Input id={ids.min} type="number" inputMode="numeric" min={0} max={MAX_PORT} value={form.min} onChange={(e) => set("min")(e.target.value)} aria-describedby={ids.status} className="w-28" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.max}>Highest port</Label>
            <Input id={ids.max} type="number" inputMode="numeric" min={0} max={MAX_PORT} value={form.max} onChange={(e) => set("max")(e.target.value)} aria-describedby={ids.status} className="w-28" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.count}>How many</Label>
            <Input id={ids.count} type="number" inputMode="numeric" min={1} max={MAX_PORTS} value={form.count} onChange={(e) => set("count")(e.target.value)} aria-describedby={ids.status} className="w-24" />
          </div>
          <Checkbox label="No repeats" checked={form.unique} onChange={(e) => set("unique")(e.target.checked)} className="pb-2" />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Range:</span>
          {PRESETS.map(({ label, range: [a, b] }) => (
            <Button key={label} size="sm" variant="ghost" onClick={() => setForm((f) => ({ ...f, min: String(a), max: String(b) }))}>
              {label} {a}–{b}
            </Button>
          ))}
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">Exclude</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Checkbox label="Well-known ports (0–1023)" checked={form.excludeWellKnown} onChange={(e) => set("excludeWellKnown")(e.target.checked)} />
            <Checkbox label={`Common service ports (${COMMON_PORTS.length})`} checked={form.excludeCommon} onChange={(e) => set("excludeCommon")(e.target.checked)} />
            <Checkbox label="Dynamic ports (49152–65535)" checked={form.excludeDynamic} onChange={(e) => set("excludeDynamic")(e.target.checked)} />
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <Label htmlFor={ids.custom}>Also exclude (ports or ranges)</Label>
            <Input id={ids.custom} value={form.custom} onChange={(e) => set("custom")(e.target.value)} placeholder="8000-8100, 9229" autoComplete="off" spellCheck={false} aria-describedby={ids.status} className="font-mono sm:max-w-md" />
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={generate} disabled={!plan.ok}>
            {ports.length ? "Generate again" : "Generate"}
          </Button>
          <kbd className="hidden font-sans text-xs text-muted-foreground sm:inline" aria-hidden="true">
            Ctrl/⌘ + Enter
          </kbd>
          <Button variant="ghost" className="ml-auto" onClick={() => setForm(DEFAULT_FORM)} disabled={isDefault}>
            Reset settings
          </Button>
        </div>
        <p id={ids.status} role="status" className={plan.ok ? "text-sm text-muted-foreground" : "text-sm text-danger"} data-port-plan>
          {plan.ok ? `${plan.size.toLocaleString("en-US")} ${plan.size === 1 ? "port is" : "ports are"} allowed. Each is equally likely.` : plan.error}
        </p>
      </div>

      {error ? <Alert title="Could not generate ports">{error}</Alert> : null}

      <ToolPanel
        label={ports.length ? `${ports.length} ${ports.length === 1 ? "port" : "ports"}` : "Ports"}
        htmlFor={ids.output}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setPorts([])} disabled={!ports.length}>
              Clear
            </Button>
            <CopyButton text={output} label={ports.length > 1 ? "Copy all" : "Copy"} ariaLabel="Copy all ports" />
          </>
        }
      >
        <Textarea id={ids.output} value={output} readOnly placeholder="Select Generate to draw random ports." className="bg-subtle font-mono" rows={Math.min(Math.max(ports.length, 5), 14)} />
      </ToolPanel>

      {common.length ? (
        <Alert tone="warning" title="Some ports are commonly used">
          {common.map((p) => `${p} (${commonPortName(p)})`).join(", ")}. Turn on Exclude common service ports to avoid them.
        </Alert>
      ) : null}

      <Notice tone="info" title="A random port is not guaranteed to be free.">
        This page cannot see which ports are in use on your machine. Check before using one, for example with <code className="font-mono">ss -ltn</code> on Linux, <code className="font-mono">lsof -i :PORT</code> on macOS or <code className="font-mono">netstat -ano</code> on Windows, or let your program bind to port 0 so the operating system picks a free one.
      </Notice>
    </ShortcutScope>
  );
}
