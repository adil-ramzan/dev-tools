"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { copyText } from "@/lib/clipboard";

type CopyButtonProps = {
  /** Text to copy. The button is disabled while it is empty. */
  text: string;
  label?: string;
  /** Accessible name when the visible label is not specific enough, e.g. "Copy output". */
  ariaLabel?: string;
  variant?: "primary" | "secondary" | "ghost";
};

/** Copy button with visible and announced feedback, including when copying fails. */
export function CopyButton({ text, label = "Copy", ariaLabel, variant = "secondary" }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function handleClick() {
    const ok = await copyText(text);
    setState(ok ? "copied" : "failed");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), ok ? 2000 : 4000);
  }

  return (
    <>
      <Button
        size="sm"
        variant={variant}
        onClick={handleClick}
        disabled={text === ""}
        aria-label={state === "idle" ? ariaLabel : undefined}
        className={state === "failed" ? "text-danger" : undefined}
      >
        {state === "copied" ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            Copied
          </>
        ) : state === "failed" ? (
          "Copy failed"
        ) : (
          label
        )}
      </Button>
      <span role="status" className="sr-only">
        {state === "copied"
          ? "Copied to clipboard"
          : state === "failed"
            ? "Copy failed. Select the text and copy it with your keyboard instead."
            : ""}
      </span>
    </>
  );
}
