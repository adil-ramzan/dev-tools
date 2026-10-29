"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { DOMPurify } from "dompurify";
import { ToolPanel } from "@/components/tools/ToolPanel";
import { Alert } from "@/components/ui/Alert";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  MAX_HTML_LENGTH,
  blockRemoteMedia,
  checkLink,
  createSanitizer,
  formatHtml,
  frameDocument,
  restoreRemoteMedia,
  sanitizeEditorHtml,
} from "@/lib/tools/html-editor";

type View = "visual" | "source" | "preview";

const SAMPLE = `<h2>Release notes</h2>
<p>Version <strong>2.4</strong> adds <em>dark mode</em> and fixes several bugs. Read the <a href="https://example.com/changelog">full changelog</a>.</p>
<ul>
<li>Faster start-up</li>
<li>New keyboard shortcuts</li>
</ul>
<blockquote>Thanks to everyone who reported issues.</blockquote>
<p><img src="https://example.com/banner.png" alt="Remote images are not loaded"> <a href="javascript:alert('xss')" onclick="alert('xss')">This unsafe link is cleaned</a></p>
<script>alert("This script is removed")</script>`;

type Command = { label: string; command: string; value?: string; title: string };

const COMMANDS: Command[][] = [
  [
    { label: "B", command: "bold", title: "Bold" },
    { label: "I", command: "italic", title: "Italic" },
    { label: "U", command: "underline", title: "Underline" },
    { label: "S", command: "strikeThrough", title: "Strikethrough" },
  ],
  [
    { label: "H1", command: "formatBlock", value: "h1", title: "H1 (heading 1)" },
    { label: "H2", command: "formatBlock", value: "h2", title: "H2 (heading 2)" },
    { label: "H3", command: "formatBlock", value: "h3", title: "H3 (heading 3)" },
    { label: "¶", command: "formatBlock", value: "p", title: "Paragraph" },
    { label: "❝", command: "formatBlock", value: "blockquote", title: "Quote" },
    { label: "</>", command: "formatBlock", value: "pre", title: "Code block" },
  ],
  [
    { label: "Bulleted", command: "insertUnorderedList", title: "Bulleted list" },
    { label: "Numbered", command: "insertOrderedList", title: "Numbered list" },
  ],
  [
    { label: "Unlink", command: "unlink", title: "Unlink (remove link)" },
    { label: "Clear", command: "removeFormat", title: "Clear formatting" },
    { label: "↶", command: "undo", title: "Undo" },
    { label: "↷", command: "redo", title: "Redo" },
  ],
];

const escapeText = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

