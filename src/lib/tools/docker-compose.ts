import { tokenize } from "@/lib/tools/shell";

/**
 * Converts a `docker run` command into a Docker Compose service. The command
 * is parsed as text and never run.
 *
 * Every option ends up in the service, in the notes (options with no Compose
 * equivalent, such as --rm), or in the unsupported list. An unknown option
 * written as `--flag value` is ambiguous, because the next word could be its
 * value or the image name, so it stops the conversion with an error rather
 * than guessing.
 */

type Kind = "bool" | "value";

type Spec = { kind: Kind; key: string };

const OPTIONS: Record<string, Spec> = {};
function option(names: string[], kind: Kind, key: string) {
  for (const n of names) OPTIONS[n] = { kind, key };
}
option(["-d", "--detach"], "bool", "detach");
option(["--rm"], "bool", "rm");
option(["-i", "--interactive"], "bool", "stdin_open");
option(["-t", "--tty"], "bool", "tty");
option(["--privileged"], "bool", "privileged");
option(["--read-only"], "bool", "read_only");
option(["--init"], "bool", "init");
option(["--no-healthcheck"], "bool", "no_healthcheck");
option(["--oom-kill-disable"], "bool", "oom_kill_disable");
option(["-P", "--publish-all"], "bool", "publish_all");
option(["--name"], "value", "container_name");
option(["-p", "--publish"], "value", "ports");
option(["-v", "--volume"], "value", "volumes");
option(["--mount"], "value", "mount");
option(["-e", "--env"], "value", "environment");
option(["--env-file"], "value", "env_file");
option(["--restart"], "value", "restart");
option(["--network", "--net"], "value", "network");
option(["--network-alias", "--net-alias"], "value", "network_alias");
option(["--entrypoint"], "value", "entrypoint");
option(["-w", "--workdir"], "value", "working_dir");
option(["-u", "--user"], "value", "user");
option(["-h", "--hostname"], "value", "hostname");
option(["-l", "--label"], "value", "labels");
option(["--add-host"], "value", "extra_hosts");
option(["--dns"], "value", "dns");
option(["--dns-search"], "value", "dns_search");
option(["--cap-add"], "value", "cap_add");
option(["--cap-drop"], "value", "cap_drop");
option(["--platform"], "value", "platform");
option(["-m", "--memory"], "value", "mem_limit");
option(["--memory-reservation"], "value", "mem_reservation");
option(["--memory-swap"], "value", "memswap_limit");
option(["--cpus"], "value", "cpus");
option(["--cpu-shares", "-c"], "value", "cpu_shares");
option(["--pids-limit"], "value", "pids_limit");
option(["--shm-size"], "value", "shm_size");
option(["--log-driver"], "value", "log_driver");
option(["--log-opt"], "value", "log_opt");
option(["--health-cmd"], "value", "health_cmd");
option(["--health-interval"], "value", "health_interval");
option(["--health-timeout"], "value", "health_timeout");
option(["--health-retries"], "value", "health_retries");
option(["--health-start-period"], "value", "health_start_period");
option(["--device"], "value", "devices");
option(["--tmpfs"], "value", "tmpfs");
option(["--ulimit"], "value", "ulimits");
option(["--sysctl"], "value", "sysctls");
option(["--security-opt"], "value", "security_opt");
option(["--link"], "value", "links");
option(["--expose"], "value", "expose");
option(["--stop-signal"], "value", "stop_signal");
option(["--stop-timeout"], "value", "stop_timeout");
option(["--pid"], "value", "pid");
option(["--ipc"], "value", "ipc");
option(["--pull"], "value", "pull_policy");
option(["--group-add"], "value", "group_add");
option(["--runtime"], "value", "runtime");
option(["--domainname"], "value", "domainname");
option(["--mac-address"], "value", "mac_address");
option(["--userns"], "value", "userns_mode");
option(["--volumes-from"], "value", "volumes_from");

