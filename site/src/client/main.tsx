import { hydrateRoot } from "react-dom/client";
import { App } from "../App.jsx";
import { start } from "./mode.ts";
import "./warp.ts";
import "./bird.ts";
import "./sky.ts";

start();

const host = document.getElementById("app");
const box = document.getElementById("props");

if (host && box) {
  const { page, chrome } = JSON.parse(box.textContent ?? "{}");
  hydrateRoot(host, <App page={page} chrome={chrome} />);
}
