/** Renders `code` spans in content strings. */
export function RichText({ text }: { text: string }) {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={i} className="rounded-sm bg-subtle px-1 py-0.5 text-[0.85em] [overflow-wrap:anywhere]">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}

/** Content text without the backticks that mark code. */
export const plainText = (text: string) => text.replace(/`/g, "");
