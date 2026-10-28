"use client";

import { useState } from "react";
import { EncodeDecodeTool } from "@/components/tools/EncodeDecodeTool";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatBytes } from "@/lib/format";
import { binaryToText, breakdown, textToBinary, type ByteSeparator } from "@/lib/tools/text-binary";

export function TextToBinaryConverter() {
  const [separator, setSeparator] = useState<ByteSeparator>("space");
  const [sampleText, setSampleText] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <EncodeDecodeTool
        sample="Hi 👋 é"
        inputPlaceholder="Text to convert, or binary bytes such as 01001000 01101001"
        encode={(input) => {
          const result = textToBinary(input, separator);
          if (!result.ok) return result;
          setSampleText(input);
          return { ok: true, output: result.output, note: `${formatBytes(result.bytes)} as UTF-8, ${(result.bytes * 8).toLocaleString("en-US")} bits.` };
        }}
        decode={(input) => {
          const result = binaryToText(input);
          if (!result.ok) return result;
          setSampleText(result.output);
          return { ok: true, output: result.output, note: `${formatBytes(result.bytes)} decoded as UTF-8 text.` };
        }}
        options={
          <SegmentedControl
            label="Separator between bytes"
            value={separator}
            onChange={setSeparator}
            options={[
              { value: "space", label: "Space" },
              { value: "newline", label: "New line" },
              { value: "none", label: "None" },
            ]}
          />
        }
      />
      {sampleText ? <Breakdown text={sampleText} /> : null}
    </div>
  );
}

function Breakdown({ text }: { text: string }) {
  const rows = breakdown(text, 32);
  const total = Array.from(text).length;
  return (
    <section aria-labelledby="binary-breakdown" className="flex flex-col gap-2">
      <h3 id="binary-breakdown" className="text-sm font-medium">
        Characters and their UTF-8 bytes{total > rows.length ? ` (first ${rows.length} of ${total.toLocaleString("en-US")})` : ""}
      </h3>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-subtle text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Character</th>
              <th scope="col" className="px-3 py-2 font-medium">Code point</th>
              <th scope="col" className="px-3 py-2 font-medium">Bytes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface font-mono">
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5">{row.char === " " ? "␠" : row.char === "\n" ? "↵" : row.char === "\t" ? "⇥" : row.char}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{row.codePoint}</td>
                <td className="px-3 py-1.5">{row.bytes.join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
