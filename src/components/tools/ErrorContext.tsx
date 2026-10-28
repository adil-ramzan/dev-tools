/** The line containing an error, with a caret under the error column. */
export function ErrorContext({ input, line, column }: { input: string; line: number; column: number }) {
  const text = input.split(/\r\n|\r|\n/)[line - 1] ?? "";
  const start = Math.max(0, column - 40);
  const snippet = text.slice(start, start + 80).replace(/\t/g, " ");
  return (
    <pre aria-hidden="true" className="mt-1.5 overflow-x-auto font-mono text-xs leading-relaxed text-foreground">
      {snippet}
      {"\n"}
      <span className="text-danger">{" ".repeat(Math.max(0, column - 1 - start))}^</span>
    </pre>
  );
}

/** Focuses a textarea and selects the character at a line and column. */
export function selectPosition(el: HTMLTextAreaElement | null, line: number, column: number) {
  if (!el) return;
  const lines = el.value.split("\n");
  const offset = lines.slice(0, line - 1).reduce((sum, l) => sum + l.length + 1, 0) + column - 1;
  el.focus();
  el.setSelectionRange(offset, Math.min(offset + 1, el.value.length));
}
