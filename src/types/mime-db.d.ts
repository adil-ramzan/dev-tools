/** mime-db ships its dataset as CommonJS JSON without type declarations. */
declare module "mime-db" {
  export type MimeEntry = {
    source?: "iana" | "apache" | "nginx";
    extensions?: string[];
    compressible?: boolean;
    charset?: string;
  };
  const db: Record<string, MimeEntry>;
  export default db;
}
