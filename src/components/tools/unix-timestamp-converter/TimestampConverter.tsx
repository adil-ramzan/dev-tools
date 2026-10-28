"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  parseIsoDate,
  parseTimestamp,
  relativeTime,
  toIso,
  toUnit,
  unitLabels,
  type DateZone,
  type TimestampUnit,
} from "@/lib/tools/timestamp";

const units: { value: TimestampUnit; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "s", label: "Seconds" },
  { value: "ms", label: "Milliseconds" },
  { value: "us", label: "µs" },
  { value: "ns", label: "ns" },
];

function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function localDisplay(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { dateStyle: "full", timeStyle: "long" });
}

function utcDisplay(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { dateStyle: "full", timeStyle: "long", timeZone: "UTC" });
}

/** Local date-time in ISO form without an offset, for prefilling the date field. */
function localIso(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function TimestampConverter() {
  const [now, setNow] = useState<number | null>(null);
  const [timestamp, setTimestamp] = useState("");
  const [unit, setUnit] = useState<TimestampUnit>("auto");
  const [date, setDate] = useState("");
  const [zone, setZone] = useState<DateZone>("local");
  const tsId = useId();
  const dateId = useId();

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, []);

  const fromTimestamp = useMemo(() => (timestamp.trim() ? parseTimestamp(timestamp, unit) : null), [timestamp, unit]);
  const fromDate = useMemo(() => (date.trim() ? parseIsoDate(date, zone) : null), [date, zone]);
  const nowSeconds = now === null ? "" : String(Math.floor(now / 1000));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-sm text-muted-foreground">Current Unix time</span>
          <span className="font-mono text-xl font-semibold tabular-nums" aria-live="off">
            {nowSeconds || "…"}
          </span>
          <span className="text-xs text-muted-foreground">seconds, updates every second</span>
        </p>
        <CopyButton text={nowSeconds} ariaLabel="Copy current Unix time" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby={`${tsId}-heading`} className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
          <h2 id={`${tsId}-heading`} className="font-semibold tracking-tight">
            Timestamp to date
          </h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={tsId}>Unix timestamp</Label>
            <div className="flex gap-2">
              <Input
                id={tsId}
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                inputMode="decimal"
                placeholder="1700000000"
                autoComplete="off"
                className="font-mono"
              />
              <Button onClick={() => setTimestamp(String(Math.floor(Date.now() / 1000)))}>Now</Button>
              <Button variant="ghost" onClick={() => setTimestamp("")} disabled={!timestamp}>
                Clear
              </Button>
            </div>
          </div>
          <SegmentedControl label="Unit" value={unit} onChange={setUnit} options={units} />

          {fromTimestamp && !fromTimestamp.ok ? <Alert title="Not a valid timestamp">{fromTimestamp.error}</Alert> : null}
          {fromTimestamp?.ok ? (
            <>
              <p className="text-sm text-muted-foreground">
                {fromTimestamp.detected ? "Detected as " : "Read as "}
                <span className="font-medium text-foreground">{unitLabels[fromTimestamp.unit]}</span>
                {fromTimestamp.truncated ? ". Precision below a millisecond is not shown." : "."}
              </p>
              <ResultList
                rows={[
                  { label: "UTC", value: utcDisplay(fromTimestamp.ms) },
                  { label: `Local time (${localTimeZone()})`, value: localDisplay(fromTimestamp.ms) },
                  { label: "ISO 8601", value: toIso(fromTimestamp.ms), mono: true },
                  { label: "Relative", value: now === null ? "…" : relativeTime(fromTimestamp.ms, now) },
                  { label: "Seconds", value: toUnit(fromTimestamp.ms, "s"), mono: true },
                  { label: "Milliseconds", value: toUnit(fromTimestamp.ms, "ms"), mono: true },
                ]}
              />
            </>
          ) : null}
        </section>

        <section aria-labelledby={`${dateId}-heading`} className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
          <h2 id={`${dateId}-heading`} className="font-semibold tracking-tight">
            Date to timestamp
          </h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={dateId}>Date and time (ISO 8601)</Label>
            <div className="flex gap-2">
              <Input
                id={dateId}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="2024-03-15 14:30:00"
                autoComplete="off"
                className="font-mono"
              />
              <Button onClick={() => setDate(zone === "utc" ? toIso(Date.now()) : localIso(Date.now()))}>Now</Button>
              <Button variant="ghost" onClick={() => setDate("")} disabled={!date}>
                Clear
              </Button>
            </div>
          </div>
          <SegmentedControl
            label="Dates without a time zone are in"
            value={zone}
            onChange={setZone}
            options={[
              { value: "local", label: "Local time" },
              { value: "utc", label: "UTC" },
            ]}
          />

          {fromDate && !fromDate.ok ? <Alert title="Not a valid date">{fromDate.error}</Alert> : null}
          {fromDate?.ok ? (
            <>
              <p className="text-sm text-muted-foreground">
                {fromDate.hadZone
                  ? "Using the time zone offset in the date."
                  : zone === "utc"
                    ? "Read as UTC."
                    : `Read as local time (${localTimeZone()}).`}
              </p>
              <ResultList
                rows={[
                  { label: "Seconds", value: toUnit(fromDate.ms, "s"), mono: true },
                  { label: "Milliseconds", value: toUnit(fromDate.ms, "ms"), mono: true },
                  { label: "ISO 8601 (UTC)", value: toIso(fromDate.ms), mono: true },
                  { label: "UTC", value: utcDisplay(fromDate.ms) },
                ]}
              />
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function ResultList({ rows }: { rows: { label: string; value: string; mono?: boolean }[] }) {
  return (
    <dl className="flex flex-col divide-y divide-border border-y border-border">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className={row.mono ? "font-mono text-sm break-all" : "text-sm"}>{row.value}</dd>
          </div>
          <CopyButton text={row.value} variant="ghost" ariaLabel={`Copy ${row.label}`} />
        </div>
      ))}
    </dl>
  );
}
