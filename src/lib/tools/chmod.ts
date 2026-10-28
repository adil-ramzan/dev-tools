/**
 * Unix file permissions: octal modes (755, 4755) and symbolic notation
 * (rwxr-xr-x, as shown by ls -l).
 *
 * The optional leading octal digit holds the special bits: 4 setuid, 2 setgid,
 * 1 sticky. In symbolic notation they replace the execute position of the
 * owner, group or others: s or t when execute is also set, S or T when it is
 * not.
 */

export type Who = "owner" | "group" | "others";
export type Bits = { read: boolean; write: boolean; execute: boolean };
export type Permissions = Record<Who, Bits> & { setuid: boolean; setgid: boolean; sticky: boolean };

export const WHO: Who[] = ["owner", "group", "others"];

const bitsFromDigit = (d: number): Bits => ({ read: (d & 4) !== 0, write: (d & 2) !== 0, execute: (d & 1) !== 0 });
const digitFromBits = (b: Bits) => (b.read ? 4 : 0) + (b.write ? 2 : 0) + (b.execute ? 1 : 0);

export function emptyPermissions(): Permissions {
  return { owner: bitsFromDigit(0), group: bitsFromDigit(0), others: bitsFromDigit(0), setuid: false, setgid: false, sticky: false };
}

export type ParseResult = { ok: true; permissions: Permissions; fileType?: string } | { ok: false; error: string };

export function parseOctal(input: string): ParseResult {
  const text = input.trim();
  if (!/^[0-7]{3,4}$/.test(text)) {
    if (/[89]/.test(text)) return { ok: false, error: "Octal modes use only the digits 0 to 7." };
    return { ok: false, error: "Enter 3 or 4 octal digits, e.g. 644 or 2775." };
  }
  const digits = text.padStart(4, "0").split("").map(Number);
  return {
    ok: true,
    permissions: {
      setuid: (digits[0] & 4) !== 0,
      setgid: (digits[0] & 2) !== 0,
      sticky: (digits[0] & 1) !== 0,
      owner: bitsFromDigit(digits[1]),
      group: bitsFromDigit(digits[2]),
      others: bitsFromDigit(digits[3]),
    },
  };
}

const FILE_TYPES: Record<string, string> = { "-": "regular file", d: "directory", l: "symbolic link", c: "character device", b: "block device", p: "named pipe", s: "socket" };

export function parseSymbolic(input: string): ParseResult {
  let text = input.trim();
  let fileType: string | undefined;
  if (text.length === 10 || text.length === 11) {
    // ls -l output starts with a file type and may end with + (ACL) or . (SELinux context).
    if (text.length === 11) {
      if (!/[+.@]$/.test(text)) return { ok: false, error: "Symbolic permissions have 9 characters, such as rwxr-xr-x." };
      text = text.slice(0, 10);
    }
    fileType = FILE_TYPES[text[0]];
    if (!fileType) return { ok: false, error: `"${text[0]}" is not a file type. ls -l shows - for files, d for directories and l for links.` };
    text = text.slice(1);
  }
  if (text.length !== 9) return { ok: false, error: "Symbolic permissions have 9 characters, such as rwxr-xr-x." };
  const permissions = emptyPermissions();
  for (let i = 0; i < 3; i++) {
    const [r, w, x] = text.slice(i * 3, i * 3 + 3);
    const who = WHO[i];
    if (r !== "r" && r !== "-") return { ok: false, error: `Position ${i * 3 + 1} must be r or -, not "${r}".` };
    if (w !== "w" && w !== "-") return { ok: false, error: `Position ${i * 3 + 2} must be w or -, not "${w}".` };
    const special = i === 2 ? ["t", "T"] : ["s", "S"];
    if (!["x", "-", ...special].includes(x)) return { ok: false, error: `Position ${i * 3 + 3} must be x, - or ${special.join(" or ")}, not "${x}".` };
    permissions[who] = { read: r === "r", write: w === "w", execute: x === "x" || x === special[0] };
    if (special.includes(x)) {
      if (i === 0) permissions.setuid = true;
      if (i === 1) permissions.setgid = true;
      if (i === 2) permissions.sticky = true;
    }
  }
  return { ok: true, permissions, fileType };
}

