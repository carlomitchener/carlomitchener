import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "public", "fonts");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const CSS2 = "https://fonts.googleapis.com/css2";
const OFL = "https://raw.githubusercontent.com/google/fonts/main/ofl";
const APACHE = "https://raw.githubusercontent.com/google/material-design-icons/master/LICENSE";
const ICON_AXES = "Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,0..1,0";
const ICON_FULL =
  "https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.woff2";

const ICONS = [
  "menu",
  "close",
  "shopping_bag",
  "chevron_right",
  "chevron_left",
  "expand_more",
  "expand_less",
  "arrow_forward",
  "arrow_back",
  "north_east",
  "play_arrow",
  "pause",
  "volume_off",
  "volume_up",
  "download",
  "open_in_new",
  "check",
  "add",
  "remove",
  "delete",
  "search",
  "mail",
  "brightness_auto",
  "light_mode",
  "dark_mode",
  "skip_next",
  "skip_previous",
  "fullscreen",
  "palette",
];

// FETCH

async function get(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function text(url: string): Promise<string> {
  return new TextDecoder().decode(await get(url));
}

// PARSE

type Face = { subset: string; url: string; range: string | null };

function faces(css: string): Face[] {
  const out: Face[] = [];
  let subset = "";
  const comment = /\/\*\s*([^*]+?)\s*\*\//g;
  const block = /@font-face\s*\{([^}]+)\}/g;
  let at = 0;
  let found: RegExpExecArray | null;
  while ((found = block.exec(css)) !== null) {
    comment.lastIndex = at;
    let label = "";
    let tag: RegExpExecArray | null;
    while ((tag = comment.exec(css)) !== null && tag.index < found.index) label = tag[1];
    subset = label || subset;
    const body = found[1];
    const url = /url\((\S+?)\)\s*format/.exec(body);
    if (!url) continue;
    const range = /unicode-range:\s*([^;]+);/.exec(body);
    out.push({ subset, url: url[1], range: range ? range[1].trim() : null });
    at = block.lastIndex;
  }
  return out;
}

function latin(css: string): Face {
  const all = faces(css);
  const hit = all.find((f) => f.subset === "latin");
  if (!hit) throw new Error("no latin subset in css");
  return hit;
}

// WRITE

const sizes: [string, number][] = [];

async function save(name: string, data: Uint8Array | string) {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  await writeFile(join(OUT, name), bytes);
  sizes.push([name, bytes.byteLength]);
}

function magic(name: string, data: Uint8Array) {
  const tag = String.fromCharCode(data[0], data[1], data[2], data[3]);
  if (tag !== "wOF2") throw new Error(`${name}: expected wOF2 magic, got ${JSON.stringify(tag)}`);
}

async function font(name: string, url: string): Promise<Uint8Array> {
  const data = await get(url);
  magic(name, data);
  await save(name, data);
  return data;
}

// FACES

function face(family: string, file: string, weight: string, display: string, range: string | null) {
  const lines = [
    "@font-face {",
    `  font-family: "${family}";`,
    "  font-style: normal;",
    `  font-weight: ${weight};`,
    `  src: url("${file}") format("woff2");`,
    `  font-display: ${display};`,
  ];
  if (range) lines.push(`  unicode-range: ${range};`);
  lines.push("}");
  return lines.join("\n");
}

// MAIN

async function main() {
  await mkdir(OUT, { recursive: true });
  const sheet: string[] = [];

  const sans = latin(await text(`${CSS2}?family=Noto+Sans:wght@400..700`));
  await font("sans.woff2", sans.url);
  sheet.push(face("Noto Sans", "sans.woff2", "400 700", "swap", sans.range));

  const mono = latin(await text(`${CSS2}?family=Noto+Sans+Mono:wght@400..700`));
  await font("mono.woff2", mono.url);
  sheet.push(face("Noto Sans Mono", "mono.woff2", "400 700", "swap", mono.range));

  const emoji = faces(await text(`${CSS2}?family=Noto+Color+Emoji`));
  for (const [i, shard] of emoji.entries()) {
    const name = `emoji.${i}.woff2`;
    await font(name, shard.url);
    sheet.push(face("Noto Color Emoji", name, "400", "swap", shard.range));
  }

  let subset = true;
  try {
    const css = await text(`${CSS2}?family=${ICON_AXES}&icon_names=${[...ICONS].sort().join(",")}`);
    await font("icons.woff2", faces(css)[0].url);
  } catch (err) {
    subset = false;
    console.log(`icons subset failed (${err}); falling back to the full variable font`);
    await font("icons.woff2", ICON_FULL);
  }
  sheet.push(face("Material Symbols Outlined", "icons.woff2", "400", "block", null));

  await save("fonts.css", sheet.join("\n\n") + "\n");
  await save("icons.json", JSON.stringify(ICONS, null, 2) + "\n");

  await save("LICENSE-sans.txt", await get(`${OFL}/notosans/OFL.txt`));
  await save("LICENSE-mono.txt", await get(`${OFL}/notosansmono/OFL.txt`));
  await save("LICENSE-emoji.txt", await get(`${OFL}/notocoloremoji/OFL.txt`));
  await save("LICENSE-icons.txt", await get(APACHE));

  const width = Math.max(...sizes.map(([name]) => name.length));
  for (const [name, n] of sizes) console.log(`public/fonts/${name.padEnd(width)}  ${n} bytes`);
  console.log(`icons: ${ICONS.length} names, ${subset ? "subset" : "FULL FONT (subset failed)"}`);
}

main();
