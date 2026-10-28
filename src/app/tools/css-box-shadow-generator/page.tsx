import { BoxShadowGenerator } from "@/components/tools/css-box-shadow-generator/BoxShadowGenerator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "css-box-shadow-generator";

const content: ToolPageContent = {
  metaDescription:
    "Design CSS box shadows with horizontal and vertical offset, blur, spread, color, opacity and inset controls. Layer up to five shadows and copy the CSS.",
  howItWorks: [
    "Adjust the sliders to shape the shadow and watch the preview box update. The CSS below always matches the preview, ready to copy.",
    "Each shadow has a horizontal and vertical offset (positive values move it right and down), a blur radius (higher is softer), a spread (positive grows the shadow, negative shrinks it), a color with opacity, and an inset option that draws the shadow inside the box.",
    "Add up to five layers for more realistic depth: a small, sharp shadow close to the box combined with larger, softer ones further away looks more natural than one large shadow. Layers are drawn with the first one on top.",
  ],
  notes: [
    "Change the box and background colors to check how the shadow looks on your design. These colors are only for the preview and are not part of the CSS.",
    "Blur cannot be negative in CSS; spread can.",
    "Shadow colors with less than full opacity are written as rgba().",
  ],
  example: {
    description: "A soft, slightly lifted card shadow:",
    input: "x 0, y 8px, blur 24px, spread -4px\ncolor #0f1729 at 20% opacity",
    inputLabel: "Settings",
    output: "box-shadow: 0 8px 24px -4px rgba(15, 23, 41, 0.2);",
    outputLabel: "CSS",
  },
  faqs: [
    {
      question: "What does spread do in box-shadow?",
      answer:
        "Spread grows or shrinks the shadow before it is blurred. A negative spread with a larger vertical offset keeps the shadow under the box, which suits cards and dropdowns.",
    },
    {
      question: "What is an inset shadow?",
      answer: "An inset shadow is drawn inside the element's border instead of outside, which makes it look pressed in. It is useful for input fields and pressed buttons.",
    },
    {
      question: "How do multiple shadows work?",
      answer:
        "box-shadow accepts a comma-separated list. All shadows are drawn, with the first one in the list on top. Combining a tight and a wide shadow gives a more natural sense of depth.",
    },
    {
      question: "Does box-shadow affect layout?",
      answer: "No. Shadows do not take up space or move other elements, but a large shadow can be clipped by a parent with overflow: hidden.",
    },
  ],
  related: ["css-gradient-generator", "color-converter", "flexbox-playground", "px-to-rem-converter"],
};

export const metadata = toolMetadata(slug, content);

export default function BoxShadowGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <BoxShadowGenerator />
    </ToolPage>
  );
}
