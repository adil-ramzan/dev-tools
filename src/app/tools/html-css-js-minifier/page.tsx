import { Minifier } from "@/components/tools/html-css-js-minifier/Minifier";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "html-css-js-minifier";

const content: ToolPageContent = {
  metaDescription:
    "Minify HTML, CSS and JavaScript online with real parsers instead of find-and-replace. Removes comments and whitespace safely and shows how much smaller the code gets.",
  howItWorks: [
    "Choose a language, paste your code and select Minify. Each language is handled by a parser that understands its syntax, so the minified code behaves like the original. Your code is parsed, never run.",
    "JavaScript is minified with Terser, which removes whitespace and comments, shortens local variable names and simplifies expressions. Top-level names are left unchanged, so functions and variables used by other scripts keep working.",
    "CSS is minified with csso, which removes whitespace and comments and shortens values such as colors and zero lengths. Rules are not merged or reordered.",
    "HTML is parsed with parse5, which follows the HTML standard used by browsers. Comments are removed and runs of whitespace are reduced to a single space. The content of `<pre>` and `<textarea>` is kept exactly. Inline `<style>`, `<script>` and JSON blocks are minified too.",
  ],
  notes: [
    "License comments that start with /*! or contain @license or @preserve are kept in CSS and JavaScript.",
    "Invalid JavaScript or CSS is reported with its line and column, and nothing is minified. Browsers repair broken HTML in a standard way, so HTML is minified as a browser would read it.",
    "Whitespace between elements is reduced to one space rather than removed, because it can be visible on the page. Elements styled with white-space: pre in CSS may still look different.",
    "CSS nesting (& selectors) is not supported yet.",
  ],
  example: {
    description: "Minifying a small JavaScript function:",
    input: `// Add two prices
function addPrices(first, second) {
  return first + second;
}`,
    output: "function addPrices(n,r){return n+r}",
  },
  faqs: [
    {
      question: "Is minified code safe to use in production?",
      answer:
        "The minifiers used here are designed to preserve behavior and are widely used in build tools. Still, test the minified code before deploying it, as you would with any build step.",
    },
    {
      question: "Why is my JavaScript not minified?",
      answer:
        "Terser could not parse it. The error shows the line and column of the problem. Fix the syntax error and try again. Syntax that only works with a build step, such as TypeScript or JSX, must be compiled to JavaScript first.",
    },
    {
      question: "Does minifying HTML remove all whitespace?",
      answer:
        "No. Whitespace between inline elements can be visible, for example the space between two words in different tags, so each run of whitespace becomes a single space. Text inside <pre> and <textarea> is not changed at all.",
    },
    {
      question: "Does this replace a build tool?",
      answer:
        "It is useful for quick, one-off minification, such as an inline script, a snippet for a CMS or checking how much a file shrinks. For projects, a bundler such as Vite or esbuild minifies automatically on every build.",
    },
  ],
  related: ["json-formatter", "base64-encoder-decoder", "regex-tester"],
};

export const metadata = toolMetadata(slug, content);

export default function MinifierPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <Minifier />
    </ToolPage>
  );
}
