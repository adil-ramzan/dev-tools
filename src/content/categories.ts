import type { CategoryDefinition, ToolCategory } from "@/types/tool";
import { tools } from "@/content/tools";

/** All categories, in display order. Only those with tools are published. */
const allCategories: CategoryDefinition[] = [
  {
    slug: "text-tools",
    name: "Text and String Tools",
    shortName: "Text",
    description: "Count, transform, sort, slugify, mask, generate, write and preview text.",
    intro:
      "Utilities for working with plain text: measure the length of a draft against a limit, convert identifiers between camelCase, snake_case and other naming styles, sort and clean up lists, turn titles into URL slugs, mask sensitive values, generate lorem ipsum placeholder text, or write Markdown with a live preview.",
  },
  {
    slug: "code-formatters",
    name: "Code Formatters and Minifiers",
    shortName: "Formatters",
    description: "Format, validate and minify code, queries and data.",
    intro:
      "Make code and data readable when you need to inspect it, and compact when you need to ship it. Format and validate JSON and XML, tidy up SQL queries, or minify HTML, CSS and JavaScript.",
  },
  {
    slug: "encoders-decoders",
    name: "Encoders and Decoders",
    shortName: "Encoders",
    description: "Convert text and files to and from URL encoding, Base64, HTML entities and binary, and decode JWTs.",
    intro:
      "Convert values between the encodings used in URLs, HTTP headers, HTML, data URIs and configuration files, and decode them again when you need to read what they contain: Base64 text and files, HTML character references, UTF-8 bytes in binary, and the claims inside a JSON Web Token.",
  },
  {
    slug: "converters",
    name: "Data Converters",
    shortName: "Converters",
    description: "Convert dates, number bases, data formats, cURL commands and docker run commands.",
    intro:
      "Move data between the formats different tools expect: turn Unix timestamps and date strings into ISO 8601, RFC 2822 and readable dates, convert integers between binary, octal, decimal and hex, convert configuration between YAML, JSON and TOML, convert CSV into JSON and back, generate TypeScript types from a JSON sample, turn curl commands into code, or turn docker run commands into Docker Compose files.",
  },
  {
    slug: "css-design",
    name: "CSS and Design Tools",
    shortName: "CSS",
    description: "Build gradients, shadows, flex layouts and placeholder images, and convert colors and units.",
    intro:
      "Visual tools for front-end work: convert colors and check their contrast, design gradients and box shadows with a live preview, convert px to rem, and see how flexbox properties lay out a container, and make SVG placeholder images. Each tool gives you code to copy.",
  },
  {
    slug: "image",
    name: "Image Tools",
    shortName: "Images",
    description: "Convert SVG to PNG, generate favicons and beautify screenshots, all in your browser.",
    intro:
      "Work with images without uploading them: convert SVG files to PNG at any size, turn text, an emoji or a logo into a complete favicon set with favicon.ico and the HTML to use it, and place screenshots on a background with padding, rounded corners and a shadow. Every image is decoded and drawn on your device.",
  },
  {
    slug: "generators",
    name: "Generators",
    shortName: "Generators",
    description: "Create UUIDs, ULIDs, tokens, hashes and QR codes on demand.",
    intro:
      "Generate values you need while building and testing software, such as random or time-sortable identifiers for database records, secure random tokens for API keys, hashes for checksums and cache keys, and QR codes for links.",
  },
  {
    slug: "security",
    name: "Security and Cryptography",
    shortName: "Security",
    description: "Generate and hash passwords, sign and encrypt messages, generate keys and one-time codes, and check password strength.",
    intro:
      "Cryptographic tools that run entirely in your browser: generate random passwords, hash and verify passwords with bcrypt, sign messages with HMAC, encrypt text with a password, generate RSA key pairs and two-factor codes, build Basic authentication headers and estimate how hard a password is to guess. Keys, passwords and messages are never sent, logged or saved.",
  },
  {
    slug: "web",
    name: "Web and HTTP Tools",
    shortName: "Web",
    description: "Parse URLs and user agents, analyze response headers, look up HTTP status codes, generate meta tags and edit HTML.",
    intro:
      "Tools for the building blocks of the web: break a URL into its parts and edit its query string, find out what a user-agent string says, look up what an HTTP status code means, check pasted response headers for caching and security problems, generate the meta tags a page's head needs, see exactly which keyboard events a key press fires, and write HTML in a visual editor with a safe preview.",
  },
  {
    slug: "networking",
    name: "Networking and System Tools",
    shortName: "Networking",
    description: "Calculate subnets, convert and expand IP addresses, look up MAC vendors and work out file permissions.",
    intro:
      "Tools for network and system administration that run in your browser: calculate IPv4 subnets, convert addresses between notations, expand address ranges, generate IPv6 unique local prefixes, look up the vendor of a MAC address, pick random ports, translate chmod permissions and see what your browser reports about your device.",
  },
  {
    slug: "developer-utilities",
    name: "Developer Utilities",
    shortName: "Utilities",
    description: "Test patterns, validate schemas, compare files, read cron schedules, benchmark code and look up Git commands.",
    intro:
      "Tools for debugging the small things that slow development down: check what a regular expression matches, validate JSON against a schema, see exactly what changed between two files or two JSON documents, find out when a cron job will run, look up MIME types and Git commands, and compare the speed of JavaScript snippets.",
  },
];

export function toolsInCategory(slug: ToolCategory) {
  return tools.filter((tool) => tool.category === slug);
}

/** Categories that have at least one tool. Empty categories get no page. */
export const categories: CategoryDefinition[] = allCategories.filter(
  (category) => toolsInCategory(category.slug).length > 0,
);

export function getCategoryBySlug(slug: string): CategoryDefinition | undefined {
  return categories.find((category) => category.slug === slug);
}

export function categoryPath(slug: ToolCategory): string {
  return `/categories/${slug}`;
}
