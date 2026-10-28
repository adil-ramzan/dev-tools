"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { ToolColumns, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { defaultSlugOptions, slugify, slugifyLines, type SlugCase, type SlugMode, type SlugOptions } from "@/lib/tools/slug";

const SAMPLE = `10 Tips for Writing Clean Code!
Crème Brûlée & Café au Lait
Ünïcödé Straße in München
Q3 Report (Final).PDF`;

const EXAMPLES = ["Hello, World!", "Crème Brûlée & Café", "Привет, мир", "Annual Report 2024.PDF"];

const SEPARATOR_LABELS: Record<string, string> = { "-": "Hyphen (-)", _: "Underscore (_)", ".": "Dot (.)", "": "None" };

export function SlugGenerator() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<SlugOptions>(defaultSlugOptions);
  const [maxText, setMaxText] = useState("");
  const deferred = useDeferredValue(input);
  const inputId = useId();
  const outputId = useId();
  const separatorId = useId();
  const maxId = useId();

  const max = maxText.trim() === "" ? 0 : Number(maxText);
  const maxValid = Number.isInteger(max) && max >= 0 && max <= 500;
  const effective = useMemo(() => ({ ...options, maxLength: maxValid ? max : 0 }), [options, max, maxValid]);
  const result = useMemo(() => slugifyLines(deferred, effective), [deferred, effective]);

  const set = <K extends keyof SlugOptions>(key: K, value: SlugOptions[K]) => setOptions((o) => ({ ...o, [key]: value }));

  function setMode(mode: SlugMode) {
    // Identifiers use underscores; leaving identifier mode restores hyphens.
    setOptions((o) => ({ ...o, mode, separator: mode === "identifier" ? "_" : o.mode === "identifier" ? "-" : o.separator }));
  }

  return (
    <div className="flex flex-col gap-4">
      <ToolToolbar
        actions={
          <Button size="sm" variant="ghost" onClick={() => { setOptions(defaultSlugOptions); setMaxText(""); }}>
            Reset options
          </Button>
        }
      >
        <SegmentedControl
          label="Use"
          value={options.mode}
          onChange={setMode}
          options={[
            { value: "url", label: "URL slug" },
            { value: "filename", label: "File name" },
            { value: "identifier", label: "Identifier" },
          ]}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={separatorId}>Separator</Label>
          <Select id={separatorId} value={options.separator} onChange={(e) => set("separator", e.target.value)} className="w-40">
            {(options.mode === "identifier" ? ["_", ""] : ["-", "_", ".", ""]).map((s) => (
              <option key={s} value={s}>{SEPARATOR_LABELS[s]}</option>
            ))}
          </Select>
        </div>
        <SegmentedControl
          label="Case"
          value={options.case}
          onChange={(v) => set("case", v as SlugCase)}
          options={[
            { value: "lower", label: "lower" },
            { value: "upper", label: "UPPER" },
            { value: "preserve", label: "Keep" },
          ]}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={maxId}>Max length</Label>
          <Input id={maxId} type="number" min={0} max={500} value={maxText} placeholder="No limit" onChange={(e) => setMaxText(e.target.value)} aria-invalid={!maxValid} className="h-9 w-28" />
        </div>
        <div className="flex flex-col gap-2 pb-1">
          <Checkbox label="Keep non-Latin letters (Unicode slug)" checked={options.unicode && options.mode !== "identifier"} disabled={options.mode === "identifier"} onChange={(e) => set("unicode", e.target.checked)} />
          <Checkbox label='Write & as "and"' checked={options.ampersand} onChange={(e) => set("ampersand", e.target.checked)} />
        </div>
      </ToolToolbar>

      {!maxValid ? <Alert title="Check the settings">Max length must be a whole number from 0 to 500. Leave it empty for no limit.</Alert> : null}
      {result.dropped.length ? (
        <Alert tone="warning" title="Some characters have no ASCII equivalent and were removed">
          {result.dropped.slice(0, 20).join(" ")}
          {result.dropped.length > 20 ? ` and ${result.dropped.length - 20} more` : ""}. Turn on &ldquo;Keep non-Latin letters&rdquo; to keep them.
        </Alert>
      ) : null}
      {result.emptyLines ? (
        <Alert tone="warning" title={`${result.emptyLines} ${result.emptyLines === 1 ? "line" : "lines"} produced an empty slug`}>
          The text had no letters or digits that could be kept.
        </Alert>
      ) : null}

      <ToolColumns>
        <ToolPanel
          label="Text"
          htmlFor={inputId}
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
          footer="Each line becomes one slug. Results update as you type."
        >
          <Textarea id={inputId} value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. My First Blog Post!" className="min-h-48" />
        </ToolPanel>
        <ToolPanel label="Slugs" htmlFor={outputId} actions={<CopyButton text={result.output.trim() ? result.output : ""} ariaLabel="Copy slugs" />}>
          <Textarea id={outputId} value={result.output} readOnly placeholder="my-first-blog-post" className="min-h-48 bg-subtle" />
        </ToolPanel>
      </ToolColumns>

      <section aria-labelledby="slug-examples" className="flex flex-col gap-2">
        <h2 id="slug-examples" className="text-sm font-medium">Examples with the current settings</h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-border bg-surface">
              {EXAMPLES.map((example) => (
                <tr key={example}>
                  <td className="px-3 py-1.5 text-muted-foreground">{example}</td>
                  <td className="px-3 py-1.5 font-mono">{slugify(example, effective).slug || "(empty)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
