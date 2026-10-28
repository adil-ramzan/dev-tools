import { buildBasicAuth } from "@/lib/tools/basic-auth";
import { tokenize } from "@/lib/tools/shell";
import { findLoneSurrogate } from "@/lib/tools/unicode";

/**
 * Converts a curl command into equivalent request code. The command is parsed
 * as text, never executed, and nothing is requested.
 *
 * Every flag ends up in one of three places: applied to the request, listed
 * as a note (flags that only change curl's own output, or that the generated
 * code handles differently), or listed as unsupported. Flags that change the
 * request in a way the converter cannot reproduce, such as reading the body
 * from a file, stop the conversion with an error instead of producing code
 * that sends something else.
 */

export type CurlBody =
  | { kind: "none" }
  | { kind: "raw"; data: string }
  | { kind: "multipart"; fields: [string, string][] };

export type CurlRequest = {
  method: string;
  url: string;
  headers: [string, string][];
  body: CurlBody;
  timeoutSeconds: number | null;
  followRedirects: boolean;
  notes: string[];
  unsupported: string[];
};

export type CurlParseResult = { ok: true; request: CurlRequest } | { ok: false; error: string };

type FlagSpec = { name: string; arg: boolean };

const FLAGS: Record<string, FlagSpec> = {};
function flag(names: string[], arg: boolean) {
  for (const n of names) FLAGS[n] = { name: names[names.length - 1], arg };
}
flag(["-X", "--request"], true);
flag(["-H", "--header"], true);
flag(["-d", "--data"], true);
flag(["--data-ascii"], true);
flag(["--data-binary"], true);
flag(["--data-raw"], true);
flag(["--data-urlencode"], true);
flag(["--json"], true);
flag(["-F", "--form"], true);
flag(["--form-string"], true);
flag(["-u", "--user"], true);
flag(["-A", "--user-agent"], true);
flag(["-e", "--referer"], true);
flag(["-b", "--cookie"], true);
flag(["-r", "--range"], true);
flag(["-m", "--max-time"], true);
flag(["--url"], true);
flag(["-G", "--get"], false);
flag(["-I", "--head"], false);
flag(["-L", "--location"], false);
flag(["-k", "--insecure"], false);
flag(["--compressed"], false);

/** Flags that only change what curl prints or saves. */
const OUTPUT_ONLY_NO_ARG = ["-s", "--silent", "-S", "--show-error", "-v", "--verbose", "-i", "--include", "-f", "--fail", "--fail-with-body", "-#", "--progress-bar", "-N", "--no-buffer", "-O", "--remote-name", "-J", "--remote-header-name", "--no-progress-meter", "-g", "--globoff"];
const OUTPUT_ONLY_ARG = ["-o", "--output", "-w", "--write-out", "-c", "--cookie-jar", "-D", "--dump-header", "--trace", "--trace-ascii", "--stderr"];
/** Known flags that change the request but cannot be reproduced. Their argument is consumed so it is not mistaken for a URL. */
const UNSUPPORTED_ARG = ["-x", "--proxy", "-E", "--cert", "--key", "--cacert", "--capath", "-T", "--upload-file", "-K", "--config", "--resolve", "--connect-to", "--retry", "--retry-delay", "--retry-max-time", "--limit-rate", "-U", "--proxy-user", "--interface", "--local-port", "--unix-socket", "--oauth2-bearer", "--aws-sigv4", "--cert-type", "--key-type", "--pass", "--ciphers", "-z", "--time-cond", "--max-redirs", "--connect-timeout", "-Y", "--speed-limit", "-y", "--speed-time", "--doh-url", "--dns-servers", "--variable", "--expand-data", "--expand-header", "--expand-url"];
const UNSUPPORTED_NO_ARG = ["--digest", "--ntlm", "--negotiate", "--anyauth", "--basic", "-4", "--ipv4", "-6", "--ipv6", "--http1.0", "-0", "--http2", "--http2-prior-knowledge", "--http3", "--http1.1", "--tlsv1.2", "--tlsv1.3", "--location-trusted", "--path-as-is", "-j", "--junk-session-cookies", "-n", "--netrc", "-Z", "--parallel", "--ssl", "--ssl-reqd"];

const TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

/** curl's --data-urlencode encoding: everything except unreserved characters, as UTF-8 percent-escapes. */
export function curlUrlEncode(text: string): string {
  return Array.from(new TextEncoder().encode(text), (b) => {
    const c = String.fromCharCode(b);
    return /[A-Za-z0-9\-._~]/.test(c) ? c : `%${b.toString(16).toUpperCase().padStart(2, "0")}`;
  }).join("");
}

function encodeDataUrlencode(value: string): string | { error: string } {
  if (value.startsWith("@")) return { error: "--data-urlencode @file reads the value from a file, which is not supported here." };
  const eq = value.indexOf("=");
  const at = value.indexOf("@");
  if (at > 0 && (eq === -1 || at < eq)) return { error: "--data-urlencode name@file reads the value from a file, which is not supported here." };
  if (eq === -1) return curlUrlEncode(value);
  if (eq === 0) return curlUrlEncode(value.slice(1));
  return `${value.slice(0, eq)}=${curlUrlEncode(value.slice(eq + 1))}`;
}

function hasHeader(headers: [string, string][], name: string): boolean {
  return headers.some(([n]) => n.toLowerCase() === name.toLowerCase());
}

export function parseCurl(command: string): CurlParseResult {
  if (findLoneSurrogate(command) !== -1) return { ok: false, error: "The command contains an incomplete Unicode character." };
  const tokens = tokenize(command.trim());
  if (!tokens.ok) return tokens;
  const args = tokens.args;
  if (args.length === 0) return { ok: false, error: "Paste a curl command, e.g. curl https://example.com." };
  if (!/^curl(\.exe)?$/i.test(args[0].split(/[\\/]/).pop() ?? "")) return { ok: false, error: 'The command must start with "curl".' };

  const notes = new Set<string>(tokens.warnings);
  const unsupported = new Set<string>();
  const headers: [string, string][] = [];
  const dataParts: string[] = [];
  const formFields: [string, string][] = [];
  const urls: string[] = [];
  let method: string | null = null;
  let head = false;
  let get = false;
  let json = false;
  let followRedirects = false;
  let timeoutSeconds: number | null = null;
  let user: string | null = null;
  let endOfOptions = false;

  // Expand combined short flags (-sSL, -XPOST, -H'…') into separate arguments.
  const queue: string[] = [];
  for (const arg of args.slice(1)) {
    if (!endOfOptions && /^-[^-]/.test(arg) && arg.length > 2) {
      for (let i = 1; i < arg.length; i++) {
        const short = `-${arg[i]}`;
        const spec = FLAGS[short];
        const takesArg = spec?.arg || OUTPUT_ONLY_ARG.includes(short) || UNSUPPORTED_ARG.includes(short);
        queue.push(short);
        if (takesArg) {
          if (i + 1 < arg.length) queue.push(arg.slice(i + 1));
          break;
        }
      }
    } else {
      if (arg === "--") endOfOptions = true;
      queue.push(arg);
    }
  }

  endOfOptions = false;
  for (let i = 0; i < queue.length; i++) {
    const arg = queue[i];
    if (endOfOptions || !arg.startsWith("-") || arg === "-") {
      urls.push(arg);
      continue;
    }
    if (arg === "--") {
      endOfOptions = true;
      continue;
    }
    const takeValue = (): string | null => (i + 1 < queue.length ? queue[++i] : null);

    if (OUTPUT_ONLY_NO_ARG.includes(arg)) {
      notes.add(`${arg} was ignored: it only changes curl's own output.`);
      continue;
    }
    if (OUTPUT_ONLY_ARG.includes(arg)) {
      takeValue();
      notes.add(`${arg} was ignored: it only changes where curl writes its output.`);
      continue;
    }
    if (UNSUPPORTED_ARG.includes(arg)) {
      takeValue();
      unsupported.add(arg);
      continue;
    }
    if (UNSUPPORTED_NO_ARG.includes(arg)) {
      unsupported.add(arg);
      continue;
    }
    const spec = FLAGS[arg];
    if (!spec) {
      unsupported.add(`${arg} (unknown option)`);
      continue;
    }
    let value = "";
    if (spec.arg) {
      const v = takeValue();
      if (v === null) return { ok: false, error: `${arg} needs a value.` };
      value = v;
    }
    switch (spec.name) {
      case "--request":
        if (!TOKEN.test(value)) return { ok: false, error: `"${value}" is not a valid HTTP method.` };
        method = value;
        break;
      case "--header": {
        if (/[\r\n]/.test(value)) return { ok: false, error: "A header contains a line break, which HTTP does not allow." };
        const colon = value.indexOf(":");
        const semicolon = value.indexOf(";");
        if (colon === -1 && semicolon > 0 && value.slice(semicolon + 1).trim() === "") {
          headers.push([value.slice(0, semicolon).trim(), ""]);
          break;
        }
        if (colon <= 0) return { ok: false, error: `The header "${value}" has no name. Write headers as "Name: value".` };
        const name = value.slice(0, colon).trim();
        const headerValue = value.slice(colon + 1).trim();
        if (!TOKEN.test(name)) return { ok: false, error: `"${name}" is not a valid header name.` };
        if (headerValue === "") {
          notes.add(`-H "${name}:" tells curl to remove a header it would send; it was ignored.`);
          break;
        }
        headers.push([name, headerValue]);
        break;
      }
      case "--data":
      case "--data-ascii":
      case "--data-binary":
        if (value.startsWith("@")) return { ok: false, error: `${arg} @file reads the request body from a file, which is not supported here. Paste the data itself.` };
        dataParts.push(value);
        break;
      case "--data-raw":
        dataParts.push(value);
        break;
      case "--data-urlencode": {
        const encoded = encodeDataUrlencode(value);
        if (typeof encoded !== "string") return { ok: false, error: encoded.error };
        dataParts.push(encoded);
        break;
      }
      case "--json":
        if (value.startsWith("@")) return { ok: false, error: "--json @file reads the body from a file, which is not supported here." };
        dataParts.push(value);
        json = true;
        break;
      case "--form":
      case "--form-string": {
        const eq = value.indexOf("=");
        if (eq <= 0) return { ok: false, error: `The form field "${value}" should be written as name=value.` };
        const fieldValue = value.slice(eq + 1);
        if (spec.name === "--form" && /^[@<]/.test(fieldValue)) {
          return { ok: false, error: `-F ${value.slice(0, eq)}=${fieldValue[0]}… uploads a file, which is not supported here. Only text form fields can be converted.` };
        }
        formFields.push([value.slice(0, eq), spec.name === "--form" ? fieldValue.replace(/;type=[^;]*$/, "") : fieldValue]);
        break;
      }
      case "--user":
        user = value;
        break;
      case "--user-agent":
        headers.push(["User-Agent", value]);
        break;
      case "--referer":
        headers.push(["Referer", value.replace(/;auto$/, "")]);
        break;
      case "--cookie":
        if (!value.includes("=")) return { ok: false, error: `-b ${value} reads cookies from a file, which is not supported here. Pass cookies as -b "name=value".` };
        headers.push(["Cookie", value]);
        break;
      case "--range":
        headers.push(["Range", `bytes=${value}`]);
        break;
      case "--max-time": {
        const seconds = Number(value);
        if (!Number.isFinite(seconds) || seconds <= 0) return { ok: false, error: `--max-time needs a positive number of seconds, not "${value}".` };
        timeoutSeconds = seconds;
        break;
      }
      case "--url":
        urls.push(value);
        break;
      case "--get":
        get = true;
        break;
      case "--head":
        head = true;
        break;
      case "--location":
        followRedirects = true;
        break;
      case "--insecure":
        notes.add("-k (--insecure) was not converted: the generated code keeps TLS certificate verification on. Fix the certificate instead of disabling verification.");
        break;
      case "--compressed":
        notes.add("--compressed is not needed in most generated code: fetch, requests, Go and Node's fetch decompress responses automatically. With Node's https module, PHP and Ruby, set Accept-Encoding and decompress yourself if you need it.");
        break;
    }
  }

  if (urls.length === 0) return { ok: false, error: "The command has no URL." };
  if (urls.length > 1) notes.add(`The command has ${urls.length} URLs; only the first (${urls[0]}) was converted.`);
  if (dataParts.length && formFields.length) return { ok: false, error: "The command mixes -d and -F, which curl itself rejects." };

  let rawUrl = urls[0];
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(rawUrl)) {
    notes.add(`The URL has no scheme, so http:// was added, as curl does.`);
    rawUrl = `http://${rawUrl}`;
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: `"${urls[0]}" is not a valid URL.` };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, error: `Only http and https URLs can be converted, not ${url.protocol}.` };

  let body: CurlBody = { kind: "none" };
  const data = dataParts.join("&");
  if (get && dataParts.length) {
    rawUrl = url.href + (url.search ? "&" : "?") + data;
    url = new URL(rawUrl);
  } else if (dataParts.length) {
    body = { kind: "raw", data };
    if (json) {
      if (!hasHeader(headers, "Content-Type")) headers.push(["Content-Type", "application/json"]);
      if (!hasHeader(headers, "Accept")) headers.push(["Accept", "application/json"]);
    } else if (!hasHeader(headers, "Content-Type")) {
      headers.push(["Content-Type", "application/x-www-form-urlencoded"]);
    }
  } else if (formFields.length) {
    body = { kind: "multipart", fields: formFields };
    const index = headers.findIndex(([n]) => n.toLowerCase() === "content-type");
    if (index !== -1) {
      headers.splice(index, 1);
      notes.add("The Content-Type header was removed for the multipart body: the HTTP library sets it with the correct boundary.");
    }
  }

  if (user !== null) {
    if (hasHeader(headers, "Authorization")) {
      notes.add("-u was ignored because an Authorization header is already set.");
    } else {
      const colon = user.indexOf(":");
      if (colon === -1) return { ok: false, error: "-u without a password makes curl prompt for one. Write -u user:password." };
      const auth = buildBasicAuth(user.slice(0, colon), user.slice(colon + 1));
      if (!auth.ok) return { ok: false, error: auth.error };
      headers.push(["Authorization", `Basic ${auth.token}`]);
      notes.add("-u was converted to an Authorization: Basic header. The password is readable in the generated code; load it from an environment variable or secret store instead.");
    }
  }

  // -X wins and is sent exactly as written, as curl does; otherwise curl's defaults apply.
  const resolvedMethod = method ?? (head ? "HEAD" : get ? "GET" : body.kind !== "none" ? "POST" : "GET");
  if (!followRedirects) notes.add("curl does not follow redirects without -L. fetch, Python requests and Go follow them by default; PHP, Ruby and Node's https module do not.");

  return {
    ok: true,
    request: {
      method: resolvedMethod,
      url: url.href,
      headers,
      body,
      timeoutSeconds,
      followRedirects,
      notes: [...notes],
      unsupported: [...unsupported],
    },
  };
}

