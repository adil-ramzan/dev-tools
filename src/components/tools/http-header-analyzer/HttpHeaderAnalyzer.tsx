"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { ActionBar, ToolPanel } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { GROUP_LABELS, MAX_HEADERS_LENGTH, SAMPLE_HEADERS, analyzeHeaders, headerInfo, type Finding, type Severity } from "@/lib/tools/http-headers";

const SEVERITY: Record<Severity, { label: string; className: string }> = {
  error: { label: "Error", className: "border-danger text-danger" },
  warning: { label: "Warning", className: "border-border-strong text-foreground" },
  info: { label: "Info", className: "border-border text-muted-foreground" },
  ok: { label: "OK", className: "border-success text-success" },
};

function report(findings: Finding[]): string {
  return findings.map((f) => `[${SEVERITY[f.severity].label}] ${f.title}\n  ${f.detail}`).join("\n");
}

export function HttpHeaderAnalyzer() {
  const [text, setText] = useState("");
  const [https, setHttps] = useState(true);
  const deferred = useDeferredValue(text);
  const inputId = useId();
  const tooLong = deferred.length > MAX_HEADERS_LENGTH;
  const analysis = useMemo(() => (deferred.trim() && !tooLong ? analyzeHeaders(deferred, { https }) : null), [deferred, https, tooLong]);
  const counts = analysis ? (["error", "warning", "info"] as const).map((s) => [s, analysis.findings.filter((f) => f.severity === s).length] as const) : [];

  return (
    <div className="flex flex-col gap-6">
      <ToolPanel
        label="Response headers"
        htmlFor={inputId}
        actions={
          <Button size="sm" variant="ghost" onClick={() => setText(SAMPLE_HEADERS)}>
            Sample
          </Button>
        }
        footer="Paste from curl -I, curl -sD - -o /dev/null, or your browser's developer tools (Network → Response Headers)."
        after={
          <ActionBar
            primary={<Checkbox label="Served over HTTPS" checked={https} onChange={(e) => setHttps(e.target.checked)} />}
            secondary={
              <Button size="sm" variant="ghost" onClick={() => setText("")} disabled={!text}>
                Clear
              </Button>
            }
            status={
              analysis ? (
                <p role="status" className="text-sm text-muted-foreground">
                  {analysis.headers.length} {analysis.headers.length === 1 ? "header" : "headers"}
                  {analysis.status ? ` · HTTP/${analysis.status.version} ${analysis.status.code}${analysis.status.name ? ` ${analysis.status.name}` : ""}` : ""}
                  {" · "}
                  {counts.map(([s, n]) => `${n} ${SEVERITY[s].label.toLowerCase()}${n === 1 ? "" : "s"}`).join(", ")}
                </p>
              ) : null
            }
          />
        }
      >
        <Textarea
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"HTTP/2 200\ncontent-type: text/html; charset=utf-8\ncache-control: max-age=600"}
          className="min-h-56"
          aria-invalid={tooLong || undefined}
        />
      </ToolPanel>

      {tooLong ? <Alert title="Too much text">Paste at most {MAX_HEADERS_LENGTH.toLocaleString("en-US")} characters of headers.</Alert> : null}
      {analysis && analysis.headers.length === 0 && !analysis.status ? <Alert title="No headers found">Each header should be on its own line, as Name: value.</Alert> : null}
      {analysis?.problems.length ? (
        <Alert tone="warning" title={`${analysis.problems.length} ${analysis.problems.length === 1 ? "line was" : "lines were"} not read as headers`}>
          <ul className="flex list-disc flex-col gap-0.5 pl-4">
            {analysis.problems.slice(0, 10).map((p) => (
              <li key={p.line}>
                Line {p.line}: {p.message}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {analysis && (analysis.headers.length > 0 || analysis.status) ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <section aria-labelledby="header-findings" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="header-findings" className="text-base font-semibold">
                Findings
              </h2>
              <CopyButton text={report(analysis.findings)} label="Copy report" ariaLabel="Copy report of findings" />
            </div>
            <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm" data-caching-summary>
              <span className="font-medium">Caching: </span>
              {analysis.caching}
            </p>
            {analysis.findings.length === 0 ? <p className="text-sm text-muted-foreground">No problems found.</p> : null}
            <ul className="flex flex-col gap-2">
              {analysis.findings.map((f, i) => (
                <li key={`${f.title}-${i}`} data-finding={f.severity} className={cn("flex flex-col gap-1 border-l-2 bg-surface py-2 pr-3 pl-3", SEVERITY[f.severity].className.split(" ")[0])}>
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className={cn("text-xs font-semibold tracking-wide uppercase", SEVERITY[f.severity].className.split(" ")[1])}>{SEVERITY[f.severity].label}</span>
                    <span className="font-medium [overflow-wrap:anywhere]">{f.title}</span>
                    <span className="text-xs text-muted-foreground">{GROUP_LABELS[f.group]}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{f.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-col gap-6">
            <section aria-labelledby="security-checklist" className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4">
              <h2 id="security-checklist" className="text-sm font-semibold">
                Security headers
              </h2>
              <ul className="flex flex-col gap-1.5 text-sm">
                {analysis.checklist.map((c) => (
                  <li key={c.name} className="flex items-center justify-between gap-3" data-check={c.name}>
                    <span className="font-mono text-xs [overflow-wrap:anywhere]">{c.name}</span>
                    <span className={c.present ? "text-success" : "text-muted-foreground"}>{c.present ? "Present" : "Missing"}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="header-list" className="flex flex-col gap-2">
              <h2 id="header-list" className="text-sm font-semibold">
                Headers explained
              </h2>
              <dl className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface text-sm">
                {analysis.headers.map((h, i) => {
                  const info = headerInfo(h.name);
                  return (
                    <div key={`${h.name}-${i}`} className="flex flex-col gap-0.5 px-3 py-2">
                      <dt className="font-mono text-xs font-semibold [overflow-wrap:anywhere]">{h.name}</dt>
                      <dd className="font-mono text-xs [overflow-wrap:anywhere] text-muted-foreground">{h.value.length > 300 ? `${h.value.slice(0, 300)}…` : h.value || "(empty)"}</dd>
                      <dd className="text-xs">{info ? info.summary : h.name.toLowerCase().startsWith("x-") ? "Custom (non-standard) header." : "Not in this tool's list of common headers."}</dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          </div>
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Headers are analyzed in your browser from the text you paste. No URL is fetched, so this cannot check a live site; the checks are
        guidance, not a security audit.
      </p>
    </div>
  );
}
