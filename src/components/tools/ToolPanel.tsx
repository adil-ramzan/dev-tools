import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ToolPanelProps = {
  label: string;
  /** id of the control the label names. Without it, the label is plain text with `labelId`. */
  htmlFor?: string;
  labelId?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  /** Rendered below the panel, e.g. an ActionBar and its status message. */
  after?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Labelled area of a tool (an input or output) with optional actions and a footer line. */
export function ToolPanel({ label, htmlFor, labelId, actions, footer, after, children, className }: ToolPanelProps) {
  const labelClass = "text-sm font-medium text-foreground";
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        {htmlFor ? (
          <label htmlFor={htmlFor} className={labelClass}>
            {label}
          </label>
        ) : (
          <p id={labelId} className={labelClass}>
            {label}
          </p>
        )}
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
      {footer ? <div className="font-mono text-xs text-muted-foreground">{footer}</div> : null}
      {after}
    </div>
  );
}

/** Settings above a tool's input and output. `actions` is for tools whose actions are not tied to one input. */
export function ToolToolbar({ children, actions }: { children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 rounded-md border border-border bg-surface p-3 sm:p-4">
      {children ? <div className="flex flex-wrap items-end gap-x-6 gap-y-4">{children}</div> : <span />}
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Side-by-side input and output on wide screens, stacked on narrow ones. */
export function ToolColumns({ children }: { children: ReactNode }) {
  return <div className="grid items-start gap-6 lg:grid-cols-2">{children}</div>;
}

type ActionBarProps = {
  /** The main action(s), e.g. Format or Convert. */
  primary: ReactNode;
  /** Secondary actions such as Clear or Reset, grouped at the end. */
  secondary?: ReactNode;
  /** Show the Ctrl/⌘ + Enter hint, for bars inside a ShortcutScope. */
  shortcut?: boolean;
  /** Status or validation feedback shown right below the actions. */
  status?: ReactNode;
};

/** The primary action for an input, placed directly under it, with secondary actions and status next to it. */
export function ActionBar({ primary, secondary, shortcut = false, status }: ActionBarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {primary}
        {shortcut ? (
          <kbd className="hidden font-sans text-xs text-muted-foreground sm:inline" aria-hidden="true">
            Ctrl/⌘ + Enter
          </kbd>
        ) : null}
        {secondary ? <div className="ml-auto flex flex-wrap items-center gap-2">{secondary}</div> : null}
      </div>
      {status}
    </div>
  );
}

/**
 * Runs `onSubmit` when Ctrl+Enter (⌘+Enter on Mac) is pressed in any field
 * inside, so users can act without leaving the keyboard.
 */
export function ShortcutScope({ onSubmit, disabled = false, children, className }: { onSubmit: () => void; disabled?: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      className={className}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
        e.preventDefault();
        if (!disabled) onSubmit();
      }}
    >
      {children}
    </div>
  );
}
