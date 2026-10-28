"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { MAX_LOG, describeKeyEvent, isTypingTarget, snippetFor, type KeyRecord } from "@/lib/tools/keycode";

export function KeycodeInspector() {
  const [latest, setLatest] = useState<KeyRecord | null>(null);
  const [log, setLog] = useState<KeyRecord[]>([]);
  const [recordKeyup, setRecordKeyup] = useState(true);
  const [preventDefaults, setPreventDefaults] = useState(true);
  const [focused, setFocused] = useState(false);
  const counter = useRef(0);
  const ids = { help: useId(), notes: useId() };

  function handle(e: React.KeyboardEvent<HTMLDivElement>) {
    // Only the capture area itself is inspected; nested controls and the page's text fields keep their keys.
    if (e.target !== e.currentTarget || isTypingTarget(e.target as HTMLElement)) return;
    if (e.type === "keyup" && !recordKeyup) return;
    // Tab always moves focus, so keyboard users can leave the capture area.
    if (preventDefaults && e.key !== "Tab") e.preventDefault();
    const record = describeKeyEvent(e.nativeEvent, ++counter.current);
    if (e.type === "keydown") setLatest(record);
    setLog((current) => [record, ...current].slice(0, MAX_LOG));
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        tabIndex={0}
        role="application"
        aria-label="Key capture area. Press any key to inspect it."
        aria-describedby={ids.help}
        onKeyDown={handle}
        onKeyUp={handle}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        data-key-capture
        className={cn(
          "flex min-h-48 cursor-text flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center outline-none",
          focused ? "border-accent bg-accent-soft" : "border-border-strong bg-surface",
        )}
      >
        {latest ? (
          <>
            <p className="font-mono text-5xl font-semibold break-all" data-latest-key>
              {latest.key === " " ? "␠" : latest.key}
            </p>
            <p className="font-mono text-sm text-muted-foreground">{latest.combo}</p>
          </>
        ) : (
          <p className="text-lg font-medium">{focused ? "Press any key" : "Click or tab here, then press a key"}</p>
        )}
        <p id={ids.help} className="text-xs text-muted-foreground">
          Tab moves focus out of this area. Some shortcuts, such as closing a tab, are handled by the browser and never reach the page.
        </p>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {latest ? `key ${latest.keyLabel}, code ${latest.code}${latest.modifiers.length ? `, with ${latest.modifiers.join(" ")}` : ""}` : ""}
      </p>

      {latest ? (
        <section aria-labelledby="key-details" className="flex flex-col gap-3">
          <h2 id="key-details" className="text-sm font-medium">Last keydown</h2>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["event.key", latest.keyLabel, "The character or key name, after layout and modifiers."],
                ["event.code", latest.code, "The physical key position (US-QWERTY names)."],
                ["event.keyCode", String(latest.keyCode), "Deprecated. Varies by browser and layout."],
                ["event.which", String(latest.which), "Deprecated. Same as keyCode."],
                ["event.location", latest.location, "Which of several identical keys was pressed."],
                ["Modifiers", latest.modifiers.join(" + ") || "None", latest.capsLock ? "Caps Lock is on." : "Ctrl, Alt, Shift, Meta and AltGraph."],
                ["event.repeat", latest.repeat ? "true" : "false", "True while a key is held down."],
                ["event.isComposing", latest.isComposing ? "true" : "false", "True during IME composition, e.g. typing Japanese."],
              ] as const
            ).map(([label, value, hint]) => (
              <div key={label} className={cn("flex flex-col gap-1 rounded-md border border-border bg-surface p-3", label.includes("keyCode") || label.includes("which") ? "opacity-80" : "")}>
                <dt className="font-mono text-xs text-muted-foreground">
                  {label}
                  {label === "event.keyCode" || label === "event.which" ? <span className="ml-1.5 rounded-sm border border-border-strong px-1 text-[0.7rem]">legacy</span> : null}
                </dt>
                <dd data-field={label} className="font-mono text-lg font-semibold break-all">{value}</dd>
                <dd className="text-xs text-muted-foreground">{hint}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
            {(["key", "code"] as const).map((by) => {
              const snippet = snippetFor(latest, by);
              return (
                <div key={by} className="flex flex-wrap items-center justify-between gap-2">
                  <code className="font-mono text-sm break-all">{`if (${snippet}) { … }`}</code>
                  <CopyButton text={snippet} ariaLabel={`Copy condition using event.${by}`} variant="ghost" />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="key-log" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="key-log" className="text-sm font-medium">Event log (newest first)</h2>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Checkbox label="Record keyup" checked={recordKeyup} onChange={(e) => setRecordKeyup(e.target.checked)} />
            <Checkbox label="Prevent browser shortcuts" checked={preventDefaults} onChange={(e) => setPreventDefaults(e.target.checked)} />
            <Button size="sm" variant="ghost" onClick={() => { setLog([]); setLatest(null); }} disabled={!log.length}>
              Clear
            </Button>
          </div>
        </div>
        {log.length ? (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-sm" data-key-log>
              <thead className="bg-subtle text-xs text-muted-foreground">
                <tr>
                  {["Event", "key", "code", "keyCode (legacy)", "Location", "Modifiers", "Repeat"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface font-mono">
                {log.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-1.5">{r.type}</td>
                    <td className="px-3 py-1.5">{r.key === " " ? '" "' : r.key}</td>
                    <td className="px-3 py-1.5">{r.code}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{r.keyCode}</td>
                    <td className="px-3 py-1.5">{r.location}</td>
                    <td className="px-3 py-1.5">{r.modifiers.join("+") || "–"}</td>
                    <td className="px-3 py-1.5">{r.repeat ? "yes" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Key events appear here.</p>
        )}
      </section>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.notes}>Scratch field (keys typed here are not captured)</Label>
        <Input id={ids.notes} placeholder="Type here normally" autoComplete="off" className="max-w-md" />
      </div>
    </div>
  );
}
