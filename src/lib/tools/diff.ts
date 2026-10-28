/**
 * Line diff for the Diff Checker, built on jsdiff (loaded on demand). Lines
 * that change are paired so the changed words inside them can be
 * highlighted.
 */

export type DiffSegment = { text: string; changed: boolean };

export type DiffLine = {
  type: "equal" | "insert" | "delete";
  text: string;
  oldNumber: number | null;
  newNumber: number | null;
  /** Word-level detail for a changed line that has a counterpart. */
  segments?: DiffSegment[];
};

export type DiffOptions = { ignoreWhitespace: boolean; ignoreCase: boolean };

export type DiffResult =
  | {
      ok: true;
      lines: DiffLine[];
      added: number;
      removed: number;
      unchanged: number;
      /** Set when only one input ends with a line break. */
      trailingNewlineNote: string | null;
    }
  | { ok: false; error: string };

/** Give up rather than freeze on inputs with a huge number of differences. */
const TIMEOUT_MS = 3000;
/** Word-level highlighting is skipped for very long lines. */
const MAX_WORD_DIFF_LENGTH = 2000;

function splitLines(value: string): string[] {
  const lines = value.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

export async function computeDiff(original: string, changed: string, options: DiffOptions): Promise<DiffResult> {
  const { diffLines, diffWordsWithSpace } = await import("diff");

  const a = original.replace(/\r\n?/g, "\n");
  const b = changed.replace(/\r\n?/g, "\n");
  const endsA = a === "" || a.endsWith("\n");
  const endsB = b === "" || b.endsWith("\n");
  const trailingNewlineNote =
    endsA === endsB
      ? null
      : endsA
        ? "The original ends with a line break and the changed text does not."
        : "The changed text ends with a line break and the original does not.";

  const oldText = endsA ? a : `${a}\n`;
  const newText = endsB ? b : `${b}\n`;
  // Lines are compared in lower case when ignoring case, but always displayed
  // from the original inputs (looked up by line number).
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  const fold = (text: string) => (options.ignoreCase ? text.toLowerCase() : text);
  const changes = diffLines(fold(oldText), fold(newText), {
    ignoreWhitespace: options.ignoreWhitespace,
    timeout: TIMEOUT_MS,
  });
  if (!changes) {
    return { ok: false, error: "These texts have too many differences to compare in a reasonable time. Try comparing smaller sections." };
  }

  const lines: DiffLine[] = [];
  let oldNumber = 1;
  let newNumber = 1;
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    if (!change.added && !change.removed) {
      for (let n = splitLines(change.value).length; n > 0; n--) {
        lines.push({ type: "equal", text: newLines[newNumber - 1], oldNumber: oldNumber++, newNumber: newNumber++ });
        unchanged++;
      }
      continue;
    }
    if (change.removed) {
      const deletedCount = splitLines(change.value).length;
      const next = changes[i + 1];
      const insertedCount = next?.added ? splitLines(next.value).length : 0;
      if (next?.added) i++;
      const pairs = Math.min(deletedCount, insertedCount);
      const deletedLines: DiffLine[] = Array.from({ length: deletedCount }, () => ({
        type: "delete",
        text: oldLines[oldNumber - 1],
        oldNumber: oldNumber++,
        newNumber: null,
      }));
      const insertedLines: DiffLine[] = Array.from({ length: insertedCount }, () => ({
        type: "insert",
        text: newLines[newNumber - 1],
        oldNumber: null,
        newNumber: newNumber++,
      }));
      for (let p = 0; p < pairs; p++) {
        const before = deletedLines[p];
        const after = insertedLines[p];
        if (before.text.length > MAX_WORD_DIFF_LENGTH || after.text.length > MAX_WORD_DIFF_LENGTH) continue;
        const words = diffWordsWithSpace(before.text, after.text, { ignoreCase: options.ignoreCase });
        before.segments = words.filter((w) => !w.added).map((w) => ({ text: w.value, changed: w.removed }));
        after.segments = words.filter((w) => !w.removed).map((w) => ({ text: w.value, changed: w.added }));
      }
      lines.push(...deletedLines, ...insertedLines);
      removed += deletedCount;
      added += insertedCount;
      continue;
    }
    for (let n = splitLines(change.value).length; n > 0; n--) {
      lines.push({ type: "insert", text: newLines[newNumber - 1], oldNumber: null, newNumber: newNumber++ });
      added++;
    }
  }

  return { ok: true, lines, added, removed, unchanged, trailingNewlineNote };
}

/** Unified diff (patch) of the raw inputs, as produced by `diff -u`. */
export async function unifiedPatch(original: string, changed: string): Promise<string> {
  const { createTwoFilesPatch } = await import("diff");
  return createTwoFilesPatch("original", "changed", original, changed);
}
