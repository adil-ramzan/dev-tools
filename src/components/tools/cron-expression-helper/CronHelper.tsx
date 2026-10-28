"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Select } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { describeCron, fieldBreakdown, nextRuns, parseCron, type CronZone } from "@/lib/tools/cron";

const PRESETS = [
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Hourly", value: "0 * * * *" },
  { label: "Daily at 09:00", value: "0 9 * * *" },
  { label: "Weekdays at 09:00", value: "0 9 * * 1-5" },
  { label: "Every Sunday at midnight", value: "0 0 * * 0" },
  { label: "First of the month", value: "0 0 1 * *" },
];

function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function CronHelper() {
  const [expression, setExpression] = useState("");
  const [zone, setZone] = useState<CronZone>("local");
  const [count, setCount] = useState("10");
  // Runs are computed from the current minute, which is only known in the browser.
  const [now, setNow] = useState<number | null>(null);
  const inputId = useId();
  const countId = useId();

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, []);

  const parsed = useMemo(() => (expression.trim() ? parseCron(expression) : null), [expression]);
  const runs = useMemo(
    () => (parsed?.ok && now !== null ? nextRuns(parsed.cron, new Date(now), Number(count), zone) : []),
    [parsed, now, count, zone],
  );

  const format = (d: Date) =>
    d.toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: zone === "utc" ? "UTC" : undefined,
      timeZoneName: "short",
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={inputId}>Cron expression</Label>
          <div className="flex gap-2">
            <Input
              id={inputId}
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="*/15 9-17 * * MON-FRI"
              spellCheck={false}
              autoComplete="off"
              className="h-11 font-mono text-base"
            />
            <Button variant="ghost" onClick={() => setExpression("")} disabled={!expression}>
              Clear
            </Button>
          </div>
          <p className="font-mono text-xs text-muted-foreground">minute · hour · day of month · month · day of week</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button key={p.value} size="sm" variant="secondary" onClick={() => setExpression(p.value)}>
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <SegmentedControl
            label="Time zone"
            value={zone}
            onChange={setZone}
            options={[
              { value: "local", label: "Local time" },
              { value: "utc", label: "UTC" },
            ]}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={countId}>Upcoming runs</Label>
            <Select id={countId} value={count} onChange={(e) => setCount(e.target.value)} className="w-28">
              {["5", "10", "20", "50"].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {parsed && !parsed.ok ? <Alert title="Unsupported or invalid expression">{parsed.error}</Alert> : null}

      {parsed?.ok ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby={`${inputId}-meaning`} className="flex flex-col gap-3">
            <h2 id={`${inputId}-meaning`} className="text-sm font-medium text-muted-foreground">
              Meaning
            </h2>
            <p className="text-xl font-semibold tracking-tight" role="status">
              {describeCron(parsed.cron)}
            </p>
            {parsed.cron.normalized !== parsed.cron.expression ? (
              <p className="text-sm text-muted-foreground">
                {parsed.cron.expression} is shorthand for <code className="font-mono">{parsed.cron.normalized}</code>.
              </p>
            ) : null}
            {!parsed.cron.dayOfMonth.star && !parsed.cron.dayOfWeek.star ? (
              <p className="text-sm text-muted-foreground">
                Both day fields are set, so cron runs on days matching either one, not only days matching both.
              </p>
            ) : null}
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-subtle text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Field</th>
                    <th scope="col" className="px-3 py-2 font-medium">Value</th>
                    <th scope="col" className="px-3 py-2 font-medium">Matches</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldBreakdown(parsed.cron).map((row) => (
                    <tr key={row.field} className="border-t border-border align-top">
                      <td className="px-3 py-2 whitespace-nowrap">{row.field}</td>
                      <td className="px-3 py-2 font-mono">{row.raw}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby={`${inputId}-runs`} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id={`${inputId}-runs`} className="text-sm font-medium text-muted-foreground">
                Next runs ({zone === "utc" ? "UTC" : localTimeZone()})
              </h2>
              <CopyButton text={runs.map((r) => r.toISOString()).join("\n")} label="Copy as ISO 8601" />
            </div>
            {now === null ? null : runs.length === 0 ? (
              <Alert tone="warning" title="This schedule never runs">
                No matching time was found in the next 10 years, for example because the date does not exist (such as 30 February).
              </Alert>
            ) : (
              <ol className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
                {runs.map((run, i) => (
                  <li key={run.getTime()} className="flex items-baseline gap-3 px-3 py-2 text-sm">
                    <span className="w-6 text-right font-mono text-xs text-muted-foreground">{i + 1}</span>
                    <span className="font-mono">{format(run)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
