"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

type PasswordInputProps = Omit<ComponentProps<"input">, "type"> & {
  /** What the field holds, for the toggle's accessible name, e.g. "password" or "key". */
  noun?: string;
};

/**
 * A masked text field for secrets with a Show/Hide toggle. Autocomplete,
 * autocorrect, autocapitalize and spellcheck are off by default, because
 * browser spellcheck services can send field contents off the device and
 * password managers should not save values typed into a tool.
 */
export function PasswordInput({ noun = "password", className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative flex">
      <Input
        type={visible ? "text" : "password"}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-1p-ignore
        data-lpignore="true"
        className={cn("pr-16 font-mono", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? `Hide ${noun}` : `Show ${noun}`}
        className="absolute inset-y-0 right-0 my-1 mr-1 rounded-sm px-2.5 text-xs font-medium text-muted-foreground hover:bg-subtle hover:text-foreground"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
