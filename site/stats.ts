import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const HERE = import.meta.dir;
const OUT = join(HERE, "public", "stats.json");
const ENV = join(resolve(HERE, ".."), ".env");
const KEY = "CLOUDFLARE_STATS_TOKEN";
const ZONE = "carlomitchener.com";
const API = "https://api.cloudflare.com/client/v4";
const FETCH = 365;

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

type Day = { date: string };

type Reply = {
  errors?: { message: string }[];
  result?: { id: string }[];
  data?: {
    viewer: {
      zones: {
        httpRequests1dGroups: { dimensions: { date: string }; uniq: { uniques: number }; sum: object }[];
      }[];
    };
  };
};

export function token() {
  if (process.env[KEY]) return process.env[KEY];
  if (!existsSync(ENV)) return undefined;
  return readFileSync(ENV, "utf8").match(new RegExp(`^${KEY}=["']?([^"'\\n]+)`, "m"))?.[1];
}

async function call(auth: string, path: string, body?: object): Promise<Reply> {
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${auth}`, "content-type": "application/json" },
    body: body && JSON.stringify(body),
  });
  const json = (await res.json()) as Reply;
  const errors = json.errors?.length ? json.errors : res.ok ? null : [{ message: res.statusText }];
  if (errors) throw new Error(`stats: ${path} ${errors.map((e) => e.message).join("; ")}`);
  return json;
}

export async function fetchDays(auth: string) {
  const zone = (await call(auth, `/zones?name=${ZONE}`)).result?.[0]?.id;
  if (!zone) throw new Error(`stats: no zone ${ZONE} for this token`);
  const since = new Date(Date.now() - (FETCH - 1) * 86400000).toISOString().slice(0, 10);
  const reply = await call(auth, "/graphql", { query: QUERY, variables: { zone, since } });
  const groups = reply.data?.viewer.zones[0]?.httpRequests1dGroups ?? [];
  return groups.map(({ dimensions, uniq, sum }) => ({ date: dimensions.date, uniques: uniq.uniques, ...sum }));
}

export function merge(old: Day[], fresh: Day[]) {
  const all = new Map(old.map((day) => [day.date, day]));
  for (const day of fresh) all.set(day.date, day);
  return [...all.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function serialise(days: Day[], updated: string) {
  return `{"zone":"${ZONE}","updated":"${updated}","days":[\n${days.map((day) => JSON.stringify(day)).join(",\n")}\n]}\n`;
}

if (import.meta.main) {
  const auth = token();
  if (!auth) console.log(`stats: no ${KEY}, stats.json left as is`);
  else {
    try {
      const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")).days : [];
      const days = merge(old, await fetchDays(auth));
      const updated = `${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`;
      writeFileSync(OUT, serialise(days, updated));
      console.log(`stats: stats.json updated, ${days.length} days`);
    } catch (error) {
      console.warn(`${(error as Error).message}; stats.json left as is`);
    }
  }
}
