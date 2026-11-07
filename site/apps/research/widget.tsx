import type { Site } from "site:routes";
import { index, resolve } from "mrly-git/links.ts";
import { Btn, Icon } from "mrly-kit/controls.tsx";
import { Bar, usePanes } from "mrly-kit/frame.tsx";
import { state } from "mrly-kit/history.ts";
import { Item, Library, Shelf } from "mrly-kit/library.tsx";
import { COPY, library, Reader, rule, useCopy } from "mrly-kit/reader.tsx";
import { front, reader } from "mrly-md/md.ts";
import type { Drawn } from "mrly-shell/figures.ts";
import { Figure, Grid, Lede, Lost } from "mrly-shell/parts.tsx";
import { named } from "mrly-shell/route.ts";
import type { Row } from "mrly-shell/rows.ts";
import { useEffect, useRef, useState } from "react";
import { cards, codeOf, hrefOf, many, ROOT, shelf, slugOf, sourceOf } from "./scene.ts";
import type { Topic } from "./topics.ts";

export type GalleryProps = { names?: string[] };

export type NoteProps = { topic: Topic; html: string | false | null };

export type Props = { rows: Row[]; site: Pick<Site, "title" | "root" | "menu">; draw: () => Promise<Drawn> };

type Made = { slug: string; html: string | false };

const TOPICS = "/research.json";

const NONE = index([]);

let listed: Promise<Topic[]> | null = null;

function topics() {
  listed ??= fetch(TOPICS)
    .then((reply) =>
      reply.ok ? reply.json() : Promise.reject(new Error(`research: ${TOPICS} answered ${reply.status}`)),
    )
    .then((data: { topics: Topic[] }) => data.topics);
  listed.catch(() => (listed = null));
  return listed;
}

async function read(slug: string, title: string) {
  const source = sourceOf(slug);
  const reply = await fetch(`/raw/${source}`);
  if (!reply.ok) throw new Error(`research: /raw/${source} answered ${reply.status}`);
  const { body } = front(await reply.text());
  const text = /^#\s/.test(body.trimStart()) ? body : `# ${title}\n\n${body}`;
  return (await reader()).markdown(text, { lazy: true, link: (url) => resolve(source, url, NONE) });
}

const go = (href: string) => dispatchEvent(new CustomEvent("go", { detail: href }));

export function Gallery({ names = [] }: GalleryProps) {
  if (!names.length) return null;
  return (
    <section className="gallery grid" aria-label="Figures">
      {names.map((name) => (
        <div className="tile" key={name}>
          <Figure name={name} label={name} caption={name} />
        </div>
      ))}
    </section>
  );
}

function Note({ topic, html }: NoteProps) {
  if (html === false)
    return (
      <article className="prose">
        <p>
          This topic did not load. <a href={codeOf(topic.slug)}>Read it in the code viewer</a>.
        </p>
      </article>
    );
  if (!html) return null;
  return (
    <>
      <article className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      <Gallery names={topic.figures} />
    </>
  );
}

