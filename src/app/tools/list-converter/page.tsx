import { ListConverter } from "@/components/tools/list-converter/ListConverter";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "list-converter";

const content: ToolPageContent = {
  metaDescription:
    "Sort lines, remove duplicates, reverse, transpose columns, trim whitespace, add prefixes and suffixes, and join lists with any separator. Runs in your browser.",
  howItWorks: [
    "Paste a list with one item per line, or items separated by commas, tabs or another separator. Choose the operations you need, and the output updates as you type.",
    "Operations run in a fixed order: split, trim, remove empty lines, change case, truncate items, remove duplicates, sort, reverse, keep the first N rows, transpose, add prefix and suffix, then join. Sort alphabetically, naturally (so `item2` comes before `item10`), by numeric value or by length.",
    "Switch the input to Columns for tab-, comma-, semicolon- or pipe-separated rows. Rows are sorted and deduplicated as a whole or by a chosen column, and Transpose swaps rows and columns.",
  ],
  notes: [
    "Nothing is removed by default: empty lines, leading and trailing spaces and duplicates are all kept until you turn on the matching option.",
    "Duplicate detection keeps the first occurrence and treats different Unicode forms of the same accented letter as equal. Turn on \"Ignore case\" to treat Apple and apple as duplicates too.",
    "Alphabetical sorting follows your browser's language rules. Numeric sorting reads the number at the start of each item; items without one go last.",
    "Truncation counts characters as you see them, so emoji and accented letters are never cut in half.",
    "Column mode splits on the delimiter only; quoted CSV fields that contain the delimiter are not supported. Use the CSV ↔ JSON Converter for quoted CSV.",
  ],
  example: {
    description: "Turning a list of IDs into a quoted, comma-separated list for a SQL IN clause, with duplicates removed:",
    input: "42\n7\n42\n19",
    output: "'42', '7', '19'",
  },
  faqs: [
    {
      question: "How do I convert a column of values to a comma-separated list?",
      answer: "Paste the column, keep \"Items separated by\" on New line, and set \"Join output with\" to Comma or Comma + space. Add a prefix and suffix such as ' to quote each value.",
    },
    {
      question: "Why does sorting put item10 before item2?",
      answer: "Alphabetical sorting compares text character by character, and 1 comes before 2. Choose Natural sorting to compare the numbers inside the text by value.",
    },
    {
      question: "Can I sort a table by one column?",
      answer: "Yes. Switch the input to Columns, choose the delimiter, pick a sort order and enter the column number to sort by.",
    },
    {
      question: "How large a list can it handle?",
      answer: "Hundreds of thousands of lines. Processing happens in your browser, so very large inputs depend on your device's memory.",
    },
  ],
  related: ["text-case-converter", "diff-checker", "csv-json-converter", "word-counter"],
};

export const metadata = toolMetadata(slug, content);

export default function ListConverterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <ListConverter />
    </ToolPage>
  );
}
