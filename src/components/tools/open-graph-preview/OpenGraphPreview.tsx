"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { FileDropField } from "@/components/ui/FileDropField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import { checkImageFile } from "@/lib/image";
import { EMPTY_FIELDS, buildMetaTags, checkFields, type MetaFields } from "@/lib/tools/meta-tags";
import { MAX_HTML_LENGTH, SAMPLES, checkMetadata, extractMetadata, hostOf, openGraphCard, truncate, twitterCard, type Card, type Issue } from "@/lib/tools/og-preview";

type Mode = "html" | "manual";

const MANUAL_FIELDS: { key: "title" | "description" | "canonical" | "siteName" | "image" | "imageAlt" | "twitterSite"; label: string; placeholder: string }[] = [
  { key: "title", label: "Title", placeholder: "How we cut our build time in half" },
  { key: "description", label: "Description", placeholder: "One or two sentences about the page" },
  { key: "canonical", label: "Page URL", placeholder: "https://example.com/page" },
  { key: "siteName", label: "Site name", placeholder: "Example" },
  { key: "image", label: "Image URL", placeholder: "https://example.com/og.png" },
  { key: "imageAlt", label: "Image description", placeholder: "What the image shows" },
  { key: "twitterSite", label: "Twitter/X handle", placeholder: "@example" },
];

const SEVERITY_STYLE: Record<Issue["severity"], { label: string; border: string; text: string }> = {
  error: { label: "Error", border: "border-danger", text: "text-danger" },
  warning: { label: "Warning", border: "border-border-strong", text: "text-foreground" },
  info: { label: "Info", border: "border-border", text: "text-muted-foreground" },
};

/** The share image area. Remote images are never loaded; a local file can stand in for them. */
function CardImage({ card, localUrl, className }: { card: Card; localUrl: string | null; className?: string }) {
  if (localUrl) {
    // A local file chosen on this page (Blob URL); nothing is fetched.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={localUrl} alt={card.imageAlt ?? ""} className={cn("block w-full object-cover", className)} />;
  }
  return (
    <div className={cn("flex w-full flex-col items-center justify-center gap-1 bg-subtle px-3 text-center text-xs text-muted-foreground", className)} data-image-placeholder>
      {card.image ? (
        <>
          <span className="font-medium text-foreground">Image not loaded</span>
          <span className="max-w-full truncate font-mono">{hostOf(card.image) ?? truncate(card.image, 40)}</span>
        </>
      ) : (
        <span className="font-medium text-foreground">No image</span>
      )}
    </div>
  );
}

function OpenGraphCardView({ card, localUrl }: { card: Card; localUrl: string | null }) {
  const showImage = Boolean(card.image || localUrl);
  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface" data-card="open-graph">
      {showImage ? <CardImage card={card} localUrl={localUrl} className="aspect-[1.91/1]" /> : null}
      <div className="flex flex-col gap-0.5 border-t border-border bg-subtle px-3 py-2.5">
        <span className="truncate text-xs tracking-wide text-muted-foreground uppercase">{card.domain ?? card.siteName ?? "No URL"}</span>
        <span className="line-clamp-2 text-sm font-semibold [overflow-wrap:anywhere] text-foreground" data-card-title>
          {card.title ? truncate(card.title, 100) : card.url ?? "Untitled"}
        </span>
        {card.description ? <span className="line-clamp-1 text-sm [overflow-wrap:anywhere] text-muted-foreground">{truncate(card.description, 200)}</span> : null}
      </div>
    </div>
  );
}

