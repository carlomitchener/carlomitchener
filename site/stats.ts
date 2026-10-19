import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, SITE } from "./build.ts";

/* WHERE */

const README = join(REPO, "README.md");
const JSON_FILE = join(SITE, "public", "stats.json");
const ENV = join(REPO, ".env");
const KEY = "CLOUDFLARE_STATS_TOKEN";
const ZONE = "carlomitchener.com";
const ORIGIN = "https://carlomitchener.com";
const API = "https://api.cloudflare.com/client/v4";
const FETCH = 365;
const DAYS = 30;
const TOP = 3;
const SECTION = /## Stats\n\n(?:\|.*\n)+\n(?:.*\[View all\].*\n\n)?/;
const CLOSER = /^Thank you, come again!/m;

/* CLOUDFLARE */

export function token() {
  if (process.env[KEY]) return process.env[KEY];
  if (!existsSync(ENV)) return undefined;
  return readFileSync(ENV, "utf8").match(new RegExp(`^${KEY}=["']?([^"'\\n]+)`, "m"))?.[1];
}

export async function call(auth: string, path: string, body?: object) {
  const res = await fetch(`${API}${path}`, { method: body ? "POST" : "GET", headers: { authorization: `Bearer ${auth}`, "content-type": "application/json" }, body: body && JSON.stringify(body) });
  const json = (await res.json()) as any;
  const errors = json.errors?.length ? json.errors : res.ok ? null : [{ message: res.statusText }];
  if (errors) throw new Error(`stats: ${path} ${errors.map((e: any) => e.message).join("; ")}`);
  return json;
}

const QUERY = `query ($zone: String!, $since: Date!) {
  viewer { zones(filter: { zoneTag: $zone }) {
    httpRequests1dGroups(limit: ${FETCH + 1}, filter: { date_geq: $since }, orderBy: [date_ASC]) {
      dimensions { date }
      uniq { uniques }
      sum {
        requests bytes cachedRequests cachedBytes pageViews threats
        countryMap { clientCountryName requests bytes threats }
        responseStatusMap { edgeResponseStatus requests }
        contentTypeMap { edgeResponseContentTypeName requests bytes }
        browserMap { uaBrowserFamily pageViews }
        clientHTTPVersionMap { clientHTTPProtocol requests }
        clientSSLMap { clientSSLProtocol requests }
        ipClassMap { ipType requests }
        threatPathingMap { threatPathingName requests }
      }
    }
  } }
}`;

const day = (offset: number) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
const now = () => new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

export async function fetchDays(auth: string) {
  const zone = (await call(auth, `/zones?name=${ZONE}`)).result?.[0]?.id;
  if (!zone) throw new Error(`stats: no zone ${ZONE} for this token`);
  const groups = (await call(auth, "/graphql", { query: QUERY, variables: { zone, since: day(FETCH - 1) } })).data.viewer.zones[0]?.httpRequests1dGroups ?? [];
  return groups.map(({ dimensions, uniq, sum }: any) => ({ date: dimensions.date, uniques: uniq.uniques, ...sum }));
}

/* STATS.JSON */

export function merge(old: any[], fresh: any[]) {
  const all = new Map(old.map((d) => [d.date, d]));
  for (const d of fresh) all.set(d.date, d);
  return [...all.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function serialise(days: any[], updated: string) {
  return `{"zone":"${ZONE}","updated":"${updated}","days":[\n${days.map((d) => JSON.stringify(d)).join(",\n")}\n]}\n`;
}

/* README */

export function summary(days: any[], updated: string) {
  const recent = days.filter((d) => d.date >= day(DAYS - 1));
  const countries = new Map<string, number>();
  for (const d of recent) for (const c of d.countryMap) countries.set(c.clientCountryName, (countries.get(c.clientCountryName) ?? 0) + c.requests);
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return {
    visitors: recent.reduce((n, d) => n + d.uniques, 0),
    views: recent.reduce((n, d) => n + d.pageViews, 0),
    top: [...countries].filter(([code]) => code !== "XX" && code !== "T1").sort((a, b) => b[1] - a[1]).slice(0, TOP).map(([code]) => names.of(code) ?? code),
    updated,
  };
}

export function section(s: ReturnType<typeof summary>) {
  const n = (v: number) => v.toLocaleString("en-US");
  const rows = [[`Visitors, last ${DAYS} days`, n(s.visitors)], [`Page views, last ${DAYS} days`, n(s.views)], ["Top countries", s.top.join(", ") || "None yet"], ["Last updated", s.updated]];
  return `## Stats\n\n| | |\n|---|---|\n${rows.map(([k, v]) => `| ${k} | ${v} |`).join("\n")}\n\nUpdated at each deploy, not live. [View all](${ORIGIN}/stats.json)\n\n`;
}

export function place(md: string, block: string) {
  if (SECTION.test(md)) return md.replace(SECTION, block);
  if (CLOSER.test(md)) return md.replace(CLOSER, `${block}$&`);
  throw new Error("stats: README has no Stats section and no closing line");
}

if (import.meta.main) {
  const auth = token();
  if (!auth) console.log(`stats: no ${KEY}, README and stats.json left as is`);
  else {
    try {
      const old = existsSync(JSON_FILE) ? JSON.parse(readFileSync(JSON_FILE, "utf8")).days : [];
      const days = merge(old, await fetchDays(auth));
      const updated = now();
      writeFileSync(JSON_FILE, serialise(days, updated));
      writeFileSync(README, place(readFileSync(README, "utf8"), section(summary(days, updated))));
      console.log(`stats: README and stats.json updated, ${days.length} days`);
    } catch (error) {
      console.warn(`${(error as Error).message}; README and stats.json left as is`);
    }
  }
}
