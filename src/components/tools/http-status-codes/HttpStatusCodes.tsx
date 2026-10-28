"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { STATUS_CLASSES, findStatuses, statusClass, type StatusClass } from "@/lib/tools/http-status";

const CLASS_TONE: Record<StatusClass, string> = {
  "1xx": "text-muted-foreground",
  "2xx": "text-success",
  "3xx": "text-accent",
  "4xx": "text-danger",
  "5xx": "text-danger",
};

export function HttpStatusCodes() {
  const [query, setQuery] = useState("");
  const [classes, setClasses] = useState<StatusClass[]>([]);
  const deferred = useDeferredValue(query);
  const ids = { query: useId(), count: useId() };

  const results = useMemo(() => findStatuses(deferred, classes), [deferred, classes]);
  const toggle = (c: StatusClass) => setClasses((current) => (current.includes(c) ? current.filter((x) => x !== c) : [...current, c]));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.query}>Look up a status code</Label>
          <Input
            id={ids.query}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. 404, 5xx or rate limit"
            autoComplete="off"
            spellCheck={false}
            aria-describedby={ids.count}
            className="max-w-md"
          />
        </div>
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          {STATUS_CLASSES.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={classes.includes(c.value)}
              onClick={() => toggle(c.value)}
              title={c.description}
              className={cn(
                "inline-flex h-8 items-center rounded-sm border px-3 text-sm transition-colors duration-150",
                classes.includes(c.value) ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-border-strong hover:bg-subtle",
              )}
            >
              {c.label}
            </button>
          ))}
          {query || classes.length ? (
            <Button size="sm" variant="ghost" onClick={() => { setQuery(""); setClasses([]); }}>
              Clear
            </Button>
          ) : null}
        </div>
        <p id={ids.count} role="status" className="text-xs text-muted-foreground">
          {results.length} {results.length === 1 ? "status code" : "status codes"}
        </p>
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No status code matches. Try a number such as 404, a class such as 5xx, or words such as &ldquo;not found&rdquo;.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {results.map((s) => (
            <li key={s.code} id={`status-${s.code}`} data-status={s.code} className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className={cn("font-mono text-xl font-semibold", CLASS_TONE[statusClass(s.code)])}>{s.code}</span>
                  <span className="font-semibold">{s.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{s.spec}</span>
                </h2>
                <CopyButton text={`${s.code} ${s.name}`} ariaLabel={`Copy ${s.code} ${s.name}`} variant="ghost" />
              </div>
              <p className="text-sm">{s.description}</p>
              <p className="text-sm text-muted-foreground">{s.usage}</p>
              {s.caution ? <p className="text-sm font-medium text-danger">{s.caution}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
