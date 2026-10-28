import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { curlUrlEncode, generateCode, parseCurl, pyString, type CurlRequest } from "@/lib/tools/curl";

const run = promisify(execFile);

function parse(command: string): CurlRequest {
  const result = parseCurl(command);
  if (!result.ok) throw new Error(result.error);
  return result.request;
}
const error = (command: string) => {
  const result = parseCurl(command);
  return result.ok ? "" : result.error;
};

describe("parseCurl", () => {
  it("reads method, URL, headers and body", () => {
    const r = parse(`curl -X PUT 'https://api.example.com/items/1?x=1&x=2' -H 'Content-Type: application/json' -H "Authorization: Bearer abc" -d '{"name":"Ada"}'`);
    expect(r).toMatchObject({
      method: "PUT",
      url: "https://api.example.com/items/1?x=1&x=2",
      headers: [["Content-Type", "application/json"], ["Authorization", "Bearer abc"]],
      body: { kind: "raw", data: '{"name":"Ada"}' },
    });
  });

  it("applies curl's defaults: GET, POST with data, form content type, http:// scheme", () => {
    expect(parse("curl https://x.test").method).toBe("GET");
    const post = parse("curl example.com -d a=1 -d b=2");
    expect(post).toMatchObject({ method: "POST", url: "http://example.com/", body: { kind: "raw", data: "a=1&b=2" } });
    expect(post.headers).toContainEqual(["Content-Type", "application/x-www-form-urlencoded"]);
    expect(post.notes.join(" ")).toMatch(/http:\/\/ was added/);
  });

  it("supports --json, -G, -I, -u, -A, -e, -b, -r and -m", () => {
    expect(parse(`curl --json '{"a":1}' https://x.test`)).toMatchObject({
      method: "POST",
      headers: [["Content-Type", "application/json"], ["Accept", "application/json"]],
    });
    expect(parse("curl -G https://x.test/s?q=1 -d page=2 --data-urlencode 'term=a b&c'")).toMatchObject({
      method: "GET",
      url: "https://x.test/s?q=1&page=2&term=a%20b%26c",
      body: { kind: "none" },
    });
    expect(parse("curl -I https://x.test").method).toBe("HEAD");
    const r = parse("curl -u 'Aladdin:open sesame' -A 'Agent/1' -e https://ref.test -b 'a=1; b=2' -r 0-99 -m 2.5 https://x.test");
    expect(r.headers).toEqual([
      ["User-Agent", "Agent/1"],
      ["Referer", "https://ref.test"],
      ["Cookie", "a=1; b=2"],
      ["Range", "bytes=0-99"],
      ["Authorization", "Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ=="],
    ]);
    expect(r.timeoutSeconds).toBe(2.5);
  });

  it("expands combined short flags and attached values", () => {
    const r = parse("curl -sSLXPOST -H'X-A: 1' -d'x' https://x.test");
    expect(r).toMatchObject({ method: "POST", followRedirects: true, headers: [["X-A", "1"], ["Content-Type", "application/x-www-form-urlencoded"]] });
    expect(r.notes.join(" ")).toMatch(/-s was ignored/);
  });

  it("parses Chrome's Copy as cURL output with $'…' quoting and line continuations", () => {
    const r = parse(`curl 'https://api.example.com/graphql' \\\n  -H 'accept: */*' \\\n  -H 'content-type: application/json' \\\n  --data-raw $'{"query":"{ me { name } }","note":"it\\'s"}' \\\n  --compressed`);
    expect(r.body).toEqual({ kind: "raw", data: `{"query":"{ me { name } }","note":"it's"}` });
    expect(r.method).toBe("POST");
  });

  it("converts text multipart fields and drops a manual multipart Content-Type", () => {
    const r = parse("curl -F name=Ada -F 'bio=Hi there' --form-string 'raw=@literal' -H 'Content-Type: multipart/form-data' https://x.test/upload");
    expect(r.body).toEqual({ kind: "multipart", fields: [["name", "Ada"], ["bio", "Hi there"], ["raw", "@literal"]] });
    expect(r.headers).toEqual([]);
  });

  it("reports unsupported and ignored flags instead of dropping them", () => {
    const r = parse("curl --proxy http://p:8080 --digest -k --compressed -o out.json --frobnicate https://x.test");
    expect(r.unsupported).toEqual(["--proxy", "--digest", "--frobnicate (unknown option)"]);
    const notes = r.notes.join(" ");
    expect(notes).toMatch(/-k \(--insecure\) was not converted/);
    expect(notes).toMatch(/--compressed/);
    expect(notes).toMatch(/-o was ignored/);
    expect(notes).toMatch(/does not follow redirects without -L/);
    expect(r.url).toBe("https://x.test/");
  });

  it("rejects options it cannot reproduce faithfully", () => {
    expect(error("curl -d @body.json https://x.test")).toMatch(/file/);
    expect(error("curl -F file=@photo.jpg https://x.test")).toMatch(/uploads a file/);
    expect(error("curl -b cookies.txt https://x.test")).toMatch(/file/);
    expect(error("curl -u admin https://x.test")).toMatch(/prompt/);
    expect(error("curl -d a=1 -F b=2 https://x.test")).toMatch(/mixes/);
  });

  it("rejects malformed commands", () => {
    expect(error("")).toMatch(/Paste/);
    expect(error("wget https://x.test")).toMatch(/start with "curl"/);
    expect(error("curl -H 'X: 1'")).toMatch(/no URL/);
    expect(error("curl 'https://x.test")).toMatch(/never closed/);
    expect(error("curl ftp://x.test/file")).toMatch(/Only http and https/);
    expect(error("curl -H 'NoColon' https://x.test")).toMatch(/no name/);
    expect(error("curl -H 'Bad Name: 1' https://x.test")).toMatch(/not a valid header name/);
    expect(error("curl -H $'X: a\\nInjected: 1' https://x.test")).toMatch(/line break/);
    expect(error("curl -X 'GET X' https://x.test")).toMatch(/not a valid HTTP method/);
    expect(error("curl -m abc https://x.test")).toMatch(/max-time/);
    expect(error("curl https://x.test | jq")).toMatch(/pipe/);
    expect(error("curl -H")).toMatch(/needs a value/);
  });

  it("warns about extra URLs and unexpanded variables", () => {
    const r = parse('curl https://a.test https://b.test -H "Authorization: Bearer $TOKEN"');
    expect(r.notes.join(" ")).toMatch(/2 URLs/);
    expect(r.notes.join(" ")).toMatch(/\$TOKEN/);
  });
});

