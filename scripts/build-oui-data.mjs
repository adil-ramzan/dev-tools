// Builds src/data/oui-vendors.json from the oui-data package (BSD-2-Clause),
// which mirrors the IEEE Registration Authority's MA-L, MA-M and MA-S
// registries. Only the organization name and country are kept, and repeated
// organizations share one entry, so the file is about a third of the original.
//
// Run with: npm run data:oui
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// The package exports only its JSON file; its folder holds package.json and LICENSE.
const dataPath = require.resolve("oui-data");
const dir = dataPath.replace(/index\.json$/, "");
const pkg = JSON.parse(readFileSync(`${dir}package.json`, "utf8"));
const data = JSON.parse(readFileSync(dataPath, "utf8"));
const license = readFileSync(`${dir}LICENSE`, "utf8").trim();

const names = new Map();
const entries = [];
for (const prefix of Object.keys(data).sort()) {
  if (!/^[0-9A-F]{6}([0-9A-F]|[0-9A-F]{3})?$/.test(prefix)) throw new Error(`Unexpected prefix ${prefix}`);
  const lines = data[prefix].split("\n").map((l) => l.trim()).filter(Boolean);
  const key = `${lines[0]}\t${lines.length > 1 ? lines[lines.length - 1] : ""}`;
  if (!names.has(key)) names.set(key, names.size);
  entries.push(`${prefix}:${names.get(key).toString(36)}`);
}

const output = {
  source: "IEEE Registration Authority MA-L, MA-M and MA-S registries, via the oui-data package",
  package: `oui-data@${pkg.version}`,
  license,
  generated: new Date().toISOString().slice(0, 10),
  names: [...names.keys()],
  entries: entries.join("|"),
};
writeFileSync(new URL("../src/data/oui-vendors.json", import.meta.url), JSON.stringify(output));
console.log(`Wrote ${entries.length} prefixes and ${names.size} organizations from oui-data@${pkg.version}.`);
