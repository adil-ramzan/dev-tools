/**
 * Shapes for the tool registry (`src/content/tools.ts`) and category list
 * (`src/content/categories.ts`). Together they drive routing, navigation,
 * listings, the sitemap and page metadata.
 */

/** Category id. Also the URL segment: /categories/<id>. */
export type ToolCategory =
  | "text-tools"
  | "code-formatters"
  | "encoders-decoders"
  | "converters"
  | "css-design"
  | "generators"
  | "security"
  | "web"
  | "networking"
  | "developer-utilities";

export type CategoryDefinition = {
  slug: ToolCategory;
  /** Display name, also used as the category page title. */
  name: string;
  /** Compact label for filters, e.g. "Text". */
  shortName: string;
  /** One sentence for listings and the meta description. */
  description: string;
  /** Short paragraph introducing the category page. */
  intro: string;
};

/** Icon drawn by `ToolIcon` (src/components/tools/ToolIcon.tsx). */
export type ToolIconName =
  | "braces"
  | "text-lines"
  | "link"
  | "compress"
  | "binary"
  | "dice"
  | "case"
  | "regex"
  | "key"
  | "clock"
  | "diff"
  | "database"
  | "type"
  | "table"
  | "check-file"
  | "angle-brackets"
  | "compare"
  | "palette"
  | "calendar"
  | "markdown"
  | "gradient"
  | "shadow"
  | "ruler"
  | "columns"
  | "token"
  | "hash"
  | "date-convert"
  | "number-base"
  | "file-binary"
  | "ampersand"
  | "bits"
  | "layers"
  | "list"
  | "file-type"
  | "slug"
  | "mask"
  | "ulid"
  | "bcrypt"
  | "hmac"
  | "key-pair"
  | "strength"
  | "encrypt"
  | "otp"
  | "basic-auth"
  | "curl"
  | "url-parse"
  | "wysiwyg"
  | "user-agent"
  | "http-status"
  | "keyboard"
  | "qr"
  | "placeholder"
  | "git"
  | "docker"
  | "benchmark"
  | "lorem"
  | "chmod"
  | "subnet"
  | "ip-convert"
  | "ip-range"
  | "mac"
  | "ipv6"
  | "device"
  | "port";

/**
 * "planned" tools are listed but not linked: their page does not exist yet.
 * Switch to "available" when the tool page ships.
 */
export type ToolStatus = "available" | "planned";

export type ToolDefinition = {
  /** URL segment, e.g. "json-formatter" → /tools/json-formatter */
  slug: string;
  /** Display name, also used as the page title. */
  name: string;
  /** One sentence, used for listings and the meta description. */
  description: string;
  category: ToolCategory;
  status: ToolStatus;
  icon: ToolIconName;
  /** Related terms, available for page keywords. */
  keywords?: string[];
  /** Shown in the homepage's featured section. */
  featured?: boolean;
};

/**
 * Written content for a tool page, below the tool itself. Text may use
 * `backticks` for inline code.
 */
export type ToolPageContent = {
  /** Meta description: unique per tool, about 150 characters. */
  metaDescription: string;
  /** Paragraphs explaining what the tool does and how. */
  howItWorks: string[];
  example: {
    description: string;
    input: string;
    output: string;
    inputLabel?: string;
    outputLabel?: string;
  };
  /** Limits and conventions worth knowing, shown as a list. */
  notes?: string[];
  faqs: { question: string; answer: string }[];
  /** Related tool slugs, in order. Defaults to tools in the same category. */
  related?: string[];
};
