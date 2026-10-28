import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import { XmlFormatter } from "@/components/tools/xml-formatter/XmlFormatter";
import type { ToolPageContent } from "@/types/tool";

const slug = "xml-formatter";

const content: ToolPageContent = {
  metaDescription:
    "Format and minify XML online and check that it is well-formed, with the line and column of any error. Attributes, comments, CDATA and namespaces are kept intact.",
  howItWorks: [
    "Paste XML and select Format to indent it, or Validate to only check it. The document is checked against the XML 1.0 well-formedness rules: every tag closed in the right order, attribute values quoted, special characters escaped, a single root element and namespace prefixes declared.",
    "If the XML is not well-formed, nothing is changed. You get the line and column of the problem, the offending line with a marker, and a button that selects it in the input.",
    "Formatting only changes the whitespace between elements. Tags and attributes are copied exactly as written, and text, comments, CDATA sections and processing instructions are kept unchanged. Elements that mix text and child elements, or that set `xml:space=\"preserve\"`, are kept on one line exactly as they are, because whitespace inside them can be meaningful.",
  ],
  notes: [
    "This tool checks that XML is well-formed. It does not validate against a DTD or an XSD schema, so it cannot check which elements or values are allowed.",
    "Entities other than &amp; &lt; &gt; &quot; and &apos; must be declared in the document's DOCTYPE. Entities from an external DTD cannot be checked and are reported as a warning.",
    "Minify removes the whitespace between elements only. Whitespace inside text is kept.",
  ],
  example: {
    description: "Formatting a one-line XML document with 2-space indentation:",
    input: `<order id="7"><item sku="A1">Lamp</item><item sku="B2">Pen</item></order>`,
    output: `<order id="7">
  <item sku="A1">Lamp</item>
  <item sku="B2">Pen</item>
</order>`,
  },
  faqs: [
    {
      question: "What is the difference between well-formed and valid XML?",
      answer:
        "Well-formed XML follows the syntax rules of XML, such as closing every tag. Valid XML also matches a schema (DTD or XSD) that defines which elements and attributes are allowed. This tool checks well-formedness only.",
    },
    {
      question: "Why do I get an error about &?",
      answer:
        "In XML, & starts an entity reference. A literal ampersand must be written as &amp;, and a literal < as &lt;. HTML entities such as &nbsp; are not defined in XML unless the document declares them.",
    },
    {
      question: "Will formatting change my data?",
      answer:
        "No text, attribute or CDATA content is changed. Only whitespace between elements is replaced with indentation; text-only and mixed-content elements are copied exactly.",
    },
    {
      question: "Are namespaces supported?",
      answer:
        "Yes. Default and prefixed namespaces are kept as written, and the tool reports any prefix, such as media:image, that is used without an xmlns:media declaration.",
    },
  ],
  related: ["json-formatter", "html-css-js-minifier", "sql-formatter", "json-schema-validator"],
};

export const metadata = toolMetadata(slug, content);

export default function XmlFormatterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <XmlFormatter />
    </ToolPage>
  );
}
