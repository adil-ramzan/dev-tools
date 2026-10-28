"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ColorField } from "@/components/ui/ColorField";
import { Label, Select } from "@/components/ui/Field";
import { FileDropField } from "@/components/ui/FileDropField";
import { RangeField } from "@/components/ui/RangeField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { canvasToPng, createCanvas, loadImageFile, type LoadedImage } from "@/lib/image";
import { BACKGROUND_PRESETS, DEFAULT_BEAUTIFY, MAX_PADDING, MAX_RADIUS, MAX_SHADOW_BLUR, drawScreenshot, layout, type Background, type BeautifyOptions, type Frame } from "@/lib/tools/screenshot";

type Rendered = { url: string; blob: Blob; width: number; height: number };

export function ScreenshotBeautifier() {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [options, setOptions] = useState<BeautifyOptions>(DEFAULT_BEAUTIFY);
  const [rendered, setRendered] = useState<Rendered | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const renderedRef = useRef<Rendered | null>(null);
  const frameId = useId();

  const set = <K extends keyof BeautifyOptions>(key: K, value: BeautifyOptions[K]) => {
    setOptions((o) => ({ ...o, [key]: value }));
    setStatus(null);
  };
  const planned = image ? layout(image.width, image.height, options) : null;

  useEffect(() => {
    const result = image ? layout(image.width, image.height, options) : null;
    if (!image || !result?.ok) return;
    let cancelled = false;
    const plan = result.layout;
    const handle = window.setTimeout(async () => {
      const target = createCanvas(plan.width, plan.height);
      if ("error" in target) {
        setRenderError(target.error);
        return;
      }
      drawScreenshot(target.ctx, image.bitmap, plan, options);
      const blob = await canvasToPng(target.canvas);
      if (cancelled) return;
      if (!blob) {
        setRenderError("The PNG could not be created. Try less padding or a smaller image.");
        return;
      }
      if (renderedRef.current) URL.revokeObjectURL(renderedRef.current.url);
      const next = { url: URL.createObjectURL(blob), blob, width: plan.width, height: plan.height };
      renderedRef.current = next;
      setRendered(next);
      setRenderError(null);
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [image, options]);

  useEffect(() => () => {
    if (renderedRef.current) URL.revokeObjectURL(renderedRef.current.url);
  }, []);

  async function pick(file: File) {
    setStatus(null);
    const result = await loadImageFile(file);
    if (!result.ok) {
      setImageError(result.error);
      return;
    }
    image?.bitmap.close();
    setImage(result.image);
    setImageError(null);
  }

  function clear() {
    image?.bitmap.close();
    setImage(null);
    setImageError(null);
    setRendered(null);
    setRenderError(null);
    setStatus(null);
    setResetKey((k) => k + 1);
  }

  async function copy() {
    if (!rendered) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": rendered.blob })]);
      setStatus("Copied the image to the clipboard.");
    } catch {
      setStatus("This browser did not allow copying images. Download the PNG instead.");
    }
  }

  const current = planned?.ok && rendered ? rendered : null;
  const customized = JSON.stringify(options) !== JSON.stringify(DEFAULT_BEAUTIFY);
  const outName = `${(image?.name ?? "screenshot").replace(/\.[^.]+$/, "")}-beautified.png`;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <FileDropField label="Screenshot" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp" onFile={(f) => void pick(f)} acceptPaste resetKey={resetKey} hint="Choose, drop or paste (Ctrl/⌘+V) an image. It stays on your device." />
          {image ? (
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 font-mono text-xs [overflow-wrap:anywhere] text-muted-foreground" data-image-info>
                {image.name} · {image.width}×{image.height} px
              </p>
              <Button size="sm" variant="ghost" onClick={clear}>
                Clear
              </Button>
            </div>
          ) : null}

          <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
            <SegmentedControl label="Background" value={options.background} onChange={(v: Background) => set("background", v)} options={[{ value: "gradient", label: "Gradient" }, { value: "solid", label: "Solid" }, { value: "transparent", label: "None" }]} />
            {options.background !== "transparent" ? (
              <>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Background presets">
                  {BACKGROUND_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      title={p.label}
                      aria-label={p.label}
                      aria-pressed={options.color1 === p.color1 && options.color2 === p.color2}
                      onClick={() => setOptions((o) => ({ ...o, color1: p.color1, color2: p.color2 }))}
                      className="size-8 rounded-sm border border-border-strong aria-pressed:outline-2 aria-pressed:outline-offset-1 aria-pressed:outline-accent"
                      style={{ background: options.background === "solid" ? p.color1 : `linear-gradient(135deg, ${p.color1}, ${p.color2})` }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-4">
                  <ColorField label={options.background === "gradient" ? "From" : "Color"} value={options.color1} onChange={(v) => set("color1", v)} />
                  {options.background === "gradient" ? <ColorField label="To" value={options.color2} onChange={(v) => set("color2", v)} /> : null}
                </div>
                {options.background === "gradient" ? <RangeField label={`Angle (${options.angle}°)`} value={options.angle} min={0} max={360} unit="°" onChange={(v) => set("angle", v)} /> : null}
              </>
            ) : null}
            <RangeField label={`Padding (${options.padding} px)`} value={options.padding} min={0} max={MAX_PADDING} unit="px" onChange={(v) => set("padding", v)} />
            <RangeField label={`Corner radius (${options.radius} px)`} value={options.radius} min={0} max={MAX_RADIUS} unit="px" onChange={(v) => set("radius", v)} />
            <RangeField label={`Shadow blur (${options.shadowBlur} px)`} value={options.shadowBlur} min={0} max={MAX_SHADOW_BLUR} unit="px" onChange={(v) => set("shadowBlur", v)} />
            <RangeField label={`Shadow opacity (${options.shadowOpacity}%)`} value={options.shadowOpacity} min={0} max={100} unit="%" onChange={(v) => set("shadowOpacity", v)} />
            <RangeField label={`Shadow offset (${options.shadowOffsetY} px)`} value={options.shadowOffsetY} min={-MAX_SHADOW_BLUR} max={MAX_SHADOW_BLUR} unit="px" onChange={(v) => set("shadowOffsetY", v)} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={frameId}>Window frame</Label>
              <Select id={frameId} value={options.frame} onChange={(e) => set("frame", e.target.value as Frame)}>
                <option value="none">None</option>
                <option value="light">Browser window, light</option>
                <option value="dark">Browser window, dark</option>
              </Select>
            </div>
            <Button size="sm" variant="ghost" className="self-start" onClick={() => { setOptions(DEFAULT_BEAUTIFY); setStatus(null); }} disabled={!customized}>
              Reset settings
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-sm font-medium">Result</p>
          <div className="checkerboard flex min-h-72 items-center justify-center overflow-hidden rounded-md border border-border p-3">
            {current ? (
              // The PNG this page just drew from the local image.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.url} alt={`Beautified ${image?.name ?? "screenshot"}`} data-result className="max-h-[36rem] max-w-full object-contain" />
            ) : (
              <p className="px-6 text-center text-sm text-muted-foreground">{image ? (planned?.ok ? "Drawing…" : "Adjust the settings to draw the result.") : "Choose, drop or paste a screenshot to start."}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={!current} onClick={() => { if (!current) return; downloadBlob(outName, current.blob); setStatus(`Downloaded ${outName} (${current.width}×${current.height} pixels, ${formatBytes(current.blob.size)}).`); }}>
              Download PNG
            </Button>
            <Button disabled={!current} onClick={() => void copy()}>
              Copy image
            </Button>
            {current ? <span className="font-mono text-xs text-muted-foreground" data-result-size>{current.width}×{current.height} px · {formatBytes(current.blob.size)}</span> : null}
          </div>
          {status ? <p role="status" className="text-sm text-muted-foreground">{status}</p> : null}
        </div>
      </div>

      {imageError ? <Alert title="Could not use this image">{imageError}</Alert> : null}
      {planned && !planned.ok ? <Alert title="Check the settings">{planned.error}</Alert> : null}
      {renderError ? <Alert title="Could not draw the result">{renderError}</Alert> : null}

      <p className="text-sm text-muted-foreground">The screenshot is processed in your browser and never uploaded. The result keeps the screenshot&apos;s full resolution.</p>
    </div>
  );
}