export function HtmlWysiwygEditor() {
  const [purify, setPurify] = useState<DOMPurify | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [view, setView] = useState<View>("visual");
  // The current document, always sanitized.
  const [html, setHtml] = useState("");
  // The document loaded into the editing frame; changes only when the frame must be reloaded.
  const [editorDoc, setEditorDoc] = useState(() => frameDocument("", { editable: true }));
  const [editorKey, setEditorKey] = useState(0);
  const [source, setSource] = useState("");
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  // HTML waiting to be loaded until DOMPurify is ready, so nothing is cleaned to an empty document.
  const pendingLoad = useRef<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const ids = { source: useId(), link: useId(), linkError: useId(), output: useId() };

  const sanitize = useCallback((value: string) => (purify ? sanitizeEditorHtml(value, purify) : ""), [purify]);
  /** Sanitized HTML for a frame, with remote media URLs made inert. */
  const forFrame = useCallback((clean: string) => blockRemoteMedia(clean, new DOMParser()), []);

  /** Sanitizes a whole document with the given sanitizer and reloads the editing frame with it. */
  const apply = useCallback(
    (instance: DOMPurify, value: string) => {
      const clean = sanitizeEditorHtml(value.slice(0, MAX_HTML_LENGTH), instance);
      setHtml(clean);
      setSource(formatHtml(clean));
      setEditorDoc(frameDocument(forFrame(clean), { editable: true }));
      setEditorKey((k) => k + 1);
    },
    [forFrame],
  );

  useEffect(() => {
    // A DOMPurify instance is callable: wrap it, or React would call it as a state updater.
    import("dompurify").then((m) => {
      const instance = createSanitizer(m.default, window);
      setPurify(() => instance);
      if (pendingLoad.current !== null) {
        apply(instance, pendingLoad.current);
        pendingLoad.current = null;
        setWaiting(false);
      }
    }, () => setLoadFailed(true));
  }, [apply]);

  /** Replaces the whole document. Before DOMPurify has loaded, the HTML is kept and loaded as soon as it is ready. */
  const load = useCallback(
    (value: string) => {
      if (purify) {
        apply(purify, value);
        return;
      }
      pendingLoad.current = value;
      setWaiting(true);
    },
    [purify, apply],
  );

  const syncFromFrame = useCallback(() => {
    const body = frameRef.current?.contentDocument?.body;
    if (body) setHtml(sanitize(restoreRemoteMedia(body.innerHTML, new DOMParser())));
  }, [sanitize]);

  /** Wires up the editing frame after each load. The frame cannot run scripts, so this page handles its events. */
  const onFrameLoad = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    const insertClean = (raw: string) => {
      doc.execCommand("insertHTML", false, forFrame(sanitize(raw)));
      syncFromFrame();
    };
    doc.addEventListener("input", syncFromFrame);
    doc.addEventListener("paste", (e) => {
      e.preventDefault();
      const data = e.clipboardData;
      if (!data) return;
      const richHtml = data.getData("text/html");
      insertClean(richHtml || escapeText(data.getData("text/plain")));
    });
    doc.addEventListener("drop", (e) => {
      e.preventDefault();
      const text = e.dataTransfer?.getData("text/plain");
      if (text) insertClean(escapeText(text));
    });
    doc.addEventListener("dragover", (e) => e.preventDefault());
  }, [sanitize, forFrame, syncFromFrame]);

  function run(command: string, value?: string) {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    doc.body.focus();
    doc.execCommand(command, false, value);
    syncFromFrame();
  }

  function addLink() {
    const checked = checkLink(link);
    if (!checked.ok) {
      setLinkError(checked.error);
      return;
    }
    const doc = frameRef.current?.contentDocument;
    const selection = doc?.getSelection();
    if (!doc || !selection || selection.isCollapsed) {
      setLinkError("Select some text in the editor first.");
      return;
    }
    setLinkError(null);
    run("createLink", checked.href);
    setLink("");
  }

  function switchView(next: View) {
    if (view === "source") load(source);
    // While DOMPurify loads, the source keeps the HTML that is waiting to be cleaned.
    if (next === "source") setSource(pendingLoad.current ?? formatHtml(html));
    setView(next);
  }

  const sourcePreview = useMemo(() => (view === "source" && purify ? sanitize(source) : ""), [view, purify, source, sanitize]);
  const sourceChanged = view === "source" && source.trim() !== "" && sourcePreview.replace(/\s+/g, "") !== source.replace(/\s+/g, "");
  const output = waiting ? "" : formatHtml(html);
  const loadingPanel = (label: string) => (
    <div role="status" data-sanitizer-loading className="flex h-96 w-full items-center justify-center rounded-sm border border-border bg-subtle px-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );

  if (loadFailed) return <Alert title="The editor could not be loaded">Check your connection and reload the page.</Alert>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border border-border bg-surface p-3">
        <SegmentedControl
          label="View"
          hideLabel
          value={view}
          onChange={switchView}
          options={[
            { value: "visual", label: "Visual" },
            { value: "source", label: "HTML source" },
            { value: "preview", label: "Preview" },
          ]}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { load(SAMPLE); setView("visual"); }} disabled={!purify}>
            Sample
          </Button>
          <Button size="sm" variant="ghost" onClick={() => load("")} disabled={!html && !source && !waiting}>
            Clear
          </Button>
        </div>
      </div>

      {view === "visual" ? (
        <div className="flex flex-col gap-2">
          <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-1.5">
            {COMMANDS.map((group, g) => (
              <div key={g} className="flex flex-wrap gap-0.5 rounded-sm border border-border bg-surface p-0.5">
                {group.map((c) => (
                  <Button
                    key={c.title}
                    size="sm"
                    variant="ghost"
                    title={c.title}
                    aria-label={c.title}
                    // Keep the text selection in the editor when the button is pressed.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => run(c.command, c.value)}
                    disabled={!purify}
                    className="min-w-8 px-2 font-mono"
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <Label htmlFor={ids.link} className="sr-only">
                Link address
              </Label>
              <Input
                id={ids.link}
                value={link}
                onChange={(e) => { setLink(e.target.value); setLinkError(null); }}
                onKeyDown={(e) => e.key === "Enter" && addLink()}
                placeholder="https://… (select text first)"
                aria-invalid={linkError ? true : undefined}
                aria-describedby={linkError ? ids.linkError : undefined}
                className="h-8 w-56 font-mono text-xs"
              />
              <Button size="sm" variant="secondary" onMouseDown={(e) => e.preventDefault()} onClick={addLink} disabled={!link.trim()}>
                Link
              </Button>
            </div>
          </div>
          {linkError ? <p id={ids.linkError} className="text-sm text-danger">{linkError}</p> : null}
          {/* Editing starts once DOMPurify is ready, so every change can be cleaned straight away. */}
          {purify ? (
            <iframe
              key={editorKey}
              ref={frameRef}
              title="Visual HTML editor"
              sandbox="allow-same-origin"
              srcDoc={editorDoc}
              onLoad={onFrameLoad}
              className="h-96 w-full rounded-sm border border-input bg-white"
            />
          ) : (
            loadingPanel("Loading the editor and HTML sanitizer…")
          )}
        </div>
      ) : view === "source" ? (
        <div className="flex flex-col gap-2">
          <ToolPanel label="HTML source" htmlFor={ids.source} footer="Unsafe markup is removed when you leave this view.">
            <Textarea id={ids.source} value={source} onChange={(e) => setSource(e.target.value)} maxLength={MAX_HTML_LENGTH} className="min-h-96" wrap="off" />
          </ToolPanel>
          {sourceChanged ? (
            <Alert tone="warning" title="Some markup will be removed">
              Scripts, event handlers, forms, embedded frames, styles that load resources and unsafe links are not allowed and
              will be removed when you switch views.
            </Alert>
          ) : null}
        </div>
      ) : (
        purify ? (
          <iframe title="Preview of the HTML" sandbox="" srcDoc={frameDocument(forFrame(html), { editable: false })} className="h-96 w-full rounded-sm border border-border bg-white" />
        ) : (
          loadingPanel("Loading the HTML sanitizer… The preview appears when your HTML has been cleaned.")
        )
      )}

      <ToolPanel
        label="Clean HTML"
        htmlFor={ids.output}
        actions={<CopyButton text={output} ariaLabel="Copy HTML" />}
        footer={waiting ? <span role="status">Cleaning your HTML as soon as the sanitizer has loaded…</span> : undefined}
      >
        <Textarea id={ids.output} value={output} readOnly placeholder="Your sanitized HTML appears here" className="min-h-40 bg-subtle" wrap="off" />
      </ToolPanel>

      <Notice title="How this editor keeps you safe">
        All HTML is sanitized with DOMPurify, and the editor and preview run in sandboxed frames that cannot run scripts or
        load anything from the network, including remote images. The output is cleaned for display, but always sanitize
        user-supplied HTML again on the server that stores or shows it.
      </Notice>
    </div>
  );
}
