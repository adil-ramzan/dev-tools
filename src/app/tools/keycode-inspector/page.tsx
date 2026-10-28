import { KeycodeInspector } from "@/components/tools/keycode-inspector/KeycodeInspector";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "keycode-inspector";

const content: ToolPageContent = {
  metaDescription:
    "Press any key to see its JavaScript event.key, event.code, legacy keyCode, location, modifiers and repeat state for keydown and keyup events.",
  howItWorks: [
    "Click the capture area, or move to it with Tab, and press a key. The tool shows the properties of the keydown event: `key`, `code`, the legacy `keyCode` and `which`, `location`, the modifier keys held, `repeat` and `isComposing`, plus a ready-made JavaScript condition you can copy.",
    "Every keydown and keyup is added to the event log, so you can see the order of events in a combination such as Ctrl+Shift+K, or what happens while a key is held down.",
    "Keys are only captured while the capture area has focus. Text fields and other controls on the page keep their normal keyboard behavior, and Tab always moves focus out of the capture area.",
  ],
  notes: [
    "`key` follows the keyboard layout and modifiers: the same key gives \"q\" on QWERTY and \"a\" on AZERTY, and Shift turns \"2\" into \"@\" or \"\\\"\" depending on the layout. Use it for text input and shortcuts that match the key's label.",
    "`code` names the physical position on a US-QWERTY layout, whatever the actual layout. Use it for games and other position-based controls.",
    "`keyCode` and `which` are deprecated: their values differ between browsers, layouts and operating systems. Use them only to maintain old code.",
    "Some shortcuts, such as closing a tab or switching windows, are handled by the browser or operating system and never reach the page.",
    "Accent keys produce `Dead`, and input methods for languages such as Japanese set `isComposing` while text is being composed.",
  ],
  example: {
    description: "Pressing Shift+A on a US keyboard:",
    input: "Shift + A",
    output: `event.key       "A"
event.code      "KeyA"
event.keyCode   65 (legacy)
event.location  Standard
Modifiers       Shift`,
  },
  faqs: [
    {
      question: "Should I use event.key or event.code?",
      answer:
        "Use event.key when the meaning of the key matters, such as Enter, Escape or a shortcut letter. Use event.code when its position matters, such as WASD movement in a game, so it works on any keyboard layout.",
    },
    {
      question: "Why is keyCode deprecated?",
      answer: "Its values were never standardized and differ between browsers and layouts, especially for punctuation. event.key and event.code replace it and are supported by all modern browsers.",
    },
    {
      question: "How do I detect Ctrl on a Mac?",
      answer: "Mac shortcuts usually use Command, which sets event.metaKey. For cross-platform shortcuts, check metaKey on macOS and ctrlKey elsewhere.",
    },
    {
      question: "Why does a key show \"Unidentified\" or \"Dead\"?",
      answer: "Unidentified means the browser could not name the key, which happens with some media and vendor keys. Dead means an accent key waiting for the next key to combine with.",
    },
  ],
  related: ["user-agent-parser", "text-to-binary-converter", "regex-tester", "html-wysiwyg-editor"],
};

export const metadata = toolMetadata(slug, content);

export default function KeycodeInspectorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <KeycodeInspector />
    </ToolPage>
  );
}
