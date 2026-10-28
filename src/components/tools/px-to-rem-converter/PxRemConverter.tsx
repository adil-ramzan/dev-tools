"use client";

import { useId, useMemo, useState } from "react";
import { ToolColumns, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { convertUnits, type UnitDirection } from "@/lib/tools/css-generators";

const SAMPLES: Record<UnitDirection, string> = {
  "px-to-rem": `.card {
  padding: 24px 32px;
  margin-bottom: 16px;
  font-size: 18px;
  border: 1px solid #e6e3da;
  border-radius: 6px;
}`,
  "rem-to-px": `h1 { font-size: 2.25rem; margin: 0 0 1.5rem; }
p { font-size: 1rem; line-height: 1.6; }`,
};

const COMMON = [4, 8, 12, 14, 16, 18, 20, 24, 32, 40, 48, 64];

export function PxRemConverter() {
  const [direction, setDirection] = useState<UnitDirection>("px-to-rem");
  const [root, setRoot] = useState("16");
  const [precision, setPrecision] = useState("4");
  const [keepOnePx, setKeepOnePx] = useState(false);
  const [input, setInput] = useState("");
  const inputId = useId();
  const outputId = useId();
  const rootId = useId();
  const precisionId = useId();

  const rootSize = Number(root);
  const result = useMemo(
    () => convertUnits(input, { direction, rootSize, precision: Number(precision), keepOnePx }),
    [input, direction, rootSize, precision, keepOnePx],
  );
  const output = result.ok ? result.output : "";
  const rootValid = Number.isFinite(rootSize) && rootSize > 0 && rootSize <= 1000;
  const from = direction === "px-to-rem" ? "px" : "rem";

  return (
    <div className="flex flex-col gap-4">
      <ToolToolbar actions={<CopyButton text={output} label="Copy result" />}>
        <SegmentedControl
          label="Convert"
          value={direction}
          onChange={setDirection}
          options={[
            { value: "px-to-rem", label: "px → rem" },
            { value: "rem-to-px", label: "rem → px" },
          ]}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={rootId}>Root font size (px)</Label>
          <Input id={rootId} type="number" inputMode="decimal" min={1} max={1000} value={root} onChange={(e) => setRoot(e.target.value)} aria-invalid={!rootValid} className="h-9 w-24" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={precisionId}>Decimal places</Label>
          <Select id={precisionId} value={precision} onChange={(e) => setPrecision(e.target.value)} className="w-24">
            {["2", "3", "4", "5"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        {direction === "px-to-rem" ? (
          <Checkbox label="Keep 1px values (borders)" checked={keepOnePx} onChange={(e) => setKeepOnePx(e.target.checked)} className="h-9" />
        ) : null}
      </ToolToolbar>

      {!result.ok ? <Alert title="Cannot convert">{result.error}</Alert> : null}

      <ToolColumns>
        <ToolPanel
          label={`Values or CSS in ${from}`}
          htmlFor={inputId}
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={() => setInput(SAMPLES[direction])}>
                Sample
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setInput("")} disabled={!input}>
                Clear
              </Button>
            </>
          }
          footer={`Converts as you type. Plain numbers are read as ${from}.`}
        >
          <Textarea id={inputId} value={input} onChange={(e) => setInput(e.target.value)} placeholder={direction === "px-to-rem" ? "16px, 24px\nor paste CSS rules" : "1rem, 1.5rem\nor paste CSS rules"} className="min-h-64" wrap="off" />
        </ToolPanel>
        <ToolPanel
          label="Result"
          htmlFor={outputId}
          footer={result.ok && input.trim() ? `${result.converted} ${result.converted === 1 ? "value" : "values"} converted` : null}
        >
          <Textarea id={outputId} value={output} readOnly placeholder="Converted values appear here" className="min-h-64 bg-subtle" wrap="off" />
        </ToolPanel>
      </ToolColumns>

      {rootValid ? (
        <section aria-labelledby={`${rootId}-table`} className="flex flex-col gap-3">
          <h2 id={`${rootId}-table`} className="text-sm font-medium">
            Common sizes at a {root}px root
          </h2>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border text-sm sm:grid-cols-6">
            {COMMON.map((size) => (
              <div key={size} className="flex flex-col bg-surface px-3 py-2">
                <span className="font-mono">{size}px</span>
                <span className="font-mono text-muted-foreground">{Number((size / rootSize).toFixed(4))}rem</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