// --- Code generation -------------------------------------------------------------

export type CodeTarget = "fetch" | "python" | "php" | "go" | "ruby" | "node";

export const codeTargets: { value: CodeTarget; label: string }[] = [
  { value: "fetch", label: "JavaScript (fetch)" },
  { value: "python", label: "Python (requests)" },
  { value: "php", label: "PHP (cURL)" },
  { value: "go", label: "Go (net/http)" },
  { value: "ruby", label: "Ruby (Net::HTTP)" },
  { value: "node", label: "Node.js (https)" },
];

const js = (s: string) => JSON.stringify(s);
const single = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

/** A Python string literal that round-trips any text. */
export function pyString(s: string): string {
  let out = '"';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (ch === "\\") out += "\\\\";
    else if (ch === '"') out += '\\"';
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (code < 0x20 || code === 0x7f) out += `\\x${code.toString(16).padStart(2, "0")}`;
    else out += ch;
  }
  return `${out}"`;
}

/** Combines repeated headers for libraries that store headers in a map. */
function mergedHeaders(headers: [string, string][]): { merged: [string, string][]; combined: boolean } {
  const map = new Map<string, [string, string]>();
  let combined = false;
  for (const [name, value] of headers) {
    const key = name.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing[1] += key === "cookie" ? `; ${value}` : `, ${value}`;
      combined = true;
    } else {
      map.set(key, [name, value]);
    }
  }
  return { merged: [...map.values()], combined };
}