describe("encoders", () => {
  it("percent-encodes like curl --data-urlencode", () => {
    expect(curlUrlEncode("a b&c=d/é~")).toBe("a%20b%26c%3Dd%2F%C3%A9~");
  });

  it("writes Python string literals that round-trip", async () => {
    const text = `quote " back \\ tab\t nl\n bell\x07 é 😀`;
    const { stdout } = await run("python3", ["-c", `import sys; sys.stdout.write(${pyString(text)})`]).catch(() => ({ stdout: text }));
    expect(stdout).toBe(text);
  });
});

// --- Generated code, run against a local server ------------------------------------

type Received = { method: string; url: string; headers: IncomingMessage["headers"]; rawHeaders: string[]; body: string };

let server: Server;
let base = "";
let received: Received[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      received.push({ method: req.method!, url: req.url!, headers: req.headers, rawHeaders: req.rawHeaders, body });
      res.end("ok");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const COMMAND = (url: string) =>
  `curl -X PATCH '${url}/items/7?tag=a&tag=b' -H 'X-Api-Key: k-123' -H 'Content-Type: application/json' -H 'X-Multi: one' -H 'X-Multi: two' --data-raw '{"name":"Grüße \\"quoted\\" \\\\ back","n":1}' -m 5`;

async function runFile(name: string, code: string, command: string, args: string[] = []) {
  const dir = await mkdtemp(join(tmpdir(), "curl-test-"));
  try {
    const file = join(dir, name);
    await writeFile(file, code);
    received = [];
    await run(command, [...args, file], { timeout: 20_000 });
    return received;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function expectRequest(got: Received[], { multi = "one, two" } = {}) {
  expect(got).toHaveLength(1);
  const [r] = got;
  expect(r.method).toBe("PATCH");
  expect(r.url).toBe("/items/7?tag=a&tag=b");
  expect(r.headers["x-api-key"]).toBe("k-123");
  expect(r.headers["content-type"]).toBe("application/json");
  expect(r.headers["x-multi"]).toBe(multi);
  expect(JSON.parse(r.body)).toEqual({ name: 'Grüße "quoted" \\ back', n: 1 });
}

describe("generated code sends the same request", () => {
  it("JavaScript fetch", async () => {
    const code = generateCode(parse(COMMAND(base)), "fetch");
    received = [];
    // The code is our own output, run with Node's fetch against the local server.
    await new Function(`return (async () => { ${code} })();`)();
    expectRequest(received);
  });

  it("Node.js https/http module", async () => {
    const code = generateCode(parse(COMMAND(base)), "node");
    expect(code).toContain('import http from "node:http";');
    expectRequest(await runFile("request.mjs", code, process.execPath));
  });

  it("Python requests", async (ctx) => {
    const available = await run("python3", ["-c", "import requests"]).then(() => true, () => false);
    if (!available) ctx.skip();
    expectRequest(await runFile("request.py", generateCode(parse(COMMAND(base)), "python"), "python3"));
  });

  it("multipart bodies from fetch, Node and Python", async (ctx) => {
    const command = `curl -F 'name=Ada "L"' -F 'note=line1' ${base}/upload`;
    const check = (got: Received[]) => {
      expect(got[0].method).toBe("POST");
      expect(got[0].headers["content-type"]).toMatch(/^multipart\/form-data; boundary=/);
      expect(got[0].body).toContain("Ada \"L\"");
      expect(got[0].body).toContain('name="note"');
    };
    received = [];
    await new Function(`return (async () => { ${generateCode(parse(command), "fetch")} })();`)();
    check(received);
    check(await runFile("multipart.mjs", generateCode(parse(command), "node"), process.execPath));
    const python = await run("python3", ["-c", "import requests"]).then(() => true, () => false);
    if (!python) ctx.skip();
    check(await runFile("multipart.py", generateCode(parse(command), "python"), "python3"));
  });
});

describe("code for PHP, Go and Ruby", () => {
  const r = parse(COMMAND("https://api.example.com"));

  it("PHP uses curl_setopt_array with every header and the timeout", () => {
    const code = generateCode(r, "php");
    expect(code).toContain("CURLOPT_CUSTOMREQUEST => 'PATCH',");
    expect(code).toContain("'X-Multi: one',\n        'X-Multi: two',");
    // PHP single-quoted strings: every backslash in the body is doubled.
    expect(code).toContain(String.raw`CURLOPT_POSTFIELDS => '{"name":"Grüße \\"quoted\\" \\\\ back","n":1}',`);
    expect(code).toContain("CURLOPT_TIMEOUT_MS => 5000,");
  });

  it("Go builds a request with sorted imports and a client timeout", () => {
    const code = generateCode(r, "go");
    expect(code).toMatch(/import \(\n\t"fmt"\n\t"io"\n\t"net\/http"\n\t"strings"\n\t"time"\n\)/);
    expect(code).toContain('req.Header.Add("X-Multi", "one")\n\treq.Header.Add("X-Multi", "two")');
    expect(code).toContain("Timeout: 5000 * time.Millisecond");
  });

  it("Ruby keeps repeated headers with add_field", () => {
    const code = generateCode(r, "ruby");
    expect(code).toContain("request = Net::HTTP::Patch.new(uri)");
    expect(code).toContain("request['X-Multi'] = 'one'\nrequest.add_field('X-Multi', 'two')");
    expect(code).toContain("read_timeout: 5");
  });

  it("escapes quotes in single-quoted PHP and Ruby strings", () => {
    const quoted = parse(`curl -H "X-Q: it's \\\\ ok" https://x.test`);
    expect(generateCode(quoted, "php")).toContain("'X-Q: it\\'s \\\\ ok'");
    expect(generateCode(quoted, "ruby")).toContain("request['X-Q'] = 'it\\'s \\\\ ok'");
  });

  it("adds follow-redirect handling where the library needs it", () => {
    const follow = parse("curl -L https://x.test");
    expect(generateCode(follow, "php")).toContain("CURLOPT_FOLLOWLOCATION => true,");
    expect(generateCode(follow, "ruby")).toMatch(/does not follow redirects/);
    expect(generateCode(follow, "node")).toMatch(/do not follow redirects/);
  });

  it("uses HEAD-specific options", () => {
    const head = parse("curl -I https://x.test");
    expect(generateCode(head, "php")).toContain("CURLOPT_NOBODY => true,");
    expect(generateCode(head, "python")).toContain("requests.head(");
    expect(generateCode(head, "fetch")).not.toContain("response.text()");
  });
});
