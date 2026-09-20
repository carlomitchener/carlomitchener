import { Fragment, useEffect, useState } from "react";

const EVERY = 60 * 1000;

const LINE = /^(\S+)\s+(DEBUG|INFO|WARNING|ERROR|CRITICAL)\s+(.*)$/;

export const when = (seconds) => (seconds ? new Date(seconds * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "never");

export const ago = (seconds) => {
  if (!seconds) return "never";
  const gap = Math.max(0, Math.floor(Date.now() / 1000 - seconds));
  if (gap < 90) return `${gap} s ago`;
  if (gap < 5400) return `${Math.round(gap / 60)} min ago`;
  if (gap < 172800) return `${(gap / 3600).toFixed(1)} h ago`;
  return `${Math.round(gap / 86400)} d ago`;
};

export const bytes = (n) => (n == null ? "" : n < 1e6 ? `${(n / 1e3).toFixed(0)} kB` : n < 1e9 ? `${(n / 1e6).toFixed(1)} MB` : `${(n / 1e9).toFixed(2)} GB`);

async function grab(path) {
  try {
    const reply = await fetch(path, { cache: "no-store" });
    return reply.ok ? await reply.json() : null;
  } catch {
    return null;
  }
}

export function useMirror(path) {
  const [seen, setSeen] = useState(null);

  useEffect(() => {
    let live = true;
    let timer = 0;
    const refresh = async () => {
      const data = await grab(path);
      if (live) setSeen({ data });
    };
    const run = () => {
      clearInterval(timer);
      if (document.hidden) return;
      void refresh();
      timer = setInterval(refresh, EVERY);
    };
    document.addEventListener("visibilitychange", run);
    run();
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", run);
    };
  }, [path]);

  return seen;
}

export function Waiting({ seen }) {
  return <p className="fine">{seen ? "No data yet." : "Loading"}</p>;
}

export function Rows({ list }) {
  return (
    <table>
      <tbody>
        {list.map(([name, value]) => (
          <tr key={name}>
            <th>{name}</th>
            <td>{String(value ?? "")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Code({ lines }) {
  return (
    <pre>
      <code>
        {lines.map((line, i) => {
          const hit = LINE.exec(line);
          return (
            <Fragment key={i}>
              {hit ? (
                <span className={hit[2].toLowerCase()}>
                  <span className="time">{hit[1]}</span> <span className="level">{hit[2].padEnd(7)}</span> <span className="text">{hit[3]}</span>
                </span>
              ) : (
                <span className="text">{line}</span>
              )}
              {i < lines.length - 1 ? "\n" : null}
            </Fragment>
          );
        })}
      </code>
    </pre>
  );
}
