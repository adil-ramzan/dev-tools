import { DataFormatConverter } from "@/components/tools/yaml-json-toml-converter/DataFormatConverter";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "yaml-json-toml-converter";

const content: ToolPageContent = {
  metaDescription:
    "Convert between YAML, JSON and TOML in your browser. Values a format cannot represent, like null in TOML, are reported instead of silently dropped.",
  howItWorks: [
    "Choose the source and target formats, paste your data and select Convert. JSON, YAML and TOML can each be converted to either of the others, or to the same format to normalize its formatting.",
    "Data is read into a typed model that keeps integers and floats apart and stores integers exactly, so `1.0` stays a float and `9007199254740993` is not rounded. JSON is read with a strict parser that reports duplicate keys; YAML 1.2 is read with the `yaml` package and TOML 1.0 with `smol-toml`, both loaded only on this page.",
    "Syntax errors show the line and column, with a marker under the problem. After a successful conversion, the tool lists anything that changed along the way, with the path of each value affected, such as `$.server.ports[1]`.",
  ],
  notes: [
    "TOML has no null value, needs an object at the top level, and limits integers to 64 bits. Input that breaks these rules is reported with the paths of the values involved; nothing is dropped.",
    "JSON has no NaN or infinity and no dates. TOML dates and times become strings in JSON and YAML, with a warning.",
    "YAML aliases (`*name`) are expanded into copies, keys that are numbers or booleans become strings, and documents that expand to more than a million values are rejected to protect your browser.",
    "YAML 1.2 has no merge keys, so `<<` is kept as an ordinary key. Strings such as `yes` and `off` are quoted in YAML output so YAML 1.1 parsers do not read them as booleans.",
    "Comments, key quoting and blank lines are not carried over. A round trip between formats does not reproduce the original text exactly.",
  ],
  example: {
    description: "A JSON configuration converted to TOML:",
    input: `{
  "title": "app",
  "ratio": 1.0,
  "server": { "ports": [80, 443] }
}`,
    output: `title = "app"
ratio = 1.0

[server]
ports = [ 80, 443 ]`,
    outputLabel: "TOML",
  },
  faqs: [
    {
      question: "Why does converting to TOML fail when my JSON has null?",
      answer:
        "TOML has no way to write null. Silently leaving the key out would change the meaning of your data, so the tool lists every null with its path instead. Remove those keys or give them a value, then convert again.",
    },
    {
      question: "Are comments kept?",
      answer: "No. The parsers read data, not comments, so comments are lost in conversion. The tool warns you when the input contained comments.",
    },
    {
      question: "Which YAML version is used?",
      answer:
        "YAML 1.2 with the core schema, which most modern tools use. Under YAML 1.1, unquoted yes, no, on and off are booleans; the tool quotes such strings in its output so older parsers read them correctly.",
    },
    {
      question: "Is my configuration uploaded?",
      answer: "No. Parsing and conversion happen in your browser, so secrets in configuration files never leave your device.",
    },
  ],
  related: ["json-formatter", "csv-json-converter", "json-to-typescript", "json-schema-validator"],
};

export const metadata = toolMetadata(slug, content);

export default function YamlJsonTomlConverterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <DataFormatConverter />
    </ToolPage>
  );
}
