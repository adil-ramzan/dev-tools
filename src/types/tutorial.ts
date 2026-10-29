/**
 * Shape of a tutorial in `src/content/tutorials.ts`, which drives the
 * /tutorials directory, the tutorial pages, tool page links and the sitemap.
 * Text may use `backticks` for inline code.
 */
export type TutorialDefinition = {
  /** URL segment: /tutorials/<slug>. Permanent, like tool slugs. */
  slug: string;
  /** Page title and h1, phrased as the task, e.g. "How to calculate an IPv4 subnet". */
  title: string;
  /** One sentence for the directory listing. */
  description: string;
  /** Meta description: unique, about 150 characters. */
  metaDescription: string;
  /** Slugs of the available tools the tutorial uses; the first is the main one. */
  tools: string[];
  /** Opening paragraphs: what the task is and when you need it. */
  intro: string[];
  steps: {
    title: string;
    body: string[];
    /** Tool to open for this step, when it differs from the main tool or deserves a link. */
    tool?: string;
  }[];
  example: {
    description: string;
    input: string;
    output: string;
    inputLabel?: string;
    outputLabel?: string;
  };
  mistakes: { title: string; body: string }[];
};
