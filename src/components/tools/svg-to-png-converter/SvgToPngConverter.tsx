"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ColorField } from "@/components/ui/ColorField";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { FileDropField } from "@/components/ui/FileDropField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { canvasToPng, createCanvas } from "@/lib/image";
import { MAX_SVG_BYTES, SAMPLE_SVG, createSvgSanitizer, inspectSvg, outputSize, sanitizeSvg, withPixelSize, type SizeMode } from "@/lib/tools/svg-png";

type Purify = ReturnType<typeof createSvgSanitizer>;
type Rendered = { url: string; blob: Blob; width: number; height: number };

const DEFAULTS = { mode: "scale" as SizeMode, scale: "2", width: "512", height: "512", background: "#ffffff", transparent: true };

/** Draws sanitized SVG through an <img> from a Blob URL, which never runs scripts or loads external resources. */
async function rasterize(svg: string, width: number, height: number, background: string | null): Promise<Rendered | { error: string }> {
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = svgUrl;
    try {
      await img.decode();
    } catch {
      return { error: "The browser could not render this SVG. It may use features that are not supported in images." };
    }
    const target = createCanvas(width, height);
    if ("error" in target) return target;
    if (background) {
      target.ctx.fillStyle = background;
      target.ctx.fillRect(0, 0, width, height);
    }
    target.ctx.drawImage(img, 0, 0, width, height);
    const blob = await canvasToPng(target.canvas);
    if (!blob) return { error: "The PNG could not be created. Try a smaller size." };
    return { url: URL.createObjectURL(blob), blob, width, height };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export function SvgToPngConverter() {
  const [purify, setPurify] = useState<Purify | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [mode, setMode] = useState<SizeMode>(DEFAULTS.mode);
  const [scale, setScale] = useState(DEFAULTS.scale);
  const [width, setWidth] = useState(DEFAULTS.width);
  const [height, setHeight] = useState(DEFAULTS.height);
  const [background, setBackground] = useState(DEFAULTS.background);
  const [transparent, setTransparent] = useState(DEFAULTS.transparent);
  const [rendered, setRendered] = useState<Rendered | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const deferred = useDeferredValue(text);
  const ids = { text: useId(), scale: useId(), width: useId(), height: useId() };
  const renderedRef = useRef<Rendered | null>(null);

  useEffect(() => {
    import("dompurify").then(
      ({ default: DOMPurify }) => setPurify(() => createSvgSanitizer(DOMPurify, window)),
      () => setLoadFailed(true),
    );
  }, []);

  const prepared = useMemo(() => {
    if (!purify || deferred.trim() === "") return null;
    const original = inspectSvg(deferred, window);
    if (!original.ok) return original;
    const { svg, removed } = sanitizeSvg(deferred, purify);
    const checked = inspectSvg(svg, window);
    return checked.ok ? { ok: true as const, svg, removed, info: checked.info } : checked;
  }, [purify, deferred]);

  const size = prepared?.ok ? outputSize(prepared.info, { mode, scale: Number(scale), width: Number(width), height: Number(height) }) : null;
  const fill = transparent ? null : background;
  const outWidth = size?.ok ? size.width : 0;
  const outHeight = size?.ok ? size.height : 0;

  // Render the PNG whenever the SVG or a setting changes; stale renders are discarded.
  useEffect(() => {
    if (!prepared?.ok || !outWidth || !outHeight) return;
    let cancelled = false;
    const sized = withPixelSize(prepared.svg, prepared.info, outWidth, outHeight, window);
    const handle = window.setTimeout(() => {
      void rasterize(sized, outWidth, outHeight, fill).then((result) => {
        if (cancelled) {
          if (!("error" in result)) URL.revokeObjectURL(result.url);
          return;
        }
        if ("error" in result) {
          setRenderError(result.error);
          return;
        }
        if (renderedRef.current) URL.revokeObjectURL(renderedRef.current.url);
        renderedRef.current = result;
        setRendered(result);
        setRenderError(null);
      });
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [prepared, outWidth, outHeight, fill]);

  useEffect(() => () => {
    if (renderedRef.current) URL.revokeObjectURL(renderedRef.current.url);
  }, []);

  const current = prepared?.ok && size?.ok && rendered && rendered.width === size.width && rendered.height === size.height ? rendered : null;

  async function readFile(file: File) {
    setStatus(null);
    if (file.size > MAX_SVG_BYTES) {
      setFileError(`${file.name} is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_SVG_BYTES)}.`);
      return;
    }
    if (file.type && file.type !== "image/svg+xml" && !file.name.toLowerCase().endsWith(".svg")) {
      setFileError(`${file.name} is not an SVG file.`);
      return;
    }
    setFileError(null);
    setFileName(file.name);
    setText(await file.text());
  }

  function clear() {
    setText("");
    setFileName(null);
    setFileError(null);
    setRendered(null);
    setRenderError(null);
    setStatus(null);
    setResetKey((k) => k + 1);
  }

  function resetSettings() {
    setMode(DEFAULTS.mode);
    setScale(DEFAULTS.scale);
    setWidth(DEFAULTS.width);
    setHeight(DEFAULTS.height);
    setBackground(DEFAULTS.background);
    setTransparent(DEFAULTS.transparent);
  }
  const customized = mode !== DEFAULTS.mode || scale !== DEFAULTS.scale || width !== DEFAULTS.width || height !== DEFAULTS.height || background !== DEFAULTS.background || transparent !== DEFAULTS.transparent;
  const outName = `${(fileName ?? "image.svg").replace(/\.svg$/i, "") || "image"}.png`;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <FileDropField label="SVG file" accept=".svg,image/svg+xml" onFile={(f) => void readFile(f)} resetKey={resetKey} hint="Or drop a file here, or paste the markup below." />
          <ToolPanel
            label="SVG markup"
            htmlFor={ids.text}
            actions={
              <>
                <Button size="sm" variant="ghost" onClick={() => { setText(SAMPLE_SVG); setFileName(null); setStatus(null); }}>
                  Sample
                </Button>
                <Button size="sm" variant="ghost" onClick={clear} disabled={!text && !fileName && !fileError}>
                  Clear
                </Button>
              </>
            }
            footer={prepared?.ok ? `${fileName ? `${fileName} · ` : ""}${Math.round(prepared.info.width)}×${Math.round(prepared.info.height)} px from ${prepared.info.source === "default" ? "the default size (no width, height or viewBox)" : prepared.info.source === "viewBox" ? "the viewBox" : "width and height"}` : "Scripts, event handlers and external references are removed before rendering."}
          >
            <Textarea id={ids.text} value={text} onChange={(e) => { setText(e.target.value); setFileName(null); setStatus(null); }} placeholder={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">…</svg>'} className="min-h-48" />
          </ToolPanel>

          <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
            <SegmentedControl label="Output size" value={mode} onChange={setMode} options={[{ value: "scale", label: "Scale" }, { value: "width", label: "Width" }, { value: "height", label: "Height" }, { value: "custom", label: "Exact" }]} />
            <div className="flex flex-wrap gap-3">
              {mode === "scale" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={ids.scale}>Scale (×)</Label>
                  <Input id={ids.scale} type="number" min={0.1} max={16} step={0.5} value={scale} onChange={(e) => setScale(e.target.value)} className="h-9 w-28" />
                </div>
              ) : null}
              {mode === "width" || mode === "custom" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={ids.width}>Width (px)</Label>
                  <Input id={ids.width} type="number" min={1} max={8192} value={width} onChange={(e) => setWidth(e.target.value)} className="h-9 w-28" />
                </div>
              ) : null}
              {mode === "height" || mode === "custom" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={ids.height}>Height (px)</Label>
                  <Input id={ids.height} type="number" min={1} max={8192} value={height} onChange={(e) => setHeight(e.target.value)} className="h-9 w-28" />
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <Checkbox label="Transparent background" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
              {!transparent ? <ColorField label="Background" value={background} onChange={setBackground} /> : null}
            </div>
            <Button size="sm" variant="ghost" className="self-start" onClick={resetSettings} disabled={!customized}>
              Reset settings
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">PNG preview</p>
          <div className="checkerboard flex min-h-64 items-center justify-center overflow-hidden rounded-md border border-border p-3">
            {current ? (
              // A PNG this page created from the sanitized SVG.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.url} alt={`PNG of ${fileName ?? "the SVG"}, ${current.width}×${current.height} pixels`} data-png-preview className="max-h-[28rem] max-w-full object-contain" />
            ) : (
              <p className="px-6 text-center text-sm text-muted-foreground">{loadFailed ? "The sanitizer could not be loaded." : !purify ? "Loading…" : prepared?.ok && size?.ok ? "Rendering…" : "Paste SVG or choose a file to see the PNG."}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={!current} onClick={() => { if (!current) return; downloadBlob(outName, current.blob); setStatus(`Downloaded ${outName} (${current.width}×${current.height} pixels, ${formatBytes(current.blob.size)}).`); }}>
              Download PNG
            </Button>
            {current ? <span className="font-mono text-xs text-muted-foreground" data-png-size>{current.width}×{current.height} px · {formatBytes(current.blob.size)}</span> : null}
          </div>
          {status ? <p role="status" className="text-sm text-success">{status}</p> : null}
        </div>
      </div>

      {loadFailed ? <Alert title="The SVG sanitizer could not be loaded">Check your connection and reload the page.</Alert> : null}
      {fileError ? <Alert title="Could not open the file">{fileError}</Alert> : null}
      {prepared && !prepared.ok ? <Alert title="Could not read the SVG">{prepared.error}</Alert> : null}
      {size && !size.ok ? <Alert title="Check the size">{size.error}</Alert> : null}
      {renderError && prepared?.ok && size?.ok ? <Alert title="Could not render the SVG">{renderError}</Alert> : null}
      {prepared?.ok && prepared.removed > 0 ? (
        <Alert tone="warning" title={`${prepared.removed} unsafe or external ${prepared.removed === 1 ? "item was" : "items were"} removed`}>
          Scripts, event handlers, embedded HTML and references to external files (images, fonts, stylesheets) are not rendered. Embed images as data: URIs and convert text to paths if it must look exact.
        </Alert>
      ) : null}

      <p className="text-sm text-muted-foreground">
        The SVG is converted in your browser and never uploaded. It is sanitized and drawn only as an image, so it cannot run scripts or load anything from the network.
      </p>
    </div>
  );
}
