import { CurlToCode } from "@/components/tools/curl-to-code/CurlToCode";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "curl-to-code";

const content: ToolPageContent = {
  metaDescription:
    "Convert curl commands to JavaScript fetch, Python requests, PHP, Go, Ruby and Node.js. Keeps method, headers, query and body, and reports unsupported flags.",
  howItWorks: [
    "Paste a curl command, for example from your browser's developer tools (Network tab → Copy as cURL), and choose a language. The tool reads the command the way a POSIX shell would, including single and double quotes, `$'…'` strings and backslash line continuations, then generates code that sends the same request.",
    "The method, URL with its query string, headers, body and timeout are preserved. Supported options include `-X`, `-H`, `-d`, `--data-raw`, `--data-binary`, `--data-urlencode`, `--json`, `-F` (text fields), `-G`, `-I`, `-u`, `-A`, `-e`, `-b`, `-r`, `-m` and `-L`, applying curl's own defaults, such as POST and a form content type when you send data.",
    "Every option is accounted for. Options that change curl's output only (`-s`, `-v`, `-o`) are listed as ignored, and options that cannot be reproduced (proxies, client certificates) are listed as unsupported. Options that would change what is sent, such as reading the body from a file with `-d @file`, stop the conversion with an explanation rather than producing code that sends something different.",
  ],
  notes: [
    "The command is parsed as text. It is never run, and the URL is never requested.",
    "Pipes, redirections, command substitution and Windows cmd syntax (`^` escapes) are rejected. Shell variables such as `$TOKEN` are kept literally, with a warning.",
    "curl does not follow redirects without `-L`, but fetch, Python requests and Go do by default; the notes say when this differs.",
    "`-k` (`--insecure`) is not converted: the generated code keeps TLS certificate verification on.",
    "Credentials from `-u` or headers appear in the generated code. Move them to environment variables or a secret store before committing it.",
  ],
  example: {
    description: "A JSON POST converted to Python requests:",
    input: `curl -X POST https://api.example.com/items \\
  -H 'Content-Type: application/json' \\
  -d '{"name": "Ada"}'`,
    output: `import requests

headers = {
    "Content-Type": "application/json",
}

data = "{\\"name\\": \\"Ada\\"}".encode("utf-8")

response = requests.post("https://api.example.com/items", headers=headers, data=data)

print(response.status_code)
print(response.text)`,
  },
  faqs: [
    {
      question: "Is the request sent when I convert it?",
      answer: "No. The command is only read as text, and nothing is sent anywhere, including to the URL in the command.",
    },
    {
      question: "Why does it say an option is unsupported?",
      answer:
        "Some curl options have no simple equivalent in every language, such as proxies, client certificates or retry settings. They are listed so you can add the right setting by hand rather than lose them without noticing.",
    },
    {
      question: "Can I convert file uploads?",
      answer: "Not yet. Commands that read data from files (-d @file, -F file=@photo.jpg, -T) are rejected, because the generated code would need the file's contents. Text form fields (-F name=value) are supported.",
    },
    {
      question: "Why is the body sent as a string rather than JSON?",
      answer: "The body is kept exactly as curl would send it, byte for byte, so the generated request matches. You can replace it with your language's JSON encoder afterwards.",
    },
  ],
  related: ["url-parser", "http-status-codes", "basic-auth-header-generator", "json-formatter"],
};

export const metadata = toolMetadata(slug, content);

export default function CurlToCodePage() {
  return (
    <ToolPage slug={slug} content={content}>
      <CurlToCode />
    </ToolPage>
  );
}
