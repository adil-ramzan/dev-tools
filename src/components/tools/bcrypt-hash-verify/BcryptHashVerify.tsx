"use client";

import { useId, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { RangeField } from "@/components/ui/RangeField";
import {
  DEFAULT_COST,
  MAX_COST,
  MIN_COST,
  SLOW_COST,
  estimateMs,
  hashPassword,
  parseHash,
  verifyPassword,
} from "@/lib/tools/bcrypt";

function duration(ms: number): string {
  if (ms < 1000) return `${Math.max(1, Math.round(ms))} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms / 60_000)} min`;
}

export function BcryptHashVerify() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <GeneratePanel />
        <VerifyPanel />
      </div>
      <Notice title="bcrypt hashes cannot be decrypted">
        bcrypt is a one-way function: there is no key that turns a hash back into the password. A password can only be
        checked by hashing it again with the salt and cost stored in the hash. Passwords and hashes stay in this page&apos;s
        memory and are never sent, logged or saved.
      </Notice>
    </div>
  );
}

function GeneratePanel() {
  const [password, setPassword] = useState("");
  const [cost, setCost] = useState(DEFAULT_COST);
  const [result, setResult] = useState<{ hash: string; ms: number; cost: number; warnings: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const passwordId = useId();
  const hashId = useId();

  async function generate() {
    const id = ++request.current;
    setBusy(true);
    setResult(null);
    setError(null);
    const outcome = await hashPassword(password, cost);
    if (id !== request.current) return;
    setBusy(false);
    if (outcome.ok) setResult({ hash: outcome.hash, ms: outcome.ms, cost, warnings: outcome.warnings });
    else setError(outcome.error);
  }

  function clear() {
    request.current++;
    setPassword("");
    setResult(null);
    setError(null);
    setBusy(false);
  }

  return (
    <section aria-labelledby="bcrypt-generate" className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
      <h2 id="bcrypt-generate" className="font-semibold tracking-tight">Generate a hash</h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={passwordId}>Password</Label>
        <PasswordInput id={passwordId} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && password && !busy && void generate()} />
      </div>
      <RangeField label={`Cost factor (${cost}: ${(2 ** cost).toLocaleString("en-US")} rounds)`} value={cost} min={MIN_COST} max={MAX_COST} onChange={setCost} />
      <p className={cost > SLOW_COST ? "-mt-2 text-xs text-danger" : "-mt-2 text-xs text-muted-foreground"}>
        {cost < 10
          ? "Below 10 is fast to crack; use it only for testing."
          : cost > SLOW_COST
            ? "This cost can take many seconds in a browser. Each step doubles the time."
            : "10–12 is a common choice for servers today. Each step doubles the time."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={generate} disabled={!password || busy} aria-busy={busy}>
          {busy ? "Hashing…" : "Generate hash"}
        </Button>
        <Button variant="ghost" onClick={clear} disabled={!password && !result && !error}>
          Clear
        </Button>
      </div>

      {error ? <Alert title="Could not hash this password">{error}</Alert> : null}
      {result?.warnings.map((w) => <Alert key={w} tone="warning">{w}</Alert>)}
      {result ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={hashId}>Generated hash</Label>
            <CopyButton text={result.hash} ariaLabel="Copy bcrypt hash" />
          </div>
          <Input id={hashId} value={result.hash} readOnly className="bg-subtle font-mono text-xs sm:text-sm" />
          <p role="status" className="font-mono text-xs text-muted-foreground">
            Cost {result.cost} took {duration(result.ms)} here
            {result.cost < MAX_COST ? `; cost ${result.cost + 1} would take about ${duration(estimateMs(result.ms, result.cost, result.cost + 1))}` : ""}.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function VerifyPanel() {
  const [password, setPassword] = useState("");
  const [hash, setHash] = useState("");
  const [result, setResult] = useState<{ match: boolean; ms: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const passwordId = useId();
  const hashId = useId();
  const hashHintId = useId();

  const info = hash.trim() ? parseHash(hash) : null;

  async function verify() {
    const id = ++request.current;
    setBusy(true);
    setResult(null);
    setError(null);
    const outcome = await verifyPassword(password, hash);
    if (id !== request.current) return;
    setBusy(false);
    if (outcome.ok) setResult({ match: outcome.match, ms: outcome.ms });
    else setError(outcome.error);
  }

  function clear() {
    request.current++;
    setPassword("");
    setHash("");
    setResult(null);
    setError(null);
    setBusy(false);
  }

  return (
    <section aria-labelledby="bcrypt-verify" className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
      <h2 id="bcrypt-verify" className="font-semibold tracking-tight">Verify a password</h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={passwordId}>Password to check</Label>
        <PasswordInput id={passwordId} value={password} onChange={(e) => { setPassword(e.target.value); setResult(null); }} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={hashId}>bcrypt hash</Label>
        <Input
          id={hashId}
          value={hash}
          onChange={(e) => { setHash(e.target.value); setResult(null); setError(null); }}
          placeholder="$2b$10$…"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={info ? !info.ok : undefined}
          aria-describedby={hashHintId}
          className="font-mono text-xs sm:text-sm"
        />
        <p id={hashHintId} className={info && !info.ok ? "text-xs text-danger" : "text-xs text-muted-foreground"}>
          {info ? (info.ok ? `Version $${info.variant}$, cost ${info.cost}, salt ${info.salt}` : info.error) : "Paste a hash that starts with $2a$, $2b$ or $2y$."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={verify} disabled={!password || !info?.ok || busy} aria-busy={busy}>
          {busy ? "Checking…" : "Verify"}
        </Button>
        <Button variant="ghost" onClick={clear} disabled={!password && !hash && !result && !error}>
          Clear
        </Button>
      </div>
      {error ? <Alert title="Could not verify">{error}</Alert> : null}
      {result ? (
        result.match ? (
          <Alert tone="success" title="Match: the password is correct for this hash.">Checked in {duration(result.ms)}.</Alert>
        ) : (
          <Alert title="No match: the password does not produce this hash.">
            Check for typing mistakes, extra spaces or a different keyboard layout.
          </Alert>
        )
      ) : null}
    </section>
  );
}
