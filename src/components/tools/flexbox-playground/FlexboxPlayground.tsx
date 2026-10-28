"use client";

import { useId, useState } from "react";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Label, Select } from "@/components/ui/Field";
import { RangeField } from "@/components/ui/RangeField";
import { MAX_FLEX_ITEMS, flexContainerStyle, flexCss, type FlexItem, type FlexState } from "@/lib/tools/css-generators";

let nextId = 0;
const item = (): FlexItem => ({ id: `i${nextId++}`, label: "", grow: 0 });

const initial = (): FlexState => ({
  direction: "row",
  wrap: "wrap",
  justifyContent: "flex-start",
  alignItems: "stretch",
  alignContent: "normal",
  gap: 12,
  items: [item(), item(), item(), item()],
});

/** Varied sizes so alignment changes are visible. */
const SIZES = [
  { w: 72, h: 56 },
  { w: 96, h: 88 },
  { w: 64, h: 40 },
  { w: 112, h: 72 },
  { w: 80, h: 104 },
  { w: 56, h: 64 },
];

const OPTIONS = {
  direction: ["row", "row-reverse", "column", "column-reverse"],
  wrap: ["nowrap", "wrap", "wrap-reverse"],
  justifyContent: ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"],
  alignItems: ["stretch", "flex-start", "center", "flex-end", "baseline"],
  alignContent: ["normal", "flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly", "stretch"],
} as const;

type SelectKey = keyof typeof OPTIONS;

const LABELS: Record<SelectKey, string> = {
  direction: "flex-direction",
  wrap: "flex-wrap",
  justifyContent: "justify-content",
  alignItems: "align-items",
  alignContent: "align-content",
};

export function FlexboxPlayground() {
  const [state, setState] = useState<FlexState>(initial);
  const baseId = useId();
  const css = flexCss(state);
  const update = (patch: Partial<FlexState>) => setState((s) => ({ ...s, ...patch }));

  function move(index: number, by: number) {
    setState((s) => {
      const items = [...s.items];
      const [moved] = items.splice(index, 1);
      items.splice(index + by, 0, moved);
      return { ...s, items };
    });
  }

  const column = state.direction.startsWith("column");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <div
          role="region"
          aria-label="Flex container preview"
          className="h-80 resize-x overflow-auto rounded-md border border-dashed border-border-strong bg-surface p-3 sm:h-96"
          style={{ ...flexContainerStyle(state), minWidth: "12rem", maxWidth: "100%" }}
        >
          {state.items.map((it, i) => {
            const size = SIZES[i % SIZES.length];
            return (
              <div
                key={it.id}
                className="flex shrink-0 items-start justify-start rounded-sm border border-accent/40 bg-accent-soft p-2 font-mono text-sm font-semibold text-accent"
                style={{
                  minWidth: column ? undefined : size.w,
                  minHeight: column ? undefined : size.h,
                  width: column ? size.w : undefined,
                  height: column ? size.h * 0.6 : undefined,
                  flexGrow: it.grow,
                }}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Drag the bottom-right corner of the preview to resize it and see wrapping change.</p>
        <ToolPanel label="CSS" labelId={`${baseId}-css`} actions={<CopyButton text={css} label="Copy CSS" />}>
          <pre aria-labelledby={`${baseId}-css`} className="overflow-x-auto rounded-sm border border-border bg-subtle p-3 font-mono text-sm leading-relaxed">
            {css}
          </pre>
        </ToolPanel>
      </div>

      <div className="flex flex-col gap-5 rounded-md border border-border bg-surface p-4">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-medium">Container</legend>
          {(Object.keys(OPTIONS) as SelectKey[]).map((key) => (
            <div key={key} className="flex flex-col gap-1.5">
              <Label htmlFor={`${baseId}-${key}`} className="font-mono text-xs">
                {LABELS[key]}
              </Label>
              <Select id={`${baseId}-${key}`} value={state[key]} onChange={(e) => update({ [key]: e.target.value } as Partial<FlexState>)}>
                {OPTIONS[key].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
          ))}
          <RangeField label="gap" value={state.gap} min={0} max={48} unit="px" onChange={(gap) => update({ gap })} />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Items</legend>
          <ol className="flex flex-col gap-2">
            {state.items.map((it, i) => (
              <li key={it.id} className="flex flex-wrap items-center gap-2 rounded-sm border border-border px-2 py-1.5">
                <span className="w-6 font-mono text-sm font-semibold">{i + 1}</span>
                <label className="flex items-center gap-1.5 text-xs">
                  <span className="font-mono">flex-grow</span>
                  <select
                    value={it.grow}
                    onChange={(e) => setState((s) => ({ ...s, items: s.items.map((x) => (x.id === it.id ? { ...x, grow: Number(e.target.value) } : x)) }))}
                    className="h-7 rounded-sm border border-input bg-surface px-1 text-xs"
                  >
                    {[0, 1, 2, 3].map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="ml-auto flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move item ${i + 1} earlier`} className="w-8 px-0">
                    ↑
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === state.items.length - 1} aria-label={`Move item ${i + 1} later`} className="w-8 px-0">
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setState((s) => ({ ...s, items: s.items.filter((x) => x.id !== it.id) }))}
                    disabled={state.items.length <= 1}
                    aria-label={`Remove item ${i + 1}`}
                  >
                    Remove
                  </Button>
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setState((s) => ({ ...s, items: [...s.items, item()] }))} disabled={state.items.length >= MAX_FLEX_ITEMS}>
              Add item
            </Button>
            <Button variant="ghost" onClick={() => setState(initial())}>
              Reset
            </Button>
          </div>
          {state.items.length >= MAX_FLEX_ITEMS ? <p className="text-xs text-muted-foreground">Up to {MAX_FLEX_ITEMS} items.</p> : null}
        </fieldset>
      </div>
    </div>
  );
}
