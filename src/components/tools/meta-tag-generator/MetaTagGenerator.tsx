"use client";

import { useId, useState } from "react";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CopyButton } from "@/components/ui/CopyButton";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/Field";
import { downloadText } from "@/lib/download";
import { DESCRIPTION_RANGE, EMPTY_FIELDS, MAX_FIELD_LENGTH, SAMPLE_FIELDS, TITLE_RANGE, buildMetaTags, checkFields, type MetaFields } from "@/lib/tools/meta-tags";

type TextField = { [K in keyof MetaFields]: MetaFields[K] extends string ? K : never }[keyof MetaFields];

const TEXT_FIELDS: { key: Exclude<TextField, "ogType" | "twitterCard">; label: string; placeholder: string; type?: string; multiline?: boolean; range?: readonly [number, number] }[] = [
  { key: "title", label: "Title", placeholder: "Page title – Site name", range: TITLE_RANGE },
  { key: "description", label: "Description", placeholder: "One or two sentences about the page", multiline: true, range: DESCRIPTION_RANGE },
  { key: "canonical", label: "Canonical URL", placeholder: "https://example.com/page", type: "url" },
  { key: "siteName", label: "Site name", placeholder: "Example" },
  { key: "image", label: "Share image URL", placeholder: "https://example.com/og.png (1200×630)", type: "url" },
  { key: "imageAlt", label: "Image description (alt text)", placeholder: "What the image shows" },
  { key: "locale", label: "Locale", placeholder: "en_US" },
  { key: "twitterSite", label: "Twitter/X site handle", placeholder: "@example" },
  { key: "twitterCreator", label: "Twitter/X author handle", placeholder: "@author" },
  { key: "themeColor", label: "Theme color", placeholder: "#1f4fe0" },
];

export function MetaTagGenerator() {
  const [fields, setFields] = useState<MetaFields>(EMPTY_FIELDS);
  const [status, setStatus] = useState<string | null>(null);
  const baseId = useId();
  const outputId = `${baseId}-output`;
  const issues = checkFields(fields);
  const html = buildMetaTags(fields);
  const set = <K extends keyof MetaFields>(key: K, value: MetaFields[K]) => {
    setFields((f) => ({ ...f, [key]: value }));
    setStatus(null);
  };
  const changed = JSON.stringify(fields) !== JSON.stringify(EMPTY_FIELDS);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Page details</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setFields(SAMPLE_FIELDS); setStatus(null); }}>
                Sample
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setFields(EMPTY_FIELDS); setStatus(null); }} disabled={!changed}>
                Clear
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {TEXT_FIELDS.map(({ key, label, placeholder, type, multiline, range }) => {
              const id = `${baseId}-${key}`;
              const issue = issues.find((i) => i.field === key);
              const length = fields[key].trim().length;
              const describedBy = [issue ? `${id}-issue` : "", range ? `${id}-count` : ""].filter(Boolean).join(" ") || undefined;
              const props = {
                id,
                value: fields[key],
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value),
                placeholder,
                maxLength: MAX_FIELD_LENGTH + 1,
                spellCheck: key === "title" || key === "description" || key === "imageAlt",
                autoComplete: "off",
                "aria-invalid": issue?.severity === "error" || undefined,
                "aria-describedby": describedBy,
              };
              return (
                <div key={key} className={multiline || key === "title" ? "flex flex-col gap-1.5 sm:col-span-2" : "flex flex-col gap-1.5"}>
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor={id}>{label}</Label>
                    {range ? (
                      <span id={`${id}-count`} className="font-mono text-xs text-muted-foreground">
                        {length}/{range[1]}
                      </span>
                    ) : null}
                  </div>
                  {multiline ? <Textarea {...props} className="min-h-20 font-sans" /> : <Input {...props} type={type ?? "text"} />}
                  {issue ? (
                    <FieldError id={`${id}-issue`} className={issue.severity === "warning" ? "text-muted-foreground" : undefined}>
                      {issue.message}
                    </FieldError>
                  ) : null}
                </div>
              );
            })}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${baseId}-ogType`}>Open Graph type</Label>
              <Select id={`${baseId}-ogType`} value={fields.ogType} onChange={(e) => set("ogType", e.target.value as MetaFields["ogType"])}>
                <option value="website">website</option>
                <option value="article">article</option>
                <option value="product">product</option>
                <option value="profile">profile</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${baseId}-card`}>Twitter/X card</Label>
              <Select id={`${baseId}-card`} value={fields.twitterCard} onChange={(e) => set("twitterCard", e.target.value as MetaFields["twitterCard"])}>
                <option value="summary_large_image">Large image</option>
                <option value="summary">Summary (small image)</option>
              </Select>
            </div>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Options</legend>
            <Checkbox label="Allow search engines to index this page" checked={fields.index} onChange={(e) => set("index", e.target.checked)} />
            <Checkbox label="Allow search engines to follow links" checked={fields.follow} onChange={(e) => set("follow", e.target.checked)} />
            <Checkbox label="Include charset and viewport" checked={fields.basics} onChange={(e) => set("basics", e.target.checked)} />
            {issues.find((i) => i.field === "index") ? <p className="text-sm text-muted-foreground">{issues.find((i) => i.field === "index")!.message}</p> : null}
          </fieldset>
        </div>

        <ToolPanel
          label="HTML for the <head>"
          htmlFor={outputId}
          actions={
            <>
              <CopyButton text={html} label="Copy HTML" ariaLabel="Copy HTML meta tags" variant="primary" />
              <Button size="sm" onClick={() => { downloadText("meta-tags.html", `${html}\n`, "text/html"); setStatus("Downloaded meta-tags.html."); }} disabled={!html}>
                Download
              </Button>
            </>
          }
          footer={`${html ? html.split("\n").filter((l) => l.startsWith("<")).length : 0} tags. Fields with errors are left out.`}
          after={status ? <p role="status" className="text-sm text-success">{status}</p> : null}
        >
          <Textarea id={outputId} value={html} readOnly className="min-h-96 bg-subtle text-xs" />
        </ToolPanel>
      </div>

      <p className="text-sm text-muted-foreground">
        Tags are generated in your browser; nothing is sent or saved, and URLs are only checked for form, not visited. To see how a page will look
        when shared, check it with each platform&apos;s own card validator after publishing.
      </p>
    </div>
  );
}
