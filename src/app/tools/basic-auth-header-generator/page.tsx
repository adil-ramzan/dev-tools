import { BasicAuthHeaderGenerator } from "@/components/tools/basic-auth-header-generator/BasicAuthHeaderGenerator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "basic-auth-header-generator";

const content: ToolPageContent = {
  metaDescription:
    "Generate an HTTP Basic Authorization header from a username and password, encoded as UTF-8 per RFC 7617, or decode an existing header. Runs in your browser.",
  howItWorks: [
    "HTTP Basic authentication (RFC 7617) sends credentials in the `Authorization` header. The username and password are joined with a colon, encoded as UTF-8 bytes and then as Base64: `Authorization: Basic base64(username:password)`.",
    "Enter a username and password and the header updates as you type. Copy the full header, just the value, or a ready-made curl command.",
    "To read an existing header, paste it under Decode a header. Splitting happens at the first colon, so passwords may contain colons.",
  ],
  notes: [
    "Base64 is an encoding, not encryption: anyone who sees the header can read the password. Use Basic authentication only over HTTPS.",
    "A username cannot contain a colon, and neither field may contain control characters such as tabs or line breaks; the tool reports both.",
    "Non-ASCII characters are encoded as UTF-8, as RFC 7617 specifies. Some older servers expect ISO-8859-1 and may reject them.",
    "Credentials are encoded in your browser and are never sent, logged or saved.",
  ],
  example: {
    description: "The example from RFC 7617:",
    input: "Username: Aladdin\nPassword: open sesame",
    output: "Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==",
  },
  faqs: [
    {
      question: "Is Basic authentication secure?",
      answer:
        "Only over HTTPS, which encrypts the header in transit. Even then, the password is sent with every request and can end up in logs, so API tokens that can be scoped, rotated and revoked are usually a better choice.",
    },
    {
      question: "Can the password contain a colon?",
      answer: "Yes. The first colon separates the username from the password, so only the username must not contain one.",
    },
    {
      question: "How do I use the header with curl?",
      answer: "Copy the curl command, or let curl build the header for you with curl -u username:password https://example.com/.",
    },
    {
      question: "What about non-English characters?",
      answer:
        "RFC 7617 says to encode credentials as UTF-8, which this tool does. Servers announce support with charset=\"UTF-8\" in their WWW-Authenticate header; older servers may assume ISO-8859-1.",
    },
  ],
  related: ["base64-encoder-decoder", "jwt-decoder", "url-encoder-decoder", "hmac-generator"],
};

export const metadata = toolMetadata(slug, content);

export default function BasicAuthHeaderGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <BasicAuthHeaderGenerator />
    </ToolPage>
  );
}
