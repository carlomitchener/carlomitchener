import { mkdirSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO, SITE } from "./build.ts";
import { serve } from "./serve.ts";

/* WHERE */

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9336;
const SERVE = 3336;
const DATA_DIR = join(REPO, "data", relative(REPO, SITE));
const OUT = join(DATA_DIR, "shots");
const PROFILE = join(DATA_DIR, "profile");
const SIZES: Record<string, [number, number, boolean]> = { phone: [390, 844, true], tablet: [834, 1194, true], desktop: [1440, 900, false] };
const ROUTES = ["/", "/?at=1.2", "/404.html"];
const SCHEMES = ["light", "dark"];
const SETTLE = 1500;
const REST = 2600;
const HOLD = 900;

/* CHROME */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function page() {
  try {
    return ((await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()) as { type: string; webSocketDebuggerUrl: string }[]).find((one) => one.type === "page");
  } catch {
    return undefined;
  }
}

async function launch() {
  if (await page()) throw new Error(`shots: something already answers on port ${PORT}; kill it first`);
  rmSync(PROFILE, { recursive: true, force: true });
  mkdirSync(PROFILE, { recursive: true });
  const proc = Bun.spawn([CHROME, "--headless=new", "--use-angle=metal", "--ignore-gpu-blocklist", "--no-first-run", "--hide-scrollbars", `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${PORT}`, "about:blank"], { stdout: "ignore", stderr: "ignore" });
  for (let i = 0; i < 50; i++) {
    await wait(200);
    const found = await page();
    if (found) return { proc, target: found };
  }
  proc.kill();
  throw new Error(`shots: no chrome at ${CHROME}; set CHROME to the binary`);
}

function driver(ws: WebSocket) {
  let id = 0;
  const pending = new Map<number, (v: any) => void>();
  const waiting = new Map<string, () => void>();
  const noise: string[] = [];
  const said = (line: string) => noise.push(line.replace(/\s+/g, " ").slice(0, 240));
  ws.onmessage = (event) => {
    const m = JSON.parse(String(event.data));
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)!(m.result ?? m.error);
      pending.delete(m.id);
    } else if (m.method === "Runtime.exceptionThrown") said(`exception: ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`);
    else if (m.method === "Runtime.consoleAPICalled" && /error|warning/.test(m.params.type)) said(`${m.params.type}: ${m.params.args.map((a: any) => a.value ?? a.description).join(" ")}`);
    else if (m.method === "Log.entryAdded" && /error|warning/.test(m.params.entry.level)) said(`${m.params.entry.level}: ${m.params.entry.text}`);
    else if (waiting.has(m.method)) {
      waiting.get(m.method)!();
      waiting.delete(m.method);
    }
  };
  const send = (method: string, params = {}) => new Promise<any>((r) => (pending.set(++id, r), ws.send(JSON.stringify({ id, method, params }))));
  const once = (method: string) => new Promise<void>((r) => waiting.set(method, r));
  const run = async (expression: string) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value;
  return { send, once, run, noise };
}

/* SHOTS */