/** Reads an octal mode or symbolic notation, whichever the input looks like. */
export function parsePermissions(input: string): ParseResult {
  const text = input.trim();
  if (text === "") return { ok: false, error: "Enter an octal mode such as 755 or symbolic permissions such as rwxr-xr-x." };
  return /^\d+$/.test(text) ? parseOctal(text) : parseSymbolic(text);
}

export function toOctal(p: Permissions, { full = false } = {}): string {
  const special = (p.setuid ? 4 : 0) + (p.setgid ? 2 : 0) + (p.sticky ? 1 : 0);
  const base = `${digitFromBits(p.owner)}${digitFromBits(p.group)}${digitFromBits(p.others)}`;
  return special || full ? `${special}${base}` : base;
}

export function toSymbolic(p: Permissions): string {
  return WHO.map((who, i) => {
    const b = p[who];
    const specialSet = i === 0 ? p.setuid : i === 1 ? p.setgid : p.sticky;
    const [on, off] = i === 2 ? ["t", "T"] : ["s", "S"];
    const x = specialSet ? (b.execute ? on : off) : b.execute ? "x" : "-";
    return `${b.read ? "r" : "-"}${b.write ? "w" : "-"}${x}`;
  }).join("");
}

/** chmod's symbolic form, e.g. u=rwx,g=rx,o=rx (u=rwxs for setuid, o=rxt for sticky). */
export function toChmodSymbolic(p: Permissions): string {
  return WHO.map((who, i) => {
    const b = p[who];
    let letters = `${b.read ? "r" : ""}${b.write ? "w" : ""}${b.execute ? "x" : ""}`;
    if (i === 0 && p.setuid) letters += "s";
    if (i === 1 && p.setgid) letters += "s";
    if (i === 2 && p.sticky) letters += "t";
    return `${"ugo"[i]}=${letters}`;
  }).join(",");
}

function list(words: string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

const LABELS: Record<Who, string> = { owner: "The owner", group: "Members of the group", others: "Everyone else" };

/** One sentence per class, for files or directories. */
export function explain(p: Permissions, target: "file" | "directory"): Record<Who, string> {
  const result = {} as Record<Who, string>;
  for (const who of WHO) {
    const b = p[who];
    const verbs =
      target === "file"
        ? [b.read && "read", b.write && "change", b.execute && "run"]
        : [b.read && "list the contents", b.write && "create, rename and delete entries", b.execute && "enter and access files inside"];
    const allowed = verbs.filter((v): v is string => Boolean(v));
    result[who] = allowed.length ? `${LABELS[who]} can ${list(allowed)}.` : `${LABELS[who]} ${who === "group" ? "have" : "has"} no access.`;
  }
  return result;
}

/** Notes about risky or unusual combinations. */
export function warnings(p: Permissions): string[] {
  const out: string[] = [];
  if (p.others.write && !p.sticky) out.push("Everyone can modify this. World-writable files and directories are a common security risk.");
  if (p.others.write && p.sticky) out.push("World-writable with the sticky bit, as for /tmp: anyone can create files, but only owners can delete theirs.");
  if (p.setuid) out.push("Setuid: the program runs with its owner's privileges. Use only on trusted, carefully written programs.");
  if (p.setgid) out.push("Setgid: on a program, it runs with the group's privileges; on a directory, new files inherit the directory's group.");
  if ((p.setuid && !p.owner.execute) || (p.setgid && !p.group.execute)) out.push("A capital S means the special bit is set without execute permission, which usually has no effect.");
  if (!p.owner.read && (p.group.read || p.others.read)) out.push("Others can read it but the owner cannot, which is unusual.");
  return out;
}

export const PRESETS: { mode: string; use: string }[] = [
  { mode: "644", use: "Regular files: owner edits, everyone reads" },
  { mode: "755", use: "Programs, scripts and directories" },
  { mode: "600", use: "Private files, such as SSH keys" },
  { mode: "700", use: "Private directories, such as ~/.ssh" },
  { mode: "640", use: "Files shared read-only with a group" },
  { mode: "664", use: "Files edited by a group" },
  { mode: "775", use: "Directories shared by a group" },
  { mode: "400", use: "Read-only for the owner" },
  { mode: "2775", use: "Shared directory where new files keep its group" },
  { mode: "1777", use: "Shared temporary directory, like /tmp" },
];
