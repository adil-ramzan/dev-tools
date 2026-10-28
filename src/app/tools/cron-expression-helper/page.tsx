import { CronHelper } from "@/components/tools/cron-expression-helper/CronHelper";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "cron-expression-helper";

const content: ToolPageContent = {
  metaDescription:
    "Explain cron expressions in plain English and see the next run times in your local time zone or UTC. Supports standard five-field crontab syntax.",
  howItWorks: [
    "Type a cron expression, or choose a preset, to see what it means and when it will run next. The explanation and the list of upcoming runs update as you type, and a table shows which values each field matches.",
    "A standard cron expression has five fields separated by spaces: minute (0–59), hour (0–23), day of month (1–31), month (1–12 or JAN–DEC) and day of week (0–6 or SUN–SAT, where 0 and 7 are both Sunday). Each field can be `*` for every value, a list such as `1,15`, a range such as `1-5` or a step such as `*/15` or `9-17/2`.",
    "Run times are calculated in your browser's local time zone or in UTC, whichever you choose. Servers usually run cron in their own time zone, which is often UTC, so check which one your system uses.",
  ],
  notes: [
    "When both day of month and day of week are restricted, cron runs on days that match either field, not only days that match both. For example, 0 0 1 * MON runs on the 1st of every month and on every Monday.",
    "Supported macros: @yearly, @annually, @monthly, @weekly, @daily, @midnight and @hourly.",
    "Not supported, and reported as errors: a seconds or year field (six or seven fields, as used by Quartz and Spring), the Quartz characters ? L W and #, Jenkins H, and steps without a range such as 5/15.",
    "In local time, a run that falls in the hour skipped when clocks go forward is not listed, and a time repeated when clocks go back is listed once. Cron implementations differ in how they handle these hours.",
  ],
  example: {
    description: "Explaining a weekday schedule and listing its next runs in UTC, starting from Friday 15 March 2024 at 10:00 UTC:",
    input: "30 9 * * 1-5",
    output: `At 09:30, on Monday through Friday.

Mon, 18 Mar 2024 09:30 UTC
Tue, 19 Mar 2024 09:30 UTC
Wed, 20 Mar 2024 09:30 UTC`,
  },
  faqs: [
    {
      question: "What does */15 mean in cron?",
      answer:
        "A step: every 15th value of the field's range. In the minute field, */15 means minutes 0, 15, 30 and 45. Steps also work on ranges, so 9-17/2 in the hour field means 9, 11, 13, 15 and 17.",
    },
    {
      question: "How do I run a job every weekday at 9 AM?",
      answer: "Use 0 9 * * 1-5, or 0 9 * * MON-FRI. Remember that 9 AM is in the time zone of the server running cron.",
    },
    {
      question: "Why does my six-field expression not work?",
      answer:
        "Six- and seven-field expressions with seconds or years come from Quartz, Spring and some JavaScript libraries. Standard cron, crontab files, Kubernetes CronJobs and GitHub Actions use five fields.",
    },
    {
      question: "Can a schedule never run?",
      answer:
        "Yes, if it asks for a date that does not exist, such as 0 0 30 2 * (30 February). The tool searches ten years ahead and tells you when no run is found.",
    },
  ],
  related: ["unix-timestamp-converter", "regex-tester", "jwt-decoder"],
};

export const metadata = toolMetadata(slug, content);

export default function CronHelperPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <CronHelper />
    </ToolPage>
  );
}
