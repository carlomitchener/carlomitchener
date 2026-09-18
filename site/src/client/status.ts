const root = document.querySelector<HTMLElement>("[data-status]");

const EVERY = 60 * 1000;

type Automator = {
  at: number;
  seconds: number;
  error: string | null;
  design: { key: string; created_at: number; group: string; edition: string; primary: string; secondary: string[]; scheme: string } | null;
  task: { key: string; step: string; product: { title: string }; created_at: number; updated_at: number; mockups: number; variants: number; metadata: Record<string, unknown> } | null;
  paths: { open: number; used: number; quarantined: number; strikes?: Record<string, number> } | null;
  live: { products: number; expiring: number; newest: number | null; oldest: number | null };
  log: string[];
};

type Stats = {
  at: number;
  hours: number;
  cdn: { requests?: number; bytes?: number; error_4xx?: number; error_5xx?: number };
  lambdas: Record<string, { invocations: number; errors: number; throttles: number; duration_ms: number }>;
  errors: Record<string, { at: string | null; level: string; message: string }[]>;
  bucket: { site_objects: number; site_bytes: number; data_objects: number; data_bytes: number; products: number; designs: number; posts: number };
};

const when = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "never");

const ago = (seconds: number | null | undefined) => {
  if (!seconds) return "never";
  const gap = Math.max(0, Math.floor(Date.now() / 1000 - seconds));
  if (gap < 90) return `${gap} s ago`;
  if (gap < 5400) return `${Math.round(gap / 60)} min ago`;
  if (gap < 172800) return `${(gap / 3600).toFixed(1)} h ago`;
  return `${Math.round(gap / 86400)} d ago`;
};

const bytes = (n: number | undefined) => (n == null ? "" : n < 1e6 ? `${(n / 1e3).toFixed(0)} kB` : n < 1e9 ? `${(n / 1e6).toFixed(1)} MB` : `${(n / 1e9).toFixed(2)} GB`);

const esc = (text: unknown) => String(text ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

const rows = (list: [string, unknown][]) => `<table>${list.map(([name, value]) => `<tr><th>${esc(name)}</th><td>${esc(value)}</td></tr>`).join("")}</table>`;

const LINE = /^(\S+)\s+(DEBUG|INFO|WARNING|ERROR|CRITICAL)\s+(.*)$/;

const paint = (line: string) => {
  const hit = LINE.exec(line);
  if (!hit) return `<span class="text">${esc(line)}</span>`;
  const level = hit[2].toLowerCase();
  return `<span class="${level}"><span class="time">${esc(hit[1])}</span> <span class="level">${esc(hit[2].padEnd(7))}</span> <span class="text">${esc(hit[3])}</span></span>`;
};

const code = (lines: string[]) => `<pre><code>${lines.map(paint).join("\n")}</code></pre>`;

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const reply = await fetch(path, { cache: "no-store" });
    return reply.ok ? ((await reply.json()) as T) : null;
  } catch {
    return null;
  }
}

function automator(data: Automator | null) {
  const box = root?.querySelector("[data-automator]");
  if (!box) return;
  if (!data) {
    box.innerHTML = "<h2>Automator</h2><p class=\"fine\">No status file yet.</p>";
    return;
  }
  const task = data.task;
  const waiting = task?.metadata?.waiting_since as number | undefined;
  const list: [string, unknown][] = [
    ["Last tick", `${ago(data.at)} (${when(data.at)}), ${data.seconds} s${data.error ? `, ${data.error}` : ""}`],
    ["Design", data.design ? `${data.design.key}, ${data.design.group} ${data.design.edition} ${data.design.scheme}, ${data.design.primary} with ${data.design.secondary.join(", ")}, ${ago(data.design.created_at)}` : "none"],
    ["Task", task ? `${task.key} at ${task.step}, ${task.mockups} mockups, ${task.variants} variants, started ${ago(task.created_at)}${waiting ? `, waiting ${ago(waiting).replace(" ago", "")}` : ""}` : "idle"],
    ["Counters", task ? JSON.stringify(task.metadata) : ""],
    ["Round", data.paths ? `${data.paths.open} open, ${data.paths.used} used, ${data.paths.quarantined} quarantined${Object.keys(data.paths.strikes ?? {}).length ? `, strikes ${Object.entries(data.paths.strikes ?? {}).map(([id, n]) => `${id}x${n}`).join(" ")}` : ""}` : "no paths"],
    ["Live", `${data.live.products} products, ${data.live.expiring} expiring within a day, newest ${ago(data.live.newest)}, oldest ${ago(data.live.oldest)}`],
  ];
  box.innerHTML = `<h2>Automator</h2>${rows(list)}`;
}

function cloud(data: Stats | null) {
  const box = root?.querySelector("[data-cloud]");
  if (!box) return;
  if (!data) {
    box.innerHTML = "<h2>Cloud</h2><p class=\"fine\">No stats file yet.</p>";
    return;
  }
  const lambdas = Object.entries(data.lambdas).map(([name, one]) => `<tr><th>${esc(name)}</th><td>${one.invocations} runs, ${one.errors} errors, ${one.throttles} throttles, ${Math.round(one.duration_ms)} ms avg</td></tr>`);
  const list: [string, unknown][] = [
    ["Stats", `${ago(data.at)}, last ${data.hours} h`],
    ["CDN", data.cdn.requests == null ? "no distribution" : `${data.cdn.requests} requests, ${bytes(data.cdn.bytes)}, ${data.cdn.error_4xx}% 4xx, ${data.cdn.error_5xx}% 5xx`],
    ["Bucket", `${data.bucket.site_objects} site files (${bytes(data.bucket.site_bytes)}), ${data.bucket.data_objects} data files (${bytes(data.bucket.data_bytes)})`],
    ["Shop", `${data.bucket.products} live products, ${data.bucket.designs} designs on the CDN, ${data.bucket.posts} posts`],
  ];
  box.innerHTML = `<h2>Cloud</h2>${rows(list)}<table>${lambdas.join("")}</table>`;
}

function errors(data: Stats | null) {
  const box = root?.querySelector("[data-errors]");
  if (!box) return;
  const found = Object.entries(data?.errors ?? {}).flatMap(([name, list]) => list.map((one) => `${one.at ?? "sometime"} ${one.level} ${name} ${one.message}`));
  box.innerHTML = `<h2>Errors</h2>${found.length ? code(found) : "<p class=\"fine\">None in the window.</p>"}`;
}

function log(data: Automator | null) {
  const box = root?.querySelector("[data-log]");
  if (!box) return;
  box.innerHTML = `<h2>Log</h2>${data?.log?.length ? code(data.log.slice(-120)) : "<p class=\"fine\">No log yet.</p>"}`;
}

async function refresh() {
  const [auto, stats] = await Promise.all([fetchJson<Automator>("/status/automator.json"), fetchJson<Stats>("/status/stats.json")]);
  automator(auto);
  cloud(stats);
  errors(stats);
  log(auto);
}

if (root) {
  refresh();
  setInterval(refresh, EVERY);
}
