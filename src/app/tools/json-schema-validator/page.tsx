import { JsonSchemaValidator } from "@/components/tools/json-schema-validator/JsonSchemaValidator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "json-schema-validator";

const content: ToolPageContent = {
  metaDescription:
    "Validate JSON data against a JSON Schema (2020-12, 2019-09, draft 7 or draft 4) in your browser and see every error with its path and the rule that failed.",
  howItWorks: [
    "Paste a JSON Schema on the left and the JSON data to check on the right, then select Validate. Both are first checked for JSON syntax errors, with the line and column of any problem. The data is then checked against every rule in the schema.",
    "Each problem is listed with its location in the data, written as a path such as `$.address.zip`, the reason it failed and the schema rule responsible, such as `#/properties/address/properties/zip/pattern`. For `anyOf` and `oneOf`, the reason each option failed is listed underneath.",
    "Validation uses @cfworker/json-schema, which interprets the schema directly instead of generating code from it, and runs in a background worker in your browser. If a `pattern` in the schema is so slow it would freeze the page, validation stops after a few seconds.",
  ],
  notes: [
    "Supported versions: 2020-12, 2019-09, draft 7 and draft 4. The version is read from $schema, or you can choose one.",
    "Common keywords are supported, including type, required, properties, additionalProperties, items, enum, const, minimum, pattern, format, $ref and $defs, allOf, anyOf, oneOf, not and if/then/else.",
    "References to schemas at other URLs are not downloaded. Put shared definitions in $defs and refer to them with #/$defs/name.",
    "format is checked as an assertion (for example email, date-time, uri and uuid), which is stricter than the 2019-09 and 2020-12 default of treating it as an annotation.",
    "Numbers are compared as 64-bit floating point values, so integers beyond 9,007,199,254,740,991 may be compared approximately.",
  ],
  example: {
    description: "Validating a record whose id is a string instead of an integer:",
    input: `Schema:
{
  "type": "object",
  "required": ["id"],
  "properties": {
    "id": { "type": "integer" },
    "email": { "type": "string", "format": "email" }
  }
}

Data:
{ "id": "42", "email": "ada@" }`,
    output: `$.id: Instance type "string" is invalid.
  Expected "integer".
$.email: String does not match format "email".`,
    outputLabel: "Errors",
  },
  faqs: [
    {
      question: "What is JSON Schema?",
      answer:
        "JSON Schema is a standard way to describe the shape of JSON data: which properties are required, what types they have and which values are allowed. It is used to validate API requests, configuration files and form data.",
    },
    {
      question: "Which schema version should I use?",
      answer:
        "Use 2020-12 for new schemas; it is the current version and the one used by OpenAPI 3.1. Draft 7 is still very common in existing tools. Declare the version with $schema at the top of your schema.",
    },
    {
      question: "Why is a property I declared reported as an additional property?",
      answer:
        "This tool reports additionalProperties errors only for properties that are not declared in properties or matched by patternProperties. If you still see one, check the spelling of the property name in the data and the schema.",
    },
    {
      question: "Is my data sent to a server?",
      answer: "No. Both the schema and the data are checked in your browser, in a background worker, and are not uploaded.",
    },
  ],
  related: ["json-formatter", "json-diff", "json-to-typescript", "regex-tester"],
};

export const metadata = toolMetadata(slug, content);

export default function JsonSchemaValidatorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <JsonSchemaValidator />
    </ToolPage>
  );
}