/** Known options with no faithful Compose equivalent. Values are consumed so they are not read as the image. */
const UNSUPPORTED_VALUE = ["--gpus", "--cidfile", "-a", "--attach", "--cgroup-parent", "--label-file", "--detach-keys", "--device-cgroup-rule", "--blkio-weight", "--cpuset-cpus", "--cpuset-mems", "--cpu-period", "--cpu-quota", "--kernel-memory", "--memory-swappiness", "--isolation", "--uts", "--cgroupns", "--ip", "--ip6", "--link-local-ip", "--storage-opt", "--volume-driver", "--annotation"];
const UNSUPPORTED_BOOL = ["--sig-proxy", "--disable-content-trust", "-q", "--quiet"];

export type ComposeResult =
  | { ok: true; yaml: string; service: string; notes: string[]; unsupported: string[] }
  | { ok: false; error: string };

type Service = Record<string, unknown>;

function serviceName(name: string | undefined, image: string): string {
  const base = name ?? image.split("@")[0].split("/").pop()!.split(":")[0];
  const clean = base.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^[-_]+|[-_]+$/g, "");
  return clean || "app";
}

const PWD = /^(?:\$\{PWD\}|\$PWD)(?=\/|$)/;

function hostPath(path: string, notes: Set<string>): string {
  if (PWD.test(path)) {
    notes.add("$(pwd) / $PWD was converted to \".\": Compose resolves relative paths from the folder that contains the compose file.");
    return path.replace(PWD, ".");
  }
  return path;
}

const isNamedVolume = (source: string) => source !== "" && !/^[./~$]/.test(source) && !source.includes("/") && !/^[A-Za-z]:\\/.test(source);

function parseKeyValueList(text: string): Map<string, string | true> {
  const map = new Map<string, string | true>();
  for (const part of text.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) map.set(part.trim(), true);
    else map.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
  }
  return map;
}

const TOKEN_VALUE = /^\S+$/;

