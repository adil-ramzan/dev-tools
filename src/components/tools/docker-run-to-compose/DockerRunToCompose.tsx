"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ToolColumns, ToolPanel } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Textarea } from "@/components/ui/Field";
import { downloadText } from "@/lib/download";
import { dockerRunToCompose, type ComposeResult } from "@/lib/tools/docker-compose";

const SAMPLE = `docker run -d \\
  --name db \\
  --restart unless-stopped \\
  -p 5432:5432 \\
  -e POSTGRES_USER=app \\
  -e POSTGRES_DB=app \\
  -e POSTGRES_PASSWORD \\
  -v pgdata:/var/lib/postgresql/data \\
  -v "$(pwd)/init":/docker-entrypoint-initdb.d:ro \\
  --health-cmd "pg_isready -U app" \\
  --health-interval 10s \\
  postgres:16-alpine`;

export function DockerRunToCompose() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [saved, setSaved] = useState(false);
  const request = useRef(0);
  const inputId = useId();
  const outputId = useId();

  useEffect(() => {
    const id = ++request.current;
    const handle = window.setTimeout(async () => {
      if (!input.trim()) {
        setResult(null);
        return;
      }
      try {
        const next = await dockerRunToCompose(input);
        if (id === request.current) setResult(next);
      } catch {
        if (id === request.current) setResult({ ok: false, error: "The converter could not be loaded. Check your connection and try again." });
      }
    }, 150);
    return () => window.clearTimeout(handle);
  }, [input]);

  const yaml = result?.ok ? result.yaml : "";

  return (
    <div className="flex flex-col gap-4">
      <ToolColumns>
        <ToolPanel
          label="docker run command"
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
          footer="The command is parsed as text and never run."
        >
          <Textarea id={inputId} value={input} onChange={(e) => { setInput(e.target.value); setSaved(false); }} placeholder="docker run -d --name web -p 8080:80 nginx" className="min-h-80" wrap="off" />
        </ToolPanel>
        <ToolPanel
          label="compose.yaml"
          htmlFor={outputId}
          actions={
            <>
              <Button size="sm" variant="ghost" disabled={!yaml} onClick={() => { downloadText("compose.yaml", yaml, "application/yaml"); setSaved(true); }}>
                Download
              </Button>
              <CopyButton text={yaml} ariaLabel="Copy compose YAML" />
            </>
          }
          footer={saved ? <span role="status">Downloaded compose.yaml.</span> : result?.ok ? `Service: ${result.service}` : null}
        >
          <Textarea id={outputId} value={yaml} readOnly placeholder={"services:\n  web:\n    image: nginx"} className="min-h-80 bg-subtle" wrap="off" />
        </ToolPanel>
      </ToolColumns>

      {result && !result.ok ? <Alert title="Could not convert this command">{result.error}</Alert> : null}
      {result?.ok && result.unsupported.length ? (
        <Alert title="Unsupported options were not converted">
          <ul className="flex list-disc flex-col gap-0.5 pl-4">
            {result.unsupported.map((u) => <li key={u}>{u}</li>)}
          </ul>
        </Alert>
      ) : null}
      {result?.ok && result.notes.length ? (
        <Alert tone="warning" title="Notes">
          <ul className="flex list-disc flex-col gap-0.5 pl-4">
            {result.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </Alert>
      ) : null}
    </div>
  );
}
