"use client";

import { useEffect, useId, useState } from "react";
import { ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { MAX_UUIDS, formatUuid, uuidV4, type UuidFormat } from "@/lib/tools/uuid";

export function UuidGenerator() {
  const [count, setCount] = useState("1");
  const [format, setFormat] = useState<UuidFormat>({ uppercase: false, hyphens: true, braces: false });
  // Raw lowercase UUIDs; formatting options apply on display without regenerating.
  const [uuids, setUuids] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const countId = useId();
  const countHintId = useId();
  const outputId = useId();

  const parsed = Number(count);
  const countValid = Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_UUIDS;
  const output = uuids.map((u) => formatUuid(u, format)).join("\n");

  function generate() {
    if (!countValid) return;
    try {
      setUuids(Array.from({ length: parsed }, () => uuidV4()));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "UUIDs could not be generated.");
    }
  }

  // Show a UUID straight away; it is created in the browser after hydration, never on the server.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      try {
        setUuids([uuidV4()]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "UUIDs could not be generated.");
      }
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);

  const toggle = (key: keyof UuidFormat) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormat((f) => ({ ...f, [key]: e.target.checked }));

  return (
    <div className="flex flex-col gap-4">
      <ToolToolbar
        actions={
          <Button variant="primary" onClick={generate} disabled={!countValid}>
            {uuids.length ? "Generate new" : "Generate"}
          </Button>
        }
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={countId}>How many</Label>
          <Input
            id={countId}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_UUIDS}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            aria-invalid={!countValid}
            aria-describedby={countHintId}
            className="w-28"
          />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 pb-2">
          <Checkbox label="Uppercase" checked={format.uppercase} onChange={toggle("uppercase")} />
          <Checkbox label="Hyphens" checked={format.hyphens} onChange={toggle("hyphens")} />
          <Checkbox label="Braces { }" checked={format.braces} onChange={toggle("braces")} />
        </div>
      </ToolToolbar>
      <p id={countHintId} className={countValid ? "-mt-2 text-xs text-muted-foreground" : "-mt-2 text-xs text-danger"}>
        {countValid ? `Up to ${MAX_UUIDS.toLocaleString()} at a time.` : `Enter a whole number from 1 to ${MAX_UUIDS.toLocaleString()}.`}
      </p>

      {error ? <Alert title="Could not generate UUIDs">{error}</Alert> : null}

      <ToolPanel
        label={uuids.length ? `${uuids.length.toLocaleString()} ${uuids.length === 1 ? "UUID" : "UUIDs"}` : "UUIDs"}
        htmlFor={outputId}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setUuids([])} disabled={!uuids.length}>
              Clear
            </Button>
            <CopyButton text={output} label={uuids.length > 1 ? "Copy all" : "Copy"} ariaLabel="Copy UUIDs" />
          </>
        }
      >
        <Textarea
          id={outputId}
          value={output}
          readOnly
          placeholder="Choose how many UUIDs you need, then select Generate."
          className="min-h-64 bg-subtle"
          rows={Math.min(Math.max(uuids.length, 6), 16)}
        />
      </ToolPanel>
    </div>
  );
}
