"use client";

import { useCallback, useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Label, Select, Textarea } from "@/components/ui/Field";
import { MAC_FORMATS, MAX_LINES, formatMac, loadVendorDb, lookupLines, type LookupRow, type MacFormat, type VendorDb } from "@/lib/tools/mac";

const SAMPLE = "00:00:0C:12:34:56\nB8-27-EB-AA-BB-CC\n0050.56c0.0001\nDA:A1:19:00:00:01\nFF:FF:FF:FF:FF:FF";

type Load = { state: "loading" } | { state: "ready"; db: VendorDb } | { state: "error"; message: string };

function rowText(row: LookupRow, format: MacFormat, lowercase: boolean): string {
  if (!row.ok) return `${row.input}\tInvalid: ${row.error}`;
  return `${formatMac(row.hex, format, lowercase)}\t${row.vendor ? row.vendor.name : row.note ?? "No vendor"}`;
}

export function MacLookup() {
  const [input, setInput] = useState("");
  const [format, setFormat] = useState<MacFormat>("colon");
  const [lowercase, setLowercase] = useState(false);
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const deferred = useDeferredValue(input);
  const ids = { input: useId(), format: useId(), status: useId() };

  const fetchData = useCallback(() => {
    setLoad({ state: "loading" });
    loadVendorDb().then(
      (db) => setLoad({ state: "ready", db }),
      (error: unknown) => setLoad({ state: "error", message: error instanceof Error ? error.message : String(error) }),
    );
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(fetchData, 0);
    return () => window.clearTimeout(handle);
  }, [fetchData]);

  const db = load.state === "ready" ? load.db : null;
  const rows = useMemo(() => (db && deferred.trim() ? lookupLines(deferred, db) : []), [db, deferred]);
  const lineCount = deferred.split(/\r?\n/).filter((l) => l.trim()).length;
  const found = rows.filter((r) => r.ok && r.vendor).length;
  const invalid = rows.filter((r) => !r.ok).length;
  const copyAll = rows.map((r) => rowText(r, format, lowercase)).join("\n");
  const single = rows.length === 1 && rows[0].ok && rows[0].complete ? rows[0] : null;

  return (
    <div className="flex flex-col gap-4">
      <ToolToolbar>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.format}>Show addresses with</Label>
          <Select id={ids.format} value={format} onChange={(e) => setFormat(e.target.value as MacFormat)} className="w-44">
            {MAC_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </Select>
        </div>
        <Checkbox label="Lowercase" checked={lowercase} onChange={(e) => setLowercase(e.target.checked)} className="pb-2" />
      </ToolToolbar>

      <ToolPanel
        label="MAC addresses (one per line)"
        htmlFor={ids.input}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setInput(SAMPLE)}>
              Sample
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setInput("")} disabled={!input}>
              Clear
            </Button>
          </>
        }
        after={
          <p id={ids.status} role="status" className="text-sm text-muted-foreground">
            {load.state === "loading"
              ? "Loading the bundled IEEE vendor list…"
              : load.state === "error"
                ? null
                : rows.length
                  ? `${rows.length} ${rows.length === 1 ? "address" : "addresses"} · ${found} with a registered vendor${invalid ? ` · ${invalid} invalid` : ""}${lineCount > MAX_LINES ? ` · only the first ${MAX_LINES.toLocaleString("en-US")} lines are checked` : ""}`
                  : "Results update as you type. Colons, hyphens, Cisco dots or no separators all work."}
          </p>
        }
      >
        <Textarea
          id={ids.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"00:1A:2B:3C:4D:5E\n001a.2b3c.4d5e"}
          aria-describedby={ids.status}
          className="min-h-32 font-mono"
          rows={5}
        />
      </ToolPanel>

      {load.state === "error" ? (
        <Alert title="The vendor list could not be loaded">
          <p>{load.message}</p>
          <Button size="sm" className="mt-2" onClick={fetchData}>
            Try again
          </Button>
        </Alert>
      ) : null}

      {single ? (
        <dl className="grid divide-y divide-border rounded-md border border-border bg-surface sm:grid-cols-2 sm:divide-y-0">
          {MAC_FORMATS.map((f) => {
            const text = formatMac(single.hex, f.value, lowercase);
            return (
              <div key={f.value} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2 sm:border-b sm:border-border sm:odd:border-r">
                <dt className="text-xs text-muted-foreground">{f.label}</dt>
                <dd data-mac-format={f.value} className="col-start-1 font-mono text-sm break-all">{text}</dd>
                <dd className="col-start-2 row-span-2 row-start-1">
                  <CopyButton text={text} ariaLabel={`Copy address with ${f.label.toLowerCase()}`} variant="ghost" />
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      {rows.length ? (
        <section aria-labelledby={`${ids.input}-results`} className="flex flex-col gap-2">
          <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
            <h2 id={`${ids.input}-results`} className="text-sm font-medium">
              Vendors
            </h2>
            <CopyButton text={copyAll} label="Copy results" ariaLabel="Copy results" />
          </div>
          <ol className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
            {rows.map((row, i) => (
              <li key={i} data-mac-row className="flex flex-col gap-0.5 px-3 py-2.5 text-sm">
                <span data-mac-address className="font-mono break-all">{row.ok ? formatMac(row.hex, format, lowercase) : row.input}</span>
                {!row.ok ? (
                  <span className="text-danger">{row.error}</span>
                ) : (
                  <>
                    <span data-vendor className={row.vendor ? "font-medium" : "text-muted-foreground"}>
                      {row.vendor ? row.vendor.name : "No registered vendor"}
                    </span>
                    {row.vendor ? (
                      <span className="text-xs text-muted-foreground">
                        {row.vendor.registry} block <span className="font-mono">{row.vendor.prefix}</span>
                        {row.vendor.country ? ` · ${row.vendor.country}` : ""}
                      </span>
                    ) : null}
                    {row.note ? <span className="text-xs text-muted-foreground">{row.note}</span> : null}
                    <span className="text-xs text-muted-foreground">
                      {row.complete ? (row.bits.multicast ? "Group (multicast) address" : "Individual (unicast) address") : "Vendor prefix only"}
                      {" · "}
                      {row.bits.local ? "locally administered" : "globally unique (assigned by IEEE)"}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {db ? (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">
            Vendor data: IEEE Registration Authority public listings (MA-L, MA-M and MA-S), {db.prefixes.size.toLocaleString("en-US")} prefixes, bundled from {db.package}
            {db.generated ? `, prepared ${db.generated.slice(0, 10)}` : ""}. Lookups run in your browser; nothing is sent anywhere.
          </summary>
          <pre className="mt-2 font-mono text-xs whitespace-pre-wrap">{db.license}</pre>
        </details>
      ) : null}
    </div>
  );
}
