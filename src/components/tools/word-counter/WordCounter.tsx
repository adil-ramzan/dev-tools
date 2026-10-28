"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Textarea } from "@/components/ui/Field";
import { getTextStats, type TextStats } from "@/lib/tools/text-stats";

const SAMPLE = `Café culture isn't new. Paris had more than 3,000 cafés by 1789, and many became meeting places for writers and politicians.

Today the word "café" appears in dozens of languages: カフェ in Japanese, 咖啡馆 in Chinese. ☕`;

const fields: { key: keyof TextStats; label: string }[] = [
  { key: "words", label: "Words" },
  { key: "characters", label: "Characters" },
  { key: "charactersNoSpaces", label: "Characters without spaces" },
  { key: "sentences", label: "Sentences" },
  { key: "paragraphs", label: "Paragraphs" },
  { key: "lines", label: "Lines" },
  { key: "utf8Bytes", label: "UTF-8 bytes" },
  { key: "codeUnits", label: "UTF-16 code units" },
];

export function WordCounter() {
  const [text, setText] = useState("");
  // Counting runs on the deferred value so typing stays responsive on long text.
  const deferred = useDeferredValue(text);
  const stats = useMemo(() => getTextStats(deferred), [deferred]);
  const inputId = useId();

  const summary = fields.map((f) => `${f.label}: ${stats[f.key].toLocaleString()}`).join("\n");

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4">
        {fields.map((field, index) => (
          <div key={field.key} className="flex flex-col gap-1 bg-surface px-4 py-3.5">
            <dt className="text-xs text-muted-foreground">{field.label}</dt>
            <dd
              className={
                index < 2
                  ? "text-2xl font-semibold tracking-tight tabular-nums"
                  : "text-xl font-semibold tracking-tight tabular-nums"
              }
            >
              {stats[field.key].toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>

      <ToolPanel
        label="Your text"
        htmlFor={inputId}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setText(SAMPLE)}>
              Sample
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setText("")} disabled={!text}>
              Clear
            </Button>
            <CopyButton text={text ? summary : ""} label="Copy counts" />
          </>
        }
        footer="Counts update as you type."
      >
        <Textarea
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste your text here"
          spellCheck
          className="min-h-80 font-sans text-base"
        />
      </ToolPanel>
    </div>
  );
}
