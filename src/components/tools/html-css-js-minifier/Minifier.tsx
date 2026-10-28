"use client";

import { useId, useRef, useState } from "react";
import { ActionBar, ShortcutScope, ToolColumns, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatBytes } from "@/lib/format";
import { minify, type MinifyLanguage } from "@/lib/tools/minify";
import { utf8Length } from "@/lib/tools/unicode";

const languages: { value: MinifyLanguage; label: string }[] = [
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "js", label: "JavaScript" },
];

const samples: Record<MinifyLanguage, string> = {
  html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- Page metadata -->
    <title>  Order summary  </title>
    <style>
      .total { font-weight: bold; color: #ff0000; }
    </style>
  </head>
  <body>
    <h1>Your order</h1>
    <p class="note">
      Thanks for shopping   with us.
    </p>
    <pre>
  Item      Qty
  Coffee    2
    </pre>
    <script>
      const items = [4.5, 3.25];
      const total = items.reduce((sum, price) => sum + price, 0);
      console.log("Total:", total);
    </script>
  </body>
</html>`,
  css: `/*! Theme v1.2 | MIT License */

/* Card component */
.card {
  margin: 0px 0px 16px 0px;
  padding: 16px;
  color: #ffffff;
  background-color: #1f4fe0;
}

@media (max-width: 600px) {
  .card {
    padding: 8px;
  }
}`,
  js: `/*! utils.js | MIT License */

// Returns the total price including tax.
function calculateTotal(items, taxRate) {
  const subtotal = items.reduce(function (sum, item) {
    return sum + item.price * item.quantity;
  }, 0);
  const tax = subtotal * taxRate;
  return Math.round((subtotal + tax) * 100) / 100;
}

console.log(calculateTotal([{ price: 4.5, quantity: 2 }], 0.08));`,
};

type Status =
  | { kind: "error"; message: string }
  | { kind: "done"; before: number; after: number; warnings: string[] }
  | null;

export function Minifier() {
  const [language, setLanguage] = useState<MinifyLanguage>("html");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const inputId = useId();
  const outputId = useId();

  function reset() {
    request.current++;
    setOutput("");
    setStatus(null);
    setBusy(false);
  }

  async function run() {
    const id = ++request.current;
    setBusy(true);
    try {
      const result = await minify(language, input);
      if (id !== request.current) return; // A newer request or a reset happened.
      if (result.ok) {
        setOutput(result.output);
        setStatus({ kind: "done", before: utf8Length(input), after: utf8Length(result.output), warnings: result.warnings });
      } else {
        setOutput("");
        setStatus({ kind: "error", message: result.error });
      }
    } catch {
      if (id !== request.current) return;
      setOutput("");
      setStatus({ kind: "error", message: "The minifier could not be loaded. Check your connection and try again." });
    } finally {
      if (id === request.current) setBusy(false);
    }
  }

  const label = languages.find((l) => l.value === language)?.label ?? "";

  return (
    <ShortcutScope onSubmit={run} disabled={!input.trim() || busy} className="flex flex-col gap-4">
      <ToolToolbar>
        <SegmentedControl
          label="Language"
          value={language}
          onChange={(value) => {
            setLanguage(value);
            reset();
          }}
          options={languages}
        />
      </ToolToolbar>

      <ToolColumns>
        <ToolPanel
          label={`${label} input`}
          htmlFor={inputId}
          actions={
            <Button size="sm" variant="ghost" onClick={() => { setInput(samples[language]); reset(); }}>
              Sample
            </Button>
          }
          footer={input ? formatBytes(utf8Length(input)) : null}
          after={
            <ActionBar
              shortcut
              primary={
                <Button variant="primary" onClick={run} disabled={!input.trim() || busy} aria-busy={busy}>
                  {busy ? "Minifying…" : `Minify ${label}`}
                </Button>
              }
              secondary={
                <Button variant="ghost" onClick={() => { setInput(""); reset(); }} disabled={!input && !output}>
                  Clear
                </Button>
              }
              status={
                status?.kind === "error" ? (
                  <Alert title={`Could not minify this ${label}`}>{status.message}</Alert>
                ) : status?.kind === "done" ? (
                  <Alert
                    tone={status.warnings.length ? "warning" : "success"}
                    title={`Minified: ${formatBytes(status.before)} → ${formatBytes(status.after)}${
                      status.before > 0 ? ` (${Math.max(0, Math.round((1 - status.after / status.before) * 100))}% smaller)` : ""
                    }`}
                  >
                    {status.warnings.length ? (
                      <ul className="flex flex-col gap-0.5">
                        {status.warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    ) : null}
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
            placeholder={`Paste ${label} here`}
            className="min-h-80 lg:min-h-[28rem]"
            wrap="off"
          />
        </ToolPanel>
        <ToolPanel label="Minified output" htmlFor={outputId} actions={<CopyButton text={output} ariaLabel="Copy minified output" />}>
          <Textarea
            id={outputId}
            value={output}
            readOnly
            placeholder="Minified code appears here"
            className="min-h-80 bg-subtle lg:min-h-[28rem]"
          />
        </ToolPanel>
      </ToolColumns>
    </ShortcutScope>
  );
}
