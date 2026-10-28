"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { ToolColumns, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { MAX_KEEP, defaultObfuscateOptions, obfuscate, type ObfuscateOptions } from "@/lib/tools/obfuscate";

const SAMPLE = `sk_live_4eC39HqLyjWDarjtT1zdp7dc
ada.lovelace@example.com
4111-1111-1111-1234
ghp_16C7e42F292c6912E7710c838347Ae178B4a`;

type NumberField = "keepStart" | "keepEnd" | "fixedLength";

export function StringObfuscator() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<ObfuscateOptions>(defaultObfuscateOptions);
  // Number fields keep their text while being edited, so an empty field is not forced to 0.
  const [numbers, setNumbers] = useState<Record<NumberField, string>>({ keepStart: "2", keepEnd: "2", fixedLength: "0" });
  const deferred = useDeferredValue(input);
  const ids = { input: useId(), output: useId(), start: useId(), end: useId(), mask: useId(), fixed: useId() };

  const effective = useMemo(
    () => ({ ...options, keepStart: Number(numbers.keepStart || 0), keepEnd: Number(numbers.keepEnd || 0), fixedLength: Number(numbers.fixedLength || 0) }),
    [options, numbers],
  );
  const result = useMemo(() => obfuscate(deferred, effective), [deferred, effective]);
  const output = result.ok ? result.output : "";

  const setNumber = (key: NumberField) => (e: React.ChangeEvent<HTMLInputElement>) => setNumbers((n) => ({ ...n, [key]: e.target.value }));
  const toggle = (key: "keepPunctuation" | "keepEmailDomain" | "perLine") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setOptions((o) => ({ ...o, [key]: e.target.checked }));

  return (
    <div className="flex flex-col gap-4">
      <ToolToolbar
        actions={
          <Button size="sm" variant="ghost" onClick={() => { setOptions(defaultObfuscateOptions); setNumbers({ keepStart: "2", keepEnd: "2", fixedLength: "0" }); }}>
            Reset options
          </Button>
        }
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.start}>Keep first</Label>
          <Input id={ids.start} type="number" min={0} max={MAX_KEEP} value={numbers.keepStart} onChange={setNumber("keepStart")} className="h-9 w-20" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.end}>Keep last</Label>
          <Input id={ids.end} type="number" min={0} max={MAX_KEEP} value={numbers.keepEnd} onChange={setNumber("keepEnd")} className="h-9 w-20" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.mask}>Mask character</Label>
          <Input id={ids.mask} value={options.mask} onChange={(e) => setOptions((o) => ({ ...o, mask: e.target.value }))} className="h-9 w-20 text-center font-mono" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.fixed}>Fixed mask length</Label>
          <Input id={ids.fixed} type="number" min={0} max={64} value={numbers.fixedLength} onChange={setNumber("fixedLength")} className="h-9 w-24" aria-describedby={`${ids.fixed}-hint`} />
          <span id={`${ids.fixed}-hint`} className="sr-only">0 keeps the original length</span>
        </div>
        <div className="flex flex-col gap-2 pb-1">
          <Checkbox label="Keep spaces and punctuation" checked={options.keepPunctuation} onChange={toggle("keepPunctuation")} />
          <Checkbox label="Keep email domains" checked={options.keepEmailDomain} onChange={toggle("keepEmailDomain")} />
          <Checkbox label="Mask each line separately" checked={options.perLine} onChange={toggle("perLine")} />
        </div>
      </ToolToolbar>

      {!result.ok ? <Alert title="Check the settings">{result.error}</Alert> : null}
      {result.ok && result.fullyMasked > 0 ? (
        <Alert tone="warning" title={`${result.fullyMasked} ${result.fullyMasked === 1 ? "value was" : "values were"} masked completely`}>
          They are too short to keep {effective.keepStart + effective.keepEnd} characters visible and still hide anything.
        </Alert>
      ) : null}

      <ToolColumns>
        <ToolPanel
          label="Text to mask"
          htmlFor={ids.input}
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
          footer="Results update as you type. Nothing is sent or saved."
        >
          <Textarea id={ids.input} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste an API key, email or other value, one per line" className="min-h-56" autoComplete="off" />
        </ToolPanel>
        <ToolPanel label="Masked" htmlFor={ids.output} actions={<CopyButton text={output} ariaLabel="Copy masked text" />}>
          <Textarea id={ids.output} value={output} readOnly placeholder="sk**********************dc" className="min-h-56 bg-subtle" />
        </ToolPanel>
      </ToolColumns>

      <Notice title="Masking is not encryption or anonymization">
        The visible characters, the length and the format still reveal information, and short or predictable values can
        be guessed from what remains. Use masking to make values recognizable in screenshots, logs and support tickets,
        not to protect secrets: rotate any key that has been exposed, even partly.
      </Notice>
    </div>
  );
}
