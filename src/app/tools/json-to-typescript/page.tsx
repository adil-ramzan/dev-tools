import { JsonToTypeScript } from "@/components/tools/json-to-typescript/JsonToTypeScript";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "json-to-typescript";

const content: ToolPageContent = {
  metaDescription:
    "Generate TypeScript interfaces or type aliases from a JSON sample. Nested objects get their own types, and properties missing from some items become optional.",
  howItWorks: [
    "Paste a JSON sample, such as an API response, and select Generate types. Every object becomes a named interface, nested objects get their own interfaces, and arrays are typed by their items.",
    "When an array contains several objects, they are merged into one type. A property that appears in only some of the objects becomes optional (`email?: string`), and a property with different kinds of values becomes a union (`number | string`).",
    "Type names come from property names: `profile` becomes `Profile`, and array items are named in the singular, so `orders` becomes `Order`. You can choose the root name, use `type` instead of `interface`, and make every property optional.",
  ],
  notes: [
    "Types are inferred from your sample only. A field that is always null in the sample is typed as null, and an empty array as unknown[]; use a sample with real values for better types.",
    "Strings that look like dates, IDs or enums are typed as string, because JSON has no way to mark them.",
    "Property names that are not valid identifiers, such as \"first-name\", are quoted.",
  ],
  example: {
    description: "Generating interfaces for a task object, with the root name set to Task:",
    input: `{
  "id": 7,
  "title": "Ship it",
  "tags": ["release"],
  "assignee": { "name": "Ada", "email": null }
}`,
    output: `export interface Task {
  id: number;
  title: string;
  tags: string[];
  assignee: Assignee;
}

export interface Assignee {
  name: string;
  email: null;
}`,
  },
  faqs: [
    {
      question: "Should I use interface or type?",
      answer:
        "For object shapes they are nearly interchangeable. Interfaces can be extended and merged, which suits public APIs; type aliases can also describe unions and other types. Follow your project's convention.",
    },
    {
      question: "How are optional properties detected?",
      answer:
        "Objects in the same array are compared. A property present in every object is required; a property missing from at least one becomes optional. With a single object, nothing can be detected, so you can choose to make every property optional instead.",
    },
    {
      question: "Why is a property typed as null?",
      answer:
        "Its only value in your sample was null, so the tool cannot know its real type. Change it to something like string | null, or use a sample where the field has a value.",
    },
    {
      question: "Does this validate data at runtime?",
      answer:
        "No. TypeScript types are checked when you compile and disappear at runtime. To check API responses while your app runs, use a validation library such as Zod with a matching schema.",
    },
  ],
  related: ["json-formatter", "csv-json-converter", "text-case-converter"],
};

export const metadata = toolMetadata(slug, content);

export default function JsonToTypeScriptPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <JsonToTypeScript />
    </ToolPage>
  );
}
