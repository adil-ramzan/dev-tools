"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Textarea } from "@/components/ui/Field";
import { caseOptions, convertCase } from "@/lib/tools/text-case";

const SAMPLE = `user account ID
XMLHttpRequest
max_retry-count`;

export function TextCaseConverter() {
  const [text, setText] = useState("");
  const deferred = useDeferredValue(text);
  const results = useMemo(
    () => caseOptions.map((option) => ({ ...option, output: convertCase(deferred, option.id) })),
    [deferred],
  );
  const inputId = useId();

  return (
    <div className="flex flex-col gap-6">
      <ToolPanel
        label="Text to convert"
        htmlFor={inputId}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setText(SAMPLE)}>
              Sample
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setText("")} disabled={!text}>
              Clear
            </Button>
          </>
        }
        footer="Results update as you type. For code cases, each line is converted separately."
      >
        <Textarea
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste text, e.g. user account id"
          className="min-h-36"
        />
      </ToolPanel>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {results.map((result) => {
          const id = `${inputId}-${result.id}`;
          return (
            <li key={result.id}>
              <ToolPanel
                label={result.label}
                htmlFor={id}
                actions={<CopyButton text={result.output} ariaLabel={`Copy ${result.label}`} />}
                className="rounded-md border border-border bg-surface p-3"
              >
                <Textarea
                  id={id}
                  value={result.output}
                  readOnly
                  placeholder={result.example}
                  className="min-h-24 border-border bg-subtle"
                />
              </ToolPanel>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
