import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

/* WHERE */

export type Size = [number, number, boolean];

export type Block = { routes: string[]; sizes: Record<string, Size> };

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9335;
const SERVE = 3335;
const LIVE = (process.env.SITE_URL ?? "").replace(/\/$/, "");
const CSP = process.env.CSP ?? "";
const TALL = 6000;
const PATIENCE = 15000;
const REPLY = 30000;

export function block(config: Record<string, unknown>): Block {
  const found = config.shots as Block | undefined;
  if (!found?.routes?.length || !found.sizes) throw new Error("shots: site.json has no shots block");
  return found;
}

/* SERVER */

const TYPES: Record<string, string> = {
  ".css": "text/css",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
};

const doc = (bytes: Uint8Array) => new TextDecoder().decode(bytes.subarray(0, 15)).toLowerCase().startsWith("<!doctype html");

function serve(dist: string) {
  const file = (path: string): Response | null => {
    const want = join(dist, path.endsWith("/") ? `${path}index.html` : path);
    if (!want.startsWith(dist) || !existsSync(want) || !statSync(want).isFile()) return null;
    const bytes = new Uint8Array(readFileSync(want));
    const type = doc(bytes) ? TYPES[".html"]! : (TYPES[extname(want)] ?? "application/octet-stream");
    const headers: Record<string, string> = { "content-type": type };
    if (CSP) headers["content-security-policy"] = CSP;
    return new Response(bytes, { headers });
  };
  return Bun.serve({
    port: SERVE,
    fetch(req) {
      const path = decodeURIComponent(new URL(req.url).pathname);
      const hit = file(path) ?? file(`${path}/`);
      if (hit) return hit;
      const lost = file("/404.html");
      return lost ? new Response(lost.body, { status: 404, headers: lost.headers }) : new Response("not found", { status: 404 });
    },
  });
}

/* CHROME */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function deadline<T>(job: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((ok, no) => {
    const timer = setTimeout(() => no(new Error(`shots: ${what} did not answer within ${ms / 1000} s`)), ms);
    const clear = (run: () => void) => {
      clearTimeout(timer);
      run();
    };
    job.then(
      (value) => clear(() => ok(value)),
      (error) => clear(() => no(error)),
    );
  });
}

type Target = { type: string; webSocketDebuggerUrl: string };

async function targets(): Promise<Target[] | null> {
  try {
    return (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()) as Target[];
  } catch {
    return null;
  }
}

