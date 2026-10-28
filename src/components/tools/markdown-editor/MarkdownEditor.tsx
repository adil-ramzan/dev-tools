"use client";

import { useDeferredValue, useEffect, useId, useState } from "react";
import { ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import { renderMarkdown, sanitizeHtml } from "@/lib/tools/markdown";

const SAMPLE = `# Release notes

Version **2.4** adds _faster builds_ and a new \`--watch\` flag. See the [changelog](https://example.com/changelog).

## Highlights

- Incremental compilation
- Smaller output, about 30% less
- ~~Legacy config format~~ removed

1. Install the update
2. Run \`npm run build\`

> Builds are now cached between runs.

| Command | Before | After |
| --- | ---: | ---: |
| build | 42 s | 18 s |
| test | 65 s | 51 s |

\`\`\`js
export function sum(a, b) {
  return a + b;
}
\`\`\`

---

Raw HTML such as <b>bold</b> is shown as text.
`;

type View = "split" | "write" | "preview";

export function MarkdownEditor() {
  const [source, setSource] = useState("");
  const [view, setView] = useState<View>("split");
  const [remoteImages, setRemoteImages] = useState(false);
  const [html, setHtml] = useState("");
  const [failed, setFailed] = useState(false);
  const deferred = useDeferredValue(source);
  const editorId = useId();

  useEffect(() => {
    let cancelled = false;
    renderMarkdown(deferred, { remoteImages })
      .then(sanitizeHtml)
      .then((safe) => {
        if (cancelled) return;
        setHtml(safe);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [deferred, remoteImages]);

  const words = source.trim() ? source.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col gap-4">
      <ToolToolbar
        actions={
          <>
            <CopyButton text={source} label="Copy Markdown" />
            <CopyButton text={source ? html : ""} label="Copy HTML" />
          </>
        }
      >
        <SegmentedControl
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: "split", label: "Split" },
            { value: "write", label: "Write" },
            { value: "preview", label: "Preview" },
          ]}
        />
        <Checkbox
          label="Load images from other websites"
          checked={remoteImages}
          onChange={(e) => setRemoteImages(e.target.checked)}
          className="h-9"
        />
      </ToolToolbar>

      {failed ? <Alert title="The preview could not be rendered">Reload the page and try again.</Alert> : null}

      <div className={cn("grid gap-6", view === "split" && "lg:grid-cols-2")}>
        <ToolPanel
          label="Markdown"
          htmlFor={editorId}
          className={view === "preview" ? "hidden" : undefined}
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={() => setSource(SAMPLE)}>
                Sample
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSource("")} disabled={!source}>
                Clear
              </Button>
            </>
          }
          footer={`${words.toLocaleString()} ${words === 1 ? "word" : "words"}`}
        >
          <Textarea
            id={editorId}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="# Start writing Markdown"
            spellCheck
            className="min-h-96 lg:min-h-[32rem]"
          />
        </ToolPanel>
        <ToolPanel label="Preview" labelId={`${editorId}-preview`} className={view === "write" ? "hidden" : undefined}>
          <div
            role="region"
            aria-labelledby={`${editorId}-preview`}
            className="markdown-preview min-h-96 overflow-auto rounded-sm border border-border bg-surface p-5 lg:min-h-[32rem]"
            // Sanitized twice: markdown-it with raw HTML disabled, then DOMPurify.
            dangerouslySetInnerHTML={{ __html: source ? html : '<p class="md-empty">The preview appears here.</p>' }}
          />
        </ToolPanel>
      </div>
    </div>
  );
}
