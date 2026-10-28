"use client";

import { useId, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { buildBasicAuth, decodeBasicAuth } from "@/lib/tools/basic-auth";

/** Single-quotes a value for a POSIX shell. */
const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

export function BasicAuthHeaderGenerator() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [encoded, setEncoded] = useState("");
  const ids = { username: useId(), password: useId(), header: useId(), token: useId(), curl: useId(), decode: useId(), usernameError: useId(), passwordError: useId() };

  const result = username || password ? buildBasicAuth(username, password) : null;
  const decoded = encoded.trim() ? decodeBasicAuth(encoded) : null;
  const header = result?.ok ? result.header : "";
  const curl = result?.ok ? `curl -H ${shellQuote(result.header)} https://api.example.com/` : "";

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="basic-generate" className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="basic-generate" className="font-semibold tracking-tight">Generate a header</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setUsername("Aladdin"); setPassword("open sesame"); }}>
              Sample
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setUsername(""); setPassword(""); }} disabled={!username && !password}>
              Clear
            </Button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.username}>Username</Label>
            <Input
              id={ids.username}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-invalid={result && !result.ok && result.field === "username" ? true : undefined}
              aria-describedby={result && !result.ok && result.field === "username" ? ids.usernameError : undefined}
              className="font-mono"
            />
            {result && !result.ok && result.field === "username" ? <p id={ids.usernameError} className="text-sm text-danger">{result.error}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.password}>Password</Label>
            <PasswordInput
              id={ids.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={result && !result.ok && result.field === "password" ? true : undefined}
              aria-describedby={result && !result.ok && result.field === "password" ? ids.passwordError : undefined}
            />
            {result && !result.ok && result.field === "password" ? <p id={ids.passwordError} className="text-sm text-danger">{result.error}</p> : null}
          </div>
        </div>

        {result?.ok ? result.warnings.map((w) => <Alert key={w} tone="warning">{w}</Alert>) : null}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={ids.header}>Header</Label>
            <CopyButton text={header} ariaLabel="Copy header" />
          </div>
          <Input id={ids.header} value={header} readOnly placeholder="Authorization: Basic …" className="bg-subtle font-mono" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={ids.token}>Value only</Label>
              <CopyButton text={result?.ok ? `Basic ${result.token}` : ""} ariaLabel="Copy header value" />
            </div>
            <Input id={ids.token} value={result?.ok ? `Basic ${result.token}` : ""} readOnly className="bg-subtle font-mono" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={ids.curl}>curl</Label>
              <CopyButton text={curl} ariaLabel="Copy curl command" />
            </div>
            <Input id={ids.curl} value={curl} readOnly className="bg-subtle font-mono text-xs" />
          </div>
        </div>
      </section>

      <section aria-labelledby="basic-decode" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <h2 id="basic-decode" className="font-semibold tracking-tight">Decode a header</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.decode}>Authorization header or Base64 value</Label>
          <Input id={ids.decode} value={encoded} onChange={(e) => setEncoded(e.target.value)} placeholder="Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==" autoComplete="off" spellCheck={false} className="font-mono" />
        </div>
        {decoded ? (
          decoded.ok ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm" aria-live="polite">
              <dt className="text-muted-foreground">Username</dt>
              <dd data-decoded="username" className="font-mono break-all">{decoded.username}</dd>
              <dt className="text-muted-foreground">Password</dt>
              <dd data-decoded="password" className="font-mono break-all">{decoded.password || <span className="text-muted-foreground">(empty)</span>}</dd>
            </dl>
          ) : (
            <p role="status" className="text-sm text-danger">{decoded.error}</p>
          )
        ) : null}
      </section>

      <Notice title="Base64 is encoding, not encryption">
        Anyone who sees this header can decode the username and password instantly, as the decoder above shows. Send
        Basic authentication only over HTTPS, and prefer tokens that can be scoped and revoked where the API supports
        them. The credentials are encoded in your browser and are never sent, logged or saved.
      </Notice>
    </div>
  );
}
