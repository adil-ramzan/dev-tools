"use client";

import { useDeferredValue, useId, useMemo, useState, useSyncExternalStore } from "react";
import { ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Select } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  dateInputFormats,
  formatDateOutputs,
  localZoneName,
  parseDateInput,
  type AssumedZone,
  type DateInputFormat,
} from "@/lib/tools/date-format";

const SAMPLES = ["2024-03-15T14:30:00Z", "Fri, 15 Mar 2024 14:30:00 GMT", "1710513000", "15 March 2024 2:30 PM"];

const noop = () => () => {};

export function DateTimeFormatConverter() {
  const [input, setInput] = useState("");
  const [format, setFormat] = useState<DateInputFormat>("auto");
  const [zone, setZone] = useState<AssumedZone>("utc");
  const [sample, setSample] = useState(0);
  const deferred = useDeferredValue(input);
  // The browser's zone is only known on the client; the server renders a generic label.
  const zoneName = useSyncExternalStore(noop, localZoneName, () => "local time");
  const inputId = useId();
  const formatId = useId();
  const statusId = useId();

  const parsed = useMemo(() => (deferred.trim() ? parseDateInput(deferred, format, zone) : null), [deferred, format, zone]);
  const outputs = useMemo(() => (parsed?.ok ? formatDateOutputs(parsed.ms) : []), [parsed]);

  const zoneText = !parsed?.ok
    ? null
    : parsed.zone.kind === "explicit"
      ? `Time zone from the input: ${parsed.zone.offset}.`
      : parsed.zone.kind === "assumed"
        ? `The input has no time zone, so it was read as ${parsed.zone.zone === "utc" ? "UTC" : `local time (${zoneName})`}.`
        : "Unix time is always counted in UTC.";

  return (
    <div className="flex flex-col gap-4">
      <ToolToolbar
        actions={
          <>
            <Button
              onClick={() => {
                setInput(SAMPLES[sample % SAMPLES.length]);
                setSample((s) => s + 1);
              }}
              variant="ghost"
              size="sm"
            >
              Sample
            </Button>
            <Button size="sm" onClick={() => { setFormat("iso"); setInput(new Date().toISOString()); }}>
              Now
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setInput("")} disabled={!input}>
              Clear
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={formatId}>Input format</Label>
          <Select id={formatId} value={format} onChange={(e) => setFormat(e.target.value as DateInputFormat)} className="w-64">
            {dateInputFormats.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </div>
        <SegmentedControl
          label="Times without a zone are in"
          value={zone}
          onChange={setZone}
          options={[
            { value: "utc", label: "UTC" },
            { value: "local", label: `Local (${zoneName})` },
          ]}
        />
      </ToolToolbar>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={inputId}>Date and time</Label>
        <Input
          id={inputId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. 2024-03-15T14:30:00Z, 1710513000 or 15 March 2024 14:30"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={parsed ? !parsed.ok : undefined}
          aria-describedby={statusId}
          className="font-mono"
        />
      </div>

      <div id={statusId}>
        {parsed && !parsed.ok ? (
          <Alert title="Could not read this date">{parsed.error}</Alert>
        ) : parsed?.ok ? (
          <Alert tone={parsed.notes.length ? "warning" : "success"} title={`Recognized as ${parsed.recognized.charAt(0).toLowerCase()}${parsed.recognized.slice(1)}.`}>
            <ul className="flex flex-col gap-0.5">
              <li>{zoneText}</li>
              {parsed.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Alert>
        ) : (
          <p className="text-sm text-muted-foreground">
            Formats with an ambiguous day/month order, such as 03/04/2024, are only read after you choose the order as the
            input format.
          </p>
        )}
      </div>

      {outputs.length ? (
        <dl className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
          {outputs.map((o) => (
            <div key={o.id} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[16rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
              <dt className="text-sm font-medium">{o.label}</dt>
              <dd data-output={o.id} className="min-w-0 font-mono text-sm break-all">
                {o.value}
              </dd>
              <dd>
                <CopyButton text={o.value} ariaLabel={`Copy ${o.label}`} variant="ghost" />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
