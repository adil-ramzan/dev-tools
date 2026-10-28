export const MAIN_CONTENT_ID = "main-content";

export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:shadow"
    >
      Skip to content
    </a>
  );
}
