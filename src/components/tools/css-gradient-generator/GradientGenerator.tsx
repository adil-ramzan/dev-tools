"use client";

import { useState } from "react";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { Button } from "@/components/ui/Button";
import { ColorField } from "@/components/ui/ColorField";
import { CopyButton } from "@/components/ui/CopyButton";
import { RangeField } from "@/components/ui/RangeField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { MAX_STOPS, gradientCss, gradientValue, type GradientState, type GradientStop } from "@/lib/tools/css-generators";

let nextId = 0;
const stop = (color: string, position: number, opacity = 1): GradientStop => ({ id: `s${nextId++}`, color, opacity, position });

const PRESETS: { label: string; state: () => GradientState }[] = [
  { label: "Ocean", state: () => ({ type: "linear", angle: 135, shape: "circle", x: 50, y: 50, stops: [stop("#1f4fe0", 0), stop("#06b6d4", 100)] }) },
  { label: "Sunset", state: () => ({ type: "linear", angle: 90, shape: "circle", x: 50, y: 50, stops: [stop("#f97316", 0), stop("#ec4899", 50), stop("#8b5cf6", 100)] }) },
  { label: "Spotlight", state: () => ({ type: "radial", angle: 90, shape: "circle", x: 50, y: 30, stops: [stop("#ffffff", 0), stop("#0f1729", 70)] }) },
  { label: "Fade", state: () => ({ type: "linear", angle: 180, shape: "circle", x: 50, y: 50, stops: [stop("#0f1729", 0, 0), stop("#0f1729", 100, 0.8)] }) },
];

const DIRECTIONS = [
  { label: "↑", angle: 0, name: "To top" },
  { label: "↗", angle: 45, name: "To top right" },
  { label: "→", angle: 90, name: "To right" },
  { label: "↘", angle: 135, name: "To bottom right" },
  { label: "↓", angle: 180, name: "To bottom" },
  { label: "↙", angle: 225, name: "To bottom left" },
  { label: "←", angle: 270, name: "To left" },
  { label: "↖", angle: 315, name: "To top left" },
];

export function GradientGenerator() {
  const [state, setState] = useState<GradientState>(PRESETS[0].state);
  const css = gradientCss(state);
  const update = (patch: Partial<GradientState>) => setState((s) => ({ ...s, ...patch }));
  const updateStop = (id: string, patch: Partial<GradientStop>) =>
    setState((s) => ({ ...s, stops: s.stops.map((st) => (st.id === id ? { ...st, ...patch } : st)) }));

  function addStop() {
    setState((s) => {
      const sorted = [...s.stops].sort((a, b) => a.position - b.position);
      // Insert in the widest gap between stops.
      let best = { at: 50, width: -1, color: sorted[0]?.color ?? "#ffffff" };
      for (let i = 0; i < sorted.length - 1; i++) {
        const width = sorted[i + 1].position - sorted[i].position;
        if (width > best.width) best = { at: Math.round(sorted[i].position + width / 2), width, color: sorted[i].color };
      }
      return { ...s, stops: [...s.stops, stop(best.color, best.at)] };
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <div
            role="img"
            aria-label={`Preview of ${gradientValue(state)}`}
            className="checkerboard h-64 overflow-hidden rounded-md border border-border sm:h-80"
          >
            <div className="h-full w-full" style={{ backgroundImage: gradientValue(state) }} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Presets</span>
            {PRESETS.map((p) => (
              <Button key={p.label} size="sm" variant="secondary" onClick={() => setState(p.state())}>
                {p.label}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setState(PRESETS[0].state())}>
              Reset
            </Button>
          </div>
          <ToolPanel label="CSS" labelId="gradient-css-label" actions={<CopyButton text={css} label="Copy CSS" />}>
            <pre aria-labelledby="gradient-css-label" className="overflow-x-auto rounded-sm border border-border bg-subtle p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap">
              {css}
            </pre>
          </ToolPanel>
        </div>

        <div className="flex flex-col gap-5 rounded-md border border-border bg-surface p-4">
          <SegmentedControl
            label="Type"
            value={state.type}
            onChange={(type) => update({ type })}
            options={[
              { value: "linear", label: "Linear" },
              { value: "radial", label: "Radial" },
            ]}
          />
          {state.type === "linear" ? (
            <>
              <RangeField label="Angle" value={state.angle} min={0} max={360} unit="deg" onChange={(angle) => update({ angle })} />
              <div role="group" aria-label="Direction" className="flex flex-wrap gap-1">
                {DIRECTIONS.map((d) => (
                  <Button key={d.angle} size="sm" variant={state.angle === d.angle ? "primary" : "secondary"} onClick={() => update({ angle: d.angle })} aria-label={d.name} title={d.name} className="w-9 px-0">
                    {d.label}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <>
              <SegmentedControl
                label="Shape"
                value={state.shape}
                onChange={(shape) => update({ shape })}
                options={[
                  { value: "circle", label: "Circle" },
                  { value: "ellipse", label: "Ellipse" },
                ]}
              />
              <RangeField label="Center X" value={state.x} min={0} max={100} unit="%" onChange={(x) => update({ x })} />
              <RangeField label="Center Y" value={state.y} min={0} max={100} unit="%" onChange={(y) => update({ y })} />
            </>
          )}

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 flex w-full items-center justify-between text-sm font-medium">
              Color stops
            </legend>
            {[...state.stops]
              .sort((a, b) => a.position - b.position)
              .map((st, i) => (
                <div key={st.id} className="flex flex-col gap-3 rounded-sm border border-border p-3">
                  <div className="flex items-end justify-between gap-2">
                    <ColorField label={`Stop ${i + 1} color`} value={st.color} onChange={(color) => updateStop(st.id, { color })} />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setState((s) => ({ ...s, stops: s.stops.filter((x) => x.id !== st.id) }))}
                      disabled={state.stops.length <= 2}
                      aria-label={`Remove stop ${i + 1}`}
                    >
                      Remove
                    </Button>
                  </div>
                  <RangeField label="Position" value={st.position} min={0} max={100} unit="%" onChange={(position) => updateStop(st.id, { position })} />
                  <RangeField label="Opacity" value={Math.round(st.opacity * 100)} min={0} max={100} unit="%" onChange={(o) => updateStop(st.id, { opacity: o / 100 })} />
                </div>
              ))}
            <Button onClick={addStop} disabled={state.stops.length >= MAX_STOPS}>
              Add color stop
            </Button>
            {state.stops.length >= MAX_STOPS ? <p className="text-xs text-muted-foreground">Up to {MAX_STOPS} stops.</p> : null}
          </fieldset>
        </div>
      </div>
    </div>
  );
}
