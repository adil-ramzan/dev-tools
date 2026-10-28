"use client";

import { useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Label, Select, Textarea } from "@/components/ui/Field";
import { PLATFORM_LABELS, SAMPLE_USER_AGENTS, loadBowser, parseUserAgent } from "@/lib/tools/user-agent";

type Bowser = Awaited<ReturnType<typeof loadBowser>>;
type ClientHints = { brands: string; mobile: boolean; platform: string } | null;

type NavigatorWithHints = Navigator & { userAgentData?: { brands: { brand: string; version: string }[]; mobile: boolean; platform: string } };

export function UserAgentParser() {
  const [bowser, setBowser] = useState<Bowser | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [input, setInput] = useState("");
  const [hints, setHints] = useState<ClientHints>(null);
  const deferred = useDeferredValue(input);
  const ids = { input: useId(), sample: useId(), status: useId() };

  useEffect(() => {
    // Bowser is a class: wrap it, or React would call it as a state updater.
    loadBowser().then((b) => setBowser(() => b), () => setLoadFailed(true));
  }, []);

  const result = useMemo(() => (bowser && deferred.trim() ? parseUserAgent(deferred, bowser) : null), [bowser, deferred]);

  function useMine() {
    setInput(navigator.userAgent);
    // Low-entropy client hints are already known to the page; nothing is requested.
    const data = (navigator as NavigatorWithHints).userAgentData;
    setHints(data ? { brands: data.brands.map((b) => `${b.brand} ${b.version}`).join(", "), mobile: data.mobile, platform: data.platform } : null);
  }

  const report = result?.ok ? result.report : null;
  const rows: [string, string][] = report
    ? [
        ["Browser", [report.browser.name, report.browser.version].filter(Boolean).join(" ")],
        ["Rendering engine", [report.engine.name, report.engine.version].filter(Boolean).join(" ")],
        ["Operating system", [report.os.name, report.os.versionName || report.os.version].filter(Boolean).join(" ")],
        ["Device type", PLATFORM_LABELS[report.platform.type] ?? ""],
        ["Device", [report.platform.vendor, report.platform.model].filter(Boolean).join(" ")],
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Label htmlFor={ids.input}>User-agent string</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={useMine}>
              Use my browser
            </Button>
            <Label htmlFor={ids.sample} className="sr-only">
              Sample user agents
            </Label>
            <Select
              id={ids.sample}
              value=""
              onChange={(e) => {
                setInput(e.target.value);
                setHints(null);
              }}
              className="w-48"
            >
              <option value="" disabled>
                Samples…
              </option>
              {SAMPLE_USER_AGENTS.map((s) => (
                <option key={s.label} value={s.ua}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Button size="sm" variant="ghost" onClick={() => { setInput(""); setHints(null); }} disabled={!input}>
              Clear
            </Button>
          </div>
        </div>
        <Textarea
          id={ids.input}
          value={input}
          onChange={(e) => { setInput(e.target.value); setHints(null); }}
          placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 …"
          aria-describedby={ids.status}
          aria-invalid={result ? !result.ok : undefined}
          className="min-h-24 break-all"
        />
      </div>

      <div id={ids.status} aria-live="polite">
        {loadFailed ? (
          <Alert title="The parser could not be loaded">Check your connection and reload the page.</Alert>
        ) : !bowser ? (
          <p className="text-sm text-muted-foreground">Loading the parser…</p>
        ) : result && !result.ok ? (
          <Alert title="Could not parse this string">{result.error}</Alert>
        ) : !report ? (
          <p className="text-sm text-muted-foreground">Paste a user-agent string, choose a sample, or use your own browser&apos;s.</p>
        ) : null}
      </div>

      {report ? (
        <section aria-labelledby="ua-result" className="flex flex-col gap-3">
          <h2 id="ua-result" className="text-sm font-medium">
            Detected{report.isBot ? <span className="ml-2 rounded-sm border border-border-strong px-1.5 py-0.5 text-xs font-normal">Bot or automation</span> : null}
          </h2>
          <dl className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
            {rows.map(([label, value]) => (
              <div key={label} className="grid gap-1 px-3 py-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd data-ua={label.toLowerCase()} className="text-sm font-medium">
                  {value || <span className="font-normal text-muted-foreground">Not detected</span>}
                </dd>
              </div>
            ))}
          </dl>
          {report.notes.length ? (
            <Alert tone="warning" title="Notes">
              <ul className="flex list-disc flex-col gap-0.5 pl-4">
                {report.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          {hints ? (
            <div className="flex flex-col gap-1.5 rounded-md border border-border bg-surface p-3 text-sm">
              <p className="font-medium">Your browser&apos;s client hints (navigator.userAgentData)</p>
              <p className="text-muted-foreground">
                Brands: {hints.brands || "none"} · Platform: {hints.platform || "unknown"} · Mobile: {hints.mobile ? "yes" : "no"}
              </p>
            </div>
          ) : null}
          <div className="flex justify-end">
            <CopyButton text={rows.map(([l, v]) => `${l}: ${v || "Not detected"}`).join("\n")} label="Copy result" ariaLabel="Copy parsed result" />
          </div>
        </section>
      ) : null}

      <Notice title="User-agent detection is a heuristic">
        Any client can send any user-agent string, browsers deliberately freeze or reduce parts of it, and new browsers and
        devices are not recognized until parsers are updated. Use feature detection, not user-agent parsing, to decide what
        a browser can do. The string is parsed in your browser with Bowser and is not sent anywhere.
      </Notice>
    </div>
  );
}
