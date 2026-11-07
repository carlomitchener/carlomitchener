export type Step = { uri: string } | { redirect: string };

export function decide(uri: string): Step {
  if (uri.startsWith("/raw/")) return { uri };
  if (uri.startsWith("/git/")) return { uri: "/index.html" };
  const last = uri.slice(uri.lastIndexOf("/") + 1);
  if (last.includes(".")) return { uri };
  if (last === "") return { uri: "/index.html" };
  return { redirect: `${uri}/` };
}

export const join = (to: string, search: string) =>
  !search ? to : to.includes("?") ? `${to}&${search.slice(1)}` : to + search;

const TEXT = "text/plain; charset=utf-8";

const PASSIVE = /^(image\/(?!svg)|audio\/|video\/|font\/)|^application\/(pdf|wasm|gzip|zip)\b/;

export const raw = (type: string) => (PASSIVE.test(type) ? type : TEXT);

type Env = { ASSETS: { fetch: (request: Request) => Promise<Response> } };

const move = (location: string) => new Response(null, { status: 301, headers: { location } });

export async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.hostname.startsWith("www.")) {
    url.protocol = "https:";
    url.hostname = url.hostname.slice(4);
    return move(url.toString());
  }
  const step = decide(url.pathname);
  if ("redirect" in step) return move(join(step.redirect, url.search));
  url.pathname = step.uri;
  const answer = await env.ASSETS.fetch(new Request(url, request));
  if (!step.uri.startsWith("/raw/") || !answer.ok) return answer;
  const out = new Response(answer.body, answer);
  out.headers.set("content-type", raw(answer.headers.get("content-type") ?? ""));
  return out;
}

export default { fetch: (request: Request, env: Env) => handle(request, env) };
