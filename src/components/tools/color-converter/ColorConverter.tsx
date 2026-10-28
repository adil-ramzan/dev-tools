"use client";

import { useId, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import {
  contrastRatio,
  formatRatio,
  parseColor,
  readableText,
  shades,
  toHex,
  toHslString,
  toRgbString,
  wcag,
  type Rgba,
} from "@/lib/tools/color";

const DEFAULT = "#1f4fe0";

/** A color text field with a picker. The picker only edits the RGB part; alpha is kept. */
function ColorInput({ label, value, onChange, id }: { label: string; value: string; onChange: (v: string) => void; id: string }) {
  const parsed = parseColor(value);
  const pickerValue = parsed.ok ? toHex({ ...parsed.color, a: 1 }) : "#000000";
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={pickerValue}
          onChange={(e) => {
            const picked = parseColor(e.target.value);
            if (!picked.ok) return;
            const alpha = parsed.ok ? parsed.color.a : 1;
            onChange(toHex({ ...picked.color, a: alpha }));
          }}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-sm border border-input bg-surface p-0.5"
        />
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} autoComplete="off" className="font-mono" aria-invalid={!parsed.ok} />
      </div>
    </div>
  );
}

function Swatch({ color, className }: { color: Rgba; className?: string }) {
  return (
    <span className={cn("checkerboard block overflow-hidden rounded-sm border border-border", className)}>
      <span className="block h-full w-full" style={{ backgroundColor: toRgbString(color) }} />
    </span>
  );
}

function Pass({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center justify-between gap-3 border-t border-border py-2 text-sm first:border-t-0">
      <span>{label}</span>
      <span className={cn("rounded-sm border px-1.5 py-0.5 text-xs font-semibold", ok ? "border-success/40 bg-success/10 text-success" : "border-danger/40 bg-danger/10 text-danger")}>
        {ok ? "Pass" : "Fail"}
      </span>
    </li>
  );
}

