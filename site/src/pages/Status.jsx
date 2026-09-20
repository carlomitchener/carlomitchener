import { Fragment, useEffect, useState } from "react";
import { ProductGrid } from "../components/ProductGrid.jsx";

const EVERY = 60 * 1000;

const LINE = /^(\S+)\s+(DEBUG|INFO|WARNING|ERROR|CRITICAL)\s+(.*)$/;

const when = (seconds) => (seconds ? new Date(seconds * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "never");

const ago = (seconds) => {
  if (!seconds) return "never";
  const gap = Math.max(0, Math.floor(Date.now() / 1000 - seconds));
  if (gap < 90) return `${gap} s ago`;
  if (gap < 5400) return `${Math.round(gap / 60)} min ago`;
  if (gap < 172800) return `${(gap / 3600).toFixed(1)} h ago`;
  return `${Math.round(gap / 86400)} d ago`;
};

const bytes = (n) => (n == null ? "" : n < 1e6 ? `${(n / 1e3).toFixed(0)} kB` : n < 1e9 ? `${(n / 1e6).toFixed(1)} MB` : `${(n / 1e9).toFixed(2)} GB`);

async function grab(path) {
  try {
    const reply = await fetch(path, { cache: "no-store" });
    return reply.ok ? await reply.json() : null;
  } catch {
    return null;
  }
}

function Rows({ list }) {
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

function Code({ lines }) {
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

function Automator({ data }) {
  if (!data) return <p className="fine">No status file yet.</p>;
  const task = data.task;
  const waiting = task?.metadata?.waiting_since;
  return (
    <Rows
      list={[
        ["Last tick", `${ago(data.at)} (${when(data.at)}), ${data.seconds} s${data.error ? `, ${data.error}` : ""}`],
        ["Design", data.design ? `${data.design.key}, ${data.design.group} ${data.design.edition} ${data.design.scheme}, with ${data.design.secondary.join(", ")}, ${ago(data.design.created_at)}` : "none"],
        ["Task", task ? `${task.key} at ${task.step}, ${task.mockups} mockups, ${task.variants} variants, started ${ago(task.created_at)}${waiting ? `, waiting ${ago(waiting).replace(" ago", "")}` : ""}` : "idle"],
        ["Counters", task ? JSON.stringify(task.metadata) : ""],
        ["Batch", data.batch ? `${data.batch.open} open, ${data.batch.used} used, ${data.batch.dropped} dropped, tiles ${Object.keys(data.batch.tiles ?? {}).join(" ") || "none"}${Object.keys(data.batch.strikes ?? {}).length ? `, strikes ${Object.entries(data.batch.strikes ?? {}).map(([id, n]) => `${id}x${n}`).join(" ")}` : ""}` : "no batch"],
        ["Live", `${data.live.products} products in ${data.live.batches} batches, ${data.live.expiring} expiring within a day, newest ${ago(data.live.newest)}, oldest ${ago(data.live.oldest)}`],
      ]}
    />
  );
}

function Cloud({ data }) {
  if (!data) return <p className="fine">No stats file yet.</p>;
  return (
    <>
      <Rows
        list={[
          ["Stats", `${ago(data.at)}, last ${data.hours} h`],
          ["CDN", data.cdn.requests == null ? "no distribution" : `${data.cdn.requests} requests, ${bytes(data.cdn.bytes)}, ${data.cdn.error_4xx}% 4xx, ${data.cdn.error_5xx}% 5xx`],
          ["Bucket", `${data.bucket.site_objects} site files (${bytes(data.bucket.site_bytes)}), ${data.bucket.data_objects} data files (${bytes(data.bucket.data_bytes)})`],
          ["Shop", `${data.bucket.products} live products, ${data.bucket.designs} designs on the CDN, ${data.bucket.posts} posts`],
        ]}
      />
      <Rows list={Object.entries(data.lambdas).map(([name, one]) => [name, `${one.invocations} runs, ${one.errors} errors, ${one.throttles} throttles, ${Math.round(one.duration_ms)} ms avg`])} />
    </>
  );
}

function Errors({ data }) {
  const found = Object.entries(data?.errors ?? {}).flatMap(([name, list]) => list.map((one) => `${one.at ?? "sometime"} ${one.level} ${name} ${one.message}`));
  return found.length ? <Code lines={found} /> : <p className="fine">None in the window.</p>;
}

export function Status({ pending = [], now }) {
  const [seen, setSeen] = useState(null);

  useEffect(() => {
    let live = true;
    let timer = 0;
    const refresh = async () => {
      const [auto, stats] = await Promise.all([grab("/status/automator.json"), grab("/status/stats.json")]);
      if (live) setSeen({ auto, stats });
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
  }, []);

  return (
    <div className="wrap">
      {pending.length ? (
        <section className="batch">
          <h2>{`Batch ${pending[0].design}: ${pending.length} of the pairs so far`}</h2>
          <ProductGrid products={pending} now={now} />
        </section>
      ) : null}
      <article className="doc status narrow">
        <h1>Status</h1>
        <p className="lead">
          The automator, the CDN and the Lambdas, read from the bucket every minute. Raw: <a href="/status/automator.json">automator.json</a>, <a href="/status/stats.json">stats.json</a>, <a href="/cdn/feed/index.json">feed</a>.
        </p>
        <section>
          <h2>Automator</h2>
          {seen ? <Automator data={seen.auto} /> : <p className="fine">Loading</p>}
        </section>
        <section>
          <h2>Cloud</h2>
          {seen ? <Cloud data={seen.stats} /> : <p className="fine">Loading</p>}
        </section>
        <section>
          <h2>Errors</h2>
          {seen ? <Errors data={seen.stats} /> : <p className="fine">Loading</p>}
        </section>
        <section>
          <h2>Log</h2>
          {!seen ? <p className="fine">Loading</p> : seen.auto?.log?.length ? <Code lines={seen.auto.log.slice(-120)} /> : <p className="fine">No log yet.</p>}
        </section>
      </article>
    </div>
  );
}
