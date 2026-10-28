import { MarkdownEditor } from "@/components/tools/markdown-editor/MarkdownEditor";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "markdown-editor";

const content: ToolPageContent = {
  metaDescription:
    "Write Markdown with a live, sanitized preview in your browser. Supports headings, lists, links, tables and code blocks, and copies clean HTML.",
  howItWorks: [
    "Type Markdown on the left and the preview updates as you write. Switch between split, write-only and preview-only views; on small screens the editor and preview are stacked. Copy the Markdown, or copy the rendered HTML to paste into a CMS or email template.",
    "Markdown is rendered with markdown-it, following the CommonMark standard plus GitHub-style tables, ~~strikethrough~~ and automatic links. Everything happens in your browser, and your text is not uploaded.",
    "The preview is safe to use with untrusted text. HTML written inside the Markdown is shown as text instead of being run, links such as `javascript:` are refused, and the generated HTML is cleaned again with DOMPurify before it is displayed.",
  ],
  notes: [
    "Raw HTML is not rendered. Tags such as <b> or <details> appear as text, which keeps the preview safe.",
    "Images from other websites are not loaded unless you turn on Load images from other websites, because loading them sends a request to that site. Embedded data: images always load.",
    "Not supported: task-list checkboxes (- [ ]), footnotes, math, emoji shortcodes and syntax highlighting in code blocks.",
    "Links in the preview open in a new tab.",
  ],
  example: {
    description: "Rendering a short section with code, a link and a list:",
    input: `## Setup

Run \`npm install\`, then see the [docs](https://example.com).

- Fast
- Free`,
    output: `<h2>Setup</h2>
<p>Run <code>npm install</code>, then see the
<a href="https://example.com" target="_blank"
rel="noopener noreferrer nofollow">docs</a>.</p>
<ul>
<li>Fast</li>
<li>Free</li>
</ul>`,
    outputLabel: "HTML",
  },
  faqs: [
    {
      question: "Which Markdown flavor is supported?",
      answer:
        "CommonMark, the standard most tools follow, plus GitHub-style tables, strikethrough and automatic links. It is close to GitHub's Markdown, without task lists, footnotes or raw HTML.",
    },
    {
      question: "Why is my HTML shown as text?",
      answer:
        "Raw HTML inside Markdown is turned off so the preview cannot run scripts or load unexpected content. Use Markdown syntax instead, for example **bold** instead of <b>bold</b>.",
    },
    {
      question: "Is the copied HTML safe to publish?",
      answer:
        "It has been sanitized, so it contains no scripts or event handlers. Still treat it like any content you publish and review it, especially links.",
    },
    {
      question: "Is my text saved?",
      answer: "No. Nothing is stored or uploaded, so copy your Markdown before closing the page.",
    },
  ],
  related: ["word-counter", "text-case-converter", "diff-checker", "html-css-js-minifier"],
};

export const metadata = toolMetadata(slug, content);

export default function MarkdownEditorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <MarkdownEditor />
    </ToolPage>
  );
}