async function launch(profile: string) {
  if (await targets()) throw new Error(`shots: something already answers on port ${PORT}; kill it first`);
  if (!LIVE) rmSync(profile, { recursive: true, force: true });
  mkdirSync(profile, { recursive: true });
  const proc = Bun.spawn(
    [CHROME, "--headless=new", "--disable-gpu", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`, "about:blank"],
    { stdout: "ignore", stderr: "ignore" },
  );
  for (let i = 0; i < 50; i++) {
    await wait(200);
    if (proc.exitCode !== null) break;
    const page = (await targets())?.find((one) => one.type === "page");
    if (page) return { proc, page };
  }
  proc.kill();
  throw new Error(`shots: no chrome at ${CHROME}; set CHROME to the binary`);
}

const flat = (one: any) => (one?.value !== undefined ? String(one.value) : (one?.description ?? one?.preview?.description ?? one?.unserializableValue ?? one?.type ?? ""));

function driver(ws: WebSocket) {
  let id = 0;
  const pending = new Map<number, (v: any) => void>();
  const events = new Map<string, () => void>();
  const noise: string[] = [];
  const said = (text: string) => {
    const line = text.trim().replace(/\s+/g, " ").slice(0, 400);
    if (line) noise.push(line);
  };
  ws.onmessage = (event) => {
    const m = JSON.parse(String(event.data));
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)!(m.result ?? m.error);
      pending.delete(m.id);
    } else if (m.method === "Runtime.consoleAPICalled" && /error|warning|assert/.test(m.params.type)) {
      said(`${m.params.type}: ${(m.params.args ?? []).map(flat).join(" ")}`);
    } else if (m.method === "Runtime.exceptionThrown") {
      said(`exception: ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`);
    } else if (m.method === "Log.entryAdded" && /error|warning/.test(m.params.entry.level)) {
      said(`${m.params.entry.level}: ${m.params.entry.text} ${m.params.entry.url ?? ""}`);
    } else if (m.method && events.has(m.method)) {
      events.get(m.method)!();
      events.delete(m.method);
    }
  };
  const send = (method: string, params = {}) =>
    deadline(
      new Promise<any>((r) => {
        pending.set(++id, r);
        ws.send(JSON.stringify({ id, method, params }));
      }),
      REPLY,
      `${method} reply`,
    );
  const once = (method: string) => deadline(new Promise<void>((r) => events.set(method, r)), PATIENCE, method);
  return { send, once, noise };
}

/* PROBES */

const MOUNTED = `new Promise((r) => { const root = document.querySelector("#root, #app"); if (!root) return r(); const t0 = Date.now(); const poll = () => (root.children.length || Date.now() - t0 > 8000 ? r() : setTimeout(poll, 50)); poll(); })`;

const STILL = `document.head.insertAdjacentHTML("beforeend", "<style>canvas:not(.mark) { visibility: hidden !important; }</style>")`;

const READY = `${MOUNTED}.then(() => Promise.all([...document.images].map((i) => { i.loading = "eager"; return (i.complete ? Promise.resolve() : new Promise((r) => { i.onload = i.onerror = r; })).then(() => i.decode().catch(() => 0)); }))).then(() => document.fonts.ready).then(() => { ${STILL}; }).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))).then(() => 1)`;

const WIDE = `JSON.stringify([...document.querySelectorAll("body *")].filter((el) => !el.closest(".pane, .scrim") && getComputedStyle(el).visibility !== "hidden").map((el) => [el, el.getBoundingClientRect()]).filter(([, r]) => r.right > innerWidth + 1 && r.width > 0).sort((a, b) => b[1].right - a[1].right).slice(0, 4).map(([el, r]) => el.tagName.toLowerCase() + (typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\\s+/).join(".") : "") + " right=" + Math.round(r.right) + " width=" + Math.round(r.width)))`;

const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex").slice(0, 8);

/* RUN */

export async function main(root: string, config?: Record<string, unknown>): Promise<void> {
  const conf = config ?? (JSON.parse(readFileSync(join(root, "site.json"), "utf8")) as Record<string, unknown>);
  const { routes, sizes } = block(conf);
  const desk = resolve(root, "../..");
  const DATA_DIR = join(desk, "data", relative(desk, root), "scripts");
  const args = process.argv.slice(2);
  const print = args.includes("--print");
  const baseline = args.includes("--baseline");
  const probe = args.includes("--js") ? (args[args.indexOf("--js") + 1] ?? "") : "";
  const scheme = args.includes("--theme") ? (args[args.indexOf("--theme") + 1] ?? "") : "";
  const asked = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--js" && args[i - 1] !== "--theme");
  const pages = asked.length ? asked : routes;
  const out = join(DATA_DIR, "shots", baseline ? "baseline" : "latest");
  const base = join(DATA_DIR, "shots", "baseline");
  const name = (route: string, size: string, act: number) =>
    `${route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"}${act >= 0 ? `-open${act}` : ""}-${size}${print ? "-print" : ""}${scheme ? `-${scheme}` : ""}.png`;
  mkdirSync(out, { recursive: true });
  const server = LIVE ? null : serve(join(root, "dist"));
  const { proc, page } = await launch(join(DATA_DIR, "profile"));
  let shot = 0;
  let changed = 0;
  let fresh = 0;
  try {
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));
    const { send, once, noise } = driver(ws);
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Log.enable");
    await send("Emulation.setEmulatedMedia", { media: print ? "print" : "", features: [{ name: "prefers-reduced-motion", value: "reduce" }, ...(scheme ? [{ name: "prefers-color-scheme", value: scheme }] : [])] });
    for (const [turn, want] of pages.entries()) {
      const [route = "/", act] = want.split("@");
      for (const [size, [width, height, mobile]] of Object.entries(sizes)) {
        await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
        const loaded = once("Page.loadEventFired");
        noise.length = 0;
        await send("Page.navigate", { url: `${LIVE || `http://127.0.0.1:${SERVE}`}${route}` });
        const file = name(route, size, act ? turn : -1);
        try {
          await loaded;
        } catch (error) {
          console.log(`shots: ${file} FAILED ${(error as Error).message}`);
          continue;
        }
        await Promise.race([send("Runtime.evaluate", { expression: READY, awaitPromise: true, returnByValue: true }).catch(() => 0), wait(PATIENCE)]);
        await wait(300);
        if (act) {
          const { result, exceptionDetails } = await send("Runtime.evaluate", { expression: act, returnByValue: true, awaitPromise: true });
          if (exceptionDetails) console.log(`  act failed: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
          else if (result?.value !== undefined && result.value !== 0) console.log(`  act: ${JSON.stringify(result.value)}`);
          await wait(600);
        }
        const { cssContentSize } = await send("Page.getLayoutMetrics");
        const full = act ? height : Math.min(Math.ceil(cssContentSize.height), TALL);
        const cap = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: !act, clip: { x: 0, y: 0, width, height: full, scale: 1 } });
        const bytes = new Uint8Array(Buffer.from(cap.data, "base64"));
        await Bun.write(join(out, file), bytes);
        shot++;
        const wide = Math.ceil(cssContentSize.width) > width;
        const was = join(base, file);
        let verdict = "";
        if (!baseline && existsSync(was)) {
          const same = sha(new Uint8Array(readFileSync(was))) === sha(bytes);
          verdict = same ? " same" : " DIFF";
          if (!same) changed++;
        } else if (!baseline) {
          verdict = " new";
          fresh++;
        }
        console.log(`shots: ${file} ${width}x${full} ${sha(bytes)}${wide ? " OVERFLOW" : ""}${verdict}${noise.length ? ` ${noise.length} NOISE` : ""}`);
        for (const line of [...new Set(noise)]) console.log(`  ${line}`);
        if (probe) {
          const { result, exceptionDetails } = await send("Runtime.evaluate", { expression: probe, returnByValue: true, awaitPromise: true });
          console.log(`  ${exceptionDetails ? `probe failed: ${exceptionDetails.text}` : JSON.stringify(result.value)}`);
        }
        if (wide) {
          const { result } = await send("Runtime.evaluate", { expression: WIDE, returnByValue: true });
          for (const line of JSON.parse(result.value) as string[]) console.log(`  ${line}`);
        }
      }
    }
    ws.close();
  } finally {
    proc.kill();
    await proc.exited;
    if (!LIVE) rmSync(join(DATA_DIR, "profile"), { recursive: true, force: true });
    server?.stop(true);
  }
  const tail = baseline ? "baseline written" : `${changed} differ from baseline, ${fresh} new`;
  console.log(`shots: ${shot} shots in ${out}, ${tail}, chrome killed`);
  process.exit(0);
}
