"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { paramsToJson, parseUrl, withParams, type QueryParam } from "@/lib/tools/url-parse";

const SAMPLE = "https://user:secret@shop.example.com:8443/products/caf%C3%A9-beans?sort=price&tag=organic&tag=fair+trade&q=dark%20roast#reviews";

export function UrlParser() {
  const [input, setInput] = useState("");
  const [base, setBase] = useState("");
  // Edited query parameters; null means "as parsed from the URL".
  const [edited, setEdited] = useState<QueryParam[] | null>(null);
  const deferredInput = useDeferredValue(input);
  const deferredBase = useDeferredValue(base);
  const ids = { input: useId(), base: useId(), status: useId(), rebuilt: useId() };

  const result = useMemo(() => (deferredInput.trim() ? parseUrl(deferredInput, deferredBase) : null), [deferredInput, deferredBase]);
  const url = result?.ok ? result.url : null;
  const params = edited ?? url?.params ?? [];
  const rebuilt = url ? withParams(url.href, params) : "";

  function setUrl(next: string) {
    setInput(next);
    setEdited(null);
  }

  function updateParam(index: number, field: keyof QueryParam, value: string) {
    setEdited(params.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  const parts: [string, string][] = url
    ? [
        ["Protocol", url.protocol],
        ["Username", url.username],
        ["Password", url.password ? "•".repeat(Math.min(url.password.length, 12)) : ""],
        ["Hostname", url.hostname],
        ["Port", url.port ? url.port : url.effectivePort ? `${url.effectivePort} (default)` : ""],
        ["Origin", url.origin === "null" ? "" : url.origin],
        ["Path", url.pathname],
        ["Query", url.search],
        ["Fragment", url.hash],
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <Label htmlFor={ids.input}>URL</Label>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setUrl(SAMPLE)}>
                Sample
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setUrl(""); setBase(""); }} disabled={!input && !base}>
                Clear
              </Button>
            </div>
          </div>
          <Textarea
            id={ids.input}
            value={input}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/path?key=value#section"
            aria-invalid={result ? !result.ok : undefined}
            aria-describedby={ids.status}
            className="min-h-20 break-all"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.base}>Base URL for relative URLs (optional)</Label>
          <Input id={ids.base} value={base} onChange={(e) => { setBase(e.target.value); setEdited(null); }} placeholder="https://example.com/docs/page.html" autoComplete="off" spellCheck={false} className="font-mono" />
        </div>
      </div>

      <div id={ids.status}>
        {result && !result.ok ? (
          <Alert title="Could not parse this URL">
            <p>{result.error}</p>
            {result.suggestion ? (
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => setUrl(result.suggestion!)}>
                Use {result.suggestion.length > 60 ? `${result.suggestion.slice(0, 60)}…` : result.suggestion}
              </Button>
            ) : null}
          </Alert>
        ) : url?.warnings.length ? (
          <Alert tone="warning" title="Notes">
            <ul className="flex list-disc flex-col gap-0.5 pl-4">
              {url.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Alert>
        ) : !result ? (
          <p className="text-sm text-muted-foreground">The URL is parsed as you type with your browser&apos;s URL parser. It is never requested.</p>
        ) : null}
      </div>

      {url ? (
        <>
          <section aria-labelledby="url-parts" className="flex flex-col gap-2">
            <h2 id="url-parts" className="text-sm font-medium">Parts</h2>
            <dl className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
              {parts.map(([label, value]) => (
                <div key={label} className="grid gap-1 px-3 py-2 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd data-part={label.toLowerCase()} className="min-w-0 font-mono text-sm break-all">
                    {value || <span className="text-muted-foreground">(none)</span>}
                  </dd>
                  <dd>{value && label !== "Password" ? <CopyButton text={value} ariaLabel={`Copy ${label.toLowerCase()}`} variant="ghost" /> : null}</dd>
                </div>
              ))}
              {url.segments.length > 1 || (url.segments.length === 1 && url.segments[0] !== "") ? (
                <div className="grid gap-1 px-3 py-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                  <dt className="text-sm text-muted-foreground">Path segments</dt>
                  <dd className="flex flex-wrap gap-1.5 font-mono text-sm">
                    {url.segments.map((s, i) => (
                      <span key={i} className="rounded-sm bg-subtle px-1.5 py-0.5 break-all">{s || "(empty)"}</span>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section aria-labelledby="url-params" className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="url-params" className="text-sm font-medium">
                Query parameters ({params.length})
              </h2>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEdited([...params, { key: "", value: "" }])}>
                  Add parameter
                </Button>
                {edited ? (
                  <Button size="sm" variant="ghost" onClick={() => setEdited(null)}>
                    Reset
                  </Button>
                ) : null}
                <CopyButton text={params.length ? paramsToJson(params) : ""} label="Copy as JSON" ariaLabel="Copy parameters as JSON" />
              </div>
            </div>
            {params.length ? (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-subtle text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Key (decoded)</th>
                      <th scope="col" className="px-3 py-2 font-medium">Value (decoded)</th>
                      <th scope="col" className="w-0 px-3 py-2"><span className="sr-only">Remove</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {params.map((p, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1.5">
                          <Input aria-label={`Parameter ${i + 1} key`} value={p.key} onChange={(e) => updateParam(i, "key", e.target.value)} className="h-8 min-w-28 font-mono" spellCheck={false} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input aria-label={`Parameter ${i + 1} value`} value={p.value} onChange={(e) => updateParam(i, "value", e.target.value)} className="h-8 min-w-40 font-mono" spellCheck={false} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Button size="sm" variant="ghost" aria-label={`Remove parameter ${i + 1}`} onClick={() => setEdited(params.filter((_, j) => j !== i))}>
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">This URL has no query parameters.</p>
            )}
          </section>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={ids.rebuilt}>{edited ? "Rebuilt URL" : "Normalized URL"}</Label>
              <CopyButton text={rebuilt} ariaLabel="Copy URL" />
            </div>
            <Textarea id={ids.rebuilt} value={rebuilt} readOnly className="min-h-16 bg-subtle break-all" />
            <p className="text-xs text-muted-foreground">Parameters are encoded with URLSearchParams: spaces become +, and &amp;, = and other reserved characters are percent-encoded.</p>
          </div>
        </>
      ) : null}
    </div>
  );
}