const COMBINED_NOTE = "Repeated headers with the same name were combined into one, separated by commas (semicolons for Cookie).";

function fetchCode(r: CurlRequest): string {
  const lines: string[] = [];
  const options: string[] = [];
  if (r.method !== "GET") options.push(`  method: ${js(r.method)},`);
  const duplicate = new Set(r.headers.map(([n]) => n.toLowerCase())).size !== r.headers.length;
  if (r.headers.length) {
    if (duplicate) options.push(`  headers: [\n${r.headers.map(([n, v]) => `    [${js(n)}, ${js(v)}],`).join("\n")}\n  ],`);
    else options.push(`  headers: {\n${r.headers.map(([n, v]) => `    ${js(n)}: ${js(v)},`).join("\n")}\n  },`);
  }
  if (r.body.kind === "raw") options.push(`  body: ${js(r.body.data)},`);
  if (r.body.kind === "multipart") {
    lines.push("const form = new FormData();");
    for (const [n, v] of r.body.fields) lines.push(`form.append(${js(n)}, ${js(v)});`);
    lines.push("");
    options.push("  body: form,");
  }
  if (r.timeoutSeconds !== null) options.push(`  signal: AbortSignal.timeout(${Math.round(r.timeoutSeconds * 1000)}),`);
  lines.push(`const response = await fetch(${js(r.url)}${options.length ? `, {\n${options.join("\n")}\n}` : ""});`);
  lines.push("", "console.log(response.status);", r.method === "HEAD" ? "" : "console.log(await response.text());");
  return lines.join("\n").trimEnd() + "\n";
}

