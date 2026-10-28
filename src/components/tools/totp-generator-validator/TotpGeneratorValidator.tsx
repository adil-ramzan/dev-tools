"use client";

import { useEffect, useId, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  DEFAULT_SETTINGS,
  MAX_PERIOD,
  MAX_WINDOW,
  MIN_PERIOD,
  buildOtpauthUri,
  generateSecret,
  parseOtpauthUri,
  totp,
  verifyTotp,
  type OtpAlgorithm,
  type TotpSettings,
} from "@/lib/tools/totp";

/** Current time in milliseconds, updated every second while the page is open. */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);
  return now;
}

export function TotpGeneratorValidator() {
  const [secret, setSecret] = useState("");
  const [settings, setSettings] = useState<TotpSettings>(DEFAULT_SETTINGS);
  const [periodText, setPeriodText] = useState("30");
  const [issuer, setIssuer] = useState("");
  const [account, setAccount] = useState("");
  const [uriInput, setUriInput] = useState("");
  const [uriStatus, setUriStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [code, setCode] = useState<{ code: string; counter: number } | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState("");
  const [window_, setWindow] = useState(1);
  const [verdict, setVerdict] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const now = useNow();
  const ids = { secret: useId(), uri: useId(), algorithm: useId(), period: useId(), issuer: useId(), account: useId(), candidate: useId(), window: useId(), built: useId() };

  const counter = now === null ? null : Math.floor(now / 1000 / settings.period);
  const remaining = now === null ? settings.period : settings.period - (Math.floor(now / 1000) % settings.period);

  // Recompute only when the time step, secret or settings change, not every second.
  useEffect(() => {
    if (counter === null) return;
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      if (!secret.trim()) {
        setCode(null);
        setCodeError(null);
        return;
      }
      const result = await totp(secret, settings, counter * settings.period * 1000);
      if (cancelled) return;
      if (result.ok) {
        setCode({ code: result.code, counter: result.counter });
        setCodeError(null);
      } else {
        setCode(null);
        setCodeError(result.error);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [secret, settings, counter]);

  function newSecret() {
    const result = generateSecret();
    if (result.ok && result.base32) {
      setSecret(result.base32);
      setCodeError(null);
    } else if (!result.ok) {
      setCodeError(result.error);
    }
  }

  function importUri() {
    const result = parseOtpauthUri(uriInput);
    if (!result.ok) {
      setUriStatus({ ok: false, message: result.error });
      return;
    }
    const { secret: s, issuer: i, account: a, ...rest } = result.value;
    setSecret(s);
    setIssuer(i);
    setAccount(a);
    setSettings(rest);
    setPeriodText(String(rest.period));
    setUriInput("");
    setUriStatus({ ok: true, message: `Imported${i ? ` ${i}` : ""}${a ? ` (${a})` : ""}. ${result.warnings.join(" ")}`.trim() });
  }

  async function verify() {
    if (now === null) return;
    const result = await verifyTotp(candidate, secret, settings, Date.now(), window_);
    if (!result.ok) setVerdict({ tone: "danger", text: result.error });
    else if (!result.valid) setVerdict({ tone: "danger", text: `Invalid: the code does not match this secret within ±${window_} ${window_ === 1 ? "period" : "periods"}.` });
    else {
      const when = result.offset === 0 ? "the current period" : `${Math.abs(result.offset)} ${Math.abs(result.offset) === 1 ? "period" : "periods"} ${result.offset < 0 ? "ago" : "ahead"}`;
      setVerdict({ tone: "success", text: `Valid: the code matches ${when}.` });
    }
  }

  function setPeriod(text: string) {
    setPeriodText(text);
    const n = Number(text);
    if (Number.isInteger(n) && n >= MIN_PERIOD && n <= MAX_PERIOD) setSettings((s) => ({ ...s, period: n }));
  }

  function clearAll() {
    setSecret("");
    setIssuer("");
    setAccount("");
    setUriInput("");
    setUriStatus(null);
    setCandidate("");
    setVerdict(null);
    setCode(null);
    setCodeError(null);
    setSettings(DEFAULT_SETTINGS);
    setPeriodText("30");
  }

  const periodValid = Number(periodText) === settings.period;
  const builtUri = secret.trim() && !codeError ? buildOtpauthUri({ secret, issuer, account: account || "account", ...settings }) : "";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="totp-secret" className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id="totp-secret" className="font-semibold tracking-tight">Secret and settings</h2>
            <Button size="sm" variant="ghost" onClick={clearAll}>
              Clear
            </Button>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.secret}>Secret (Base32)</Label>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <PasswordInput id={ids.secret} noun="secret" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="e.g. JBSWY3DPEHPK3PXP" />
              </div>
              <Button onClick={newSecret}>Generate</Button>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.algorithm}>Algorithm</Label>
              <Select id={ids.algorithm} value={settings.algorithm} onChange={(e) => setSettings((s) => ({ ...s, algorithm: e.target.value as OtpAlgorithm }))} className="w-32">
                <option value="SHA-1">SHA-1</option>
                <option value="SHA-256">SHA-256</option>
                <option value="SHA-512">SHA-512</option>
              </Select>
            </div>
            <SegmentedControl
              label="Digits"
              value={String(settings.digits) as "6" | "7" | "8"}
              onChange={(v) => setSettings((s) => ({ ...s, digits: Number(v) }))}
              options={[
                { value: "6", label: "6" },
                { value: "7", label: "7" },
                { value: "8", label: "8" },
              ]}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.period}>Period (seconds)</Label>
              <Input id={ids.period} type="number" min={MIN_PERIOD} max={MAX_PERIOD} value={periodText} onChange={(e) => setPeriod(e.target.value)} aria-invalid={!periodValid || undefined} className="h-9 w-24" />
            </div>
          </div>
          {!periodValid ? <p className="-mt-2 text-xs text-danger">Enter a period from {MIN_PERIOD} to {MAX_PERIOD} seconds.</p> : null}
          {settings.algorithm !== "SHA-1" || settings.digits !== 6 || settings.period !== 30 ? (
            <p className="text-xs text-muted-foreground">Many authenticator apps support only SHA-1, 6 digits and 30 seconds.</p>
          ) : null}

          <div className="flex flex-col gap-1.5 border-t border-border pt-4">
            <Label htmlFor={ids.uri}>Import an otpauth:// URI</Label>
            <div className="flex gap-2">
              <Input id={ids.uri} value={uriInput} onChange={(e) => { setUriInput(e.target.value); setUriStatus(null); }} placeholder="otpauth://totp/Issuer:account?secret=…" autoComplete="off" spellCheck={false} className="min-w-0 flex-1 font-mono text-xs" />
              <Button onClick={importUri} disabled={!uriInput.trim()}>Import</Button>
            </div>
            {uriStatus ? <p role="status" className={uriStatus.ok ? "text-sm text-success" : "text-sm text-danger"}>{uriStatus.message}</p> : null}
          </div>
        </section>

        <section aria-labelledby="totp-code" className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
          <h2 id="totp-code" className="font-semibold tracking-tight">Current code</h2>
          {codeError ? <Alert title="Cannot compute a code">{codeError}</Alert> : null}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p data-totp-code className="font-mono text-4xl font-semibold tracking-[0.2em] tabular-nums" aria-live="off">
              {code ? code.code : "–".repeat(settings.digits)}
            </p>
            <CopyButton text={code?.code ?? ""} ariaLabel="Copy code" variant="primary" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
              <div className="h-full rounded-full bg-accent motion-safe:transition-[width] motion-safe:duration-1000 motion-safe:ease-linear" style={{ width: `${(remaining / settings.period) * 100}%` }} />
            </div>
            <p className="text-xs text-muted-foreground" data-totp-remaining={remaining}>
              {code ? `Changes in ${remaining} s` : "Enter or generate a secret to see the code."}
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <h3 className="text-sm font-medium">Validate a code</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={ids.candidate}>Code</Label>
                <Input id={ids.candidate} value={candidate} onChange={(e) => { setCandidate(e.target.value); setVerdict(null); }} onKeyDown={(e) => e.key === "Enter" && void verify()} inputMode="numeric" autoComplete="one-time-code" className="h-9 w-36 font-mono" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={ids.window}>Allowed clock skew</Label>
                <Select id={ids.window} value={String(window_)} onChange={(e) => setWindow(Number(e.target.value))} className="w-44">
                  {Array.from({ length: MAX_WINDOW + 1 }, (_, n) => (
                    <option key={n} value={n}>
                      {n === 0 ? "None" : `±${n} ${n === 1 ? "period" : "periods"} (±${n * settings.period} s)`}
                    </option>
                  ))}
                </Select>
              </div>
              <Button onClick={verify} disabled={!candidate.trim() || !secret.trim()}>
                Validate
              </Button>
            </div>
            {verdict ? <p role="status" className={verdict.tone === "success" ? "text-sm text-success" : "text-sm text-danger"}>{verdict.text}</p> : null}
          </div>
        </section>
      </div>

      <section aria-labelledby="totp-uri" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 id="totp-uri" className="font-semibold tracking-tight">Setup URI</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.issuer}>Issuer</Label>
            <Input id={ids.issuer} value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="e.g. Example Co" autoComplete="off" className="h-9 w-56" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.account}>Account</Label>
            <Input id={ids.account} value={account} onChange={(e) => setAccount(e.target.value)} placeholder="e.g. ada@example.com" autoComplete="off" className="h-9 w-56" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={ids.built}>otpauth:// URI</Label>
            <CopyButton text={builtUri} ariaLabel="Copy otpauth URI" />
          </div>
          <Textarea id={ids.built} value={builtUri} readOnly placeholder="Enter a secret to build the URI" className="min-h-20 bg-subtle text-xs break-all" />
          <p className="text-xs text-muted-foreground">
            Authenticator apps usually import this URI from a QR code. This tool does not draw QR codes; most apps also
            accept the secret typed in manually.
          </p>
        </div>
      </section>

      <Notice title="Secrets and codes are sensitive">
        Anyone with the secret can generate valid codes for the account forever, so treat it like a password. Codes are
        valid for only a short time but still grant access while they are. Everything is computed in your browser with Web
        Crypto and is never sent, logged, saved or put in the URL.
      </Notice>
    </div>
  );
}
