import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { front, plain, summary } from "mrly-md/md.ts";

export type Topic = {
  slug: string;
  title: string;
  date: string;
  lead: string;
  figure: string | null;
  figures: string[];
};

export type Figure = { name: string; file: string };

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const folders = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((item) => item.isDirectory() && !item.name.startsWith("."))
        .map((item) => item.name)
        .sort()
    : [];

const stem = (name: string) => name.slice(0, -3);

const drawn = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((name) => name.endsWith(".ts") && !/\.(test|d)\.ts$/.test(name))
        .sort((a, b) => (stem(a) < stem(b) ? -1 : stem(a) > stem(b) ? 1 : 0))
    : [];

const lede = (text: string, max = 200) => {
  const all = summary(text, Infinity);
  if (all.length <= max) return all;
  const cut = all.slice(0, max + 1).lastIndexOf(". ");
  return cut > 0 ? all.slice(0, cut + 1) : summary(text, max);
};

export const figures = (at: string): Figure[] =>
  folders(at).flatMap((topic) =>
    drawn(join(at, topic, "figures")).map((name) => ({ name: stem(name), file: join(at, topic, "figures", name) })),
  );

export function topics(at: string, known: Set<string>): Topic[] {
  return folders(at)
    .filter((slug) => slug !== "shared" && existsSync(join(at, slug, "README.md")))
    .flatMap((slug) => {
      const { data } = front(readFileSync(join(at, slug, "README.md"), "utf8"));
      if (!data.title) return [];
      if (!SLUG.test(slug))
        throw new Error(`site: research/${slug} is not a slug; use lowercase words and digits joined by hyphens`);
      if (data.slug && data.slug !== slug)
        throw new Error(`site: research/${slug}/README.md names the slug ${data.slug}, and the folder is ${slug}`);
      if (data.figure && !known.has(data.figure))
        throw new Error(`site: research/${slug}/README.md uses the figure ${data.figure}, which no roster file draws`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date ?? ""))
        throw new Error(
          `site: research/${slug}/README.md dates itself ${data.date ?? "nowhere"}; its front matter needs a date, YYYY-MM-DD`,
        );
      return [
        {
          slug,
          title: data.title,
          date: data.date!,
          lead: data.lead ? lede(plain(data.lead)) : "",
          figure: data.figure || null,
          figures: drawn(join(at, slug, "figures"))
            .map(stem)
            .filter((name) => known.has(name)),
        },
      ];
    })
    .sort((a, b) => a.title.localeCompare(b.title) || a.slug.localeCompare(b.slug));
}

export const llms = (topics: Topic[], folder = "research") => ({
  name: "Research",
  lines: topics.length
    ? [
        { name: "Research", note: "", href: `/raw/${folder}/README.md` },
        ...topics.map((one) => ({ name: one.title, note: "", href: `/raw/${folder}/${one.slug}/README.md` })),
      ]
    : [],
});