const PY_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

function pythonCode(r: CurlRequest): string {
  const { merged, combined } = mergedHeaders(r.headers);
  const lines = ["import requests", ""];
  const args = [pyString(r.url)];
  if (combined) lines.push(`# ${COMBINED_NOTE}`);
  if (merged.length) {
    lines.push("headers = {", ...merged.map(([n, v]) => `    ${pyString(n)}: ${pyString(v)},`), "}", "");
    args.push("headers=headers");
  }
  if (r.body.kind === "raw") {
    lines.push(`data = ${pyString(r.body.data)}.encode("utf-8")`, "");
    args.push("data=data");
  }
  if (r.body.kind === "multipart") {
    lines.push("files = {", ...r.body.fields.map(([n, v]) => `    ${pyString(n)}: (None, ${pyString(v)}),`), "}", "");
    args.push("files=files");
  }
  if (r.timeoutSeconds !== null) args.push(`timeout=${r.timeoutSeconds}`);
  const call = PY_METHODS.has(r.method) ? `requests.${r.method.toLowerCase()}(${args.join(", ")})` : `requests.request(${pyString(r.method)}, ${args.join(", ")})`;
  lines.push(`response = ${call}`, "", "print(response.status_code)");
  if (r.method !== "HEAD") lines.push("print(response.text)");
  return lines.join("\n") + "\n";
}

function phpCode(r: CurlRequest): string {
  const options: string[] = ["    CURLOPT_RETURNTRANSFER => true,"];
  if (r.method === "HEAD") options.push("    CURLOPT_NOBODY => true,");
  else if (r.method !== "GET") options.push(`    CURLOPT_CUSTOMREQUEST => ${single(r.method)},`);
  if (r.headers.length) options.push("    CURLOPT_HTTPHEADER => [", ...r.headers.map(([n, v]) => `        ${single(`${n}: ${v}`)},`), "    ],");
  if (r.body.kind === "raw") options.push(`    CURLOPT_POSTFIELDS => ${single(r.body.data)},`);
  if (r.body.kind === "multipart") options.push("    CURLOPT_POSTFIELDS => [", ...r.body.fields.map(([n, v]) => `        ${single(n)} => ${single(v)},`), "    ],");
  if (r.followRedirects) options.push("    CURLOPT_FOLLOWLOCATION => true,");
  if (r.timeoutSeconds !== null) options.push(`    CURLOPT_TIMEOUT_MS => ${Math.round(r.timeoutSeconds * 1000)},`);
  return [
    "<?php",
    "",
    `$ch = curl_init(${single(r.url)});`,
    "curl_setopt_array($ch, [",
    ...options,
    "]);",
    "",
    "$response = curl_exec($ch);",
    "if ($response === false) {",
    "    throw new RuntimeException(curl_error($ch));",
    "}",
    "$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);",
    "curl_close($ch);",
    "",
    "echo $status, PHP_EOL, $response, PHP_EOL;",
    "",
  ].join("\n");
}

