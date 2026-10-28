"use client";

import { useState } from "react";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ColorField } from "@/components/ui/ColorField";
import { CopyButton } from "@/components/ui/CopyButton";
import { RangeField } from "@/components/ui/RangeField";
import { cn } from "@/lib/cn";
import { MAX_SHADOWS, boxShadowCss, shadowValue, type ShadowLayer } from "@/lib/tools/css-generators";

let nextId = 0;
const layer = (patch: Partial<ShadowLayer> = {}): ShadowLayer => ({
  id: `l${nextId++}`,
  x: 0,
  y: 8,
  blur: 24,
  spread: -4,
  color: "#0f1729",
  opacity: 20,
  inset: false,
  ...patch,
});

const PRESETS: { label: string; layers: () => ShadowLayer[] }[] = [
  { label: "Soft", layers: () => [layer()] },
  { label: "Layered", layers: () => [layer({ y: 1, blur: 2, spread: 0, opacity: 8 }), layer({ y: 4, blur: 8, spread: -2, opacity: 10 }), layer({ y: 16, blur: 32, spread: -8, opacity: 16 })] },
  { label: "Hard", layers: () => [layer({ x: 6, y: 6, blur: 0, spread: 0, opacity: 100 })] },
  { label: "Inset", layers: () => [layer({ y: 2, blur: 6, spread: 0, opacity: 25, inset: true })] },
];

export function BoxShadowGenerator() {
  const [layers, setLayers] = useState<ShadowLayer[]>(PRESETS[0].layers);
  const [activeId, setActiveId] = useState(layers[0].id);
  const [boxColor, setBoxColor] = useState("#ffffff");
  const [canvasColor, setCanvasColor] = useState("#f1efe8");
  const active = layers.find((l) => l.id === activeId) ?? layers[0];
  const css = boxShadowCss(layers);
  const update = (patch: Partial<ShadowLayer>) => setLayers((ls) => ls.map((l) => (l.id === active.id ? { ...l, ...patch } : l)));

  function applyPreset(make: () => ShadowLayer[]) {
    const next = make();
    setLayers(next);
    setActiveId(next[0].id);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <div className="flex h-72 items-center justify-center rounded-md border border-border sm:h-96" style={{ backgroundColor: canvasColor }}>
          <div
            role="img"
            aria-label={`Preview box with box-shadow: ${shadowValue(layers)}`}
            className="size-36 rounded-lg sm:size-44"
            style={{ backgroundColor: boxColor, boxShadow: shadowValue(layers) }}
          />
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <ColorField label="Box color" value={boxColor} onChange={setBoxColor} />
          <ColorField label="Background" value={canvasColor} onChange={setCanvasColor} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Presets</span>
          {PRESETS.map((p) => (
            <Button key={p.label} size="sm" variant="secondary" onClick={() => applyPreset(p.layers)}>
              {p.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              applyPreset(PRESETS[0].layers);
              setBoxColor("#ffffff");
              setCanvasColor("#f1efe8");
            }}
          >
            Reset
          </Button>
        </div>
        <ToolPanel label="CSS" labelId="shadow-css-label" actions={<CopyButton text={css} label="Copy CSS" />}>
          <pre aria-labelledby="shadow-css-label" className="overflow-x-auto rounded-sm border border-border bg-subtle p-3 font-mono text-sm leading-relaxed">
            {css}
          </pre>
        </ToolPanel>
      </div>

      <div className="flex flex-col gap-5 rounded-md border border-border bg-surface p-4">
        <div className="flex flex-col gap-2">
          <span id="shadow-layers-label" className="text-sm font-medium">
            Shadow layers
          </span>
          <div role="group" aria-labelledby="shadow-layers-label" className="flex flex-wrap gap-2">
            {layers.map((l, i) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={l.id === active.id}
                onClick={() => setActiveId(l.id)}
                className={cn(
                  "inline-flex h-8 items-center gap-2 rounded-sm border px-3 text-sm transition-colors duration-150",
                  l.id === active.id ? "border-foreground bg-foreground text-background" : "border-border hover:bg-subtle",
                )}
              >
                <span className="size-3 rounded-full border border-border" style={{ backgroundColor: l.color, opacity: Math.max(0.25, l.opacity / 100) }} />
                Layer {i + 1}
                {l.inset ? <span className="text-xs opacity-70">inset</span> : null}
              </button>
            ))}
            <Button
              size="sm"
              onClick={() => {
                const added = layer({ y: 2, blur: 6, spread: 0, opacity: 15 });
                setLayers((ls) => [...ls, added]);
                setActiveId(added.id);
              }}
              disabled={layers.length >= MAX_SHADOWS}
            >
              Add layer
            </Button>
          </div>
        </div>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 text-sm font-medium">Layer {layers.indexOf(active) + 1}</legend>
          <RangeField label="Horizontal offset" value={active.x} min={-100} max={100} unit="px" onChange={(x) => update({ x })} />
          <RangeField label="Vertical offset" value={active.y} min={-100} max={100} unit="px" onChange={(y) => update({ y })} />
          <RangeField label="Blur" value={active.blur} min={0} max={200} unit="px" onChange={(blur) => update({ blur })} />
          <RangeField label="Spread" value={active.spread} min={-100} max={100} unit="px" onChange={(spread) => update({ spread })} />
          <ColorField label="Shadow color" value={active.color} onChange={(color) => update({ color })} />
          <RangeField label="Opacity" value={active.opacity} min={0} max={100} unit="%" onChange={(opacity) => update({ opacity })} />
          <Checkbox label="Inset (inner shadow)" checked={active.inset} onChange={(e) => update({ inset: e.target.checked })} />
          <Button
            variant="ghost"
            onClick={() => {
              const remaining = layers.filter((l) => l.id !== active.id);
              setLayers(remaining);
              setActiveId(remaining[0].id);
            }}
            disabled={layers.length <= 1}
            className="self-start"
          >
            Remove this layer
          </Button>
        </fieldset>
      </div>
    </div>
  );
}
