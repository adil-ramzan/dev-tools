import { DateTimeFormatConverter } from "@/components/tools/date-time-format-converter/DateTimeFormatConverter";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "date-time-format-converter";

const content: ToolPageContent = {
  metaDescription:
    "Convert dates between ISO 8601, Unix time, RFC 2822, HTTP dates and readable UTC and local time. Ambiguous dates like 03/04/2024 are never guessed.",
  howItWorks: [
    "Type or paste a date. The tool recognizes ISO 8601 and RFC 3339 (`2024-03-15T14:30:00Z`), Unix time in seconds or milliseconds, RFC 2822 and HTTP dates (`Fri, 15 Mar 2024 14:30:00 GMT`), written dates with English month names (`15 March 2024 2:30 PM`), and numeric dates with a four-digit year.",
    "It then shows the same moment as ISO 8601 in UTC and in your time zone, readable UTC and local time, Unix seconds and milliseconds, RFC 2822, an HTTP date, the ISO week date, the ordinal date and the time relative to now.",
    "A date without a time zone does not name a single moment, so you choose how to read it: as UTC or as your browser's local time. The result always says whether the zone came from the input or from that choice.",
  ],
  notes: [
    "Numeric dates such as `03/04/2024` mean 3 April in most countries and March 4 in the US. Detection rejects them; choose Day/Month/Year or Month/Day/Year as the input format to read them.",
    "Local times that do not exist (skipped when clocks go forward) or happen twice (when clocks go back) are rejected with an explanation. Add a UTC offset to say exactly which moment you mean.",
    "Zone abbreviations other than UTC, GMT and the US zones defined in RFC 2822 (EST, PDT and so on) are rejected, because many are ambiguous: IST is used in India, Ireland and Israel.",
    "JavaScript dates have millisecond precision and no leap seconds. Extra fractional digits are dropped with a note, and `23:59:60` is rejected.",
    "Two-digit years, week dates and ordinal dates are not accepted as input.",
  ],
  example: {
    description: "An RFC 2822 date converted to other formats:",
    input: "Fri, 15 Mar 2024 14:30:00 +0200",
    output: `ISO 8601 (UTC)   2024-03-15T12:30:00.000Z
Unix (seconds)   1710505800
HTTP date        Fri, 15 Mar 2024 12:30:00 GMT
ISO week date    2024-W11-5`,
  },
  faqs: [
    {
      question: "Why is 03/04/2024 not converted automatically?",
      answer:
        "Because it has two common readings: 3 April 2024 and March 4, 2024. Guessing would silently give the wrong date for half of the world, so the tool asks you to choose the day/month order instead.",
    },
    {
      question: "What is the difference between ISO 8601 and RFC 3339?",
      answer:
        "RFC 3339 is a strict profile of ISO 8601 for internet protocols. It always includes a full date, time and zone, such as `2024-03-15T14:30:00Z`. ISO 8601 allows more forms, including dates without a time.",
    },
    {
      question: "Which time zone is used for a date without one?",
      answer:
        "The one you choose under \"Times without a zone are in\": UTC or your browser's local time zone. The result states which was used. Dates with Z, GMT or an offset such as +02:00 always use that zone.",
    },
    {
      question: "How is this different from the Unix Timestamp Converter?",
      answer:
        "The Unix Timestamp Converter focuses on timestamps, including microseconds and nanoseconds. This tool accepts many date formats as input and shows the same moment in several standard formats.",
    },
  ],
  related: ["unix-timestamp-converter", "cron-expression-helper", "integer-base-converter", "json-formatter"],
};

export const metadata = toolMetadata(slug, content);

export default function DateTimeFormatConverterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <DateTimeFormatConverter />
    </ToolPage>
  );
}
