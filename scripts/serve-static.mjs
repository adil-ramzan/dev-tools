// Serves the static export in out/ the way Cloudflare static assets do:
// /path → path.html or path/index.html, unknown paths → 404.html with status 404.
// Used by `npm run start` and the Playwright tests. Not for production.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve("out");
const port = Number(process.argv[2] ?? process.env.PORT ?? 3000);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
  const base = normalize(join(root, pathname));
  if (!base.startsWith(root)) {
    res.writeHead(400).end();
    return;
  }
  for (const candidate of [base, `${base.replace(/\/$/, "")}.html`, join(base, "index.html")]) {
    if (await isFile(candidate)) {
      res.writeHead(200, { "content-type": TYPES[extname(candidate)] ?? "application/octet-stream" });
      res.end(await readFile(candidate));
      return;
    }
  }
  res.writeHead(404, { "content-type": TYPES[".html"] });
  res.end(await readFile(join(root, "404.html")));
}).listen(port, () => console.log(`Serving out/ on http://localhost:${port}`));
