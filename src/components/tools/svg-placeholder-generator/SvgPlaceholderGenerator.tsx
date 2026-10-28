"use client";

import { useId, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ColorField } from "@/components/ui/ColorField";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { downloadText } from "@/lib/download";
import { FONT_FAMILIES, MAX_DIMENSION, MAX_TEXT_LENGTH, buildPlaceholder, escapeXml, svgDataUri, type FontFamily } from "@/lib/tools/svg-placeholder";

const PRESETS: [string, number, number][] = [
  ["Avatar 150×150", 150, 150],
  ["Card 400×300", 400, 300],
  ["Banner ad 728×90", 728, 90],
  ["Open Graph 1200×630", 1200, 630],
  ["HD 1280×720", 1280, 720],
  ["Full HD 1920×1080", 1920, 1080],
];

export function SvgPlaceholderGenerator() {
  const [widthText, setWidthText] = useState("600");
  const [heightText, setHeightText] = useState("400");
  const [background, setBackground] = useState("#e2e8f0");
  const [foreground, setForeground] = useState("#475569");
  const [text, setText] = useState("");
  const [fontSizeText, setFontSizeText] = useState("");
  const [font, setFont] = useState<FontFamily>("sans");
  const [downloaded, setDownloaded] = useState<string | null>(null);
  const ids = { width: useId(), height: useId(), text: useId(), font: useId(), fontSize: useId(), svg: useId(), uri: useId(), img: useId() };

  const width = Number(widthText);
  const height = Number(heightText);
  const result = buildPlaceholder({ width, height, background, foreground, text, fontSize: fontSizeText.trim() === "" ? 0 : Number(fontSizeText), font });
  const svg = result.ok ? result.svg : "";
  const uri = result.ok ? svgDataUri(svg) : "";
  const imgTag = result.ok ? `<img src="${uri}" width="${width}" height="${height}" alt="${escapeXml(result.label)}">` : "";
  const invalid = (field: string) => (!result.ok && result.field === field) || undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.width}>Width (px)</Label>
              <Input id={ids.width} type="number" min={1} max={MAX_DIMENSION} value={widthText} onChange={(e) => setWidthText(e.target.value)} aria-invalid={invalid("width")} className="h-9" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.height}>Height (px)</Label>
              <Input id={ids.height} type="number" min={1} max={MAX_DIMENSION} value={heightText} onChange={(e) => setHeightText(e.target.value)} aria-invalid={invalid("height")} className="h-9" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Size presets">
            {PRESETS.map(([label, w, h]) => (
              <Button key={label} size="sm" variant="secondary" onClick={() => { setWidthText(String(w)); setHeightText(String(h)); }}>
                {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.text}>Text (empty shows the size)</Label>
            <Input id={ids.text} value={text} maxLength={MAX_TEXT_LENGTH} onChange={(e) => setText(e.target.value)} placeholder={`${widthText}×${heightText}`} aria-invalid={invalid("text")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.font}>Font</Label>
              <Select id={ids.font} value={font} onChange={(e) => setFont(e.target.value as FontFamily)}>
                {(Object.keys(FONT_FAMILIES) as FontFamily[]).map((f) => (
                  <option key={f} value={f}>
                    {{ sans: "Sans-serif", serif: "Serif", mono: "Monospace" }[f]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.fontSize}>Font size</Label>
              <Input id={ids.fontSize} type="number" min={1} max={1000} value={fontSizeText} onChange={(e) => setFontSizeText(e.target.value)} placeholder="Auto" aria-invalid={invalid("fontSize")} className="h-9" />
            </div>
          </div>
          <ColorField label="Background" value={background} onChange={setBackground} />
          <ColorField label="Text color" value={foreground} onChange={setForeground} />
          <Button variant="ghost" size="sm" onClick={() => { setWidthText("600"); setHeightText("400"); setBackground("#e2e8f0"); setForeground("#475569"); setText(""); setFontSizeText(""); setFont("sans"); }}>
            Reset
          </Button>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-sm font-medium">Preview</p>
          <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-md border border-border bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] p-4">
            {result.ok ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img data-placeholder-preview src={uri} alt={`Placeholder: ${result.label}`} className="max-h-96 max-w-full object-contain" />
            ) : (
              <p className="text-sm text-muted-foreground">Fix the settings to see a preview.</p>
            )}
          </div>
          {!result.ok ? <Alert title="Check the settings">{result.error}</Alert> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={!result.ok} onClick={() => { downloadText(`placeholder-${width}x${height}.svg`, svg, "image/svg+xml"); setDownloaded(`placeholder-${width}x${height}.svg`); }}>
              Download SVG
            </Button>
            {downloaded ? <span role="status" className="text-sm text-success">Downloaded {downloaded}.</span> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {(
          [
            ["SVG markup", ids.svg, svg, "Copy SVG markup"],
            ["Data URI (for CSS or src)", ids.uri, uri, "Copy data URI"],
            ["HTML img tag", ids.img, imgTag, "Copy img tag"],
          ] as const
        ).map(([label, id, value, aria]) => (
          <div key={id} className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={id}>{label}</Label>
              <CopyButton text={value} ariaLabel={aria} />
            </div>
            <Textarea id={id} value={value} readOnly className="min-h-32 bg-subtle text-xs break-all" />
          </div>
        ))}
      </div>
    </div>
  );
}
