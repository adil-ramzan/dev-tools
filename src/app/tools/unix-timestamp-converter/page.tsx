import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import { TimestampConverter } from "@/components/tools/unix-timestamp-converter/TimestampConverter";
import type { ToolPageContent } from "@/types/tool";

const slug = "unix-timestamp-converter";

const content: ToolPageContent = {
  metaDescription:
    "Convert Unix timestamps in seconds, milliseconds, microseconds or nanoseconds to UTC, local time and ISO 8601, and convert dates back to epoch time.",
  howItWorks: [
    "A Unix timestamp counts the time since 00:00:00 UTC on 1 January 1970, known as the Unix epoch. Most systems store it in seconds, while JavaScript and many APIs use milliseconds.",
    "Paste a timestamp to see it as a date in UTC, in your local time zone and in ISO 8601 format. The unit is detected from the number of digits (10 digits is seconds, 13 is milliseconds), or you can choose it yourself.",
    "To go the other way, enter a date in ISO 8601 format, such as `2024-03-15 14:30` or `2024-03-15T14:30:00Z`. A date without a time zone is read in your local time zone or in UTC, whichever you choose.",
  ],
  notes: [
    "Auto-detection treats up to 11 digits as seconds, up to 14 as milliseconds, up to 17 as microseconds and longer values as nanoseconds. Choose the unit yourself if your value is unusual.",
    "Dates are shown to the millisecond. Microsecond and nanosecond timestamps are converted exactly, but digits below a millisecond are not displayed.",
    "Negative timestamps are dates before 1970. Like most systems, Unix time ignores leap seconds.",
    "Only ISO 8601 dates are accepted, because other formats such as 03/04/2024 mean different dates in different countries.",
  ],
  example: {
    description: "Converting a timestamp in seconds, and a UTC date back to a timestamp:",
    input: `1700000000
2024-03-15T14:30:00Z`,
    output: `2023-11-14T22:13:20.000Z
1710513000`,
  },
  faqs: [
    {
      question: "How do I know whether a timestamp is in seconds or milliseconds?",
      answer:
        "Count the digits. Current dates are 10 digits in seconds (for example 1700000000) and 13 digits in milliseconds (1700000000000). The tool detects this automatically and tells you which unit it used.",
    },
    {
      question: "What is the year 2038 problem?",
      answer:
        "Systems that store Unix time as a signed 32-bit number of seconds overflow on 19 January 2038 at 03:14:07 UTC (timestamp 2147483647). Systems using 64-bit values, including JavaScript, are not affected.",
    },
    {
      question: "Why does my local time differ from UTC?",
      answer:
        "A timestamp is one moment in time. UTC and local time show the same moment in different time zones. Local time uses your device's time zone setting, which is shown next to the result.",
    },
    {
      question: "How do I get the current Unix timestamp in code?",
      answer:
        "In JavaScript use Math.floor(Date.now() / 1000) for seconds, in Python int(time.time()), and in a Unix shell date +%s.",
    },
  ],
  related: ["jwt-decoder", "json-formatter", "uuid-generator"],
};

export const metadata = toolMetadata(slug, content);

export default function TimestampConverterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <TimestampConverter />
    </ToolPage>
  );
}
