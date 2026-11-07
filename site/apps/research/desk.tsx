import type { Desk } from "@mrlyprod/ui/kit/rows.ts";
import { app, KNOWN } from "@mrlyprod/ui/shell/catalog.ts";
import { useEffect, useState } from "react";
import { type Note, notes } from "./notes.ts";

function Research() {
  const [topics, setTopics] = useState<Note[] | null>(null);
  useEffect(() => {
    let on = true;
    notes().then((list) => on && setTopics(list));
    return () => {
      on = false;
    };
  }, []);
  const top = topics?.length
    ? [...topics].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.title.localeCompare(b.title))[0]
    : null;
  if (!top) {
    return (
      <a className="fill" href="/research/">
        <h2>Research</h2>
        <p className="dim">{topics ? "The notes are on their way." : ""}</p>
      </a>
    );
  }
  const kin = KNOWN.has(top.slug) ? app(top.slug) : null;
  const when = top.date
    ? new Date(`${top.date}T12:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "";
  const n = top.figures?.length ?? 0;
  return (
    <>
      <a className="fill" href={top.href}>
        <span className="visually-hidden">{top.title}</span>
      </a>
      <h2>Research{when ? ` · ${when}` : ""}</h2>
      <h3>{top.title}</h3>
      <p className="lead">{top.lead}</p>
      <p className="tags">
        {n > 0 && <span className="chip">{n === 1 ? "1 figure" : `${n} figures`}</span>}
        {kin && (
          <a className="chip" href={kin.route}>
            {kin.title} app
          </a>
        )}
      </p>
    </>
  );
}

export const widget: Desk = { name: "Research", size: "wide", Body: Research };
