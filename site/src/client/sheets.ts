declare const SHEETS: string;

const map = JSON.parse(SHEETS) as Record<string, string[]>;

const worn = () => new Set([...document.querySelectorAll("link[rel=stylesheet]")].map((one) => one.getAttribute("href")));

const pull = (href: string) =>
  new Promise<void>((done) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = link.onerror = () => done();
    document.head.append(link);
  });

export async function wear(kind: string) {
  const have = worn();
  await Promise.all((map[kind] ?? []).filter((href) => !have.has(href)).map(pull));
}