function goCode(r: CurlRequest): string {
  const imports = new Set(["fmt", "io", "net/http"]);
  const body: string[] = [];
  let reader = "nil";
  if (r.body.kind === "raw") {
    imports.add("strings");
    reader = `strings.NewReader(${js(r.body.data)})`;
  }
  if (r.body.kind === "multipart") {
    imports.add("bytes");
    imports.add("mime/multipart");
    body.push("\tvar form bytes.Buffer", "\twriter := multipart.NewWriter(&form)");
    for (const [n, v] of r.body.fields) body.push(`\tif err := writer.WriteField(${js(n)}, ${js(v)}); err != nil {`, "\t\tpanic(err)", "\t}");
    body.push("\tif err := writer.Close(); err != nil {", "\t\tpanic(err)", "\t}", "");
    reader = "&form";
  }
  body.push(`\treq, err := http.NewRequest(${js(r.method)}, ${js(r.url)}, ${reader})`, "\tif err != nil {", "\t\tpanic(err)", "\t}");
  for (const [n, v] of r.headers) {
    if (n.toLowerCase() === "host") body.push(`\treq.Host = ${js(v)}`);
    else body.push(`\treq.Header.Add(${js(n)}, ${js(v)})`);
  }
  if (r.body.kind === "multipart") body.push("\treq.Header.Set(\"Content-Type\", writer.FormDataContentType())");
  body.push("");
  if (r.timeoutSeconds !== null) {
    imports.add("time");
    body.push(`\tclient := &http.Client{Timeout: ${Math.round(r.timeoutSeconds * 1000)} * time.Millisecond}`);
  } else {
    body.push("\tclient := &http.Client{}");
  }
  body.push(
    "\tresp, err := client.Do(req)",
    "\tif err != nil {",
    "\t\tpanic(err)",
    "\t}",
    "\tdefer resp.Body.Close()",
    "",
    "\trespBody, err := io.ReadAll(resp.Body)",
    "\tif err != nil {",
    "\t\tpanic(err)",
    "\t}",
    "\tfmt.Println(resp.StatusCode)",
    "\tfmt.Println(string(respBody))",
  );
  return ["package main", "", "import (", ...[...imports].sort().map((i) => `\t"${i}"`), ")", "", "func main() {", ...body, "}", ""].join("\n");
}

const RUBY_CLASSES: Record<string, string> = { GET: "Get", POST: "Post", PUT: "Put", PATCH: "Patch", DELETE: "Delete", HEAD: "Head", OPTIONS: "Options" };

