const [url, out, w = "1440", h = "900"] = process.argv.slice(2);
import { mkdirSync } from "node:fs";
const S = new URL("../../data/carlomitchener/avatar/", import.meta.url).pathname, port = 9334;
mkdirSync(S, { recursive: true });
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const proc = Bun.spawn([chrome, "--headless=new", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${port}`, `--user-data-dir=${S}/chrome-profile`, "about:blank"], { stdout: "ignore", stderr: "ignore" });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let target: any;
for (let i = 0; i < 50 && !target; i++) { await wait(200); try { target = ((await (await fetch(`http://127.0.0.1:${port}/json`)).json()) as any[]).find((t) => t.type === "page"); } catch {} }
if (!target) { proc.kill(); throw new Error("no chrome"); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map<number, (v: any) => void>(); const logs: string[] = [];
ws.onmessage = (e) => { const m = JSON.parse(String(e.data)); if (m.id && pending.has(m.id)) { pending.get(m.id)!(m); pending.delete(m.id); } if (m.method === "Runtime.exceptionThrown") logs.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text); if (m.method === "Runtime.consoleAPICalled") logs.push(m.params.args.map((a: any) => a.value ?? a.description).join(" ")); };
const send = (method: string, params = {}) => new Promise<any>((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: +w, height: +h, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url });
await wait(1800);
const shot = await send("Page.captureScreenshot", { format: "png" });
await Bun.write(out, Buffer.from(shot.result.data, "base64"));
console.log("snap:", out, logs.length ? "\n  " + logs.join("\n  ") : "");
ws.close(); proc.kill();