const server = serve(SERVE);
const { proc, target } = await launch();
let count = 0;
try {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  const { send, once, run, noise } = driver(ws);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  const asked = process.argv.slice(2);
  for (const [route, scheme] of (asked.length ? asked : ROUTES).flatMap((one) => SCHEMES.map((two) => [one, two] as const))) {
    const stem = route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
    for (const [size, [width, height, mobile]] of Object.entries(SIZES)) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
      noise.length = 0;
      const loaded = once("Page.loadEventFired");
      await send("Page.navigate", { url: `http://127.0.0.1:${SERVE}${route}` });
      await loaded;
      await wait(SETTLE);
      const shoot = async (name: string, full: boolean) => {
        const { cssContentSize } = await send("Page.getLayoutMetrics");
        const tall = full ? Math.min(Math.ceil(cssContentSize.height), 8000) : height;
        const cap = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: full, clip: { x: 0, y: full ? 0 : await run("scrollY"), width, height: tall, scale: 1 } });
        await Bun.write(join(OUT, `${stem}-${name}-${size}-${scheme}.png`), Buffer.from(cap.data, "base64"));
        const wide = Math.ceil(cssContentSize.width) > width;
        console.log(`shots: ${stem}-${name}-${size}-${scheme}.png ${width}x${tall}${wide ? " OVERFLOW" : ""}`);
        count++;
      };
      const splashed = await run("!!document.querySelector('#splash')");
      if (splashed) {
        const gl = await run("!!document.createElement('canvas').getContext('webgl2')");
        if (route.includes("at=")) {
          await shoot("fling", false);
          console.log(`  webgl2 ${gl ? "on" : "OFF, fade fallback"}`);
          for (const line of new Set(noise)) console.log(`  ${line}`);
          continue;
        }
        await wait(REST);
        await shoot("splash", false);
        const at = { x: Math.round(width / 2), y: Math.round(height / 2), button: "left", clickCount: 1 };
        await send("Input.dispatchMouseEvent", { type: "mousePressed", ...at });
        await wait(HOLD);
        await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...at });
        const start = Date.now();
        const done = await run("new Promise((ok) => { if (!document.querySelector('#splash')) return ok(true); addEventListener('splashdone', () => ok(true), { once: true }); setTimeout(() => ok(false), 60000); })");
        const took = ((Date.now() - start + HOLD) / 1000).toFixed(1);
        await wait(SETTLE);
        await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: at.x, y: at.y, deltaX: 0, deltaY: 400 });
        await wait(600);
        const scrolled = await run("scrollY > 0 && !document.documentElement.classList.contains('splashing')");
        console.log(`  splash ${done ? `done in ${took} s` : "STUCK"}, webgl2 ${gl ? "on" : "OFF, fade fallback"}, wheel ${scrolled ? "scrolls" : "DOES NOT SCROLL"}`);
        await run("scrollTo(0, 0)");
        await wait(400);
      }
      await shoot("top", false);
      if ((await run("document.documentElement.scrollHeight")) > height + 1) {
        await run(`scrollTo(0, ${Math.round(height * 0.45)})`);
        await wait(400);
        await shoot("fade", false);
        await run(`scrollTo(0, ${height * 2})`);
        await wait(400);
        await shoot("read", false);
        const paused = await run("!Sky.G.visible");
        const fog = await run("getComputedStyle(document.querySelector('.fog') || document.body).opacity");
        console.log(`  sky ${paused ? "paused" : "STILL RUNNING"} once faded, fog ${fog}`);
        await run("scrollTo(0, 0)");
        await wait(400);
        await shoot("page", true);
        if (splashed) {
          await run(`scrollTo(0, ${Math.round(height * 0.4)})`);
          await wait(400);
          const at = { x: Math.round(width / 2), y: Math.round(height * 0.2), button: "left", clickCount: 1 };
          const hit = await run(`document.elementFromPoint(${at.x}, ${at.y}) === Sky.G.canvas`);
          await send("Input.dispatchMouseEvent", { type: "mousePressed", ...at });
          await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...at });
          await wait(3000);
          const locked = await run("document.documentElement.classList.contains('splashing') && !document.querySelector('#splash.open') && scrollY === 0");
          console.log(`  tap at scrollY ${Math.round(height * 0.4)} ${hit ? "hits the canvas" : "MISSES THE CANVAS"}, reverse ${locked ? "relocked at the top" : "DID NOT RELOCK"}`);
          await shoot("relock", false);
          const esc = { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 };
          await send("Input.dispatchKeyEvent", { type: "keyDown", ...esc });
          await send("Input.dispatchKeyEvent", { type: "keyUp", ...esc });
          await wait(400);
          await run(`scrollTo(0, ${height * 2})`);
          await wait(400);
          const before = await run("scrollY");
          const reloaded = once("Page.loadEventFired");
          await send("Page.reload", {});
          await reloaded;
          await wait(SETTLE);
          const fresh = await run("scrollY === 0 && !!document.querySelector('#splash:not(.open)') && document.documentElement.classList.contains('splashing')");
          console.log(`  reload from scrollY ${before} ${fresh ? "starts at the top under the splash" : "DID NOT START AT THE TOP"}`);
        }
      }
      for (const line of new Set(noise)) console.log(`  ${line}`);
    }
  }
  ws.close();
} finally {
  proc.kill();
  await proc.exited;
  rmSync(PROFILE, { recursive: true, force: true });
  server.stop(true);
}
console.log(`shots: ${count} shots in ${relative(REPO, OUT)}, chrome killed`);
process.exit(0);