export function Widget({ rows, site, draw }: Props) {
  const [path, setPath] = useState(() => location.pathname);
  const [list, setList] = useState<Topic[] | false | null>(null);
  const [find, setFind] = useState("");
  const [note, setNote] = useState<Made | null>(null);
  const [copied, copy] = useCopy();
  const panes = usePanes();
  const box = useRef<HTMLDivElement>(null);
  const row = rows.find((one) => one.route === ROOT)!;
  const slug = slugOf(path);
  const topic = list && slug ? list.find((one) => one.slug === slug) : null;
  const lost = Boolean(list && slug && !topic);
  const hits = list ? shelf(list, find) : [];
  const html = topic && note?.slug === topic.slug ? note.html : null;

  useEffect(() => {
    topics().then(setList, (error: unknown) => {
      console.error(error);
      setList(false);
    });
  }, []);

  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!a || a.target || a.hasAttribute("download") || a.origin !== location.origin || !a.pathname.startsWith(ROOT))
        return;
      if (a.hash && a.pathname === location.pathname) return;
      e.preventDefault();
      if (a.pathname === location.pathname) return;
      history.pushState({ depth: (state().depth ?? 0) + 1 }, "", a.pathname);
      setPath(a.pathname);
    };
    const pop = () => {
      if (location.pathname.startsWith(ROOT)) setPath(location.pathname);
    };
    document.addEventListener("click", click);
    addEventListener("popstate", pop);
    return () => {
      document.removeEventListener("click", click);
      removeEventListener("popstate", pop);
    };
  }, []);

  useEffect(() => {
    const base = named(row, site);
    document.title = topic ? `${topic.title} · ${base}` : base;
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", site.root + path);
  }, [path, topic]);

  useEffect(() => {
    box.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [slug]);

  useEffect(() => {
    if (!topic) return undefined;
    let on = true;
    read(topic.slug, topic.title).then(
      (made) => on && setNote({ slug: topic.slug, html: made }),
      (error: unknown) => {
        console.error(error);
        if (on) setNote({ slug: topic.slug, html: false });
      },
    );
    return () => {
      on = false;
    };
  }, [topic]);

  useEffect(() => {
    if (!lost) return undefined;
    const robots = Object.assign(document.createElement("meta"), { name: "robots", content: "noindex" });
    document.head.append(robots);
    return () => robots.remove();
  }, [lost]);

  useEffect(() => {
    const at = box.current?.closest(".frame") ?? box.current;
    if (list && at) draw().then((one) => one.scan(at));
  }, [list, find, html, panes.nodes.left]);

  useEffect(() => {
    const body = panes.nodes.left;
    const on = body?.querySelector('[aria-current="true"]');
    if (!on) return;
    const item = on.getBoundingClientRect();
    const view = body!.getBoundingClientRect();
    if (item.top < view.top || item.bottom > view.bottom)
      body!.scrollTop += item.top - view.top - (view.height - item.height) / 2;
  }, [slug, list, panes.nodes.left]);

  const code = () => topic && go(codeOf(topic.slug));
  const menus = [
    { name: "File", items: rule([COPY], topic ? [{ label: "Open in Code", act: "code" }] : []) },
    { name: "View", items: rule([library(panes)], [{ label: "All Topics", href: ROOT }]) },
    { name: "Help", items: [{ label: "Method", href: "/method/" }] },
  ];
  const run = (act: string) => (act === "copy" ? copy() : act === "code" ? code() : undefined);

  return (
    <Reader title={row.title} menus={menus} run={run} panes={panes}>
      <div className="page" ref={box}>
        {lost && <Lost site={site} rows={rows} />}
        {!slug && (
          <Lede id="research" title={row.title} lead={row.lead}>
            {list === false && <p>The topics did not load. Reload to try again.</p>}
          </Lede>
        )}
        {!slug && list && <Grid nodes={cards(list)} />}
        {topic && <Note topic={topic} html={html} />}
      </div>
      <Library name="Topics" find={find} onFind={setFind}>
        <Shelf>
          {hits.map((one) => (
            <Item
              key={one.slug}
              href={hrefOf(one.slug)}
              label={one.title}
              sub={one.date}
              on={one.slug === slug}
              art={one.figure ? <Figure name={one.figure} /> : undefined}
            />
          ))}
        </Shelf>
      </Library>
      <Bar side="actions">
        <Btn className="share" onClick={copy}>
          <Icon name="share" />
          Share
        </Btn>
        {topic && (
          <Btn className="code" onClick={code}>
            Code
          </Btn>
        )}
      </Bar>
      <Bar side="status">
        {topic && <span>{topic.date}</span>}
        {topic && <span className="out">{many(topic.figures.length, "figure")}</span>}
        {!slug && list && <span>{many(list.length, "topic")}</span>}
        {copied && <span>link copied</span>}
      </Bar>
    </Reader>
  );
}
