/**
 * Splits a single POSIX shell command (as copied from documentation or a
 * browser's "Copy as cURL") into arguments, without running anything.
 *
 * Supported: whitespace between arguments, 'single quotes' (literal),
 * "double quotes" (with \" \\ \$ \` escapes), $'ANSI-C quotes' (with \n, \t,
 * \xHH, \uHHHH and similar escapes), backslash escapes and backslash-newline
 * line continuations.
 *
 * Not supported, and reported as errors rather than guessed: pipes,
 * redirections, command separators, command substitution, and Windows cmd
 * syntax (^ escapes). Variables such as $TOKEN are kept as literal text with
 * a warning, because their values are unknown.
 */

export type TokenizeResult = { ok: true; args: string[]; warnings: string[] } | { ok: false; error: string };

export const MAX_COMMAND_LENGTH = 100_000;

const ANSI_ESCAPES: Record<string, string> = { a: "\x07", b: "\b", e: "\x1b", E: "\x1b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v", "\\": "\\", "'": "'", '"': '"', "?": "?" };

export function tokenize(input: string): TokenizeResult {
  if (input.length > MAX_COMMAND_LENGTH) return { ok: false, error: "The command is longer than 100,000 characters." };
  if (/\^\s*\r?\n/.test(input) || /\^"/.test(input)) {
    return { ok: false, error: 'This looks like Windows cmd syntax (^ line continuations or ^" escapes), which is not supported. Copy the command for bash or another POSIX shell instead.' };
  }
  const args: string[] = [];
  const warnings = new Set<string>();
  let current = "";
  let inArg = false;
  let i = 0;
  const n = input.length;

  const variableWarning = (name: string) => warnings.add(`The shell variable ${name} was kept as literal text, because its value is not known here.`);

  while (i < n) {
    const c = input[i];
    if (c === "\\" && (input[i + 1] === "\n" || (input[i + 1] === "\r" && input[i + 2] === "\n"))) {
      i += input[i + 1] === "\r" ? 3 : 2;
      continue;
    }
    if (/\s/.test(c)) {
      if (inArg) {
        args.push(current);
        current = "";
        inArg = false;
      }
      i++;
      continue;
    }
    if (c === "#" && !inArg) {
      // A comment runs to the end of the line.
      while (i < n && input[i] !== "\n") i++;
      continue;
    }
    if (c === "|" || c === ";" || c === "&" || c === ">" || c === "<") {
      const what = c === "|" ? "a pipe (|)" : c === ";" ? "a command separator (;)" : c === "&" ? "a command separator or background job (&)" : "a redirection (< or >)";
      return { ok: false, error: `The command contains ${what} at position ${i + 1}. Paste a single command only.` };
    }
    if (c === "`" || (c === "$" && input[i + 1] === "(")) {
      return { ok: false, error: `Command substitution at position ${i + 1} is not supported, because it would need to run another command.` };
    }
    inArg = true;
    if (c === "\\") {
      if (i + 1 < n) current += input[i + 1];
      i += 2;
      continue;
    }
    if (c === "'") {
      const end = input.indexOf("'", i + 1);
      if (end === -1) return { ok: false, error: `The single quote at position ${i + 1} is never closed.` };
      current += input.slice(i + 1, end);
      i = end + 1;
      continue;
    }
    if (c === "$" && input[i + 1] === "'") {
      let j = i + 2;
      let closed = false;
      while (j < n) {
        const d = input[j];
        if (d === "'") {
          closed = true;
          j++;
          break;
        }
        if (d === "\\" && j + 1 < n) {
          const e = input[j + 1];
          if (e in ANSI_ESCAPES) {
            current += ANSI_ESCAPES[e];
            j += 2;
          } else if (e === "x" && /^[0-9a-fA-F]{1,2}/.test(input.slice(j + 2))) {
            const hex = /^[0-9a-fA-F]{1,2}/.exec(input.slice(j + 2))![0];
            current += String.fromCharCode(parseInt(hex, 16));
            j += 2 + hex.length;
          } else if ((e === "u" || e === "U") && /^[0-9a-fA-F]{1,8}/.test(input.slice(j + 2))) {
            const hex = new RegExp(`^[0-9a-fA-F]{1,${e === "u" ? 4 : 8}}`).exec(input.slice(j + 2))![0];
            const code = parseInt(hex, 16);
            current += code <= 0x10ffff ? String.fromCodePoint(code) : "�";
            j += 2 + hex.length;
          } else if (/[0-7]/.test(e)) {
            const oct = /^[0-7]{1,3}/.exec(input.slice(j + 1))![0];
            current += String.fromCharCode(parseInt(oct, 8) & 0xff);
            j += 1 + oct.length;
          } else {
            current += "\\" + e;
            j += 2;
          }
          continue;
        }
        current += d;
        j++;
      }
      if (!closed) return { ok: false, error: `The $' quote at position ${i + 1} is never closed.` };
      i = j;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let closed = false;
      while (j < n) {
        const d = input[j];
        if (d === '"') {
          closed = true;
          j++;
          break;
        }
        if (d === "\\" && j + 1 < n) {
          const e = input[j + 1];
          if (e === "\n") j += 2;
          else if (e === '"' || e === "\\" || e === "$" || e === "`") {
            current += e;
            j += 2;
          } else {
            current += "\\";
            j++;
          }
          continue;
        }
        if (d === "`" || (d === "$" && input[j + 1] === "(")) {
          return { ok: false, error: `Command substitution at position ${j + 1} is not supported, because it would need to run another command.` };
        }
        if (d === "$" && /[A-Za-z_{]/.test(input[j + 1] ?? "")) {
          const name = /^\$(\{[^}]*\}|[A-Za-z_][A-Za-z0-9_]*)/.exec(input.slice(j));
          if (name) variableWarning(name[0]);
        }
        current += d;
        j++;
      }
      if (!closed) return { ok: false, error: `The double quote at position ${i + 1} is never closed.` };
      i = j;
      continue;
    }
    if (c === "$" && /[A-Za-z_{]/.test(input[i + 1] ?? "")) {
      const name = /^\$(\{[^}]*\}|[A-Za-z_][A-Za-z0-9_]*)/.exec(input.slice(i));
      if (name) variableWarning(name[0]);
    }
    current += c;
    i++;
  }
  if (inArg) args.push(current);
  return { ok: true, args, warnings: [...warnings] };
}
