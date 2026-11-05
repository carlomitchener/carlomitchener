export type Day = {
  date: string;
  uniques: number;
  pageViews: number;
  countryMap: { clientCountryName: string; requests: number }[];
};

export type Data = { updated: string; days: Day[] };

export type Sums = {
  visitors: number;
  views: number;
  countries: string[];
  bars: { date: string; views: number }[];
};

export const SPAN = 30;
export const TOP = 3;
const SKIP = new Set(["XX", "T1"]);

const total = (days: Day[], key: "uniques" | "pageViews") => days.reduce((n, day) => n + day[key], 0);

export function countries(days: Day[], top = TOP): string[] {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const count = new Map<string, number>();
  for (const day of days)
    for (const row of day.countryMap)
      count.set(row.clientCountryName, (count.get(row.clientCountryName) ?? 0) + row.requests);
  return [...count]
    .filter(([code]) => !SKIP.has(code))
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([code]) => names.of(code) ?? code);
}

export function sums(days: Day[], span = SPAN): Sums {
  const recent = days.slice(-span);
  return {
    visitors: total(recent, "uniques"),
    views: total(recent, "pageViews"),
    countries: countries(recent),
    bars: recent.map((day) => ({ date: day.date, views: day.pageViews })),
  };
}

export async function load(url = "/stats.json"): Promise<Data> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`stats: ${url} answered ${res.status}`);
  return (await res.json()) as Data;
}
