import { describe, expect, it } from "vitest";
import { comboFor, describeKeyEvent, isTypingTarget, keyLabel, snippetFor, type KeyEventLike } from "@/lib/tools/keycode";

const event = (over: Partial<KeyEventLike>): KeyEventLike => ({
  type: "keydown",
  key: "a",
  code: "KeyA",
  keyCode: 65,
  which: 65,
  location: 0,
  repeat: false,
  isComposing: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ...over,
});

describe("describeKeyEvent", () => {
  it("records key, code, legacy codes, location and modifiers", () => {
    const r = describeKeyEvent(event({ key: "K", code: "KeyK", keyCode: 75, which: 75, ctrlKey: true, shiftKey: true, getModifierState: (k) => k === "CapsLock" }), 1);
    expect(r).toMatchObject({ key: "K", code: "KeyK", keyCode: 75, which: 75, location: "Standard", modifiers: ["Ctrl", "Shift"], capsLock: true, combo: "Ctrl+Shift+K" });
  });

  it("names key locations", () => {
    expect(describeKeyEvent(event({ key: "Shift", code: "ShiftRight", location: 2, shiftKey: true }), 1).location).toBe("Right");
    expect(describeKeyEvent(event({ key: "1", code: "Numpad1", location: 3 }), 1).location).toBe("Numpad");
  });

  it("marks repeats, composition and AltGraph", () => {
    const r = describeKeyEvent(event({ repeat: true, isComposing: true, getModifierState: (k) => k === "AltGraph" }), 1);
    expect(r).toMatchObject({ repeat: true, isComposing: true, modifiers: ["AltGraph"] });
  });

  it("handles keyup events and an empty code", () => {
    expect(describeKeyEvent(event({ type: "keyup", code: "" }), 2)).toMatchObject({ type: "keyup", code: "(empty)" });
  });
});

describe("labels and combos", () => {
  it("makes invisible keys visible", () => {
    expect(keyLabel(" ")).toBe('Space (" ")');
    expect(keyLabel("Dead")).toMatch(/accent/);
    expect(keyLabel("")).toBe("(empty)");
  });

  it("builds shortcuts in a fixed order without repeating the pressed modifier", () => {
    expect(comboFor(event({ key: "s", metaKey: true }))).toBe("Meta+S");
    expect(comboFor(event({ key: " ", altKey: true, ctrlKey: true }))).toBe("Ctrl+Alt+Space");
    expect(comboFor(event({ key: "Control", ctrlKey: true }))).toBe("Control");
    expect(comboFor(event({ key: "Shift", shiftKey: true, ctrlKey: true }))).toBe("Ctrl");
    expect(comboFor(event({ key: "ArrowUp", shiftKey: true }))).toBe("Shift+ArrowUp");
  });

  it("writes JavaScript conditions by key or by code", () => {
    const r = describeKeyEvent(event({ key: "z", code: "KeyZ", ctrlKey: true }), 1);
    expect(snippetFor(r, "key")).toBe('event.ctrlKey && event.key === "z"');
    expect(snippetFor(r, "code")).toBe('event.ctrlKey && event.code === "KeyZ"');
    expect(snippetFor(describeKeyEvent(event({ key: '"', code: "Quote", shiftKey: true }), 1), "key")).toBe('event.shiftKey && event.key === "\\""');
  });
});

describe("isTypingTarget", () => {
  const el = (tagName: string, extra: Record<string, unknown> = {}) => ({ tagName, getAttribute: (n: string) => (extra[n] as string) ?? null, ...extra });
  it("leaves text fields, controls and editable content alone", () => {
    for (const tag of ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"]) expect(isTypingTarget(el(tag))).toBe(true);
    expect(isTypingTarget(el("DIV", { isContentEditable: true }))).toBe(true);
    expect(isTypingTarget(el("DIV", { role: "textbox" }))).toBe(true);
  });

  it("captures keys elsewhere", () => {
    expect(isTypingTarget(el("DIV"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
