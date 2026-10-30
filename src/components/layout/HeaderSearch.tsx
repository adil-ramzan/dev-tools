"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { buttonClassName } from "@/components/ui/Button";
import { categories } from "@/content/categories";
import { toolPath, tools } from "@/content/tools";
import { cn } from "@/lib/cn";
import { MAX_QUERY_LENGTH, buildIndex, highlight, searchShortcut, searchTools, searchableTools, type SearchResult } from "@/lib/search";

// Built once per page load from the registry; each keystroke only compares strings.
const INDEX = buildIndex(searchableTools(tools, categories));

function isMac() {
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

function Highlighted({ text, query }: { text: string; query: string }) {
  return highlight(text, query).map((part, i) =>
    part.match ? (
      <mark key={i} className="bg-transparent font-semibold text-foreground underline decoration-accent decoration-2 underline-offset-2">
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}

/**
 * Header search over the local tool registry, as an ARIA 1.2 combobox with a
 * listbox popup. Focus stays in the input; Arrow keys move the active option,
 * Enter opens it, Escape closes the list (then clears, then collapses the
 * small-screen panel). `/` and Ctrl/⌘+K focus the field. Queries are never
 * sent, stored or put in the URL.
 */
export function HeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // Below the md breakpoint the field lives in a panel under the header, opened with a button.
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const ids = { input: useId(), list: useId(), panel: useId() };

  const results = useMemo(() => searchTools(query, INDEX), [query]);
  const hasQuery = query.trim() !== "";
  const showPopup = open && hasQuery;
  const optionId = (result: SearchResult) => `${ids.list}-${result.slug}`;
  const activeResult = showPopup && active >= 0 ? results[active] : undefined;

  function focusField() {
    // On small screens, show the panel synchronously, so the field can take focus in the same event.
    const toggleVisible = toggleRef.current !== null && toggleRef.current.offsetParent !== null;
    if (toggleVisible) flushSync(() => setExpanded(true));
    inputRef.current?.focus();
    inputRef.current?.select();
    if (query.trim()) setOpen(true);
  }

  function close() {
    setOpen(false);
    setActive(-1);
  }

  function clear() {
    setQuery("");
    close();
    inputRef.current?.focus();
  }

  function collapse() {
    close();
    setExpanded(false);
  }

  function select(result: SearchResult) {
    setQuery("");
    collapse();
    inputRef.current?.blur();
    router.push(toolPath(result.slug));
  }

  // Global shortcuts. Only `/` and Ctrl/⌘+K are handled, so tool shortcuts such as Ctrl/⌘+Enter are untouched.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target instanceof Element ? (event.target as HTMLElement) : null;
      if (!searchShortcut(event, target, isMac())) return;
      event.preventDefault();
      focusField();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  // Close when the pointer goes down anywhere outside the search.
  useEffect(() => {
    if (!open && !expanded) return;
    function onPointerDown(event: PointerEvent) {
      if (wrapperRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setActive(-1);
      setExpanded(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, expanded]);

  // Keep the active option visible while moving through a long list.
  useEffect(() => {
    if (!activeResult) return;
    document.getElementById(optionId(activeResult))?.scrollIntoView({ block: "nearest" });
  });

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (!hasQuery || results.length === 0) return;
        event.preventDefault();
        const down = event.key === "ArrowDown";
        if (!showPopup) {
          setOpen(true);
          setActive(down ? 0 : results.length - 1);
        } else {
          setActive((current) => (down ? (current + 1) % results.length : current <= 0 ? results.length - 1 : current - 1));
        }
        return;
      }
      case "Enter": {
        if (!showPopup || results.length === 0) return;
        event.preventDefault();
        select(results[active >= 0 ? active : 0]);
        return;
      }
      case "Escape": {
        event.preventDefault();
        if (showPopup) close();
        else if (query) setQuery("");
        else if (expanded) {
          collapse();
          toggleRef.current?.focus();
        } else inputRef.current?.blur();
        return;
      }
      case "Tab":
        close();
        return;
    }
  }

  const announcement = !showPopup ? "" : results.length === 0 ? "No tools match." : `${results.length} ${results.length === 1 ? "tool" : "tools"} found. Use the up and down arrow keys to choose.`;

  return (
    <div ref={wrapperRef} className="flex items-center">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={expanded}
        aria-controls={ids.panel}
        onClick={() => (expanded ? collapse() : focusField())}
        className={buttonClassName({ variant: "ghost", size: "icon", className: "md:hidden" })}
      >
        <span className="sr-only">{expanded ? "Close search" : "Search tools"}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true" focusable="false">
          {expanded ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM16 16l5 5" />}
        </svg>
      </button>

      <div
        id={ids.panel}
        className={cn(
          expanded ? "absolute inset-x-0 top-full z-10 border-b border-border bg-background px-gutter py-3" : "hidden",
          "md:static md:block md:border-0 md:bg-transparent md:p-0",
        )}
      >
        <div role="search" aria-label="Tools" className="relative md:w-48 lg:w-64">
          <label htmlFor={ids.input} className="sr-only">
            Search tools
          </label>
          <div className="relative">
            <svg className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
              <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM16 16l5 5" />
            </svg>
            <input
              ref={inputRef}
              id={ids.input}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showPopup && results.length > 0}
              aria-controls={showPopup && results.length > 0 ? ids.list : undefined}
              aria-activedescendant={activeResult ? optionId(activeResult) : undefined}
              aria-keyshortcuts="/ Control+K Meta+K"
              value={query}
              maxLength={MAX_QUERY_LENGTH}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setActive(-1);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Search tools"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="go"
              className="peer h-9 w-full rounded-sm border border-input bg-surface pr-9 pl-8 text-sm text-foreground placeholder:text-muted-foreground hover:border-foreground/60"
            />
            {query ? (
              <button
                type="button"
                onClick={clear}
                aria-label="Clear search"
                className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-subtle hover:text-foreground"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true" focusable="false">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            ) : (
              <kbd aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-sm border border-border px-1.5 font-sans text-xs text-muted-foreground peer-focus:hidden md:block">
                /
              </kbd>
            )}
          </div>

          {showPopup ? (
            <div className="mt-2 overflow-hidden rounded-md border border-border bg-surface md:absolute md:top-full md:right-0 md:mt-1 md:w-96">
              {results.length > 0 ? (
                <ul id={ids.list} role="listbox" aria-label="Matching tools" className="max-h-[min(26rem,calc(100dvh-9rem))] overflow-y-auto py-1">
                  {results.map((result, i) => (
                    <li
                      key={result.slug}
                      id={optionId(result)}
                      role="option"
                      aria-selected={i === active}
                      data-search-result={result.slug}
                      // Keep focus in the field, so the list stays open until the click completes.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => select(result)}
                      onMouseMove={() => i !== active && setActive(i)}
                      className={cn("flex cursor-pointer flex-col gap-0.5 border-l-2 px-3 py-2", i === active ? "border-accent bg-accent-soft" : "border-transparent")}
                    >
                      <span className="text-sm text-foreground">
                        <Highlighted text={result.name} query={query} />
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {result.category} · {result.description}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col gap-1 px-3 py-3 text-sm">
                  <p className="text-foreground">No tools match “{query.trim()}”.</p>
                  <p className="text-muted-foreground">
                    Try a shorter or different word, or{" "}
                    <Link href="/tools" onClick={collapse} className="text-accent underline underline-offset-2">
                      browse all tools
                    </Link>
                    .
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
