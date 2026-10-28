/**
 * Copies text to the clipboard. Uses the async Clipboard API, which needs a
 * secure context and permission, and falls back to a temporary textarea with
 * execCommand("copy") for older or restricted browsers. Returns false if both
 * fail so the caller can tell the user.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or not a secure context: try the fallback.
  }

  const previousFocus = document.activeElement as HTMLElement | null;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  try {
    textarea.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
    previousFocus?.focus();
  }
}
