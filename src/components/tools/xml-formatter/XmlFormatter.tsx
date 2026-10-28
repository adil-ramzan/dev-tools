"use client";

import { useId, useRef, useState } from "react";
import { ErrorContext, selectPosition } from "@/components/tools/ErrorContext";
import { ActionBar, ShortcutScope, ToolColumns, ToolPanel, ToolToolbar } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatBytes } from "@/lib/format";
import { utf8Length } from "@/lib/tools/unicode";
import { formatXml, parseXml, type XmlError, type XmlIndent } from "@/lib/tools/xml";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Product catalog -->
<catalog xmlns="urn:example:catalog" xmlns:media="urn:example:media"><product id="p-1" available="true"><name>Desk lamp</name><price currency="EUR">39.90</price><description><![CDATA[Warm light & <b>dimmable</b>]]></description><media:image src="lamp.jpg"/></product><product id="p-2" available="false"><name>Notebook &amp; pen</name><price currency="EUR">7.50</price><note>Ships <em>after</em> 3 days</note></product></catalog>`;

type Status = { kind: "error"; error: XmlError } | { kind: "ok"; title: string; warnings: string[] } | null;

export function XmlFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState<XmlIndent>("2");
  const [status, setStatus] = useState<Status>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  const outputId = useId();

  function run(mode: "format" | "validate", nextIndent = indent) {
    const result = parseXml(input);
    if (!result.ok) {
      setStatus({ kind: "error", error: result.error });
      if (mode === "format") setOutput("");
      return;
    }
    if (mode === "validate") {
      setStatus({ kind: "ok", title: "Well-formed XML.", warnings: result.warnings });
      return;
    }
    const text = formatXml(result.nodes, nextIndent);
    setOutput(text);
    setStatus({
      kind: "ok",
      title: `Well-formed XML, ${nextIndent === "minify" ? "minified" : "formatted"} (${formatBytes(utf8Length(input))} → ${formatBytes(utf8Length(text))}).`,
      warnings: result.warnings,
    });
  }

  return (
    <ShortcutScope onSubmit={() => run("format")} disabled={!input.trim()} className="flex flex-col gap-4">
      <ToolToolbar>
        <SegmentedControl
          label="Indentation"
          value={indent}
          onChange={(value) => {
            setIndent(value);
            if (output) run("format", value);
          }}
          options={[
            { value: "2", label: "2 spaces" },
            { value: "4", label: "4 spaces" },
            { value: "tab", label: "Tab" },
            { value: "minify", label: "Minify" },
          ]}
        />
      </ToolToolbar>

      <ToolColumns>
        <ToolPanel
          label="XML input"
          htmlFor={inputId}
          actions={
            <Button size="sm" variant="ghost" onClick={() => { setInput(SAMPLE); setStatus(null); }}>
              Sample
            </Button>
          }
          after={
            <ActionBar
              shortcut
              primary={
                <>
                  <Button variant="primary" onClick={() => run("format")} disabled={!input.trim()}>
                    Format
                  </Button>
                  <Button onClick={() => run("validate")} disabled={!input.trim()}>
                    Validate
                  </Button>
                </>
              }
              secondary={
                <Button variant="ghost" onClick={() => { setInput(""); setOutput(""); setStatus(null); }} disabled={!input && !output}>
                  Clear
                </Button>
              }
              status={
                status?.kind === "error" ? (
                  <Alert title={`Not well-formed: line ${status.error.line}, column ${status.error.column}`}>
                    <p>{status.error.message.replace(/\.?$/, ".")}</p>
                    <ErrorContext input={input} line={status.error.line} column={status.error.column} />
                    <Button size="sm" variant="ghost" className="mt-1 -ml-3" onClick={() => selectPosition(inputRef.current, status.error.line, status.error.column)}>
                      Show in input
                    </Button>
                  </Alert>
                ) : status?.kind === "ok" ? (
                  <Alert tone={status.warnings.length ? "warning" : "success"} title={status.title}>
                    {status.warnings.length ? (
                      <ul className="flex flex-col gap-0.5">
                        {status.warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    ) : null}
                  </Alert>
                ) : null
              }
            />
          }
        >
          <Textarea ref={inputRef} id={inputId} value={input} onChange={(e) => setInput(e.target.value)} placeholder="<root><item>Paste XML here</item></root>" className="min-h-80 lg:min-h-[28rem]" wrap="off" />
        </ToolPanel>
        <ToolPanel label="Result" htmlFor={outputId} actions={<CopyButton text={output} ariaLabel="Copy formatted XML" />}>
          <Textarea id={outputId} value={output} readOnly placeholder="Formatted XML appears here" className="min-h-80 bg-subtle lg:min-h-[28rem]" wrap="off" />
        </ToolPanel>
      </ToolColumns>
    </ShortcutScope>
  );
}