export async function dockerRunToCompose(command: string): Promise<ComposeResult> {
  // $(pwd) and `pwd` are common in docker run examples; keep them as $PWD instead of rejecting the command.
  const prepared = command.trim().replace(/\$\(\s*pwd\s*\)|`\s*pwd\s*`/g, "${PWD}");
  const tokens = tokenize(prepared);
  if (!tokens.ok) return tokens;
  const args = tokens.args;
  if (args.length === 0) return { ok: false, error: "Paste a docker run command, e.g. docker run -d -p 8080:80 nginx." };

  let i = 0;
  if (/^(sudo)$/.test(args[0])) i++;
  if (!/^(docker|podman)(\.exe)?$/i.test(args[i] ?? "")) return { ok: false, error: 'The command must start with "docker run".' };
  i++;
  if (args[i] === "container") i++;
  if (args[i] !== "run") return { ok: false, error: `Only docker run can be converted, not docker ${args[i] ?? ""}.`.trim() };
  i++;

  const notes = new Set<string>(tokens.warnings.filter((w) => !w.includes("$PWD") && !w.includes("${PWD}")));
  const unsupported: string[] = [];
  const values = new Map<string, string[]>();
  const flags = new Set<string>();
  let image: string | null = null;

  // Expand -it, -dp 80:80, --name=web and similar into separate arguments.
  const queue: string[] = [];
  for (const arg of args.slice(i)) {
    if (image !== null || queue.includes("--")) {
      queue.push(arg);
      continue;
    }
    if (/^--[^=]+=/.test(arg)) {
      const eq = arg.indexOf("=");
      queue.push(arg.slice(0, eq), `\u0000=${arg.slice(eq + 1)}`);
    } else if (/^-[A-Za-z]{2,}/.test(arg) && !OPTIONS[arg]) {
      for (let j = 1; j < arg.length; j++) {
        const short = `-${arg[j]}`;
        queue.push(short);
        if (OPTIONS[short]?.kind === "value" || UNSUPPORTED_VALUE.includes(short)) {
          if (j + 1 < arg.length) queue.push(arg.slice(j + 1));
          break;
        }
      }
    } else {
      queue.push(arg);
    }
  }

  let k = 0;
  for (; k < queue.length; k++) {
    const arg = queue[k];
    if (arg === "--") {
      k++;
      break;
    }
    if (!arg.startsWith("-") || arg === "-") break;
    const attached = queue[k + 1]?.startsWith("\u0000=") ? queue[k + 1].slice(2) : null;
    const takeValue = (): string | null => {
      if (attached !== null) {
        k++;
        return attached;
      }
      return k + 1 < queue.length ? queue[++k] : null;
    };

    if (UNSUPPORTED_BOOL.includes(arg)) {
      if (attached !== null) k++;
      unsupported.push(arg);
      continue;
    }
    if (UNSUPPORTED_VALUE.includes(arg)) {
      const v = takeValue();
      unsupported.push(v === null ? arg : `${arg} ${v}`);
      continue;
    }
    const spec = OPTIONS[arg];
    if (!spec) {
      if (attached !== null) {
        k++;
        unsupported.push(`${arg}=${attached} (unknown option)`);
        continue;
      }
      return { ok: false, error: `${arg} is not a known docker run option, so it is unclear whether the next word is its value or the image. Write it as ${arg}=value or remove it.` };
    }
    if (spec.kind === "bool") {
      if (attached !== null) {
        k++;
        if (/^(false|0)$/i.test(attached)) continue;
      }
      flags.add(spec.key);
      continue;
    }
    const value = takeValue();
    if (value === null) return { ok: false, error: `${arg} needs a value.` };
    values.set(spec.key, [...(values.get(spec.key) ?? []), value]);
  }

  image = queue[k] ?? null;
  if (!image) return { ok: false, error: "The command has no image name." };
  if (!TOKEN_VALUE.test(image)) return { ok: false, error: `"${image}" is not a valid image name.` };
  const commandArgs = queue.slice(k + 1).map((a) => (a.startsWith("\u0000=") ? a.slice(2) : a));

  const one = (key: string) => {
    const list = values.get(key);
    if (list && list.length > 1) notes.add(`The option for ${key} was given ${list.length} times; the last value was used, as docker does.`);
    return list?.[list.length - 1];
  };
  const many = (key: string) => values.get(key) ?? [];

  const service: Service = { image };
  const name = one("container_name");
  if (name) service.container_name = name;
  const topVolumes = new Set<string>();
  const topNetworks = new Set<string>();

  if (flags.has("detach")) notes.add("-d was not converted: Compose services start in the background with docker compose up -d.");
  if (flags.has("rm")) notes.add("--rm has no Compose equivalent: containers are kept until docker compose down. Use docker compose run --rm for one-off containers.");
  if (flags.has("publish_all")) unsupported.push("-P (--publish-all): list the ports to publish under ports instead");

  for (const key of ["restart", "entrypoint", "working_dir", "user", "hostname", "platform", "mem_limit", "mem_reservation", "memswap_limit", "shm_size", "stop_signal", "pid", "ipc", "pull_policy", "runtime", "domainname", "mac_address", "userns_mode"] as const) {
    const v = one(key);
    if (v === undefined) continue;
    if (key === "restart" && !/^(no|always|unless-stopped|on-failure(:\d+)?)$/.test(v)) return { ok: false, error: `--restart ${v} is not a valid restart policy. Use no, always, unless-stopped or on-failure[:max-retries].` };
    if (key === "pull_policy" && !/^(always|missing|never)$/.test(v)) return { ok: false, error: `--pull ${v} is not valid. Use always, missing or never.` };
    service[key] = key === "entrypoint" ? [v] : v;
  }
  for (const key of ["cpus", "cpu_shares", "pids_limit"] as const) {
    const v = one(key);
    if (v === undefined) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n < (key === "pids_limit" ? -1 : 0)) return { ok: false, error: `${key} must be a number, not "${v}".` };
    service[key] = n;
  }
  const stopTimeout = one("stop_timeout");
  if (stopTimeout !== undefined) {
    if (!/^\d+$/.test(stopTimeout)) return { ok: false, error: `--stop-timeout needs a whole number of seconds, not "${stopTimeout}".` };
    service.stop_grace_period = `${stopTimeout}s`;
  }
  for (const flag of ["stdin_open", "tty", "privileged", "read_only", "init", "oom_kill_disable"] as const) if (flags.has(flag)) service[flag] = true;

  if (commandArgs.length) service.command = commandArgs;

  const ports = many("ports");
  for (const p of ports) if (!/^[\w.:[\]/-]+$/.test(p)) return { ok: false, error: `"${p}" is not a valid port mapping, e.g. 8080:80 or 127.0.0.1:8080:80/tcp.` };
  if (ports.length) service.ports = ports;
  const expose = many("expose");
  if (expose.length) service.expose = expose;

  const volumes: unknown[] = [];
  for (const v of many("volumes")) {
    const parts = v.split(":");
    // A Windows drive letter (C:\…) is part of the first path.
    if (/^[A-Za-z]$/.test(parts[0]) && parts.length > 1 && parts[1].startsWith("\\")) parts.splice(0, 2, `${parts[0]}:${parts[1]}`);
    if (parts.length === 1) {
      volumes.push(v);
      notes.add(`-v ${v} creates an anonymous volume; Compose creates a new one for each container.`);
      continue;
    }
    const source = hostPath(parts[0], notes);
    if (isNamedVolume(source)) topVolumes.add(source);
    volumes.push([source, ...parts.slice(1)].join(":"));
  }
  for (const m of many("mount")) {
    const map = parseKeyValueList(m);
    const type = String(map.get("type") ?? "volume");
    const target = map.get("target") ?? map.get("dst") ?? map.get("destination");
    if (typeof target !== "string") return { ok: false, error: `--mount ${m} has no target.` };
    const entry: Record<string, unknown> = { type, target };
    const source = map.get("source") ?? map.get("src");
    if (typeof source === "string") {
      entry.source = type === "bind" ? hostPath(source, notes) : source;
      if (type === "volume" && isNamedVolume(source)) topVolumes.add(source);
    }
    const ro = map.get("readonly") ?? map.get("ro");
    if (ro === true || ro === "true" || ro === "1") entry.read_only = true;
    if (typeof map.get("bind-propagation") === "string") entry.bind = { propagation: map.get("bind-propagation") };
    if (map.get("volume-nocopy") === true || map.get("volume-nocopy") === "true") entry.volume = { nocopy: true };
    if (typeof map.get("tmpfs-size") === "string") entry.tmpfs = { size: map.get("tmpfs-size") };
    const known = new Set(["type", "target", "dst", "destination", "source", "src", "readonly", "ro", "bind-propagation", "volume-nocopy", "tmpfs-size"]);
    const extra = [...map.keys()].filter((key) => !known.has(key));
    if (extra.length) unsupported.push(`--mount options ${extra.join(", ")}`);
    volumes.push(entry);
  }
  if (volumes.length) service.volumes = volumes;

  const environment = many("environment");
  if (environment.length) service.environment = environment;
  const envFiles = many("env_file").map((f) => hostPath(f, notes));
  if (envFiles.length) service.env_file = envFiles;
  if (environment.some((e) => /PASSWORD|SECRET|TOKEN|KEY/i.test(e.split("=")[0]) && e.includes("="))) {
    notes.add("The environment contains values that look like secrets. Move them to an .env file or Docker secrets instead of committing them in the compose file.");
  }

  const labels = many("labels");
  if (labels.length) service.labels = labels;
  for (const key of ["extra_hosts", "dns", "dns_search", "cap_add", "cap_drop", "devices", "tmpfs", "security_opt", "links", "group_add", "volumes_from"] as const) {
    const list = many(key);
    if (list.length) service[key] = list;
  }
  if (many("links").length) notes.add("--link is a legacy feature; services in the same Compose project can already reach each other by service name.");

  const ulimits: Record<string, unknown> = {};
  for (const u of many("ulimits")) {
    const m = /^([a-z]+)=(-?\d+)(?::(-?\d+))?$/.exec(u);
    if (!m) return { ok: false, error: `--ulimit ${u} should look like nofile=1024:2048 or nproc=65535.` };
    ulimits[m[1]] = m[3] === undefined ? Number(m[2]) : { soft: Number(m[2]), hard: Number(m[3]) };
  }
  if (Object.keys(ulimits).length) service.ulimits = ulimits;

  const sysctls: Record<string, string> = {};
  for (const s of many("sysctls")) {
    const eq = s.indexOf("=");
    if (eq <= 0) return { ok: false, error: `--sysctl ${s} should look like net.core.somaxconn=1024.` };
    sysctls[s.slice(0, eq)] = s.slice(eq + 1);
  }
  if (Object.keys(sysctls).length) service.sysctls = sysctls;

  const logDriver = one("log_driver");
  const logOpts = many("log_opt");
  if (logDriver || logOpts.length) {
    const logging: Record<string, unknown> = {};
    if (logDriver) logging.driver = logDriver;
    if (logOpts.length) {
      const options: Record<string, string> = {};
      for (const o of logOpts) {
        const eq = o.indexOf("=");
        if (eq <= 0) return { ok: false, error: `--log-opt ${o} should look like max-size=10m.` };
        options[o.slice(0, eq)] = o.slice(eq + 1);
      }
      logging.options = options;
    }
    service.logging = logging;
  }

  if (flags.has("no_healthcheck")) {
    service.healthcheck = { disable: true };
  } else {
    const test = one("health_cmd");
    const health: Record<string, unknown> = {};
    if (test) health.test = ["CMD-SHELL", test];
    for (const [key, field] of [["health_interval", "interval"], ["health_timeout", "timeout"], ["health_start_period", "start_period"]] as const) {
      const v = one(key);
      if (v) health[field] = v;
    }
    const retries = one("health_retries");
    if (retries) {
      if (!/^\d+$/.test(retries)) return { ok: false, error: `--health-retries needs a whole number, not "${retries}".` };
      health.retries = Number(retries);
    }
    if (Object.keys(health).length) service.healthcheck = health;
  }

  const network = one("network");
  const aliases = many("network_alias");
  if (network) {
    if (/^(host|none|bridge)$/.test(network) || network.startsWith("container:")) {
      service.network_mode = network;
      if (aliases.length) unsupported.push("--network-alias (network aliases need a user-defined network)");
      if (network === "bridge") notes.add("network_mode: bridge uses Docker's default bridge network instead of the network Compose creates for the project, so services cannot reach each other by name.");
    } else {
      topNetworks.add(network);
      service.networks = aliases.length ? { [network]: { aliases } } : [network];
      notes.add(`The network ${network} is declared as external, because docker run expects it to exist already. Remove external: true to let Compose create it.`);
    }
  } else if (aliases.length) {
    service.networks = { default: { aliases } };
  }

  const serviceKey = serviceName(name, image);
  const compose: Record<string, unknown> = { services: { [serviceKey]: service } };
  if (topVolumes.size) compose.volumes = Object.fromEntries([...topVolumes].map((v) => [v, {}]));
  if (topNetworks.size) compose.networks = Object.fromEntries([...topNetworks].map((n) => [n, { external: true }]));

  const Y = await import("yaml");
  const doc = new Y.Document(compose);
  // Quote strings in lists that YAML 1.1 parsers could misread, such as 22:22 (a base-60 number) or yes.
  Y.visit(doc, {
    Scalar(_, node) {
      if (typeof node.value === "string" && (/^[\d.:/-]+$/.test(node.value) || /^(y|n|yes|no|on|off|true|false|null|~)$/i.test(node.value))) {
        node.type = Y.Scalar.QUOTE_DOUBLE;
      }
    },
  });
  return { ok: true, yaml: doc.toString({ lineWidth: 0 }), service: serviceKey, notes: [...notes], unsupported };
}
