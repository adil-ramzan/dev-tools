import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { dockerRunToCompose } from "@/lib/tools/docker-compose";

async function convert(command: string) {
  const result = await dockerRunToCompose(command);
  if (!result.ok) throw new Error(result.error);
  return { ...result, data: parse(result.yaml) as { services: Record<string, Record<string, unknown>>; volumes?: Record<string, unknown>; networks?: Record<string, unknown> } };
}
const error = async (command: string) => {
  const result = await dockerRunToCompose(command);
  return result.ok ? "" : result.error;
};

describe("dockerRunToCompose", () => {
  it("converts a typical command", async () => {
    const { data, service, notes } = await convert(
      `docker run -d --name web -p 8080:80 -p 127.0.0.1:8443:443/tcp -v site-data:/usr/share/nginx/html:ro -v "$(pwd)/conf":/etc/nginx/conf.d -e TZ=UTC -e DEBUG --restart unless-stopped nginx:1.27 nginx -g 'daemon off;'`,
    );
    expect(service).toBe("web");
    expect(data.services.web).toEqual({
      image: "nginx:1.27",
      container_name: "web",
      restart: "unless-stopped",
      command: ["nginx", "-g", "daemon off;"],
      ports: ["8080:80", "127.0.0.1:8443:443/tcp"],
      volumes: ["site-data:/usr/share/nginx/html:ro", "./conf:/etc/nginx/conf.d"],
      environment: ["TZ=UTC", "DEBUG"],
    });
    expect(data.volumes).toEqual({ "site-data": {} });
    expect(notes.join(" ")).toMatch(/-d was not converted/);
    expect(notes.join(" ")).toMatch(/\$\(pwd\)/);
  });

  it("quotes port mappings so YAML 1.1 parsers do not read them as numbers", async () => {
    const { yaml } = await convert("docker run -p 22:22 -p 80 alpine");
    expect(yaml).toContain('- "22:22"');
    expect(yaml).toContain('- "80"');
  });

  it("handles combined short flags, --opt=value and docker container run", async () => {
    const { data } = await convert("docker container run -it --rm --name=shell --network=host -w /work ubuntu:24.04 bash");
    expect(data.services.shell).toMatchObject({ image: "ubuntu:24.04", stdin_open: true, tty: true, network_mode: "host", working_dir: "/work", command: ["bash"] });
  });

  it("names the service after the image when there is no --name", async () => {
    const { service } = await convert("docker run ghcr.io/acme/My_App:2.0@sha256:abc");
    expect(service).toBe("my_app");
  });

  it("converts resources, health checks, logging, ulimits and sysctls", async () => {
    const { data } = await convert(
      "docker run --memory 512m --cpus 1.5 --pids-limit 100 --shm-size 256m --health-cmd 'curl -f http://localhost/ || exit 1' --health-interval 30s --health-retries 3 --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 --ulimit nofile=1024:2048 --ulimit nproc=512 --sysctl net.core.somaxconn=1024 --stop-timeout 20 --init --read-only app",
    );
    expect(data.services.app).toMatchObject({
      mem_limit: "512m",
      cpus: 1.5,
      pids_limit: 100,
      shm_size: "256m",
      healthcheck: { test: ["CMD-SHELL", "curl -f http://localhost/ || exit 1"], interval: "30s", retries: 3 },
      logging: { driver: "json-file", options: { "max-size": "10m", "max-file": "3" } },
      ulimits: { nofile: { soft: 1024, hard: 2048 }, nproc: 512 },
      sysctls: { "net.core.somaxconn": "1024" },
      stop_grace_period: "20s",
      init: true,
      read_only: true,
    });
  });

  it("converts --mount to the long volume syntax", async () => {
    const { data } = await convert("docker run --mount type=bind,source=/srv/data,target=/data,readonly --mount type=volume,src=cache,dst=/cache,volume-nocopy busybox");
    expect(data.services.busybox.volumes).toEqual([
      { type: "bind", target: "/data", source: "/srv/data", read_only: true },
      { type: "volume", target: "/cache", source: "cache", volume: { nocopy: true } },
    ]);
    expect(data.volumes).toEqual({ cache: {} });
  });

  it("declares user-defined networks as external, with aliases", async () => {
    const { data, notes } = await convert("docker run --network backend --network-alias db postgres:16");
    expect(data.services.postgres.networks).toEqual({ backend: { aliases: ["db"] } });
    expect(data.networks).toEqual({ backend: { external: true } });
    expect(notes.join(" ")).toMatch(/external/);
  });

  it("warns about secrets in the environment", async () => {
    const { notes } = await convert("docker run -e POSTGRES_PASSWORD=hunter2 postgres");
    expect(notes.join(" ")).toMatch(/look like secrets/);
  });

  it("reports unsupported options instead of dropping them", async () => {
    const { unsupported, notes, data } = await convert("docker run --gpus all --rm -P --frobnicate=yes --mount type=bind,src=/a,dst=/b,consistency=cached nvidia/cuda");
    expect([...unsupported].sort()).toEqual(["--frobnicate=yes (unknown option)", "--gpus all", "--mount options consistency", "-P (--publish-all): list the ports to publish under ports instead"]);
    expect(notes.join(" ")).toMatch(/--rm has no Compose equivalent/);
    expect(data.services.cuda.image).toBe("nvidia/cuda");
  });

  it("rejects ambiguous unknown options instead of guessing the image", async () => {
    expect(await error("docker run --frobnicate yes nginx")).toMatch(/--frobnicate=value/);
  });

  it("rejects invalid values and commands", async () => {
    expect(await error("")).toMatch(/Paste/);
    expect(await error("podman ps")).toMatch(/Only docker run/);
    expect(await error("kubectl run x")).toMatch(/must start with "docker run"/);
    expect(await error("docker run -d -p 80:80")).toMatch(/no image/);
    expect(await error("docker run --restart sometimes nginx")).toMatch(/restart policy/);
    expect(await error("docker run --cpus lots nginx")).toMatch(/cpus must be a number/);
    expect(await error("docker run --ulimit nofile nginx")).toMatch(/--ulimit/);
    expect(await error("docker run -p '8080 80' nginx")).toMatch(/port mapping/);
    expect(await error("docker run --name")).toMatch(/needs a value/);
    expect(await error("docker run nginx | tee log")).toMatch(/pipe/);
    expect(await error("docker run 'nginx")).toMatch(/never closed/);
  });

  it("keeps arguments after -- or the image as the command", async () => {
    const { data } = await convert("docker run alpine sh -c 'echo $HOME && ls -la'");
    expect(data.services.alpine.command).toEqual(["sh", "-c", "echo $HOME && ls -la"]);
  });

  it("produces valid YAML for every option at once", async () => {
    const { yaml } = await convert("docker run -d --name all -h host -u 1000:1000 --entrypoint /bin/sh --platform linux/amd64 --pull always --add-host db:10.0.0.2 --dns 1.1.1.1 --cap-add NET_ADMIN --cap-drop ALL --device /dev/snd --tmpfs /run --security-opt no-new-privileges --expose 9000 -l team=core --privileged --no-healthcheck alpine");
    const data = parse(yaml);
    expect(data.services.all).toMatchObject({
      hostname: "host",
      user: "1000:1000",
      entrypoint: ["/bin/sh"],
      platform: "linux/amd64",
      pull_policy: "always",
      extra_hosts: ["db:10.0.0.2"],
      dns: ["1.1.1.1"],
      cap_add: ["NET_ADMIN"],
      cap_drop: ["ALL"],
      devices: ["/dev/snd"],
      tmpfs: ["/run"],
      security_opt: ["no-new-privileges"],
      expose: ["9000"],
      labels: ["team=core"],
      privileged: true,
      healthcheck: { disable: true },
    });
  });
});
