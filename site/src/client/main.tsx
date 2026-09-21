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
  const body = document.querySelector("[data-body]");
  if (body) view.page.props.body = body.innerHTML;
  void Promise.all([import("./mount.tsx"), load(view.page?.kind)]).then(([one]) => one.mount(host, view));
}
