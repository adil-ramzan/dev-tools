"use client";

import { useId, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import {
  PRESETS,
  WHO,
  explain,
  parseOctal,
  parsePermissions,
  toChmodSymbolic,
  toOctal,
  toSymbolic,
  warnings,
  type Bits,
  type Permissions,
} from "@/lib/tools/chmod";

const INITIAL = "644";
const initialPermissions = () => (parseOctal(INITIAL) as { ok: true; permissions: Permissions }).permissions;

const WHO_LABELS = { owner: "Owner (u)", group: "Group (g)", others: "Others (o)" } as const;
const BIT_LABELS: { key: keyof Bits; label: string }[] = [
  { key: "read", label: "Read" },
  { key: "write", label: "Write" },
  { key: "execute", label: "Execute" },
];
const SPECIAL: { key: "setuid" | "setgid" | "sticky"; label: string }[] = [
  { key: "setuid", label: "Setuid" },
  { key: "setgid", label: "Setgid" },
  { key: "sticky", label: "Sticky" },
];

export function ChmodCalculator() {
  const [permissions, setPermissions] = useState<Permissions>(initialPermissions);
  const [text, setText] = useState(INITIAL);
  const [target, setTarget] = useState<"file" | "directory">("file");
  const [fileName, setFileName] = useState("file");
  const ids = { text: useId(), status: useId(), name: useId() };

  const parsed = text.trim() ? parsePermissions(text) : null;
  const octal = toOctal(permissions);
  const symbolic = toSymbolic(permissions);
  const chmodSymbolic = toChmodSymbolic(permissions);
  const name = fileName.trim() || "file";
  const quoted = /^[\w./-]+$/.test(name) ? name : `'${name.replace(/'/g, `'\\''`)}'`;
  const lines = explain(permissions, target);
  const notes = warnings(permissions);

  function onText(value: string) {
    setText(value);
    const result = value.trim() ? parsePermissions(value) : null;
    if (result?.ok) {
      setPermissions(result.permissions);
      if (result.fileType === "directory") setTarget("directory");
    }
  }

  function update(next: Permissions) {
    setPermissions(next);
    setText(toOctal(next));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor={ids.text}>Octal mode or symbolic permissions</Label>
            <Input
              id={ids.text}
              value={text}
              onChange={(e) => onText(e.target.value)}
              placeholder="755 or rwxr-xr-x"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={parsed ? !parsed.ok : undefined}
              aria-describedby={ids.status}
              className="max-w-xs font-mono text-base"
            />
          </div>
          <Button variant="ghost" onClick={() => { update(initialPermissions()); setTarget("file"); setFileName("file"); }} disabled={octal === INITIAL && target === "file" && fileName === "file"}>
            Reset
          </Button>
        </div>
        <p id={ids.status} className={cn("text-sm", parsed && !parsed.ok ? "text-danger" : "text-muted-foreground")}>
          {parsed && !parsed.ok ? parsed.error : "Type a mode, tick the boxes below, or pick a preset. Both stay in sync."}
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Presets">
          {PRESETS.map((p) => (
            <Button key={p.mode} size="sm" variant={octal === p.mode ? "primary" : "secondary"} title={p.use} aria-label={`${p.mode}: ${p.use}`} onClick={() => update((parseOctal(p.mode) as { ok: true; permissions: Permissions }).permissions)} className="font-mono">
              {p.mode}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full text-sm">
            <caption className="sr-only">Permissions by class</caption>
            <thead className="bg-subtle text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">Class</th>
                {BIT_LABELS.map((b) => (
                  <th key={b.key} scope="col" className="px-3 py-2 font-medium">{b.label}</th>
                ))}
                <th scope="col" className="px-3 py-2 font-medium">Octal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {WHO.map((who) => (
                <tr key={who}>
                  <th scope="row" className="px-3 py-2.5 text-left font-medium">{WHO_LABELS[who]}</th>
                  {BIT_LABELS.map((b) => (
                    <td key={b.key} className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${WHO_LABELS[who]} ${b.label.toLowerCase()}`}
                        checked={permissions[who][b.key]}
                        onChange={(e) => update({ ...permissions, [who]: { ...permissions[who], [b.key]: e.target.checked } })}
                        className="size-4 cursor-pointer accent-accent"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-center font-mono">{octal.slice(-3)[WHO.indexOf(who)]}</td>
                </tr>
              ))}
              <tr>
                <th scope="row" className="px-3 py-2.5 text-left font-medium">Special</th>
                <td colSpan={4} className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {SPECIAL.map((s) => (
                      <label key={s.key} className="inline-flex cursor-pointer items-center gap-1.5">
                        <input type="checkbox" checked={permissions[s.key]} onChange={(e) => update({ ...permissions, [s.key]: e.target.checked })} className="size-4 cursor-pointer accent-accent" />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3">
          <dl className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
            {(
              [
                ["Octal", octal, "octal"],
                ["Symbolic", symbolic, "symbolic"],
                ["chmod (octal)", `chmod ${octal} ${quoted}`, "command-octal"],
                ["chmod (symbolic)", `chmod ${chmodSymbolic} ${quoted}`, "command-symbolic"],
              ] as const
            ).map(([label, value, key]) => (
              <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd data-result={key} className="col-start-1 font-mono text-sm break-all">{value}</dd>
                <dd className="col-start-2 row-span-2 row-start-1">
                  <CopyButton text={value} ariaLabel={`Copy ${label}`} variant="ghost" />
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.name}>File name for the commands</Label>
            <Input id={ids.name} value={fileName} onChange={(e) => setFileName(e.target.value)} autoComplete="off" spellCheck={false} className="h-9 font-mono" />
          </div>
        </div>
      </div>

      <section aria-labelledby="chmod-meaning" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="chmod-meaning" className="text-sm font-medium">What this means</h2>
          <SegmentedControl
            label="Applied to a"
            value={target}
            onChange={setTarget}
            options={[
              { value: "file", label: "File" },
              { value: "directory", label: "Directory" },
            ]}
          />
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          {WHO.map((who) => (
            <li key={who} data-explain={who}>{lines[who]}</li>
          ))}
        </ul>
        {notes.length ? (
          <Alert tone="warning" title="Check these">
            <ul className="flex list-disc flex-col gap-0.5 pl-4">
              {notes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </Alert>
        ) : null}
      </section>
    </div>
  );
}
