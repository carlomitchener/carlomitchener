export type View = { page: { kind: string; title: string; props: Record<string, unknown> }; chrome: { route: string; catalog: unknown[]; fly: boolean; now: number } };

const BOX = /<script id="props"[^>]*>([^<]*)<\/script>/g;

const APP = '<div id="app"';

const MARK = " data-body";

function boxed(html: string): string | null {
  let last: string | null = null;
  BOX.lastIndex = 0;
  for (let hit = BOX.exec(html); hit; hit = BOX.exec(html)) last = hit[1] ?? null;
  return last;
}

function carve(html: string): string | null {
  const app = html.indexOf(APP);
  const mark = html.indexOf(MARK, app < 0 ? 0 : app);
  if (mark < 0) return null;
  const open = html.lastIndexOf("<", mark);
  const name = /^<([a-zA-Z][^\s/>]*)/.exec(html.slice(open, mark))?.[1];
  const head = html.indexOf(">", mark);
  if (!name || head < 0) return null;
  const tags = new RegExp(`</?${name}(?=[\\s/>])`, "g");
  tags.lastIndex = head + 1;
  let depth = 1;
  for (let hit = tags.exec(html); hit; hit = tags.exec(html)) {
    depth += hit[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(head + 1, hit.index);
  }
  return null;
}

export function read(html: string): View | null {
  const text = boxed(html);
  if (text === null) return null;
  let view: View;
  try {
    view = JSON.parse(text) as View;
  } catch {
    return null;
  }
  if (!view?.page || !view.chrome) return null;
  const body = carve(html);
  if (body !== null) view.page.props.body = body;
  return view;
}
