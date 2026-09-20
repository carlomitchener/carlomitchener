import { start } from "./mode.ts";
import { load } from "./lazy.ts";
import "./warp.ts";
import "./bird.ts";
import "./sky.ts";

start();

const host = document.getElementById("app");
const box = document.getElementById("props");

if (host && box) {
  const view = JSON.parse(box.textContent ?? "{}");
  void Promise.all([import("./mount.tsx"), load(view.page?.kind)]).then(([one]) => one.mount(host, view));
}
