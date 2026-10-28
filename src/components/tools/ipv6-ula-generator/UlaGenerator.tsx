"use client";

import { useEffect, useId, useState } from "react";
import { ShortcutScope, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { downloadText } from "@/lib/download";
import { MAX_SUBNETS, parseSubnetId, randomGlobalId, ulaPlan } from "@/lib/tools/ipv6-ula";

const DEFAULTS = { count: "4", first: "0" };

export function UlaGenerator() {
  const [globalId, setGlobalId] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countText, setCountText] = useState(DEFAULTS.count);
  const [firstText, setFirstText] = useState(DEFAULTS.first);
  const ids = { count: useId(), first: useId(), subnets: useId(), settings: useId() };

  const count = Number(countText);
  const countValid = Number.isInteger(count) && count >= 1 && count <= MAX_SUBNETS;
  const first = parseSubnetId(firstText);
  const plan = globalId && countValid && first.ok ? ulaPlan(globalId, count, first.value) : null;
  const subnetText = plan ? plan.subnets.map((s) => s.prefix).join("\n") : "";

  function generate() {
    const result = randomGlobalId();
    if (result.ok) {
      setGlobalId(result.globalId);
      setError(null);
    } else {
      setError(result.error);
    }
  }

  // The first prefix is drawn in the browser after hydration, never on the server.
  useEffect(() => {
    const handle = window.setTimeout(generate, 0);
    return () => window.clearTimeout(handle);
  }, []);

  const settingsError = !countValid ? `List 1 to ${MAX_SUBNETS} subnets.` : !first.ok ? first.error : null;

  const rows: [string, string, string][] = plan
    ? [
        ["ULA prefix (/48)", plan.prefix, "prefix"],
        ["Global ID (40 bits)", plan.globalId, "global-id"],
        ["Prefix written in full", plan.expanded, "expanded"],
        ["Example address in the first subnet", plan.example, "example"],
      ]
    : [];

  return (
    <ShortcutScope onSubmit={generate} className="flex flex-col gap-4">
      <ToolToolbar
        actions={
          <>
            <Button variant="ghost" onClick={() => { setCountText(DEFAULTS.count); setFirstText(DEFAULTS.first); }} disabled={countText === DEFAULTS.count && firstText === DEFAULTS.first}>
              Reset
            </Button>
            <Button variant="primary" onClick={generate}>
              {globalId ? "Generate new prefix" : "Generate prefix"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.count}>Subnets to list</Label>
          <Input id={ids.count} type="number" inputMode="numeric" min={1} max={MAX_SUBNETS} value={countText} onChange={(e) => setCountText(e.target.value)} aria-invalid={!countValid || undefined} aria-describedby={ids.settings} className="w-28" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.first}>First subnet ID (hex)</Label>
          <Input id={ids.first} value={firstText} onChange={(e) => setFirstText(e.target.value)} aria-invalid={!first.ok || undefined} aria-describedby={ids.settings} autoComplete="off" spellCheck={false} className="w-32 font-mono" />
        </div>
      </ToolToolbar>
      <p id={ids.settings} className={settingsError ? "-mt-2 text-xs text-danger" : "-mt-2 text-xs text-muted-foreground"}>
        {settingsError ?? "Changing these settings keeps the current prefix. Generate a new prefix only for a new site."}
      </p>

      {error ? <Alert title="Could not generate a prefix">{error}</Alert> : null}

      {plan ? (
        <>
          <dl className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
            {rows.map(([label, value, key]) => (
              <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd data-ula={key} className={key === "prefix" ? "col-start-1 font-mono text-base font-medium break-all" : "col-start-1 font-mono text-sm break-all"}>{value}</dd>
                <dd className="col-start-2 row-span-2 row-start-1">
                  <CopyButton text={value} ariaLabel={`Copy ${label.replace(/ \(.*\)$/, "").toLowerCase()}`} variant="ghost" />
                </dd>
              </div>
            ))}
          </dl>

          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <table className="w-full table-fixed text-center text-xs">
              <caption className="px-3 pt-3 pb-2 text-left text-sm font-medium">How the 128 bits are divided</caption>
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="w-[14%] px-1 py-1 font-normal">Prefix</th>
                  <th scope="col" className="w-[31%] px-1 py-1 font-normal">Global ID</th>
                  <th scope="col" className="w-[17%] px-1 py-1 font-normal">Subnet</th>
                  <th scope="col" className="w-[38%] px-1 py-1 font-normal">Interface ID</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr>
                  <td className="border-t border-border px-1 py-2">fd</td>
                  <td className="border-t border-l border-border px-1 py-2 break-all">{plan.globalId}</td>
                  <td className="border-t border-l border-border px-1 py-2">{plan.subnets[0]?.id ?? "0000"}</td>
                  <td className="border-t border-l border-border px-1 py-2 break-all">0000…0001</td>
                </tr>
                <tr className="font-sans text-muted-foreground">
                  <td className="px-1 pb-2">8 bits</td>
                  <td className="border-l border-border px-1 pb-2">40 bits</td>
                  <td className="border-l border-border px-1 pb-2">16 bits</td>
                  <td className="border-l border-border px-1 pb-2">64 bits</td>
                </tr>
              </tbody>
            </table>
            <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              The /48 is yours for one site; the 16-bit subnet field gives 65,536 /64 networks, and each /64 holds 2<sup>64</sup> interface addresses.
            </p>
          </div>

          <ToolPanel
            label={`${plan.subnets.length} ${plan.subnets.length === 1 ? "subnet" : "subnets"} (/64)`}
            htmlFor={ids.subnets}
            actions={
              <>
                <Button size="sm" variant="ghost" onClick={() => downloadText("ula-subnets.txt", `${plan.prefix}\n\n${subnetText}\n`)}>
                  Download
                </Button>
                <CopyButton text={subnetText} ariaLabel="Copy subnets" />
              </>
            }
          >
            <Textarea id={ids.subnets} value={subnetText} readOnly className="bg-subtle font-mono" rows={Math.min(Math.max(plan.subnets.length, 4), 12)} />
          </ToolPanel>
        </>
      ) : null}
    </ShortcutScope>
  );
}
