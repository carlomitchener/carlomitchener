import type { Topic } from "./topics.ts";

export type Note = Topic & { more: string; href: string };

let topics: Promise<Note[]> | null = null;

export function notes(): Promise<Note[]> {
  topics ??= fetch("/research.json")
    .then((reply) =>
      reply.ok ? reply.json() : Promise.reject(new Error(`research: /research.json answered ${reply.status}`)),
    )
    .then((data: { topics?: Topic[] }) =>
      (data.topics ?? []).map(
        (one): Note => ({
          ...one,
          more: one.lead ?? "",
          href: `/research/${encodeURIComponent(one.slug)}/`,
        }),
      ),
    )
    .catch(() => {
      topics = null;
      return [];
    });
  return topics;
}
