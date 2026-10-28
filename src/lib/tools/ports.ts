/**
 * Random TCP/UDP port numbers from a range, with exclusions.
 *
 * Each port is drawn uniformly from the allowed ports with
 * crypto.getRandomValues and rejection sampling, so no port is more likely
 * than another. Math.random is never used. A generated port is only a
 * suggestion: whether it is free can only be checked on the machine itself.
 */

type RandomSource = Pick<Crypto, "getRandomValues">;

export const MAX_PORT = 65535;
export const MAX_PORTS = 1000;

export type Interval = [number, number];

/** Ports commonly used by development servers, databases and other services. */
export const COMMON_PORTS: { port: number; name: string }[] = [
  { port: 1080, name: "SOCKS proxy" },
  { port: 1194, name: "OpenVPN" },
  { port: 1433, name: "Microsoft SQL Server" },
  { port: 1521, name: "Oracle Database" },
  { port: 1883, name: "MQTT" },
  { port: 1900, name: "SSDP / UPnP" },
  { port: 2049, name: "NFS" },
  { port: 2181, name: "ZooKeeper" },
  { port: 2375, name: "Docker API" },
  { port: 2376, name: "Docker API (TLS)" },
  { port: 2379, name: "etcd" },
  { port: 3000, name: "Node.js / React dev servers" },
  { port: 3001, name: "Dev servers" },
  { port: 3306, name: "MySQL / MariaDB" },
  { port: 3389, name: "Remote Desktop" },
  { port: 4200, name: "Angular dev server" },
  { port: 4369, name: "Erlang port mapper" },
  { port: 5000, name: "Flask / dev servers" },
  { port: 5173, name: "Vite dev server" },
  { port: 5353, name: "mDNS" },
  { port: 5432, name: "PostgreSQL" },
  { port: 5672, name: "AMQP / RabbitMQ" },
  { port: 5900, name: "VNC" },
  { port: 6379, name: "Redis" },
  { port: 6443, name: "Kubernetes API" },
  { port: 8000, name: "HTTP alternative" },
  { port: 8080, name: "HTTP alternative" },
  { port: 8081, name: "HTTP alternative" },
  { port: 8443, name: "HTTPS alternative" },
  { port: 8888, name: "Jupyter / HTTP alternative" },
  { port: 9000, name: "Dev servers / PHP-FPM" },
  { port: 9090, name: "Prometheus" },
  { port: 9092, name: "Kafka" },
  { port: 9200, name: "Elasticsearch" },
  { port: 9300, name: "Elasticsearch cluster" },
  { port: 11211, name: "Memcached" },
  { port: 15672, name: "RabbitMQ management" },
  { port: 27017, name: "MongoDB" },
];

export const RANGES = {
  wellKnown: [0, 1023] as Interval,
  registered: [1024, 49151] as Interval,
  dynamic: [49152, 65535] as Interval,
};

export type PortSettings = {
  min: number;
  max: number;
  count: number;
  unique: boolean;
  excludeWellKnown: boolean;
  excludeCommon: boolean;
  excludeDynamic: boolean;
  /** Extra ports or ranges to skip, e.g. "8000-8100, 9229". */
  custom: string;
};

export const DEFAULT_SETTINGS: PortSettings = {
  min: 1024,
  max: 49151,
  count: 5,
  unique: true,
  excludeWellKnown: true,
  excludeCommon: true,
  excludeDynamic: false,
  custom: "",
};

function isPort(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= MAX_PORT;
}

/** Reads "80, 443, 8000-8100" into intervals. */
export function parsePortList(input: string): { ok: true; intervals: Interval[] } | { ok: false; error: string } {
  const intervals: Interval[] = [];
  for (const raw of input.split(/[,\s]+/).filter(Boolean)) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(raw);
    if (!match) return { ok: false, error: `"${raw}" is not a port or range. Use numbers like 8080 or ranges like 8000-8100.` };
    const a = Number(match[1]);
    const b = match[2] === undefined ? a : Number(match[2]);
    if (!isPort(a) || !isPort(b)) return { ok: false, error: `"${raw}" is outside 0–${MAX_PORT}.` };
    if (b < a) return { ok: false, error: `"${raw}" ends before it starts.` };
    intervals.push([a, b]);
  }
  return { ok: true, intervals };
}

