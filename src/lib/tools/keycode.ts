/**
 * Describes keyboard events for the Keycode Inspector.
 *
 * - `key` is the character or named key produced, after the keyboard layout
 *   and modifiers ("a", "A", "Enter", "ArrowLeft"). Use it for text and
 *   shortcuts that follow the label on the key.
 * - `code` is the physical key position on a US-QWERTY reference layout
 *   ("KeyA" is the key in A's position even on AZERTY, where it types Q).
 *   Use it for games and position-based controls.
 * - `keyCode` and `which` are deprecated numbers that differ between
 *   browsers and layouts. They are shown only for maintaining old code.
 */

export type KeyEventLike = {
  type: string;
  key: string;
  code: string;
  keyCode: number;
  which: number;
  location: number;
  repeat: boolean;
  isComposing: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  getModifierState?: (key: string) => boolean;
};

export type KeyRecord = {
  id: number;
  type: string;
  key: string;
  keyLabel: string;
  code: string;
  keyCode: number;
  which: number;
  location: string;
  repeat: boolean;
  isComposing: boolean;
  modifiers: string[];
  capsLock: boolean;
  combo: string;
};

const LOCATIONS = ["Standard", "Left", "Right", "Numpad"];
const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta", "AltGraph", "OS", "Hyper", "Super"]);

/** A visible label for keys whose `key` is blank or invisible. */
export function keyLabel(key: string): string {
  if (key === " ") return "Space (\" \")";
  if (key === "") return "(empty)";
  if (key === "Dead") return "Dead (accent key waiting for the next key)";
  if (key === "Unidentified") return "Unidentified";
  return key;
}

/** A shortcut description such as Ctrl+Shift+K, in a fixed modifier order. */
export function comboFor(e: Pick<KeyEventLike, "key" | "code" | "ctrlKey" | "shiftKey" | "altKey" | "metaKey">): string {
  const parts: string[] = [];
  if (e.ctrlKey && e.key !== "Control") parts.push("Ctrl");
  if (e.altKey && e.key !== "Alt") parts.push("Alt");
  if (e.shiftKey && e.key !== "Shift") parts.push("Shift");
  if (e.metaKey && e.key !== "Meta") parts.push("Meta");
  const main = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if (!MODIFIER_KEYS.has(e.key) || parts.length === 0) parts.push(main);
  return parts.join("+");
}

export function describeKeyEvent(e: KeyEventLike, id: number): KeyRecord {
  const modifiers = (["ctrlKey", "altKey", "shiftKey", "metaKey"] as const).filter((m) => e[m]).map((m) => ({ ctrlKey: "Ctrl", altKey: "Alt", shiftKey: "Shift", metaKey: "Meta" })[m]);
  if (e.getModifierState?.("AltGraph")) modifiers.push("AltGraph");
  return {
    id,
    type: e.type,
    key: e.key,
    keyLabel: keyLabel(e.key),
    code: e.code || "(empty)",
    keyCode: e.keyCode,
    which: e.which,
    location: LOCATIONS[e.location] ?? String(e.location),
    repeat: e.repeat,
    isComposing: e.isComposing,
    modifiers,
    capsLock: e.getModifierState?.("CapsLock") ?? false,
    combo: comboFor(e),
  };
}

/** A JavaScript condition matching this key, by key or by physical code. */
export function snippetFor(record: Pick<KeyRecord, "key" | "code" | "modifiers">, by: "key" | "code"): string {
  const conditions = record.modifiers.filter((m) => m !== "AltGraph").map((m) => `event.${{ Ctrl: "ctrlKey", Alt: "altKey", Shift: "shiftKey", Meta: "metaKey" }[m as "Ctrl"]}`);
  const main = by === "key" ? `event.key === ${JSON.stringify(record.key)}` : `event.code === ${JSON.stringify(record.code)}`;
  return [...conditions, main].join(" && ");
}

/**
 * True when keys pressed in `element` should be left alone: text fields,
 * editable content and form controls keep their normal keyboard behavior.
 */
export function isTypingTarget(element: { tagName?: string; isContentEditable?: boolean; getAttribute?: (name: string) => string | null } | null): boolean {
  if (!element || !element.tagName) return false;
  const tag = element.tagName.toUpperCase();
  if (element.isContentEditable) return true;
  if (tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return true;
  if (tag === "INPUT") return true;
  const role = element.getAttribute?.("role");
  return role === "textbox" || role === "combobox" || role === "searchbox" || role === "spinbutton" || role === "slider";
}

/** The maximum number of events kept in the log. */
export const MAX_LOG = 50;
