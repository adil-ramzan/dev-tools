import { CsvJsonConverter } from "@/components/tools/csv-json-converter/CsvJsonConverter";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "csv-json-converter";

const content: ToolPageContent = {
  metaDescription:
    "Convert CSV to JSON and JSON to CSV in your browser. Handles quoted fields, commas and line breaks inside values, custom delimiters and header rows.",
  howItWorks: [
    "Choose a direction, paste your data and select Convert. CSV is read according to RFC 4180, the common CSV standard: fields containing commas, quotes or line breaks are wrapped in double quotes, and a quote inside a field is written as two quotes (`\"\"`).",
    "From CSV, each row becomes a JSON object using the header row as property names, or an array of values if your file has no header. Values stay strings unless you turn on number and true/false conversion. Numbers are copied exactly, and values like `02134` stay strings so leading zeros are not lost.",
    "From JSON, an array of objects becomes a table whose columns are all the property names found, in the order they first appear. Fields are quoted only when needed. The comma, semicolon, tab and pipe delimiters are supported in both directions.",
  ],
  notes: [
    "Parsing is strict: a stray quote, text after a closing quote or a quote that is never closed is reported with its line and column instead of being guessed at.",
    "Rows with missing fields get empty strings, and extra fields get generated column names. Duplicate or empty headers are renamed. Each case is listed in a note, so no data is dropped silently.",
    "When converting JSON to CSV, nested objects and arrays are written into the cell as JSON text, and null becomes an empty cell. Both are reported.",
    "Spreadsheet apps such as Excel may run formulas in cells starting with =, + or @. Be careful when opening CSV files from untrusted sources.",
  ],
  example: {
    description: "Converting CSV with a quoted field that contains a comma:",
    input: `name,city
"Smith, Jane",Boston
Sam,"New York"`,
    output: `[
  {
    "name": "Smith, Jane",
    "city": "Boston"
  },
  {
    "name": "Sam",
    "city": "New York"
  }
]`,
  },
  faqs: [
    {
      question: "How do I include a comma or quote in a CSV value?",
      answer:
        "Wrap the value in double quotes: \"Smith, Jane\". To include a double quote inside a quoted value, write it twice: \"He said \"\"hi\"\"\".",
    },
    {
      question: "Why are my numbers strings in the JSON?",
      answer:
        "CSV has no data types, so every value is text by default. Turn on Convert numbers and true/false to turn values written like JSON numbers and booleans into numbers and booleans. Values with leading zeros, such as ZIP codes, always stay strings.",
    },
    {
      question: "My file uses semicolons. Will it work?",
      answer:
        "Yes. The delimiter is detected from the first line, and you can also choose comma, semicolon, tab or pipe yourself. Semicolons are common in CSV files exported in countries that use a decimal comma.",
    },
    {
      question: "What happens to nested JSON when converting to CSV?",
      answer:
        "CSV cells cannot contain structure, so nested objects and arrays are written as JSON text inside the cell. If you need separate columns, flatten the data before converting.",
    },
  ],
  related: ["json-formatter", "json-to-typescript", "sql-formatter"],
};

export const metadata = toolMetadata(slug, content);

export default function CsvJsonConverterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <CsvJsonConverter />
    </ToolPage>
  );
}
