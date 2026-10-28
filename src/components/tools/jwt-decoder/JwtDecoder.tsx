"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ToolColumns, ToolPanel } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Textarea } from "@/components/ui/Field";
import { decodeJwt, jwtTimeStatus } from "@/lib/tools/jwt";
import { relativeTime } from "@/lib/tools/timestamp";

const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzg0MjEiLCJuYW1lIjoiQWRhIExvdmVsYWNlIiwiZW1haWwiOiJhZGFAZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJhZG1pbiIsImVkaXRvciJdLCJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJhdWQiOiJhcGkuZXhhbXBsZS5jb20iLCJpYXQiOjE3MzU2ODk2MDAsImV4cCI6NDEwMjQ0NDgwMH0.pBKAoYzkG6sjZe8d9qwem3THOdHBVtBAWqh2RhuYv0s";

const dateFormat = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "long" });

export function JwtDecoder() {
  const [input, setInput] = useState("");
  // Current time for the expiry check, refreshed every 30 seconds.
  const [now, setNow] = useState<number | null>(null);
  const inputId = useId();
  const result = useMemo(() => (input.trim() ? decodeJwt(input) : null), [input]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, []);

  const token = result?.ok ? result.token : null;
  const status = token && now !== null ? jwtTimeStatus(token, now) : null;

  return (
    <div className="flex flex-col gap-6">
      <Notice title="Decoding is not verification">
        This tool reads the token&apos;s contents. It does not check the signature, so it cannot tell you whether the
        token is genuine or has been changed. Only the service that issued the token, holding its key, can verify it.
        The token is decoded in your browser and is not sent anywhere.
      </Notice>

      <ToolPanel
        label="JSON Web Token"
        htmlFor={inputId}
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
        footer="Decodes as you type. A leading “Bearer ” is ignored."
      >
        <Textarea
          id={inputId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="eyJhbGciOi…"
          className="min-h-28 break-all"
          autoComplete="off"
        />
      </ToolPanel>

      {result && !result.ok ? <Alert title="Could not decode this token">{result.error}</Alert> : null}

      {token ? (
        <>
          <dl className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
            <div className="flex flex-col gap-1 bg-surface px-4 py-3">
              <dt className="text-xs text-muted-foreground">Algorithm</dt>
              <dd className="font-mono text-lg font-semibold">{token.algorithm ?? "not set"}</dd>
            </div>
            <div className="flex flex-col gap-1 bg-surface px-4 py-3 sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Time validity (exp and nbf)</dt>
              <dd className="text-lg font-semibold">
                {status === null ? (
                  "…"
                ) : status.kind === "expired" ? (
                  <span className="text-danger">Expired {relativeTime(status.at, now!)}</span>
                ) : status.kind === "not-yet-valid" ? (
                  <span className="text-danger">Not valid until {dateFormat(status.from)}</span>
                ) : status.until === null ? (
                  "No expiry time (exp) set"
                ) : (
                  <span className="text-success">Not expired. Expires {relativeTime(status.until, now!)}</span>
                )}
              </dd>
            </div>
          </dl>

          {token.warnings.length ? (
            <Alert tone="warning" title="Things to check">
              <ul className="flex list-disc flex-col gap-0.5 pl-4">
                {token.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          <ToolColumns>
            <ToolPanel label="Header" labelId={`${inputId}-header`} actions={<CopyButton text={token.header} ariaLabel="Copy header" />}>
              <pre aria-labelledby={`${inputId}-header`} className="overflow-x-auto rounded-sm border border-border bg-subtle p-3 font-mono text-sm leading-relaxed">
                {token.header}
              </pre>
            </ToolPanel>
            <ToolPanel label="Payload" labelId={`${inputId}-payload`} actions={<CopyButton text={token.payload} ariaLabel="Copy payload" />}>
              <pre aria-labelledby={`${inputId}-payload`} className="max-h-96 overflow-auto rounded-sm border border-border bg-subtle p-3 font-mono text-sm leading-relaxed">
                {token.payload}
              </pre>
            </ToolPanel>
          </ToolColumns>

          {token.claims.length ? (
            <section aria-labelledby={`${inputId}-claims`} className="flex flex-col gap-3">
              <h2 id={`${inputId}-claims`} className="text-sm font-medium">
                Claims
              </h2>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-subtle text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">Claim</th>
                      <th scope="col" className="px-3 py-2 font-medium">Value</th>
                      <th scope="col" className="px-3 py-2 font-medium">Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {token.claims.map((claim) => (
                      <tr key={claim.name} className="border-t border-border align-top">
                        <td className="px-3 py-2 font-mono whitespace-nowrap">{claim.name}</td>
                        <td className="min-w-40 px-3 py-2 font-mono break-all whitespace-pre-wrap">{claim.value}</td>
                        <td className="min-w-40 px-3 py-2 text-muted-foreground">
                          {claim.label ?? "Custom claim"}
                          {claim.time !== undefined ? (
                            <span className="block text-foreground">
                              {dateFormat(claim.time)}
                              {now !== null ? <span className="text-muted-foreground"> ({relativeTime(claim.time, now)})</span> : null}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <ToolPanel label="Signature (not verified)" labelId={`${inputId}-signature`} actions={<CopyButton text={token.signature} ariaLabel="Copy signature" />}>
            <p aria-labelledby={`${inputId}-signature`} className="rounded-sm border border-border bg-subtle p-3 font-mono text-sm break-all text-muted-foreground">
              {token.signature || "No signature"}
            </p>
          </ToolPanel>
        </>
      ) : null}
    </div>
  );
}
