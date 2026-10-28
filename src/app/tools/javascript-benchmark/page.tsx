import { JavascriptBenchmark } from "@/components/tools/javascript-benchmark/JavascriptBenchmark";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "javascript-benchmark";

const content: ToolPageContent = {
  metaDescription:
    "Compare the speed of JavaScript snippets in an isolated sandbox, with calibration, warm-up, repeated samples and a 95% margin of error for each result.",
  howItWorks: [
    "Write shared setup code and two or more test cases, then select Run benchmark. Each case is calibrated to run long enough to time reliably, warmed up so the JIT compiler can optimize it, and then measured repeatedly, alternating between cases to spread out background noise.",
    "Results show operations per second with a 95% margin of error, the median and range, and how much slower each case is than the fastest. When two results overlap within their margins of error, the difference may just be noise, and the tool says so.",
    "Code runs in a Web Worker inside a sandboxed frame with its own isolated origin and a security policy that blocks all network access. It cannot read or change this page, your cookies, local storage or any other site, and it is stopped when the time limit is reached, so an endless loop cannot freeze the page.",
  ],
  notes: [
    "Microbenchmarks measure tiny pieces of code in isolation. Real performance depends on data, memory, the rest of the program and the browser, so do not expect the same differences in production.",
    "Results vary between browsers, machines and runs. Close other tabs and run the benchmark more than once before drawing conclusions.",
    "The JIT compiler may remove code whose result is never used. Use the result, for example by storing it in a variable from the setup, to measure what you intend.",
    "The setup code runs before each timed batch and is not timed. Timers in browsers have limited precision, which the calibration accounts for.",
  ],
  example: {
    description: "Counting matching items in an array three ways:",
    input: `for loop:  for (let i = 0; i < items.length; i++) …
filter:    items.filter((item) => item.active).length
reduce:    items.reduce((n, item) => n + …, 0)`,
    output: `for loop  1.92 million ops/s ±1.4%  Fastest
reduce    1.10 million ops/s ±2.0%  43% slower
filter    0.71 million ops/s ±1.8%  63% slower
(Example figures: results depend on your browser and machine.)`,
  },
  faqs: [
    {
      question: "Is it safe to run code from the internet here?",
      answer:
        "The sandbox cannot access this page, your data or the network, and it is stopped at the time limit. It can still use CPU and memory until then, so only run code you understand.",
    },
    {
      question: "Why do results change every time I run them?",
      answer: "Other work on your computer, power saving, garbage collection and JIT optimizations all affect timing. The margin of error shows how much the samples varied; differences smaller than it are not meaningful.",
    },
    {
      question: "Why can't my code use fetch or the DOM?",
      answer: "The code runs in an isolated worker without a document, and network access is blocked on purpose, so a benchmark cannot send data anywhere. Benchmark the computation itself.",
    },
    {
      question: "Does a faster microbenchmark mean faster code in my app?",
      answer: "Not necessarily. Profile the real application with your browser's performance tools to find where time is actually spent before optimizing.",
    },
  ],
  related: ["regex-tester", "json-formatter", "keycode-inspector", "html-css-js-minifier"],
};

export const metadata = toolMetadata(slug, content);

export default function JavascriptBenchmarkPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <JavascriptBenchmark />
    </ToolPage>
  );
}
