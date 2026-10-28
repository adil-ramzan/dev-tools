"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ToolToolbar } from "@/components/tools/ToolPanel";
import { LIMITS, generateLorem, type LoremFormat, type LoremUnit } from "@/lib/tools/lorem";

const UNIT_LABELS: Record<LoremUnit, string> = { paragraphs: "Paragraphs", sentences: "Sentences", words: "Words", list: "List items" };

export function LoremIpsumGenerator() {
  const [unit, setUnit] = useState<LoremUnit>("paragraphs");
  const [countText, setCountText] = useState("3");
  const [format, setFormat] = useState<LoremFormat>("text");
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [output, setOutput] = useState<{ text: string; words: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ids = { count: useId(), output: useId() };

  const count = Number(countText);

  const generate = useCallback(() => {
    const result = generateLorem({ unit, count, format, startWithLorem });
    if (result.ok) {
      setOutput({ text: result.text, words: result.words });
      setError(null);
    } else {
      setOutput(null);
      setError(result.error);
    }
  }, [unit, count, format, startWithLorem]);

  // Text is random, so it is generated in the browser after the settings change, never during server rendering.
  useEffect(() => {
    const handle = window.setTimeout(generate, 0);
    return () => window.clearTimeout(handle);
  }, [generate]);

  return (
    <div className="flex flex-col gap-4">
      <ToolToolbar
        actions={
          <>
            <Button variant="primary" onClick={generate}>
              Regenerate
            </Button>
            <CopyButton text={output?.text ?? ""} ariaLabel="Copy generated text" />
            <Button
              variant="ghost"
              onClick={() => {
                setUnit("paragraphs");
                setCountText("3");
                setFormat("text");
                setStartWithLorem(true);
              }}
              disabled={unit === "paragraphs" && countText === "3" && format === "text" && startWithLorem}
            >
              Reset
            </Button>
          </>
        }
      >
        <SegmentedControl
          label="Generate"
          value={unit}
          onChange={(u) => {
            setUnit(u);
            setCountText(String(Math.min(Number(countText) || 1, LIMITS[u])));
          }}
          options={(Object.keys(UNIT_LABELS) as LoremUnit[]).map((u) => ({ value: u, label: UNIT_LABELS[u] }))}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.count}>How many</Label>
          <Input id={ids.count} type="number" min={1} max={LIMITS[unit]} value={countText} onChange={(e) => setCountText(e.target.value)} aria-invalid={Boolean(error) || undefined} className="h-9 w-28" />
        </div>
        <SegmentedControl
          label="Format"
          value={format}
          onChange={setFormat}
          options={[
            { value: "text", label: "Plain text" },
            { value: "html", label: "HTML" },
          ]}
        />
        <Checkbox label='Start with "Lorem ipsum dolor sit amet"' checked={startWithLorem} onChange={(e) => setStartWithLorem(e.target.checked)} className="pb-2" />
      </ToolToolbar>

      {error ? <Alert title="Check the settings">{error}</Alert> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={ids.output}>{format === "html" ? "HTML" : "Text"}</Label>
        <Textarea id={ids.output} value={output?.text ?? ""} readOnly className="min-h-80 bg-subtle" style={{ fontFamily: format === "text" ? "inherit" : undefined }} />
        <p role="status" className="font-mono text-xs text-muted-foreground">
          {output ? `${output.words.toLocaleString("en-US")} words · ${output.text.length.toLocaleString("en-US")} characters` : ""}
        </p>
      </div>
    </div>
  );
}
