import { DockerRunToCompose } from "@/components/tools/docker-run-to-compose/DockerRunToCompose";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "docker-run-to-compose";

const content: ToolPageContent = {
  metaDescription:
    "Convert docker run commands to Docker Compose YAML: ports, volumes, environment, restart policy, networks, health checks and more, with unsupported flags reported.",
  howItWorks: [
    "Paste a `docker run` command and the tool writes the equivalent Compose service as you type. It reads the command like a shell, including quotes and backslash line continuations, then maps each option to its Compose key: `-p` to ports, `-v` and `--mount` to volumes, `-e` to environment, `--restart`, `--network`, `--entrypoint`, health checks, logging, resource limits and about fifty more.",
    "Named volumes are declared at the top level. User-defined networks are declared as external, because `docker run` expects them to exist. Arguments after the image become the service's command.",
    "Nothing is silently dropped. Options with no Compose equivalent, such as `--rm` and `-d`, are explained in the notes, and options that cannot be converted are listed. An unknown option written as `--flag value` stops the conversion, because the tool cannot tell whether the next word is its value or the image.",
  ],
  notes: [
    "The command is parsed as text. It is never run, and no files are created.",
    "`$(pwd)` and `$PWD` in volume paths become `.`, because Compose resolves relative paths from the compose file's folder. Other shell variables are kept as written.",
    "Port mappings and similar values are quoted, because YAML 1.1 parsers read values such as 22:22 as numbers.",
    "Values that look like secrets in the environment are flagged; move them to an .env file or Docker secrets.",
    "GPU options (`--gpus`) need a `deploy.resources` section that depends on your setup, so they are reported rather than converted.",
  ],
  example: {
    description: "A web server with a port, a volume and a restart policy:",
    input: "docker run -d --name web -p 8080:80 -v site:/usr/share/nginx/html --restart always nginx:1.27",
    output: `services:
  web:
    image: nginx:1.27
    container_name: web
    restart: always
    ports:
      - "8080:80"
    volumes:
      - site:/usr/share/nginx/html
volumes:
  site: {}`,
  },
  faqs: [
    {
      question: "Why is -d not in the compose file?",
      answer: "Detached mode is chosen when you start the services: docker compose up -d. It is not a property of the service.",
    },
    {
      question: "What happens to --rm?",
      answer: "Compose keeps containers until docker compose down, so --rm has no equivalent in the file. For one-off containers, use docker compose run --rm service.",
    },
    {
      question: "Why is my network marked external?",
      answer: "docker run --network uses a network that already exists. Marking it external tells Compose to use it rather than create a new one. Remove external: true to let Compose manage it.",
    },
    {
      question: "Can it convert several containers at once?",
      answer: "One docker run command at a time. Convert each, then combine the services under one services: key.",
    },
  ],
  related: ["curl-to-code", "yaml-json-toml-converter", "git-cheatsheet", "cron-expression-helper"],
};

export const metadata = toolMetadata(slug, content);

export default function DockerRunToComposePage() {
  return (
    <ToolPage slug={slug} content={content}>
      <DockerRunToCompose />
    </ToolPage>
  );
}