export function ColorConverter() {
  const [value, setValue] = useState(DEFAULT);
  const [text, setText] = useState("#ffffff");
  const [background, setBackground] = useState(DEFAULT);
  const colorId = useId();
  const textId = useId();
  const bgId = useId();

  const parsed = useMemo(() => parseColor(value), [value]);
  const fg = useMemo(() => parseColor(text), [text]);
  const bg = useMemo(() => parseColor(background), [background]);
  const ratio = fg.ok && bg.ok ? contrastRatio(fg.color, bg.color) : null;
  const levels = ratio === null ? null : wcag(ratio);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby={`${colorId}-convert`} className="grid grid-cols-1 gap-6 rounded-md border border-border bg-surface p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id={`${colorId}-convert`} className="font-semibold tracking-tight">
              Convert
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setValue(DEFAULT);
                setText("#ffffff");
                setBackground(DEFAULT);
              }}
              disabled={value === DEFAULT && text === "#ffffff" && background === DEFAULT}
            >
              Reset
            </Button>
          </div>
          <ColorInput label="Color (HEX, RGB or HSL)" value={value} onChange={setValue} id={colorId} />
          <div className="flex flex-wrap gap-2">
            {["#1f4fe0", "rgb(16 185 129)", "hsl(340, 82%, 52%)", "#0f172980"].map((example) => (
              <Button key={example} size="sm" variant="ghost" onClick={() => setValue(example)} className="font-mono text-xs">
                {example}
              </Button>
            ))}
          </div>
          {parsed.ok ? <Swatch color={parsed.color} className="h-28" /> : <Alert title="Not a valid color">{parsed.error}</Alert>}
        </div>
        {parsed.ok ? (
          <div className="flex flex-col self-start">
            <dl className="flex flex-col divide-y divide-border border-y border-border">
              {[
                { label: "HEX", value: toHex(parsed.color) },
                { label: "RGB", value: toRgbString(parsed.color) },
                { label: "HSL", value: toHslString(parsed.color) },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 py-3">
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="col-start-1 font-mono text-base break-all">{row.value}</dd>
                  <dd className="col-start-2 row-span-2 row-start-1">
                    <CopyButton text={row.value} ariaLabel={`Copy ${row.label}`} />
                  </dd>
                </div>
              ))}
            </dl>
            <p className="pt-3 text-xs text-muted-foreground">
              {parsed.color.a < 1 ? `Alpha ${Math.round(parsed.color.a * 1000) / 10}%. ` : ""}
              Values are rounded: RGB to whole numbers, HSL to one decimal place.
            </p>
          </div>
        ) : null}
      </section>

      {parsed.ok ? (
        <section aria-labelledby={`${colorId}-shades`} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id={`${colorId}-shades`} className="font-semibold tracking-tight">
              Lighter and darker shades
            </h2>
            <p className="text-sm text-muted-foreground">Mixed with white and black. The ratio shows contrast with the text color drawn on each swatch.</p>
          </div>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {shades(parsed.color).map((shade) => {
              const hex = toHex(shade.color);
              const label = readableText(shade.color);
              return (
                <li key={shade.label} className="flex flex-col overflow-hidden rounded-md border border-border bg-surface">
                  <span className="flex h-16 items-end p-2 text-xs font-medium" style={{ backgroundColor: hex, color: toHex(label) }}>
                    {formatRatio(contrastRatio(label, shade.color))}
                  </span>
                  <span className="flex items-center justify-between gap-1 px-2 py-1.5">
                    <span className="flex flex-col">
                      <span className="font-mono text-xs">{hex}</span>
                      <span className="text-[0.6875rem] text-muted-foreground">{shade.label}</span>
                    </span>
                    <CopyButton text={hex} label="Copy" variant="ghost" ariaLabel={`Copy ${hex}`} />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby={`${colorId}-contrast`} className="grid grid-cols-1 gap-6 rounded-md border border-border bg-surface p-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h2 id={`${colorId}-contrast`} className="font-semibold tracking-tight">
            Contrast checker (WCAG 2)
          </h2>
          <ColorInput label="Text color" value={text} onChange={setText} id={textId} />
          <ColorInput label="Background color" value={background} onChange={setBackground} id={bgId} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setText(background); setBackground(text); }}>
              Swap colors
            </Button>
            {parsed.ok ? (
              <Button size="sm" variant="ghost" onClick={() => setBackground(toHex(parsed.color))}>
                Use converted color as background
              </Button>
            ) : null}
          </div>
          {!fg.ok ? <Alert title="Text color is not valid">{fg.error}</Alert> : null}
          {!bg.ok ? <Alert title="Background color is not valid">{bg.error}</Alert> : null}
        </div>
        {fg.ok && bg.ok && ratio !== null && levels ? (
          <div className="flex flex-col gap-4">
            <div className="checkerboard overflow-hidden rounded-md border border-border">
              <div className="flex flex-col gap-1 p-5" style={{ backgroundColor: toRgbString(bg.color), color: toRgbString(fg.color) }}>
                <span className="text-2xl font-semibold">Large text sample</span>
                <span className="text-sm">Normal body text sample for reading.</span>
              </div>
            </div>
            <p role="status" className="text-sm">
              Contrast ratio <span className="font-mono text-2xl font-semibold">{formatRatio(ratio)}</span>
            </p>
            <ul className="rounded-md border border-border px-3">
              <Pass ok={levels.aaNormal} label="AA, normal text (4.5:1)" />
              <Pass ok={levels.aaLarge} label="AA, large text and UI components (3:1)" />
              <Pass ok={levels.aaaNormal} label="AAA, normal text (7:1)" />
              <Pass ok={levels.aaaLarge} label="AAA, large text (4.5:1)" />
            </ul>
            {fg.color.a < 1 || bg.color.a < 1 ? (
              <p className="text-xs text-muted-foreground">
                Translucent colors are blended first: the text onto the background, and the background onto white.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
