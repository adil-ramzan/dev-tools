/**
 * Markdown rendering with markdown-it, loaded on demand.
 *
 * Safety: raw HTML in the Markdown is disabled, so tags like <script> or
 * <img onerror> are shown as text. markdown-it also refuses javascript:,
 * vbscript:, file: and non-image data: links. The rendered HTML is then
 * sanitized again with DOMPurify before it is shown (sanitizeHtml).
 *
 * Privacy: images from other websites are not loaded unless allowed, because
 * loading them would send a request to that site.
 *
 * Supported: CommonMark plus GitHub-style tables, strikethrough and
 * automatic links. Not supported: raw HTML, task-list checkboxes, footnotes,
 * math, emoji shortcodes and syntax highlighting.
 */

import type MarkdownIt from "markdown-it";

export type MarkdownOptions = { remoteImages: boolean };

let instance: Promise<InstanceType<typeof MarkdownIt>> | null = null;

/** Creates the configured markdown-it renderer. Exported for tests. */
export async function createRenderer(): Promise<InstanceType<typeof MarkdownIt>> {
  const { default: MarkdownItCtor } = await import("markdown-it");
  const md = new MarkdownItCtor({ html: false, linkify: true, typographer: false });

  const defaultLink = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    tokens[idx].attrSet("target", "_blank");
    tokens[idx].attrSet("rel", "noopener noreferrer nofollow");
    return defaultLink(tokens, idx, options, env, self);
  };

  const defaultImage = md.renderer.rules.image!;
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const src = String(token.attrGet("src") ?? "");
    const allowRemote = (env as MarkdownOptions | undefined)?.remoteImages ?? false;
    if (!allowRemote && !/^data:image\//i.test(src)) {
      const alt = self.renderInlineAsText(token.children ?? [], options, env);
      return `<span class="md-image-placeholder">Image${alt ? `: ${md.utils.escapeHtml(alt)}` : ""} (not loaded)</span>`;
    }
    token.attrSet("loading", "lazy");
    token.attrSet("referrerpolicy", "no-referrer");
    return defaultImage(tokens, idx, options, env, self);
  };
  return md;
}

/** Renders Markdown to HTML. Run the result through sanitizeHtml before display. */
export async function renderMarkdown(source: string, options: MarkdownOptions): Promise<string> {
  instance ??= createRenderer();
  const md = await instance;
  return md.render(source, options);
}

let linkHookAdded = false;

/** Second layer of protection: removes anything unsafe that reached the HTML. Browser only. */
export async function sanitizeHtml(html: string): Promise<string> {
  const { default: DOMPurify } = await import("dompurify");
  if (!linkHookAdded) {
    // DOMPurify drops target/rel; set them after sanitizing so links open
    // safely in a new tab without access to this page.
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "A" && node.hasAttribute("href")) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer nofollow");
      }
    });
    linkHookAdded = true;
  }
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select", "iframe", "object", "embed"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#|\/|\.{0,2}\/|data:image\/(?:png|gif|jpe?g|webp);)/i,
  });
}
