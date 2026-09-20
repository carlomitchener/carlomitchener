import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const DATA_DIR = resolve(import.meta.dir, "../../../data/carlomitchener/site/shots");
const DEFAULTS = ["/", "/shop/", "/shop/men/", "/about/", "/cart/", "/404.html"];
const SIZES: [number, number, boolean][] = [
  [390, 844, true],
  [834, 1194, true],
  [1440, 900, false],
];
const chrome = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const base = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const pages = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULTS;
const port = 9333;

mkdirSync(DATA_DIR, { recursive: true });

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const proc = Bun.spawn([chrome, "--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${DATA_DIR}/.profile`, "about:blank"], { stdout: "ignore", stderr: "ignore" });

let target: { webSocketDebuggerUrl: string } | undefined;
for (let i = 0; i < 50 && !target; i++) {
  await wait(200);
  try {
    const list = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
    target = list.find((one) => one.type === "page");
  } catch {}
}
if (!target) throw new Error("shots: chrome did not answer");

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map<number, (v: any) => void>();
const noise: string[] = [];
const said = (text: string) => text.trim() && noise.push(text.trim().replace(/\s+/g, " ").slice(0, 400));
const flat = (one: any) => (one?.value !== undefined ? String(one.value) : (one?.description ?? one?.preview?.description ?? one?.unserializableValue ?? one?.type ?? ""));
ws.onmessage = (event) => {
  const m = JSON.parse(String(event.data));
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)!(m.result);
    pending.delete(m.id);
    return;
  }
  if (m.method === "Runtime.consoleAPICalled" && /error|warning|assert/.test(m.params.type)) said(`${m.params.type}: ${(m.params.args ?? []).map(flat).join(" ")}`);
  if (m.method === "Runtime.exceptionThrown") said(`exception: ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`);
  if (m.method === "Log.entryAdded" && /error|warning/.test(m.params.entry.level)) said(`${m.params.entry.level}: ${m.params.entry.text} ${m.params.entry.url ?? ""}`);
};
const send = (method: string, params = {}) =>
  new Promise<any>((r) => {
    pending.set(++id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
for (const page of pages) {
  const [path, act] = page.split("@");
  for (const [w, h, mobile] of SIZES) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
    noise.length = 0;
    await send("Page.navigate", { url: base + path });
    await wait(1500);
    if (act) {
      const { result: said, exceptionDetails } = await send("Runtime.evaluate", { expression: act, returnByValue: true, awaitPromise: true });
      if (exceptionDetails) console.log(`  act failed: ${exceptionDetails.text} ${exceptionDetails.exception?.description ?? ""}`);
      else if (said?.value !== undefined && said.value !== 0) console.log(`  act: ${JSON.stringify(said.value)}`);
      await wait(600);
    }
    const { result } = await send("Runtime.evaluate", { expression: "JSON.stringify([document.documentElement.scrollWidth, document.documentElement.scrollHeight])", returnByValue: true });
    const [sw, sh] = JSON.parse(result.value) as [number, number];
    const clip = act ? undefined : { x: 0, y: 0, width: w, height: Math.min(sh, 6000), scale: 1 };
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: !act, clip });
    const name = `${path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"}${act ? `-open${pages.indexOf(page)}` : ""}-${w}.png`;
    await Bun.write(`${DATA_DIR}/${name}`, Buffer.from(shot.data, "base64"));
    console.log(`shots: ${name} ${sw}x${sh}${sw > w ? " OVERFLOW" : ""}${noise.length ? ` ${noise.length} NOISE` : ""}`);
    for (const line of [...new Set(noise)]) console.log(`  ${line}`);
    if (sw > w) {
      const probe = `JSON.stringify([...document.querySelectorAll("body *")].map((el) => [el, el.getBoundingClientRect()]).filter(([, r]) => r.right > innerWidth + 1 && r.width > 0).sort((a, b) => b[1].right - a[1].right).slice(0, 6).map(([el, r]) => el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\\s+/).join(".") : "") + " right=" + Math.round(r.right) + " width=" + Math.round(r.width)))`;
      const { result: wide, exceptionDetails } = await send("Runtime.evaluate", { expression: probe, returnByValue: true });
      if (exceptionDetails) console.log(`  probe failed: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
      else for (const line of JSON.parse(wide.value) as string[]) console.log(`  ${line}`);
    }
  }
}
ws.close();
proc.kill();
