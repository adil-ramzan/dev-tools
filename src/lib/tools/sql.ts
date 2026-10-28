/**
 * SQL formatting with sql-formatter (loaded on demand). It re-indents the
 * query and can change keyword case; string literals, quoted identifiers and
 * comments are kept exactly. It does not validate SQL: misspelled keywords
 * pass through unchanged.
 */

export const sqlDialects = [
  { value: "sql", label: "Standard SQL" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "mariadb", label: "MariaDB" },
  { value: "sqlite", label: "SQLite" },
  { value: "transactsql", label: "SQL Server (T-SQL)" },
  { value: "plsql", label: "Oracle PL/SQL" },
  { value: "bigquery", label: "BigQuery" },
  { value: "snowflake", label: "Snowflake" },
  { value: "redshift", label: "Amazon Redshift" },
  { value: "spark", label: "Spark SQL" },
  { value: "trino", label: "Trino / Presto" },
  { value: "duckdb", label: "DuckDB" },
] as const;

export type SqlDialect = (typeof sqlDialects)[number]["value"];
export type SqlKeywordCase = "preserve" | "upper" | "lower";
export type SqlIndent = "2" | "4" | "tab";

export type SqlResult = { ok: true; output: string } | { ok: false; error: string };

export async function formatSql(
  sql: string,
  { dialect, indent, keywordCase }: { dialect: SqlDialect; indent: SqlIndent; keywordCase: SqlKeywordCase },
): Promise<SqlResult> {
  const { format } = await import("sql-formatter");
  try {
    const output = format(sql, {
      language: dialect,
      keywordCase,
      tabWidth: indent === "4" ? 4 : 2,
      useTabs: indent === "tab",
      linesBetweenQueries: 1,
    });
    return { ok: true, output };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const first = message.split("\n")[0].replace(/^Parse error:\s*/i, "");
    const where = /at line (\d+) column (\d+)/.exec(message);
    const hint =
      dialect === "sql"
        ? " If the query uses syntax specific to your database, choose its dialect and try again."
        : " Check the query near that position, or try another dialect.";
    return {
      ok: false,
      error: `${where ? `Line ${where[1]}, column ${where[2]}: ` : ""}${first.replace(/ at line \d+ column \d+\.?/, "")}.${hint}`,
    };
  }
}
