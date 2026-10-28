"use client";

import { useEffect, useId, useState } from "react";
import { ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { MAX_ULIDS, decodeUlid, generateUlids } from "@/lib/tools/ulid";

export function UlidGenerator() {
  const [count, setCount] = useState("1");
  const [monotonic, setMonotonic] = useState(true);
  const [lowercase, setLowercase] = useState(false);
  const [ulids, setUlids] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inspect, setInspect] = useState("");
  const countId = useId();
  const countHintId = useId();
  const outputId = useId();
  const inspectId = useId();
  const inspectStatusId = useId();

  const parsed = Number(count);
  const countValid = Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_ULIDS;
  const output = ulids.join("\n");
  const decoded = inspect.trim() ? decodeUlid(inspect) : null;

  function generate() {
    if (!countValid) return;
    const result = generateUlids({ count: parsed, monotonic, lowercase });
    if (result.ok) {
      setUlids(result.ulids);
      setError(null);
    } else {
      setUlids([]);
      setError(result.error);
    }
  }

  // Show a ULID straight away; it is created in the browser after hydration, never on the server.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const result = generateUlids({ count: 1, monotonic: true, lowercase: false });
      if (result.ok) setUlids(result.ulids);
      else setError(result.error);
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <ToolToolbar
          actions={
            <Button variant="primary" onClick={generate} disabled={!countValid}>
              {ulids.length ? "Generate new" : "Generate"}
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
              max={MAX_ULIDS}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              aria-invalid={!countValid}
              aria-describedby={countHintId}
              className="w-28"
            />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 pb-2">
            <Checkbox label="Monotonic (sorted within a millisecond)" checked={monotonic} onChange={(e) => setMonotonic(e.target.checked)} />
            <Checkbox label="Lowercase" checked={lowercase} onChange={(e) => setLowercase(e.target.checked)} />
          </div>
        </ToolToolbar>
        <p id={countHintId} className={countValid ? "-mt-2 text-xs text-muted-foreground" : "-mt-2 text-xs text-danger"}>
          {countValid ? `Up to ${MAX_ULIDS.toLocaleString("en-US")} at a time.` : `Enter a whole number from 1 to ${MAX_ULIDS.toLocaleString("en-US")}.`}
        </p>

        {error ? <Alert title="Could not generate ULIDs">{error}</Alert> : null}

        <ToolPanel
          label={ulids.length ? `${ulids.length.toLocaleString("en-US")} ${ulids.length === 1 ? "ULID" : "ULIDs"}` : "ULIDs"}
          htmlFor={outputId}
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={() => setUlids([])} disabled={!ulids.length}>
                Clear
              </Button>
              <CopyButton text={output} label={ulids.length > 1 ? "Copy all" : "Copy"} ariaLabel="Copy ULIDs" />
            </>
          }
        >
          <Textarea id={outputId} value={output} readOnly placeholder="Choose how many ULIDs you need, then select Generate." className="min-h-48 bg-subtle" rows={Math.min(Math.max(ulids.length, 6), 16)} />
        </ToolPanel>
      </div>

      <section aria-labelledby="ulid-inspect" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 id="ulid-inspect" className="text-sm font-medium">Inspect a ULID</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={inspectId}>ULID</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id={inspectId}
              value={inspect}
              onChange={(e) => setInspect(e.target.value)}
              placeholder="01ARZ3NDEKTSV4RRFFQ69G5FAV"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={decoded ? !decoded.ok : undefined}
              aria-describedby={inspectStatusId}
              className="max-w-md font-mono"
            />
            <Button size="sm" variant="ghost" onClick={() => setInspect(ulids[0] ?? "01ARZ3NDEKTSV4RRFFQ69G5FAV")} className="h-10">
              Sample
            </Button>
          </div>
        </div>
        <div id={inspectStatusId}>
          {decoded && !decoded.ok ? (
            <p className="text-sm text-danger">{decoded.error}</p>
          ) : decoded?.ok ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Timestamp (first 10 characters)</dt>
              <dd data-ulid="time" className="font-mono break-all">
                {new Date(decoded.time).toISOString()} · {decoded.time} ms
              </dd>
              <dt className="text-muted-foreground">Randomness (last 16 characters)</dt>
              <dd data-ulid="random" className="font-mono break-all">
                0x{decoded.random} (80 bits)
              </dd>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Paste a ULID to see when it was created.</p>
          )}
        </div>
      </section>

      <Notice title="ULIDs reveal their creation time">
        Anyone with a ULID can read the millisecond it was created, and monotonic ULIDs from the same millisecond can
        be predicted from each other. Do not use ULIDs as secrets or where creation times are sensitive; use the Token
        Generator for secrets.
      </Notice>
    </div>
  );
}
