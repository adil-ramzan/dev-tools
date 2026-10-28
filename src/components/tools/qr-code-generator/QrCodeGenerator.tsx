"use client";

import { useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ColorField } from "@/components/ui/ColorField";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { RangeField } from "@/components/ui/RangeField";
import { downloadText } from "@/lib/download";
import {
  ERROR_LEVELS,
  MAX_MARGIN,
  MAX_SIZE,
  MIN_SIZE,
  RECOMMENDED_MARGIN,
  checkColors,
  checkRender,
  drawToCanvas,
  generateQr,
  loadQr,
  toSvg,
  type ErrorLevel,
} from "@/lib/tools/qr";

type QrFactory = Awaited<ReturnType<typeof loadQr>>;

export function QrCodeGenerator() {
  const [qrcode, setQrcode] = useState<QrFactory | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [text, setText] = useState("");
  const [level, setLevel] = useState<ErrorLevel>("M");
  const [size, setSize] = useState(512);
  const [marginText, setMarginText] = useState(String(RECOMMENDED_MARGIN));
  const [foreground, setForeground] = useState("#000000");
  const [background, setBackground] = useState("#ffffff");
  const [transparent, setTransparent] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const deferred = useDeferredValue(text);
  const ids = { text: useId(), level: useId(), margin: useId(), svg: useId() };

  useEffect(() => {
    // The factory is a function: wrap it, or React would call it as a state updater.
    loadQr().then((f) => setQrcode(() => f), () => setLoadFailed(true));
  }, []);

  const customized = level !== "M" || size !== 512 || marginText !== String(RECOMMENDED_MARGIN) || foreground !== "#000000" || background !== "#ffffff" || transparent;

  function resetSettings() {
    setLevel("M");
    setSize(512);
    setMarginText(String(RECOMMENDED_MARGIN));
    setForeground("#000000");
    setBackground("#ffffff");
    setTransparent(false);
    setStatus(null);
  }

  const margin = Number(marginText);
  const renderError = checkRender({ size, margin });
  const colors = checkColors({ foreground, background: transparent ? "transparent" : background });
  const result = useMemo(() => (qrcode && deferred ? generateQr(deferred, level, qrcode) : null), [qrcode, deferred, level]);
  const ready = result?.ok && colors.ok && !renderError;
  const options = colors.ok ? { size, margin, foreground: colors.foreground, background: colors.background } : null;
  const svg = ready && options ? toSvg(result.qr, options) : "";

  async function downloadPng() {
    if (!ready || !options) return;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setStatus("This browser cannot draw the PNG. Download the SVG instead.");
      return;
    }
    drawToCanvas(ctx, result.qr, options);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      setStatus("The PNG could not be created. Download the SVG instead.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "qr-code.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`Downloaded qr-code.png (${size}×${size} pixels).`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-5">
          <ToolPanel
            label="Text or URL"
            htmlFor={ids.text}
            actions={
              <>
                <Button size="sm" variant="ghost" onClick={() => setText("https://example.com/menu?table=12")}>
                  Sample
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setText(""); setStatus(null); }} disabled={!text}>
                  Clear
                </Button>
              </>
            }
            footer={text ? `${new TextEncoder().encode(text).length.toLocaleString("en-US")} bytes as UTF-8${result?.ok ? ` · version ${result.qr.version} (${result.qr.modules.length}×${result.qr.modules.length} modules)` : ""}` : "URLs, plain text, Wi-Fi settings (WIFI:T:WPA;S:name;P:password;;) and more."}
          >
            <Textarea id={ids.text} value={text} onChange={(e) => { setText(e.target.value); setStatus(null); }} placeholder="https://example.com" className="min-h-28" />
          </ToolPanel>

          <div className="grid gap-5 rounded-md border border-border bg-surface p-4 sm:grid-cols-2">
            <RangeField label={`Size (${size}×${size} px)`} value={size} min={MIN_SIZE} max={MAX_SIZE} step={8} unit="px" onChange={setSize} className="sm:col-span-2" />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.level}>Error correction</Label>
              <Select id={ids.level} value={level} onChange={(e) => setLevel(e.target.value as ErrorLevel)}>
                {ERROR_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label} ({l.value}): recovers {l.recovery}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.margin}>Margin (modules)</Label>
              <Input id={ids.margin} type="number" min={0} max={MAX_MARGIN} value={marginText} onChange={(e) => setMarginText(e.target.value)} aria-invalid={Boolean(renderError) || undefined} className="h-9" />
            </div>
            <ColorField label="Foreground" value={foreground} onChange={setForeground} />
            <div className="flex flex-col gap-2">
              <ColorField label="Background" value={background} onChange={setBackground} />
              <Checkbox label="Transparent background" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
            </div>
            <Button size="sm" variant="ghost" className="justify-self-start sm:col-span-2" onClick={resetSettings} disabled={!customized}>
              Reset settings
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Preview</p>
          <div className="flex aspect-square items-center justify-center rounded-md border border-border bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] p-3">
            {svg ? (
              // The SVG is built from validated colors and numbers only; shown as an image, never as markup.
              // eslint-disable-next-line @next/next/no-img-element
              <img data-qr-preview src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={`QR code for ${text.length > 60 ? `${text.slice(0, 60)}…` : text}`} className="h-full w-full object-contain [image-rendering:pixelated]" />
            ) : (
              <p className="px-6 text-center text-sm text-muted-foreground">{loadFailed ? "The QR code library could not be loaded." : qrcode ? "Enter text to see the QR code." : "Loading…"}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={downloadPng} disabled={!ready}>
              Download PNG
            </Button>
            <Button onClick={() => { downloadText("qr-code.svg", svg, "image/svg+xml"); setStatus("Downloaded qr-code.svg (scalable vector)."); }} disabled={!ready}>
              Download SVG
            </Button>
            <CopyButton text={svg} label="Copy SVG" ariaLabel="Copy SVG markup" />
          </div>
          {status ? <p role="status" className="text-sm text-success">{status}</p> : null}
        </div>
      </div>

      {loadFailed ? <Alert title="The QR code library could not be loaded">Check your connection and reload the page.</Alert> : null}
      {result && !result.ok ? <Alert title="Could not create a QR code">{result.error}</Alert> : null}
      {renderError ? <Alert title="Check the settings">{renderError}</Alert> : null}
      {!colors.ok ? <Alert title="Check the colors">{colors.error}</Alert> : colors.warnings.length ? (
        <Alert tone="warning" title="This code may be hard to scan">
          <ul className="flex list-disc flex-col gap-0.5 pl-4">
            {colors.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </Alert>
      ) : null}
      {margin < RECOMMENDED_MARGIN && !renderError ? <Alert tone="warning">A margin smaller than {RECOMMENDED_MARGIN} modules can make the code harder to scan, unless it sits on a plain light background.</Alert> : null}

      <p className="text-sm text-muted-foreground">
        QR codes are generated in your browser; the text is not sent anywhere. Always test a code with a phone before printing it.
      </p>
    </div>
  );
}
