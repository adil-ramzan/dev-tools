import { UserAgentParser } from "@/components/tools/user-agent-parser/UserAgentParser";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "user-agent-parser";

const content: ToolPageContent = {
  metaDescription:
    "Parse any user-agent string to see the browser, rendering engine, operating system and device type, or check your own browser's user agent.",
  howItWorks: [
    "Paste a user-agent string from a log, header or analytics report, pick a sample, or select Use my browser. The tool shows the browser and version, rendering engine, operating system and device type (desktop, mobile, tablet, TV or bot).",
    "Parsing uses Bowser, a maintained open-source parser, loaded only on this page. Notes explain known blind spots, such as Windows 11 reporting itself as Windows 10, the reduced version numbers of Chromium browsers, and iPads that identify as Macs.",
    "When you use your own browser, the tool also shows its low-entropy client hints (navigator.userAgentData) where the browser supports them.",
  ],
  notes: [
    "User-agent detection is a heuristic. Any client can send any string, browsers deliberately freeze parts of it, and parsers recognize new browsers and devices only after an update.",
    "Bots identified by their user agent may be impostors, and many bots pretend to be browsers. Verify crawlers such as Googlebot with a reverse DNS lookup instead.",
    "Use feature detection, not the user agent, to decide what a browser can do.",
    "The string is parsed in your browser and is never sent anywhere.",
  ],
  example: {
    description: "Safari on an iPhone:",
    input: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    output: `Browser           Safari 17.5
Rendering engine  WebKit 605.1.15
Operating system  iOS 17.5
Device type       Mobile
Device            Apple iPhone`,
  },
  faqs: [
    {
      question: "What is a user-agent string?",
      answer: "A line of text browsers and other clients send in the User-Agent header to identify themselves. Its format grew by accident, which is why almost every browser claims to be \"Mozilla\".",
    },
    {
      question: "Why does my Windows 11 PC show Windows 10?",
      answer: "Browsers report Windows NT 10.0 for both Windows 10 and 11. Chromium browsers expose the real version only through high-entropy client hints, which this tool does not request.",
    },
    {
      question: "Can I trust the result?",
      answer: "Only as a hint. The string is controlled by the client, so it can be changed in browser settings or by any script or bot.",
    },
    {
      question: "Is my user agent sent anywhere?",
      answer: "No. Your browser already knows its user agent; the tool reads it locally and parses it on this page.",
    },
  ],
  related: ["http-status-codes", "url-parser", "keycode-inspector", "regex-tester"],
};

export const metadata = toolMetadata(slug, content);

export default function UserAgentParserPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <UserAgentParser />
    </ToolPage>
  );
}
