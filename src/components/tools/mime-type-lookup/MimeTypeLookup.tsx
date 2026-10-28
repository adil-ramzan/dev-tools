"use client";

import { useDeferredValue, useEffect, useId, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label } from "@/components/ui/Field";
import { COMMON_EXTENSIONS, loadMimeIndex, lookup, type MimeIndex, type TypeInfo } from "@/lib/tools/mime";

const EXAMPLES = ["png", "report.pdf", "js", "application/json", "image/jpg", "ts"];

const SOURCE_LABELS: Record<string, string> = {
  iana: "Registered with IANA",
  apache: "Used by Apache",
  nginx: "Used by nginx",
  common: "Common de-facto type, not in mime-db",
};

export function MimeTypeLookup() {
  const [index, setIndex] = useState<MimeIndex | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [example, setExample] = useState(0);
  const deferred = useDeferredValue(query);
  const inputId = useId();
  const resultId = useId();

  useEffect(() => {
    loadMimeIndex().then(setIndex, () => setLoadFailed(true));
  }, []);

  const result = index && deferred.trim() ? lookup(deferred, index) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Label htmlFor={inputId}>Extension, file name or MIME type</Label>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setQuery(EXAMPLES[example % EXAMPLES.length]); setExample((e) => e + 1); }}>
              Sample
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setQuery("")} disabled={!query}>
              Clear
            </Button>
          </div>
        </div>
        <Input
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. png, invoice.pdf or text/html"
          autoComplete="off"
          spellCheck={false}
          aria-describedby={resultId}
          className="font-mono"
        />
      </div>

      <div id={resultId} aria-live="polite">
        {loadFailed ? (
          <Alert title="The MIME type database could not be loaded">Check your connection and reload the page.</Alert>
        ) : !index ? (
          <p className="text-sm text-muted-foreground">Loading the MIME type database…</p>
        ) : !result ? (
          <p className="text-sm text-muted-foreground">
            Results appear as you type. {index.types.size.toLocaleString("en-US")} types and {index.byExtension.size.toLocaleString("en-US")} extensions are available.
          </p>
        ) : result.kind === "error" ? (
          <Alert title="Check the input">{result.error}</Alert>
        ) : result.kind === "extension" ? (
          result.types.length === 0 ? (
            <Alert tone="warning" title={`No MIME type is listed for .${result.extension}`}>
              Servers usually send unknown files as application/octet-stream.
            </Alert>
          ) : (
            <section aria-label={`Types for .${result.extension}`} className="flex flex-col gap-3">
              <h2 className="text-sm font-medium">
                .{result.extension}
                {result.fromFileName ? <span className="font-normal text-muted-foreground"> (the last extension of the file name)</span> : null}
              </h2>
              {result.note ? <Alert tone="warning">{result.note}</Alert> : null}
              <ul className="flex flex-col gap-2">
                {result.types.map((info, i) => (
                  <TypeCard key={info.type} info={info} badge={i === 0 ? (result.types.length > 1 ? "Usual type" : null) : "Also used"} onSelect={setQuery} />
                ))}
              </ul>
            </section>
          )
        ) : result.info ? (
          <section aria-label={result.info.type} className="flex flex-col gap-3">
            {result.parameters ? <p className="text-sm text-muted-foreground">Parameters ({result.parameters}) are not part of the type and were ignored.</p> : null}
            <ul>
              <TypeCard info={result.info} badge={null} onSelect={setQuery} />
            </ul>
          </section>
        ) : (
          <Alert tone="warning" title={`${result.query} is not in the database`}>
            {result.suggestions.length ? (
              <span className="flex flex-wrap items-center gap-2">
                Did you mean:
                {result.suggestions.map((s) => (
                  <Button key={s} size="sm" variant="secondary" onClick={() => setQuery(s)} className="font-mono">
                    {s}
                  </Button>
                ))}
              </span>
            ) : (
              "Check the spelling, or look up a file extension instead."
            )}
          </Alert>
        )}
      </div>

      <Notice title="An extension is a label, not proof">
        A file named photo.png can contain anything, and a server or upload form can declare any type. To decide how to
        handle an uploaded file, inspect its contents (for example its signature bytes) and never trust the extension or
        Content-Type alone.
      </Notice>

      {index ? (
        <section aria-labelledby="common-types" className="flex flex-col gap-3">
          <h2 id="common-types" className="text-sm font-medium">Common types</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {COMMON_EXTENSIONS.map((group) => (
              <div key={group.label} className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border bg-surface p-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase">{group.label}</h3>
                <ul className="flex flex-col">
                  {group.extensions.map((ext) => {
                    const type = index.byExtension.get(ext)?.[0];
                    return (
                      <li key={ext}>
                        <button
                          type="button"
                          onClick={() => setQuery(ext)}
                          className="flex w-full items-baseline justify-between gap-2 rounded-sm px-1 py-0.5 text-left font-mono text-xs hover:bg-subtle"
                        >
                          <span className="shrink-0 text-foreground">.{ext}</span>
                          <span className="min-w-0 truncate text-muted-foreground">{type}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function TypeCard({ info, badge, onSelect }: { info: TypeInfo; badge: string | null; onSelect: (query: string) => void }) {
  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-2">
          <code data-mime-type={info.type} className="font-mono text-sm font-medium break-all text-foreground">
            {info.type}
          </code>
          {badge ? <span className="rounded-sm border border-border-strong px-1.5 py-0.5 text-xs text-muted-foreground">{badge}</span> : null}
        </p>
        <CopyButton text={info.type} ariaLabel={`Copy ${info.type}`} variant="ghost" />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Extensions</dt>
        <dd className="flex flex-wrap gap-1.5 font-mono">
          {info.extensions.length
            ? info.extensions.map((ext) => (
                <button key={ext} type="button" onClick={() => onSelect(ext)} className="text-accent hover:underline">
                  .{ext}
                </button>
              ))
            : <span className="text-muted-foreground">None listed</span>}
        </dd>
        <dt className="text-muted-foreground">Source</dt>
        <dd>{info.source ? SOURCE_LABELS[info.source] : "Not specified"}</dd>
        {info.charset ? (
          <>
            <dt className="text-muted-foreground">Default charset</dt>
            <dd className="font-mono">{info.charset}</dd>
          </>
        ) : null}
        {info.compressible !== null ? (
          <>
            <dt className="text-muted-foreground">Compressible</dt>
            <dd>{info.compressible ? "Yes: worth compressing with gzip or Brotli" : "No: usually already compressed"}</dd>
          </>
        ) : null}
      </dl>
    </li>
  );
}
