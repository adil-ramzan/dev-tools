import { DeviceInfo } from "@/components/tools/device-information/DeviceInfo";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "device-information";

const content: ToolPageContent = {
  metaDescription:
    "See what your browser reports about your device: viewport and screen size, pixel ratio, language, time zone, connection and supported features. Nothing is collected or sent.",
  howItWorks: [
    "When the page opens, it reads standard browser APIs such as `window.innerWidth`, `screen`, `devicePixelRatio`, `navigator.language` and `Intl` and shows the values grouped by topic.",
    "Each value is labelled. Reported values come straight from the browser. Estimates are coarse or derived, such as approximate memory or the network speed guess. Detected features are only checked for existence.",
    "The values update when you resize the window or go online or offline; select Refresh to read everything again. Copy the report as text or download it as JSON, for a bug report for example.",
  ],
  notes: [
    "Nothing is stored, collected or sent anywhere. The report exists only on this page.",
    "Web pages cannot read hardware identifiers such as serial numbers, IMEIs or MAC addresses, and this tool does not try.",
    "Browsers deliberately round, cap or change some values (memory, processor count, user agent) to make fingerprinting harder, so they may not match your hardware exactly.",
    "Feature checks never ask for permission: having the Geolocation API does not mean your location was read.",
  ],
  example: {
    description: "Part of a report:",
    input: "A laptop with a 1440 × 900 screen at 200% scaling",
    output: `Viewport (browser window content): 1280 × 720 CSS pixels (reported)
Device pixel ratio: 2 (reported)
Screen resolution in device pixels: 2880 × 1800 (estimate)`,
  },
  faqs: [
    {
      question: "What is the difference between the viewport and the screen size?",
      answer: "The viewport is the area inside the browser window where pages are drawn. The screen size is the whole display. Both are in CSS pixels, which are larger than device pixels on high-density screens.",
    },
    {
      question: "Why does the device pixel ratio change when I zoom?",
      answer: "Browser zoom changes how many device pixels make up one CSS pixel. At 100% zoom on a typical Retina display the ratio is 2; zooming to 150% makes it 3.",
    },
    {
      question: "Why does device memory say 8 GB when I have more?",
      answer: "Browsers that support the Device Memory API round the value down to a power of two and cap it, usually at 8 GB, so that it cannot be used to tell devices apart.",
    },
    {
      question: "Can this tool tell which phone model I have?",
      answer: "No. Browsers do not expose the model or any hardware identifier. The user agent may hint at the platform, but it is reduced and can be changed.",
    },
  ],
  related: ["user-agent-parser", "keycode-inspector", "px-to-rem-converter", "mac-address-lookup"],
};

export const metadata = toolMetadata(slug, content);

export default function DeviceInformationPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <DeviceInfo />
    </ToolPage>
  );
}
