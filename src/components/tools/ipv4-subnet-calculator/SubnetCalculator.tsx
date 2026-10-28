"use client";

import { useDeferredValue, useId, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Select } from "@/components/ui/Field";
import { addressClass, addressType, calculateSubnet, formatIpv4, parseCidr, prefixToMask, toBinary } from "@/lib/tools/ipv4";

const SAMPLE = "192.168.10.77/26";

export function SubnetCalculator() {
  const [address, setAddress] = useState("");
  const [prefix, setPrefix] = useState("24");
  const deferred = useDeferredValue(address);
  const ids = { address: useId(), prefix: useId(), status: useId() };

  const hasSlash = deferred.includes("/");
  const parsed = deferred.trim() ? parseCidr(deferred, prefix) : null;
  const subnet = parsed?.ok ? calculateSubnet(parsed.address, parsed.prefix) : null;
  const type = subnet ? addressType(subnet.address) : null;

  const rows: [string, string][] = subnet
    ? [
        ["Network address", `${formatIpv4(subnet.network)}/${subnet.prefix}`],
        ["Subnet mask", formatIpv4(subnet.mask)],
        ["Wildcard mask", formatIpv4(subnet.wildcard)],
        ["Broadcast address", subnet.special ? "None (no broadcast in a /31 or /32)" : formatIpv4(subnet.broadcast)],
        ["First usable address", formatIpv4(subnet.firstUsable)],
        ["Last usable address", formatIpv4(subnet.lastUsable)],
        ["Usable hosts", subnet.usable.toLocaleString("en-US")],
        ["Total addresses", subnet.total.toLocaleString("en-US")],
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor={ids.address}>IPv4 address</Label>
            <Input
              id={ids.address}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="192.168.1.10 or 192.168.1.10/24"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={parsed ? !parsed.ok : undefined}
              aria-describedby={ids.status}
              className="font-mono"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.prefix}>Prefix</Label>
            <Select id={ids.prefix} value={prefix} onChange={(e) => setPrefix(e.target.value)} disabled={hasSlash} className="w-56">
              {Array.from({ length: 33 }, (_, p) => 32 - p).map((p) => (
                <option key={p} value={p}>
                  /{p} ({formatIpv4(prefixToMask(p))})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setAddress(SAMPLE)}>
              Sample
            </Button>
            <Button variant="ghost" onClick={() => { setAddress(""); setPrefix("24"); }} disabled={!address && prefix === "24"}>
              Clear
            </Button>
          </div>
        </div>
        <p id={ids.status} className={parsed && !parsed.ok ? "text-sm text-danger" : "text-sm text-muted-foreground"}>
          {parsed && !parsed.ok
            ? parsed.error
            : hasSlash
              ? "The prefix comes from the address you typed."
              : "Results update as you type. You can also type a mask after a slash, e.g. 10.0.0.1/255.255.255.0."}
        </p>
      </div>

      {subnet && type ? (
        <>
          {subnet.special ? (
            <Alert tone="success" title={subnet.special === "point-to-point" ? "/31: a point-to-point link" : "/32: a single host"}>
              {subnet.special === "point-to-point"
                ? "Both addresses are usable, with no network or broadcast address (RFC 3021)."
                : "The block contains just this address, as used for host routes and loopbacks."}
            </Alert>
          ) : null}
          <dl className="grid divide-y divide-border rounded-md border border-border bg-surface sm:grid-cols-2 sm:divide-y-0">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2 sm:border-b sm:border-border sm:odd:border-r">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd data-subnet={label.toLowerCase()} className="col-start-1 font-mono text-sm break-all">{value}</dd>
                <dd className="col-start-2 row-span-2 row-start-1">
                  <CopyButton text={value} ariaLabel={`Copy ${label.toLowerCase()}`} variant="ghost" />
                </dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1 rounded-md border border-border bg-surface p-3 text-sm">
              <p className="font-medium" data-subnet="type">
                {type.label}
                {type.range ? <span className="font-mono font-normal text-muted-foreground"> · {type.range}</span> : null}
              </p>
              {type.note ? <p className="text-muted-foreground">{type.note}</p> : null}
              <p className="text-xs text-muted-foreground">Historical class {addressClass(subnet.address)} (classful addressing is obsolete).</p>
            </div>
            <div className="overflow-x-auto rounded-md border border-border bg-surface p-3">
              <table className="font-mono text-xs">
                <caption className="sr-only">Binary</caption>
                <tbody>
                  {(
                    [
                      ["Address", subnet.address],
                      ["Mask", subnet.mask],
                      ["Network", subnet.network],
                    ] as const
                  ).map(([label, value]) => (
                    <tr key={label}>
                      <th scope="row" className="pr-3 text-left font-sans font-normal text-muted-foreground">{label}</th>
                      <td className="whitespace-nowrap">{toBinary(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
