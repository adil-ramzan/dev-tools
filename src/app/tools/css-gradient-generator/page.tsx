import { GradientGenerator } from "@/components/tools/css-gradient-generator/GradientGenerator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "css-gradient-generator";

const content: ToolPageContent = {
  metaDescription:
    "Create linear and radial CSS gradients with up to eight color stops, adjust angle, position and opacity with a live preview, and copy the CSS.",
  howItWorks: [
    "Choose linear or radial, then edit the color stops: each has a color, a position along the gradient and an opacity. The preview and the CSS update as you change anything, so the code always matches what you see.",
    "For a linear gradient, set the angle with the slider or a direction button: 0deg points up, 90deg to the right and 180deg down. For a radial gradient, choose a circle or an ellipse and move its center.",
    "The CSS sets `background-image` to the gradient and `background-color` to the first color, which is used if the gradient cannot be drawn. Stops are written in position order, as CSS requires.",
  ],
  notes: [
    "Opaque colors are written as HEX and translucent colors as rgba().",
    "Use opacity on a stop to fade into transparency, for example over an image.",
    "Up to eight color stops are supported.",
  ],
  example: {
    description: "A diagonal blue-to-cyan gradient:",
    input: "Linear, 135deg\n#1f4fe0 at 0%\n#06b6d4 at 100%",
    inputLabel: "Settings",
    output: `background-color: #1f4fe0;
background-image: linear-gradient(135deg, #1f4fe0 0%, #06b6d4 100%);`,
    outputLabel: "CSS",
  },
  faqs: [
    {
      question: "What is the difference between linear and radial gradients?",
      answer:
        "A linear gradient changes color along a straight line at an angle. A radial gradient spreads out from a center point as a circle or ellipse.",
    },
    {
      question: "Why use background-image instead of background?",
      answer:
        "Gradients are images in CSS. Setting background-image keeps any other background settings you have, such as background-size, and the separate background-color gives a solid fallback.",
    },
    {
      question: "How do I make a hard edge between two colors?",
      answer: "Give two stops the same position, for example red at 50% and blue at 50%. The color then switches sharply instead of blending.",
    },
    {
      question: "Do gradients need vendor prefixes?",
      answer: "No. linear-gradient and radial-gradient work without prefixes in all current browsers.",
    },
  ],
  related: ["color-converter", "css-box-shadow-generator", "flexbox-playground", "px-to-rem-converter"],
};

export const metadata = toolMetadata(slug, content);

export default function GradientGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <GradientGenerator />
    </ToolPage>
  );
}
