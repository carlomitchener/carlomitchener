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
ws.onmessage = (event) => {
  const m = JSON.parse(String(event.data));
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)!(m.result);
    pending.delete(m.id);
  }
};
const send = (method: string, params = {}) =>
  new Promise<any>((r) => {
    pending.set(++id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });

await send("Page.enable");
for (const path of pages) {
  for (const [w, h, mobile] of SIZES) {
    for (const dark of [false, true]) {
      await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
      await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }] });
      await send("Page.navigate", { url: base + path });
      await wait(1500);
      const { result } = await send("Runtime.evaluate", { expression: "JSON.stringify([document.documentElement.scrollWidth, document.documentElement.scrollHeight])", returnByValue: true });
      const [sw, sh] = JSON.parse(result.value) as [number, number];
      await send("Emulation.setDeviceMetricsOverride", { width: w, height: Math.min(sh, 6000), deviceScaleFactor: 1, mobile });
      await wait(300);
      const shot = await send("Page.captureScreenshot", { format: "png" });
      const name = `${path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"}-${w}${dark ? "-dark" : ""}.png`;
      await Bun.write(`${DATA_DIR}/${name}`, Buffer.from(shot.data, "base64"));
      console.log(`shots: ${name} ${sw}x${sh}${sw > w ? " OVERFLOW" : ""}`);
    }
  }
}
ws.close();
proc.kill();