function rubyCode(r: CurlRequest): string {
  const lines = ['require "net/http"', 'require "uri"', "", `uri = URI(${single(r.url)})`];
  const cls = RUBY_CLASSES[r.method];
  const hasBody = r.body.kind !== "none";
  lines.push(cls ? `request = Net::HTTP::${cls}.new(uri)` : `request = Net::HTTPGenericRequest.new(${single(r.method)}, ${hasBody}, true, uri)`);
  const seen = new Set<string>();
  for (const [n, v] of r.headers) {
    const key = n.toLowerCase();
    lines.push(seen.has(key) ? `request.add_field(${single(n)}, ${single(v)})` : `request[${single(n)}] = ${single(v)}`);
    seen.add(key);
  }
  if (r.body.kind === "raw") lines.push(`request.body = ${single(r.body.data)}`);
  if (r.body.kind === "multipart") lines.push(`request.set_form([${r.body.fields.map(([n, v]) => `[${single(n)}, ${single(v)}]`).join(", ")}], "multipart/form-data")`);
  const options = ['use_ssl: uri.scheme == "https"'];
  if (r.timeoutSeconds !== null) options.push(`open_timeout: ${r.timeoutSeconds}`, `read_timeout: ${r.timeoutSeconds}`);
  lines.push("", `response = Net::HTTP.start(uri.hostname, uri.port, ${options.join(", ")}) do |http|`, "  http.request(request)", "end", "");
  if (r.followRedirects) lines.push("# Net::HTTP does not follow redirects: check response.is_a?(Net::HTTPRedirection) and request response[\"location\"].");
  lines.push("puts response.code");
  if (r.method !== "HEAD") lines.push("puts response.body");
  return lines.join("\n") + "\n";
}

function nodeCode(r: CurlRequest): string {
  const lib = new URL(r.url).protocol === "https:" ? "https" : "http";
  const lines = [`import ${lib} from "node:${lib}";`, ""];
  const headers = new Map<string, string[]>();
  for (const [n, v] of r.headers) {
    const existing = [...headers.keys()].find((k) => k.toLowerCase() === n.toLowerCase());
    headers.set(existing ?? n, [...(headers.get(existing ?? n) ?? []), v]);
  }
  let bodyVar: string | null = null;
  if (r.body.kind === "raw") {
    lines.push(`const body = ${js(r.body.data)};`, "");
    bodyVar = "body";
  }
  if (r.body.kind === "multipart") {
    lines.push('const boundary = "----FormBoundary" + Math.random().toString(16).slice(2);');
    lines.push("const body = [");
    for (const [n, v] of r.body.fields) {
      const name = n.replace(/"/g, "%22").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
      lines.push("  `--${boundary}`,", `  ${js(`Content-Disposition: form-data; name="${name}"`)},`, '  "",', `  ${js(v)},`);
    }
    lines.push("  `--${boundary}--`,", '  "",', '].join("\\r\\n");', "");
    headers.set("Content-Type", ["multipart/form-data; boundary=${boundary}"]);
    bodyVar = "body";
  }
  const headerLines = [...headers].map(([n, values]) => {
    const value = n === "Content-Type" && r.body.kind === "multipart" ? "`multipart/form-data; boundary=${boundary}`" : values.length === 1 ? js(values[0]) : `[${values.map(js).join(", ")}]`;
    return `    ${js(n)}: ${value},`;
  });
  if (bodyVar) headerLines.push(`    "Content-Length": Buffer.byteLength(${bodyVar}),`);
  const options = [`  method: ${js(r.method)},`];
  if (headerLines.length) options.push("  headers: {", ...headerLines, "  },");
  if (r.timeoutSeconds !== null) options.push(`  timeout: ${Math.round(r.timeoutSeconds * 1000)}, // socket inactivity, not total time`);
  lines.push(`const req = ${lib}.request(${js(r.url)}, {`, ...options, "}, (res) => {");
  if (r.followRedirects) lines.push("  // Node's http and https modules do not follow redirects: check res.statusCode and res.headers.location.");
  lines.push('  let data = "";', '  res.setEncoding("utf8");', "  res.on(\"data\", (chunk) => (data += chunk));", "  res.on(\"end\", () => {", "    console.log(res.statusCode);", "    console.log(data);", "  });", "});", "");
  if (r.timeoutSeconds !== null) lines.push('req.on("timeout", () => req.destroy(new Error("Request timed out")));');
  lines.push('req.on("error", (err) => console.error(err));', bodyVar ? `req.end(${bodyVar});` : "req.end();");
  return lines.join("\n") + "\n";
}

export function generateCode(request: CurlRequest, target: CodeTarget): string {
  switch (target) {
    case "fetch":
      return fetchCode(request);
    case "python":
      return pythonCode(request);
    case "php":
      return phpCode(request);
    case "go":
      return goCode(request);
    case "ruby":
      return rubyCode(request);
    case "node":
      return nodeCode(request);
  }
}
