import { SqlFormatter } from "@/components/tools/sql-formatter/SqlFormatter";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "sql-formatter";

const content: ToolPageContent = {
  metaDescription:
    "Format SQL queries online for PostgreSQL, MySQL, SQL Server, SQLite, BigQuery and more. Choose indentation and keyword case; strings and comments stay intact.",
  howItWorks: [
    "Paste one or more SQL statements, choose your database's dialect and select Format SQL. Each clause (`SELECT`, `FROM`, `WHERE`, `GROUP BY` and so on) starts on its own line, with columns and conditions indented beneath it.",
    "The formatter only changes whitespace and, if you choose, the case of SQL keywords. String literals, quoted identifiers, numbers and comments are copied exactly, so the query does the same thing after formatting. Formatting uses the open-source sql-formatter library and runs in your browser.",
    "Choosing the right dialect matters for database-specific syntax, such as square-bracket identifiers in SQL Server, backticks in MySQL or dollar-quoted strings in PostgreSQL.",
  ],
  notes: [
    "The formatter does not check that your SQL is valid or will run. Misspelled keywords and unknown columns pass through unchanged.",
    "Keyword case changes only SQL keywords such as SELECT and WHERE. Table and column names keep the case you wrote them in.",
    "Multiple statements separated by semicolons are kept in order, with a blank line between them.",
  ],
  example: {
    description: "Formatting a one-line PostgreSQL query with uppercase keywords:",
    input: "select id, name from users where active = true and name like 'A%' order by name",
    output: `SELECT
  id,
  name
FROM
  users
WHERE
  active = TRUE
  AND name LIKE 'A%'
ORDER BY
  name`,
  },
  faqs: [
    {
      question: "Which SQL dialects are supported?",
      answer:
        "Standard SQL, PostgreSQL, MySQL, MariaDB, SQLite, SQL Server (T-SQL), Oracle PL/SQL, BigQuery, Snowflake, Amazon Redshift, Spark SQL, Trino and DuckDB.",
    },
    {
      question: "Why do I get a parse error?",
      answer:
        "The query uses syntax the selected dialect does not recognize, or it has an unclosed quote or bracket. Choose the dialect of your database, then check the query near the line and column in the error.",
    },
    {
      question: "Will formatting change what my query does?",
      answer:
        "No. Only spaces, line breaks and optionally keyword case change. SQL keywords are case-insensitive, and string values, identifiers and comments are kept exactly as written.",
    },
    {
      question: "Should SQL keywords be uppercase?",
      answer:
        "It is a style choice. Uppercase keywords are traditional and make them stand out from table and column names; many teams now prefer lowercase. Pick one and use it consistently.",
    },
  ],
  related: ["json-formatter", "html-css-js-minifier", "csv-json-converter", "diff-checker"],
};

export const metadata = toolMetadata(slug, content);

export default function SqlFormatterPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <SqlFormatter />
    </ToolPage>
  );
}
