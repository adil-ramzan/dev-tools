import { HtmlWysiwygEditor } from "@/components/tools/html-wysiwyg-editor/HtmlWysiwygEditor";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "html-wysiwyg-editor";

const content: ToolPageContent = {
  metaDescription:
    "Write rich text in a visual HTML editor or edit the source directly. Output is sanitized, and the editor and preview run in sandboxed frames without scripts.",
  howItWorks: [
    "Write in the Visual view as in a word processor: use the toolbar for bold, italic, headings, lists, quotes, code blocks and links. Switch to HTML source to edit the markup directly, and to Preview to see the result. The clean HTML below updates as you work and can be copied.",
    "All HTML is sanitized with DOMPurify, both what you paste or type in the editor and what you write in the source view. Scripts, event handlers such as onclick, forms, embedded frames and objects, `javascript:` links and inline styles that load resources are removed.",
    "Editing and preview take place in sandboxed frames that cannot run scripts, and each frame's security policy blocks network requests, so remote images and fonts are not loaded and nothing in your content can contact another server.",
  ],
  notes: [
    "Remote images stay in the HTML but are not displayed. Images embedded as PNG, JPEG, GIF or WebP data URIs are shown.",
    "Pasted content is cleaned before it is inserted. Formatting the editor does not support may be simplified.",
    "Sanitizing here makes the output safe to display in this editor. Always sanitize user-supplied HTML again on the server that stores or shows it.",
    "The editor uses the browser's built-in editing commands, so the exact markup produced (for example `<b>` or `<strong>`) can differ between browsers.",
  ],
  example: {
    description: "Unsafe markup is removed and the rest is kept:",
    input: `<p onclick="steal()">Hello <b>world</b></p>
<script>alert(1)</script>
<a href="javascript:alert(1)">link</a>`,
    output: `<p>Hello <b>world</b></p>
<a>link</a>`,
  },
  faqs: [
    {
      question: "Is it safe to paste HTML from an untrusted source?",
      answer:
        "Yes, for viewing and editing here: the HTML is sanitized, and the frames it is shown in cannot run scripts or load anything from the network. Treat the output like any user input in your own application and sanitize it there too.",
    },
    {
      question: "Why don't my images show?",
      answer: "Images from other websites are blocked so the editor never contacts other servers. They remain in the HTML output; only the display is blocked.",
    },
    {
      question: "Can I use CSS?",
      answer: "Inline style attributes such as text-align are kept, except styles that load resources (url(), @import). <style> elements and stylesheets are removed.",
    },
    {
      question: "How is this different from the Markdown Editor?",
      answer: "The Markdown Editor turns Markdown text into HTML. This editor works with HTML directly, with a visual mode for people who prefer not to write markup.",
    },
  ],
  related: ["markdown-editor", "html-entity-encoder-decoder", "html-css-js-minifier", "lorem-ipsum-generator"],
};

export const metadata = toolMetadata(slug, content);

export default function HtmlWysiwygEditorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <HtmlWysiwygEditor />
    </ToolPage>
  );
}