/** Sorts and merges overlapping or touching intervals. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((x, y) => x[0] - y[0]);
  const merged: Interval[] = [];
  for (const [a, b] of sorted) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  return merged;
}

/** The parts of [min, max] not covered by `excluded`. */
export function allowedIntervals(min: number, max: number, excluded: Interval[]): Interval[] {
  const result: Interval[] = [];
  let start = min;
  for (const [a, b] of mergeIntervals(excluded)) {
    if (b < start) continue;
    if (a > max) break;
    if (a > start) result.push([start, Math.min(a - 1, max)]);
    start = Math.max(start, b + 1);
    if (start > max) break;
  }
  if (start <= max) result.push([start, max]);
  return result;
}

export function intervalSize(intervals: Interval[]): number {
  return intervals.reduce((sum, [a, b]) => sum + b - a + 1, 0);
}

/** The port at position `index` (0-based) counting through the intervals in order. */
export function portAt(intervals: Interval[], index: number): number {
  let i = index;
  for (const [a, b] of intervals) {
    const size = b - a + 1;
    if (i < size) return a + i;
    i -= size;
  }
  throw new RangeError("Index outside the allowed ports.");
}

/** A uniform integer in [0, n), n ≤ 2^32, by rejection sampling over 32-bit values. */
export function secureIndex(n: number, source: RandomSource): number {
  if (!Number.isInteger(n) || n < 1 || n > 2 ** 32) throw new RangeError("n must be an integer from 1 to 2^32.");
  const limit = Math.floor(2 ** 32 / n) * n;
  const buffer = new Uint32Array(1);
  for (;;) {
    source.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % n;
  }
}

export type PortPlan =
  | { ok: true; intervals: Interval[]; size: number; excluded: Interval[] }
  | { ok: false; error: string };

/** Checks the settings and works out which ports can be drawn. */
export function planPorts(s: PortSettings): PortPlan {
  if (!isPort(s.min) || !isPort(s.max)) return { ok: false, error: `The range must use whole numbers from 0 to ${MAX_PORT}.` };
  if (s.min > s.max) return { ok: false, error: "The lowest port is greater than the highest port." };
  if (!Number.isInteger(s.count) || s.count < 1 || s.count > MAX_PORTS) {
    return { ok: false, error: `The number of ports must be a whole number from 1 to ${MAX_PORTS.toLocaleString("en-US")}.` };
  }
  const custom = parsePortList(s.custom);
  if (!custom.ok) return custom;
  const excluded: Interval[] = [...custom.intervals];
  if (s.excludeWellKnown) excluded.push(RANGES.wellKnown);
  if (s.excludeDynamic) excluded.push(RANGES.dynamic);
  if (s.excludeCommon) excluded.push(...COMMON_PORTS.map(({ port }) => [port, port] as Interval));
  const intervals = allowedIntervals(s.min, s.max, excluded);
  const size = intervalSize(intervals);
  if (size === 0) return { ok: false, error: "Every port in the range is excluded. Widen the range or remove some exclusions." };
  if (s.unique && s.count > size) {
    return { ok: false, error: `Only ${size.toLocaleString("en-US")} ${size === 1 ? "port is" : "ports are"} allowed, so ${s.count.toLocaleString("en-US")} different ports cannot be drawn. Lower the count or allow repeats.` };
  }
  return { ok: true, intervals, size, excluded: mergeIntervals(excluded) };
}

function defaultSource(): RandomSource | null {
  const source = globalThis.crypto;
  return source && typeof source.getRandomValues === "function" ? source : null;
}

export type PortResult = { ok: true; ports: number[]; size: number } | { ok: false; error: string };

export function generatePorts(s: PortSettings, source: RandomSource | null = defaultSource()): PortResult {
  const plan = planPorts(s);
  if (!plan.ok) return plan;
  if (!source) {
    return { ok: false, error: "This browser does not provide a secure random number generator (crypto.getRandomValues), so ports cannot be drawn without bias." };
  }
  try {
    const ports: number[] = [];
    if (s.unique) {
      // A partial Fisher–Yates shuffle over the allowed positions, storing only swapped entries.
      const swapped = new Map<number, number>();
      for (let i = 0; i < s.count; i++) {
        const j = i + secureIndex(plan.size - i, source);
        const atJ = swapped.get(j) ?? j;
        swapped.set(j, swapped.get(i) ?? i);
        ports.push(portAt(plan.intervals, atJ));
      }
    } else {
      for (let i = 0; i < s.count; i++) ports.push(portAt(plan.intervals, secureIndex(plan.size, source)));
    }
    return { ok: true, ports, size: plan.size };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `The secure random number generator failed: ${message}` };
  }
}

export function commonPortName(port: number): string | null {
  return COMMON_PORTS.find((p) => p.port === port)?.name ?? null;
}
