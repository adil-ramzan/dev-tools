"use client";

import { useId, useRef, useState } from "react";
import { ActionBar, ShortcutScope, ToolColumns, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Label, Textarea } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { decryptText, encryptText } from "@/lib/tools/text-encryption";

type Mode = "encrypt" | "decrypt";

export function TextEncryption() {
  const [mode, setMode] = useState<Mode>("encrypt");
  const [input, setInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<{ tone: "danger" | "success" | "warning"; title: string; detail?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const inputId = useId();
  const outputId = useId();
  const passwordId = useId();
  const confirmId = useId();

  const encrypting = mode === "encrypt";
  const mismatch = encrypting && confirm !== "" && confirm !== password;
  const ready = password !== "" && (encrypting ? confirm === password : input.trim() !== "");

  async function run() {
    const id = ++request.current;
    setBusy(true);
    setStatus(null);
    setOutput("");
    const result = encrypting ? await encryptText(input, password) : await decryptText(input, password);
    if (id !== request.current) return;
    setBusy(false);
    if (!result.ok) {
      setStatus({ tone: "danger", title: encrypting ? "Could not encrypt" : "Could not decrypt", detail: result.error });
      return;
    }
    if ("payload" in result) {
      setOutput(result.payload);
      setStatus(result.warnings.length ? { tone: "warning", title: "Encrypted.", detail: result.warnings.join(" ") } : { tone: "success", title: "Encrypted." });
    } else {
      setOutput(result.plaintext);
      setStatus({ tone: "success", title: "Decrypted and verified: the text has not been changed." });
    }
  }

  function reset(next: { mode?: Mode; input?: string; keepPassword?: boolean } = {}) {
    request.current++;
    if (next.mode) setMode(next.mode);
    setInput(next.input ?? "");
    if (!next.keepPassword) {
      setPassword("");
      setConfirm("");
    }
    setOutput("");
    setStatus(null);
    setBusy(false);
  }

  return (
    <ShortcutScope onSubmit={run} disabled={!ready || busy} className="flex flex-col gap-4">
      <ToolToolbar>
        <SegmentedControl
          label="Mode"
          value={mode}
          onChange={(m) => reset({ mode: m, keepPassword: true })}
          options={[
            { value: "encrypt", label: "Encrypt" },
            { value: "decrypt", label: "Decrypt" },
          ]}
        />
        <div className="flex w-64 flex-col gap-1.5">
          <Label htmlFor={passwordId}>Password</Label>
          <PasswordInput id={passwordId} value={password} onChange={(e) => setPassword(e.target.value)} className="h-9" />
        </div>
        {encrypting ? (
          <div className="flex w-64 flex-col gap-1.5">
            <Label htmlFor={confirmId}>Confirm password</Label>
            <PasswordInput id={confirmId} value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={mismatch || undefined} className="h-9" />
          </div>
        ) : null}
      </ToolToolbar>
      {mismatch ? <p className="-mt-2 text-sm text-danger">The passwords do not match.</p> : null}

      <ToolColumns>
        <ToolPanel
          label={encrypting ? "Text to encrypt" : "Encrypted text"}
          htmlFor={inputId}
          actions={
            <>
              {encrypting ? (
                <Button size="sm" variant="ghost" onClick={() => reset({ input: "Meet at the north entrance at 9:30. The door code is 4821.", keepPassword: true })}>
                  Sample
                </Button>
              ) : null}
            </>
          }
          after={
            <ActionBar
              shortcut
              primary={
                <Button variant="primary" onClick={run} disabled={!ready || busy} aria-busy={busy}>
                  {busy ? (encrypting ? "Encrypting…" : "Decrypting…") : encrypting ? "Encrypt" : "Decrypt"}
                </Button>
              }
              secondary={
                <Button variant="ghost" onClick={() => reset()} disabled={!input && !output && !password}>
                  Clear
                </Button>
              }
              status={
                status ? (
                  <Alert tone={status.tone} title={status.title}>
                    {status.detail}
                  </Alert>
                ) : null
              }
            />
          }
        >
          <Textarea
            id={inputId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={encrypting ? "Text to protect with a password" : "Paste text that starts with v1.pbkdf2-sha256."}
            className="min-h-64"
            autoComplete="off"
          />
        </ToolPanel>
        <ToolPanel
          label={encrypting ? "Encrypted text" : "Decrypted text"}
          htmlFor={outputId}
          actions={
            <>
              {encrypting ? (
                <Button size="sm" variant="ghost" onClick={() => reset({ mode: "decrypt", input: output, keepPassword: true })} disabled={!output}>
                  Decrypt this
                </Button>
              ) : null}
              <CopyButton text={output} ariaLabel={encrypting ? "Copy encrypted text" : "Copy decrypted text"} />
            </>
          }
        >
          <Textarea id={outputId} value={output} readOnly placeholder="The result appears here" className="min-h-64 bg-subtle break-all" autoComplete="off" />
        </ToolPanel>
      </ToolColumns>

      <Notice title="The password is the only way back">
        The text is encrypted in your browser with AES-256-GCM, using a key derived from your password with PBKDF2
        (600,000 iterations). If you lose the password, the text cannot be recovered by anyone. Nothing is sent, logged
        or saved. Share the password through a different channel from the encrypted text.
      </Notice>
    </ShortcutScope>
  );
}
