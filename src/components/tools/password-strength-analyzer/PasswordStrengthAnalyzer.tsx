"use client";

import { useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { cn } from "@/lib/cn";
import { MAX_ANALYZED, analyzePassword, loadEstimator } from "@/lib/tools/password-strength";

type Estimator = Awaited<ReturnType<typeof loadEstimator>>;

const SEGMENT_TONE = ["bg-danger", "bg-danger", "bg-muted-foreground", "bg-success", "bg-success"];
const CLASS_LABELS = { lowercase: "Lowercase", uppercase: "Uppercase", digits: "Digits", symbols: "Symbols", other: "Spaces or other" } as const;

export function PasswordStrengthAnalyzer() {
  const [estimator, setEstimator] = useState<Estimator | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [password, setPassword] = useState("");
  const [personal, setPersonal] = useState("");
  const deferredPassword = useDeferredValue(password);
  const deferredPersonal = useDeferredValue(personal);
  const passwordId = useId();
  const personalId = useId();
  const personalHintId = useId();
  const resultId = useId();

  useEffect(() => {
    loadEstimator().then(setEstimator, () => setLoadFailed(true));
  }, []);

  const report = useMemo(
    () => (estimator ? analyzePassword(deferredPassword, deferredPersonal.split(/[\s,;]+/), estimator) : null),
    [estimator, deferredPassword, deferredPersonal],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 rounded-md border border-border bg-surface p-5 sm:p-8">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-end justify-between gap-2">
            <Label htmlFor={passwordId}>Password</Label>
            <Button size="sm" variant="ghost" onClick={() => { setPassword(""); setPersonal(""); }} disabled={!password && !personal}>
              Clear
            </Button>
          </div>
          <PasswordInput id={passwordId} value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby={resultId} placeholder="Type a password to analyze" className="h-12 text-base" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={personalId}>Words about you (optional)</Label>
          <Input
            id={personalId}
            value={personal}
            onChange={(e) => setPersonal(e.target.value)}
            placeholder="e.g. your name, username, email or the site name"
            autoComplete="off"
            spellCheck={false}
            aria-describedby={personalHintId}
          />
          <p id={personalHintId} className="text-xs text-muted-foreground">Passwords built from these are easier to guess for someone who knows you.</p>
        </div>

        <div id={resultId} aria-live="polite" className="flex flex-col gap-4">
          {loadFailed ? (
            <Alert title="The strength estimator could not be loaded">Check your connection and reload the page.</Alert>
          ) : !estimator ? (
            <p className="text-sm text-muted-foreground">Loading the strength estimator and its dictionaries…</p>
          ) : !report ? (
            <p className="text-sm text-muted-foreground">The analysis appears as you type.</p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-lg font-semibold" data-strength-score={report.score}>
                    {report.label}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    Score {report.score}/4 · about 10<sup>{report.guessesLog10.toFixed(1)}</sup> guesses
                  </p>
                </div>
                <div className="grid grid-cols-5 gap-1" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className={cn("h-2 rounded-full", i <= report.score ? SEGMENT_TONE[report.score] : "bg-subtle")} />
                  ))}
                </div>
              </div>

              {report.warning ? <Alert title={report.warning} /> : null}

              {report.suggestions.length ? (
                <section aria-label="How to improve it" className="flex flex-col gap-1.5">
                  <h3 className="text-sm font-medium">How to improve it</h3>
                  <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                    {report.suggestions.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {report.patterns.length ? (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Patterns found:</span> {report.patterns.join(", ")}.
                </p>
              ) : null}

              <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <div className="flex gap-1.5">
                  <dt className="text-muted-foreground">Length</dt>
                  <dd className="font-mono">{report.length}</dd>
                </div>
                {(Object.keys(CLASS_LABELS) as (keyof typeof CLASS_LABELS)[]).map((k) => (
                  <div key={k} className="flex gap-1.5">
                    <dt className="text-muted-foreground">{CLASS_LABELS[k]}</dt>
                    <dd>{report.classes[k] ? "Yes" : "No"}</dd>
                  </div>
                ))}
              </dl>

              <section aria-label="Estimated time to guess" className="flex flex-col gap-1.5">
                <h3 className="text-sm font-medium">Estimated time to guess</h3>
                <dl className="flex flex-col divide-y divide-border rounded-md border border-border">
                  {report.scenarios.map((s) => (
                    <div key={s.id} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 px-3 py-2 text-sm">
                      <dt className="text-muted-foreground">{s.label}</dt>
                      <dd className="font-medium">{s.display}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {report.truncated ? (
                <Alert tone="warning">Only the first {MAX_ANALYZED} characters were analyzed, to keep the page responsive.</Alert>
              ) : null}
            </>
          )}
        </div>
      </div>

      <Notice className="mx-auto w-full max-w-3xl" title="A score is an estimate, not a guarantee">
        The estimate counts how many guesses known patterns would need. It cannot know whether this password has
        leaked, is reused on another site, or follows a pattern attackers use that the dictionaries miss. Your password
        is analyzed in your browser and is never sent, logged, saved or put in the URL. Even so, avoid typing a
        password you use today into any website.
      </Notice>
    </div>
  );
}
