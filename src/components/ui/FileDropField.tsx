"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { imageFromTransfer } from "@/lib/image";

type FileDropFieldProps = {
  label: string;
  /** Passed to the file input, e.g. "image/*" or ".svg,image/svg+xml". */
  accept: string;
  onFile: (file: File) => void;
  hint?: ReactNode;
  /** Also take an image pasted anywhere on the page (outside text fields). */
  acceptPaste?: boolean;
  /** Bump to clear the native input after Clear or Reset. */
  resetKey?: number;
  className?: string;
};

/**
 * A native file input with a drop area around it. Files are handed to
 * `onFile` only; nothing is uploaded. Keyboard users use the input itself.
 */
export function FileDropField({ label, accept, onFile, hint, acceptPaste = false, resetKey = 0, className }: FileDropFieldProps) {
  const id = useId();
  const hintId = useId();
  const [dragging, setDragging] = useState(false);
  const onFileRef = useRef(onFile);
  useEffect(() => {
    onFileRef.current = onFile;
  });

  useEffect(() => {
    if (!acceptPaste) return;
    function onPaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || (target.tagName === "INPUT" && (target as HTMLInputElement).type !== "file") || target.isContentEditable)) return;
      const file = imageFromTransfer(event.clipboardData);
      if (!file) return;
      event.preventDefault();
      onFileRef.current(file);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [acceptPaste]);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border-2 border-dashed p-4 transition-colors",
        dragging ? "border-accent bg-accent-soft" : "border-border-strong bg-surface",
        className,
      )}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
    >
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        key={resetKey}
        id={id}
        type="file"
        accept={accept}
        aria-describedby={hint ? hintId : undefined}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
        className="max-w-full text-sm file:mr-3 file:h-9 file:cursor-pointer file:rounded-sm file:border file:border-border-strong file:bg-surface file:px-3 file:text-sm file:font-medium file:text-foreground hover:file:bg-subtle"
      />
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