function TwitterCardView({ card, localUrl }: { card: ReturnType<typeof twitterCard>; localUrl: string | null }) {
  const domain = card.domain ?? "No URL";
  if (card.type === "summary") {
    return (
      <div className="flex overflow-hidden rounded-xl border border-border bg-surface" data-card="twitter-summary">
        <CardImage card={card} localUrl={localUrl} className="aspect-square w-24 shrink-0 sm:w-32" />
        <div className="flex min-w-0 flex-col justify-center gap-0.5 border-l border-border px-3 py-2">
          <span className="truncate text-xs text-muted-foreground">{domain}</span>
          <span className="truncate text-sm text-foreground" data-card-title>{card.title ? truncate(card.title, 70) : "Untitled"}</span>
          {card.description ? <span className="line-clamp-2 text-sm [overflow-wrap:anywhere] text-muted-foreground">{truncate(card.description, 200)}</span> : null}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1" data-card="twitter-large">
      <div className="relative overflow-hidden rounded-xl border border-border">
        <CardImage card={card} localUrl={localUrl} className="aspect-[1.91/1]" />
        {/* X shows the title over the image's lower-left corner. */}
        <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-sm bg-black/75 px-1.5 py-0.5 text-xs text-white" data-card-title>
          {card.title ? truncate(card.title, 70) : "Untitled"}
        </span>
      </div>
      <span className="truncate text-xs text-muted-foreground">From {domain}</span>
    </div>
  );
}

export function OpenGraphPreview() {
  const [mode, setMode] = useState<Mode>("html");
  const [html, setHtml] = useState("");
  const [manual, setManual] = useState<MetaFields>({ ...EMPTY_FIELDS, basics: false });
  const [sample, setSample] = useState(-1);
  const [local, setLocal] = useState<{ url: string; name: string } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const localRef = useRef<string | null>(null);
  const ids = { html: useId(), card: useId() };
  const deferredHtml = useDeferredValue(html);

  const source = mode === "html" ? deferredHtml : buildMetaTags(manual);
  const tooLong = mode === "html" && deferredHtml.length > MAX_HTML_LENGTH;
  const hasInput = source.trim() !== "" && !tooLong;
  const meta = useMemo(() => (hasInput ? extractMetadata(source, window) : null), [source, hasInput]);
  // Typed fields with invalid values are left out of the HTML, so report why alongside the card checks.
  const fieldErrors: Issue[] = mode === "manual" ? checkFields(manual).filter((i) => i.severity === "error").map((i) => ({ severity: "error", field: MANUAL_FIELDS.find((f) => f.key === i.field)?.label ?? i.field, message: `${i.message} It is left out until fixed.` })) : [];
  const issues = meta ? [...fieldErrors, ...checkMetadata(meta)] : fieldErrors;
  const og = meta ? openGraphCard(meta) : null;
  const tw = meta ? twitterCard(meta) : null;

  useEffect(() => () => {
    if (localRef.current) URL.revokeObjectURL(localRef.current);
  }, []);

  function setLocalImage(file: File | null) {
    if (localRef.current) URL.revokeObjectURL(localRef.current);
    localRef.current = null;
    setLocal(null);
    setLocalError(null);
    if (!file) return;
    const check = checkImageFile(file);
    if (!check.ok) {
      setLocalError(check.error);
      return;
    }
    const url = URL.createObjectURL(file);
    localRef.current = url;
    setLocal({ url, name: file.name });
  }

  function loadSample() {
    const next = (sample + 1) % SAMPLES.length;
    setSample(next);
    setMode("html");
    setHtml(SAMPLES[next].html);
  }

  function clear() {
    setHtml("");
    setManual({ ...EMPTY_FIELDS, basics: false });
    setSample(-1);
    setLocalImage(null);
    setResetKey((k) => k + 1);
  }

  const counts = (["error", "warning", "info"] as const).map((s) => [s, issues.filter((i) => i.severity === s).length] as const);
  const manualHtml = mode === "manual" ? buildMetaTags(manual) : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SegmentedControl label="Input" value={mode} onChange={setMode} options={[{ value: "html", label: "Paste HTML" }, { value: "manual", label: "Enter fields" }]} />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={loadSample}>
                {sample === -1 ? "Sample" : "Next sample"}
              </Button>
              <Button size="sm" variant="ghost" onClick={clear} disabled={!html && JSON.stringify(manual) === JSON.stringify({ ...EMPTY_FIELDS, basics: false }) && !local && !localError}>
                Clear
              </Button>
            </div>
          </div>
          {sample >= 0 && mode === "html" ? (
            <p role="status" className="text-xs text-muted-foreground">
              Sample {sample + 1} of {SAMPLES.length}: {SAMPLES[sample].label}
            </p>
          ) : null}

          {mode === "html" ? (
            <ToolPanel label="Page HTML" htmlFor={ids.html} footer="Paste the page source or just its <head>. Scripts are never run and nothing is loaded.">
              <Textarea id={ids.html} value={html} onChange={(e) => setHtml(e.target.value)} placeholder={'<meta property="og:title" content="…">'} className="min-h-64 text-xs" aria-invalid={tooLong || undefined} />
            </ToolPanel>
          ) : (
            <div className="grid gap-4 rounded-md border border-border bg-surface p-4 sm:grid-cols-2">
              {MANUAL_FIELDS.map(({ key, label, placeholder }) => {
                const id = `${ids.card}-${key}`;
                return (
                  <div key={key} className={cn("flex flex-col gap-1.5", (key === "title" || key === "description") && "sm:col-span-2")}>
                    <Label htmlFor={id}>{label}</Label>
                    {key === "description" ? (
                      <Textarea id={id} value={manual[key]} onChange={(e) => setManual((m) => ({ ...m, [key]: e.target.value }))} placeholder={placeholder} className="min-h-20 font-sans" maxLength={2000} />
                    ) : (
                      <Input id={id} value={manual[key]} onChange={(e) => setManual((m) => ({ ...m, [key]: e.target.value }))} placeholder={placeholder} maxLength={2000} autoComplete="off" spellCheck={key === "title" || key === "imageAlt"} />
                    )}
                  </div>
                );
              })}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${ids.card}-type`}>Twitter/X card</Label>
                <Select id={`${ids.card}-type`} value={manual.twitterCard} onChange={(e) => setManual((m) => ({ ...m, twitterCard: e.target.value as MetaFields["twitterCard"] }))}>
                  <option value="summary_large_image">Large image</option>
                  <option value="summary">Summary (small image)</option>
                </Select>
              </div>
              <div className="flex items-end sm:col-span-2">
                <CopyButton text={manualHtml} label="Copy as HTML" ariaLabel="Copy as HTML meta tags" />
              </div>
            </div>
          )}

          <FileDropField
            label="Preview image (optional)"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            onFile={setLocalImage}
            resetKey={resetKey}
            hint="Image URLs are never loaded. Choose the share image from your device to see it in the cards; it stays local."
          />
          {local ? (
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="min-w-0 font-mono [overflow-wrap:anywhere]" data-local-image>{local.name}</span>
              <Button size="sm" variant="ghost" onClick={() => { setLocalImage(null); setResetKey((k) => k + 1); }}>
                Remove image
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {og && tw ? (
            <>
              <figure className="flex flex-col gap-2">
                <figcaption className="text-sm font-medium">Facebook and LinkedIn</figcaption>
                <OpenGraphCardView card={og} localUrl={local?.url ?? null} />
              </figure>
              <figure className="flex flex-col gap-2">
                <figcaption className="text-sm font-medium">X (Twitter), {tw.type === "summary" ? "summary card" : "large image card"}</figcaption>
                <TwitterCardView card={tw} localUrl={local?.url ?? null} />
              </figure>
              <p className="text-xs text-muted-foreground">Approximate layouts. Platforms change their designs and may crop or shorten text differently.</p>
            </>
          ) : (
            <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-border-strong p-6 text-center text-sm text-muted-foreground">
              Paste HTML, enter fields or load a sample to see the previews.
            </div>
          )}
        </div>
      </div>

      {tooLong ? <Alert title="Too much HTML">Paste at most {MAX_HTML_LENGTH.toLocaleString("en-US")} characters; the &lt;head&gt; is enough.</Alert> : null}
      {localError ? <Alert title="Could not use this image">{localError}</Alert> : null}

      {meta || issues.length ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <section aria-labelledby="og-issues" className="flex min-w-0 flex-col gap-3">
            <h2 id="og-issues" className="text-base font-semibold">
              Checks
            </h2>
            <p role="status" className="text-sm text-muted-foreground">
              {counts.map(([s, n]) => `${n} ${SEVERITY_STYLE[s].label.toLowerCase()}${n === 1 ? "" : "s"}`).join(", ")}
            </p>
            {issues.length === 0 ? <p className="text-sm text-success">No problems found.</p> : null}
            <ul className="flex flex-col gap-2">
              {issues.map((issue, i) => (
                <li key={`${issue.field}-${i}`} data-issue={issue.severity} className={cn("flex flex-col gap-0.5 border-l-2 bg-surface py-2 pr-3 pl-3", SEVERITY_STYLE[issue.severity].border)}>
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className={cn("text-xs font-semibold tracking-wide uppercase", SEVERITY_STYLE[issue.severity].text)}>{SEVERITY_STYLE[issue.severity].label}</span>
                    <code className="font-mono text-xs">{issue.field}</code>
                  </p>
                  <p className="text-sm [overflow-wrap:anywhere] text-muted-foreground">{issue.message}</p>
                </li>
              ))}
            </ul>
          </section>
          {meta ? <section aria-labelledby="og-found" className="flex min-w-0 flex-col gap-3">
            <h2 id="og-found" className="text-base font-semibold">
              Metadata found
            </h2>
            <dl className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface text-xs">
              {[
                ["<title>", meta.title],
                ["description", meta.description],
                ["canonical", meta.canonical],
                ...Object.entries(meta.og),
                ...Object.entries(meta.twitter),
              ].map(([key, value]) => (
                <div key={key} className="grid grid-cols-1 gap-0.5 px-3 py-1.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
                  <dt className="font-mono font-semibold">{key}</dt>
                  <dd className={cn("font-mono [overflow-wrap:anywhere]", value ? "text-foreground" : "text-muted-foreground")}>{value ? truncate(value, 300) : "Missing"}</dd>
                </div>
              ))}
            </dl>
          </section> : null}
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Everything happens in your browser. The HTML is parsed without running scripts, and no URL in it is fetched, including the share image.
      </p>
    </div>
  );
}
