import { FlexboxPlayground } from "@/components/tools/flexbox-playground/FlexboxPlayground";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "flexbox-playground";

const content: ToolPageContent = {
  metaDescription:
    "Learn and test CSS flexbox interactively: change direction, wrapping, justify-content, align-items, align-content and gap, and copy the generated CSS.",
  howItWorks: [
    "Change the container settings and watch the numbered items move in the preview. The CSS below the preview always reflects the current settings. Items have different sizes so you can see how each alignment option behaves.",
    "`flex-direction` sets the main axis (row or column). `justify-content` places items along the main axis, `align-items` aligns them on the cross axis, and `align-content` spaces the lines when items wrap onto several lines. `gap` adds space between items.",
    "Add, remove and reorder items, and give any item a `flex-grow` value to make it take up spare space. Resize the preview from its corner to see how wrapping responds to the available width.",
  ],
  notes: [
    "align-content only has a visible effect when flex-wrap allows several lines and there is spare space on the cross axis.",
    "The generated CSS uses a .container class for the flex container and .item-N classes for items with flex-grow set. Rename them to match your markup.",
    "Up to 12 items can be added.",
  ],
  example: {
    description: "A wrapping row with items spread out and centered vertically:",
    input: "direction: row, wrap: wrap\njustify: space-between\nalign-items: center, gap: 16px",
    inputLabel: "Settings",
    output: `.container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  align-content: normal;
  gap: 16px;
}`,
    outputLabel: "CSS",
  },
  faqs: [
    {
      question: "What is the difference between justify-content and align-items?",
      answer:
        "justify-content positions items along the main axis, horizontally in a row. align-items positions them across it, vertically in a row. In a column layout the two swap directions.",
    },
    {
      question: "Why does align-content do nothing?",
      answer:
        "It only affects containers with more than one line of items. Set flex-wrap to wrap, add enough items to wrap, and make sure the container is taller than the lines.",
    },
    {
      question: "When should I use gap instead of margins?",
      answer:
        "gap adds space only between items, never on the outer edges, and works the same in any direction. It is simpler than margins and is supported in all current browsers.",
    },
    {
      question: "Should I use flexbox or grid?",
      answer:
        "Flexbox is best for one-dimensional layouts, a row or a column, such as toolbars and navigation. CSS grid is better for two-dimensional layouts where rows and columns both matter.",
    },
  ],
  related: ["css-box-shadow-generator", "px-to-rem-converter", "css-gradient-generator", "color-converter"],
};

export const metadata = toolMetadata(slug, content);

export default function FlexboxPlaygroundPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <FlexboxPlayground />
    </ToolPage>
  );
}
