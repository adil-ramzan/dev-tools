"use client";

import { useCallback, useEffect, useState } from "react";
import { ToolToolbar } from "@/components/tools/ToolPanel";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Notice } from "@/components/ui/Notice";
import { cn } from "@/lib/cn";
import { downloadText } from "@/lib/download";
import { KIND_LABELS, buildReport, readSnapshot, reportToJson, reportToText, type InfoSection, type ValueKind } from "@/lib/tools/device-info";

const KIND_STYLES: Record<ValueKind, string> = {
  reported: "border-border-strong text-foreground",
  estimate: "border-dashed border-border-strong text-foreground",
  detected: "border-border text-muted-foreground",
};

const sectionId = (title: string) => `device-${title.toLowerCase().replace(/\W+/g, "-")}`;

export function DeviceInfo() {
  const [sections, setSections] = useState<InfoSection[] | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setSections(buildReport(readSnapshot(window)));
    setUpdated(new Date().toLocaleTimeString());
  }, []);

  // Read the values in the browser after hydration, and again when they change.
  useEffect(() => {
    const handle = window.setTimeout(refresh, 0);
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(refresh);
    };
    const events = ["resize", "online", "offline", "orientationchange"] as const;
    for (const e of events) window.addEventListener(e, schedule);
    const queries = ["(prefers-color-scheme: dark)", "(prefers-reduced-motion: reduce)", "(prefers-contrast: more)"].map((q) => window.matchMedia(q));
    for (const q of queries) q.addEventListener("change", schedule);
    return () => {
      window.clearTimeout(handle);
      cancelAnimationFrame(frame);
      for (const e of events) window.removeEventListener(e, schedule);
      for (const q of queries) q.removeEventListener("change", schedule);
    };
  }, [refresh]);

  const text = sections ? reportToText(sections) : "";

  return (
    <div className="flex flex-col gap-4">
      <ToolToolbar
        actions={
          <>
            <Button variant="ghost" disabled={!sections} onClick={() => sections && downloadText("device-information.json", reportToJson(sections), "application/json")}>
              Download JSON
            </Button>
            <CopyButton text={text} label="Copy report" ariaLabel="Copy report" />
            <Button variant="primary" onClick={refresh}>
              Refresh
            </Button>
          </>
        }
      >
        <p role="status" className="pb-2 text-sm text-muted-foreground">
          {updated ? `Read at ${updated}. Updates when you resize the window or go on- or offline.` : "Reading values from your browser…"}
        </p>
      </ToolToolbar>

      <Notice tone="info" title="Nothing here is stored or sent anywhere.">
        These values come from standard browser APIs and stay on this page. Web pages cannot read hardware identifiers such as serial numbers or MAC addresses, and browsers round or alter some values to protect privacy. <strong className="font-medium text-foreground">Reported</strong> values come straight from the browser, <strong className="font-medium text-foreground">Estimates</strong> are coarse or derived, and <strong className="font-medium text-foreground">Detected</strong> features only exist: none are switched on or asked for permission.
      </Notice>

      {sections ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {sections.map((section) => (
            <section key={section.title} aria-labelledby={sectionId(section.title)} className={cn("min-w-0 rounded-md border border-border bg-surface", section.title === "Browser features" && "lg:row-span-2")}>
              <h2 id={sectionId(section.title)} className="border-b border-border px-3 py-2 text-sm font-medium">
                {section.title}
              </h2>
              <dl className="flex flex-col divide-y divide-border">
                {section.rows.map((row) => (
                  <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-3 py-2">
                    <dt className="text-xs text-muted-foreground">{row.label}</dt>
                    <dd className="col-start-2 row-start-1 self-start">
                      <span data-kind={row.kind} className={cn("inline-block rounded-sm border px-1.5 text-[11px] leading-5", KIND_STYLES[row.kind])}>{KIND_LABELS[row.kind]}</span>
                    </dd>
                    <dd data-info={row.label} className={cn("col-span-2 text-sm break-words", row.label === "User agent" && "font-mono text-xs")}>
                      {row.value}
                    </dd>
                    {row.note ? <dd className="col-span-2 text-xs text-muted-foreground">{row.note}</dd> : null}
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
