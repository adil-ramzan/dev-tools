import { MimeTypeLookup } from "@/components/tools/mime-type-lookup/MimeTypeLookup";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "mime-type-lookup";

const content: ToolPageContent = {
  metaDescription:
    "Look up the MIME type for a file extension, or the extensions for a MIME type, using the mime-db dataset behind Express and many servers. Works offline in your browser.",
  howItWorks: [
    "Type a file extension (`png`), a file name (`report.pdf`) or a MIME type (`application/json`). For an extension, the tool shows every type it is associated with and marks the usual one; for a type, it shows its extensions, where it is registered, its default charset and whether it is worth compressing.",
    "Data comes from mime-db, the dataset used by the `mime-types` package and so by Express and many other servers. It combines types registered with IANA and types used by Apache and nginx. The dataset is loaded only on this page and searched in your browser.",
    "When several types share an extension, the usual one is chosen by where it is registered (IANA first), with a few corrections for what browsers actually use, such as `video/mp4` for .mp4.",
  ],
  notes: [
    "An extension or declared Content-Type does not prove what a file contains. Validate uploads by their content, not their name.",
    "For file names, only the last extension counts: archive.tar.gz is looked up as .gz.",
    "Parameters such as `; charset=utf-8` are ignored when looking up a type.",
    "Some common extensions are ambiguous or unregistered: .ts is an MPEG transport stream in the registry, not TypeScript, and Python files have only the de-facto type `text/x-python`.",
  ],
  example: {
    description: "Looking up a file name:",
    input: "invoice.pdf",
    output: "application/pdf (registered with IANA, extension .pdf)",
  },
  faqs: [
    {
      question: "What is a MIME type?",
      answer:
        "A label in the form type/subtype, such as image/png, that tells software how to interpret data. Servers send it in the Content-Type header, and browsers use it to decide how to display or download a response.",
    },
    {
      question: "Is it image/jpg or image/jpeg?",
      answer: "image/jpeg. image/jpg is a common mistake and is not registered; the tool suggests the correct type when you search for it.",
    },
    {
      question: "Should I serve JavaScript as text/javascript or application/javascript?",
      answer: "text/javascript. RFC 9239 made it the standard type for JavaScript; application/javascript is an older alias that browsers still accept.",
    },
    {
      question: "Can I trust the extension of an uploaded file?",
      answer:
        "No. Anyone can rename a file. Check the content, for example its signature bytes, restrict what you accept, and serve uploads with a safe Content-Type and Content-Disposition.",
    },
  ],
  related: ["base64-file-converter", "url-encoder-decoder", "html-entity-encoder-decoder", "regex-tester"],
};

export const metadata = toolMetadata(slug, content);

export default function MimeTypeLookupPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <MimeTypeLookup />
    </ToolPage>
  );
}
