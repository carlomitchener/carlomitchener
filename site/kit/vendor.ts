import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const CSS2 = "https://fonts.googleapis.com/css2";
const OFL = "https://raw.githubusercontent.com/google/fonts/main/ofl";

export type Family = {
  family: string;
  file: string;
  axes?: string;
  weight: string;
  display?: string;
  shards?: boolean;
  licence: string;
};

export type Icons = Family & { names: string[]; full: string };

export type Fonts = { out: string; faces: Family[]; icons?: Icons; keep?: string };

/* FETCH */

async function get(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function text(url: string): Promise<string> {
  return new TextDecoder().decode(await get(url));
}

const query = (one: Family) => `family=${one.family.replace(/ /g, "+")}${one.axes ? `:${one.axes}` : ""}`;

const licence = (name: string) => (/^https?:/.test(name) ? name : `${OFL}/${name}/OFL.txt`);

/* PARSE */

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

/* FACES */

function rule(family: string, file: string, weight: string, display: string, range: string | null) {
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

/* MAIN */

export async function main(root: string) {
  const config = JSON.parse(await readFile(join(root, "site.json"), "utf8")) as { fonts?: Fonts };
  const fonts = config.fonts;
  if (!fonts) throw new Error("vendor: site.json carries no fonts block");
  const out = resolve(root, fonts.out);
  await mkdir(out, { recursive: true });

  const sizes: [string, number][] = [];
  const save = async (name: string, data: Uint8Array | string) => {
    const body = typeof data === "string" ? new TextEncoder().encode(data) : data;
    await writeFile(join(out, name), body);
    sizes.push([name, body.byteLength]);
  };
  const font = async (name: string, url: string) => {
    const data = await get(url);
    const tag = String.fromCharCode(data[0], data[1], data[2], data[3]);
    if (tag !== "wOF2") throw new Error(`${name}: expected wOF2 magic, got ${JSON.stringify(tag)}`);
    await save(name, data);
  };

  const sheet: string[] = [];
  const licences: [string, string][] = [];

  for (const one of fonts.faces) {
    const css = await text(`${CSS2}?${query(one)}`);
    const display = one.display ?? "swap";
    if (one.shards) {
      for (const [i, shard] of faces(css).entries()) {
        const name = `${one.file}.${i}.woff2`;
        await font(name, shard.url);
        sheet.push(rule(one.family, name, one.weight, display, shard.range));
      }
    } else {
      const hit = latin(css);
      const name = `${one.file}.woff2`;
      await font(name, hit.url);
      sheet.push(rule(one.family, name, one.weight, display, hit.range));
    }
    licences.push([`LICENSE-${one.file}.txt`, licence(one.licence)]);
  }

  const icons = fonts.icons;
  let subset = true;
  if (icons) {
    const name = `${icons.file}.woff2`;
    try {
      const css = await text(`${CSS2}?${query(icons)}&icon_names=${[...icons.names].sort().join(",")}`);
      await font(name, faces(css)[0].url);
    } catch (err) {
      subset = false;
      console.log(`icons subset failed (${err}); falling back to the full variable font`);
      await font(name, icons.full);
    }
    sheet.push(rule(icons.family, name, icons.weight, icons.display ?? "block", null));
    licences.push([`LICENSE-${icons.file}.txt`, licence(icons.licence)]);
  }

  const kept = fonts.keep ? (await readFile(resolve(root, fonts.keep), "utf8")).trim() : "";
  await save("fonts.css", sheet.join("\n\n") + (kept ? `\n\n${kept}` : "") + "\n");
  if (icons) await save(`${icons.file}.json`, JSON.stringify(icons.names, null, 2) + "\n");
  for (const [name, url] of licences) await save(name, await get(url));

  const width = Math.max(...sizes.map(([name]) => name.length));
  for (const [name, n] of sizes) console.log(`${fonts.out}/${name.padEnd(width)}  ${n} bytes`);
  if (icons) console.log(`icons: ${icons.names.length} names, ${subset ? "subset" : "FULL FONT (subset failed)"}`);
}
