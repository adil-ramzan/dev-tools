"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ColorField } from "@/components/ui/ColorField";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { FileDropField } from "@/components/ui/FileDropField";
import { RangeField } from "@/components/ui/RangeField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { canvasToPng, createCanvas, loadImageFile, type LoadedImage } from "@/lib/image";
import {
  DEFAULT_OPTIONS,
  ICO_SIZES,
  MAX_TEXT_GRAPHEMES,
  PNG_FILES,
  buildIco,
  buildZip,
  checkColors,
  checkText,
  drawIcon,
  headHtml,
  manifestJson,
  type FontStyle,
  type IconOptions,
  type IconSource,
  type Shape,
} from "@/lib/tools/favicon";

type Output = { pngs: { name: string; size: number; bytes: Uint8Array; url: string }[]; ico: Uint8Array };

async function render(options: IconOptions, source: IconSource): Promise<Output | { error: string }> {
  const pngs: Output["pngs"] = [];
  try {
    for (const file of PNG_FILES) {
      const target = createCanvas(file.size, file.size);
      if ("error" in target) return target;
      drawIcon(target.ctx, file.size, options, source);
      const blob = await canvasToPng(target.canvas);
      if (!blob) return { error: `The ${file.size}×${file.size} PNG could not be created.` };
      pngs.push({ name: file.name, size: file.size, bytes: new Uint8Array(await blob.arrayBuffer()), url: URL.createObjectURL(blob) });
    }
    const ico = buildIco(ICO_SIZES.map((size) => pngs.find((p) => p.size === size)!.bytes));
    return { pngs, ico };
  } catch (error) {
    pngs.forEach((p) => URL.revokeObjectURL(p.url));
    return { error: `The icons could not be drawn: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export function FaviconGenerator() {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [options, setOptions] = useState<IconOptions>(DEFAULT_OPTIONS);
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [fit, setFit] = useState<"contain" | "cover">("contain");
  const [imageError, setImageError] = useState<string | null>(null);
  const [appName, setAppName] = useState("");
  const [output, setOutput] = useState<Output | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const outputRef = useRef<Output | null>(null);
  const ids = { text: useId(), font: useId(), shape: useId(), name: useId(), html: useId(), manifest: useId() };

  const set = <K extends keyof IconOptions>(key: K, value: IconOptions[K]) => {
    setOptions((o) => ({ ...o, [key]: value }));
    setStatus(null);
  };
  const textError = mode === "text" ? checkText(options.text) : null;
  const colors = checkColors(options.foreground, options.background);
  const sourceMissing = mode === "image" && !image;
  const blocked = Boolean(textError) || !colors.ok || sourceMissing;

  // Redraw every size when anything changes, after the first paint so the page stays responsive.
  useEffect(() => {
    if (blocked) return;
    let cancelled = false;
    const source: IconSource = mode === "image" && image ? { kind: "image", image: image.bitmap, width: image.width, height: image.height, fit } : { kind: "text" };
    const handle = window.setTimeout(() => {
      void render(options, source).then((result) => {
        if (cancelled) {
          if (!("error" in result)) result.pngs.forEach((p) => URL.revokeObjectURL(p.url));
          return;
        }
        if ("error" in result) {
          setRenderError(result.error);
          return;
        }
        outputRef.current?.pngs.forEach((p) => URL.revokeObjectURL(p.url));
        outputRef.current = result;
        setOutput(result);
        setRenderError(null);
      });
    }, 100);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [options, mode, image, fit, blocked]);

  useEffect(() => () => outputRef.current?.pngs.forEach((p) => URL.revokeObjectURL(p.url)), []);

  async function pickImage(file: File) {
    setStatus(null);
    const result = await loadImageFile(file);
    if (!result.ok) {
      setImageError(result.error);
      return;
    }
    image?.bitmap.close();
    setImage(result.image);
    setImageError(null);
    setMode("image");
  }

  function reset() {
    image?.bitmap.close();
    setImage(null);
    setImageError(null);
    setMode("text");
    setOptions(DEFAULT_OPTIONS);
    setFit("contain");
    setAppName("");
    setStatus(null);
    setResetKey((k) => k + 1);
  }

  const themeColor = colors.ok ? colors.background : "#ffffff";
  const html = headHtml(themeColor);
  const manifest = manifestJson({ name: appName, themeColor, backgroundColor: themeColor });
  const ready = output && !blocked ? output : null;

  function downloadZip() {
    if (!ready) return;
    const encoder = new TextEncoder();
    const zip = buildZip([
      { name: "favicon.ico", data: ready.ico },
      ...ready.pngs.map((p) => ({ name: p.name, data: p.bytes })),
      { name: "site.webmanifest", data: encoder.encode(`${manifest}\n`) },
      { name: "head.html", data: encoder.encode(`${html}\n`) },
    ]);
    downloadBlob("favicons.zip", new Blob([zip as BlobPart], { type: "application/zip" }));
    setStatus(`Downloaded favicons.zip (${formatBytes(zip.length)}): favicon.ico, ${ready.pngs.length} PNGs, site.webmanifest and head.html.`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SegmentedControl label="Source" value={mode} onChange={(m) => { setMode(m); setStatus(null); }} options={[{ value: "text", label: "Text or emoji" }, { value: "image", label: "Image" }]} />
            <Button size="sm" variant="ghost" onClick={reset}>
              Reset
            </Button>
          </div>

          {mode === "text" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor={ids.text}>Text (1 to {MAX_TEXT_GRAPHEMES} characters)</Label>
                <Input id={ids.text} value={options.text} onChange={(e) => set("text", e.target.value)} maxLength={24} placeholder="A, 42 or 🚀" autoComplete="off" spellCheck={false} aria-invalid={Boolean(textError) || undefined} className="text-base" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={ids.font}>Font</Label>
                <Select id={ids.font} value={options.font} onChange={(e) => set("font", e.target.value as FontStyle)}>
                  <option value="sans">Sans-serif</option>
                  <option value="serif">Serif</option>
                  <option value="mono">Monospace</option>
                </Select>
              </div>
              <Checkbox label="Bold" checked={options.bold} onChange={(e) => set("bold", e.target.checked)} className="self-end pb-2" />
              <ColorField label="Text color" value={colors.ok ? colors.foreground : options.foreground} onChange={(v) => set("foreground", v)} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <FileDropField label="Image" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" onFile={(f) => void pickImage(f)} acceptPaste resetKey={resetKey} hint="PNG, JPEG, WebP, GIF or AVIF, ideally square and at least 512×512. You can also paste an image." />
              {image ? <p className="font-mono text-xs text-muted-foreground" data-image-info>{image.name} · {image.width}×{image.height} px · {formatBytes(image.bytes)}</p> : null}
              <SegmentedControl label="Fit" value={fit} onChange={setFit} options={[{ value: "contain", label: "Fit inside" }, { value: "cover", label: "Fill and crop" }]} />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.shape}>Shape</Label>
              <Select id={ids.shape} value={options.shape} onChange={(e) => set("shape", e.target.value as Shape)}>
                <option value="square">Square</option>
                <option value="rounded">Rounded square</option>
                <option value="circle">Circle</option>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <ColorField label="Background" value={colors.ok ? colors.background : options.background} onChange={(v) => set("background", v)} />
              <Checkbox label="Transparent background" checked={options.transparent} onChange={(e) => set("transparent", e.target.checked)} />
            </div>
            <RangeField label={`Padding (${options.padding}%)`} value={options.padding} min={0} max={40} unit="%" onChange={(v) => set("padding", v)} className="sm:col-span-2" />
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor={ids.name}>App name for the manifest (optional)</Label>
              <Input id={ids.name} value={appName} onChange={(e) => setAppName(e.target.value)} maxLength={60} placeholder="My App" autoComplete="off" />
            </div>
          </div>
          {mode === "text" ? <p className="text-xs text-muted-foreground">Emoji and fonts are drawn with the fonts on your device, so they look different on other systems. Download the files to keep this exact look.</p> : null}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Preview</p>
            <div className="checkerboard flex flex-wrap items-end gap-4 rounded-md border border-border p-4" data-favicon-previews>
              {ready ? (
                ready.pngs.map((p) => (
                  <figure key={p.name} className="flex flex-col items-center gap-1">
                    {/* PNGs this page just drew; shown at their real size, large ones scaled down. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`${p.size}×${p.size} icon`} width={Math.min(p.size, 96)} height={Math.min(p.size, 96)} data-size={p.size} className="[image-rendering:auto]" />
                    <figcaption className="rounded-sm bg-surface px-1 font-mono text-[11px] text-foreground">{p.size}</figcaption>
                  </figure>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{sourceMissing ? "Choose an image to see the icons." : blocked ? "Fix the settings to see the icons." : "Drawing…"}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={downloadZip} disabled={!ready}>
              Download all (.zip)
            </Button>
            <Button onClick={() => { if (!ready) return; downloadBlob("favicon.ico", new Blob([ready.ico as BlobPart], { type: "image/x-icon" })); setStatus(`Downloaded favicon.ico (${ICO_SIZES.join(", ")} px, ${formatBytes(ready.ico.length)}).`); }} disabled={!ready}>
              favicon.ico
            </Button>
          </div>
          {ready ? (
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface text-sm">
              {ready.pngs.map((p) => (
                <li key={p.name} className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5">
                  <span className="min-w-0">
                    <span className="font-mono text-xs [overflow-wrap:anywhere]">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">{PNG_FILES.find((f) => f.name === p.name)?.purpose}</span>
                  </span>
                  <Button size="sm" variant="ghost" aria-label={`Download ${p.name}`} onClick={() => { downloadBlob(p.name, new Blob([p.bytes as BlobPart], { type: "image/png" })); setStatus(`Downloaded ${p.name}.`); }}>
                    Download
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          {status ? <p role="status" className="text-sm text-success">{status}</p> : null}
        </div>
      </div>

      {textError ? <Alert title="Check the text">{textError}</Alert> : null}
      {!colors.ok ? <Alert title="Check the colors">{colors.error}</Alert> : null}
      {imageError ? <Alert title="Could not use this image">{imageError}</Alert> : null}
      {renderError ? <Alert title="Could not draw the icons">{renderError}</Alert> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ToolPanel label="HTML for the <head>" htmlFor={ids.html} actions={<CopyButton text={html} label="Copy HTML" ariaLabel="Copy HTML favicon links" />} footer="Upload the files to your site's root folder.">
          <Textarea id={ids.html} value={html} readOnly className="min-h-40 bg-subtle text-xs" />
        </ToolPanel>
        <ToolPanel label="site.webmanifest" htmlFor={ids.manifest} actions={<CopyButton text={manifest} label="Copy manifest" ariaLabel="Copy manifest JSON" />}>
          <Textarea id={ids.manifest} value={manifest} readOnly className="min-h-40 bg-subtle text-xs" />
        </ToolPanel>
      </div>

      <p className="text-sm text-muted-foreground">Icons are drawn in your browser; images are never uploaded. favicon.ico contains real 16, 32 and 48 pixel PNG images.</p>
    </div>
  );
}
