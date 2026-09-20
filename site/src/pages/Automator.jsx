import { Code, Rows, Waiting, ago, useMirror, when } from "../components/Mirror.jsx";
import { ProductGrid } from "../components/ProductGrid.jsx";

function Tick({ data }) {
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

export function Automator({ pending = [], now }) {
  const seen = useMirror("/automator/automator.json");
  const data = seen?.data ?? null;

  return (
    <div className="wrap">
      {pending.length ? (
        <section className="batch">
          <h2>{`Batch ${pending[0].design}: ${pending.length} of the pairs so far`}</h2>
          <ProductGrid products={pending} now={now} />
        </section>
      ) : null}
      <article className="doc status narrow">
        <h1>Automator</h1>
        <p className="lead">
          The automator, read from the bucket every minute. Raw: <a href="/automator/automator.json">automator.json</a>. The cloud numbers live on <a href="/stats/">stats</a>.
        </p>
        <section>
          <h2>Tick</h2>
          {data ? <Tick data={data} /> : <Waiting seen={seen} />}
        </section>
        <section>
          <h2>Log</h2>
          {data?.log?.length ? <Code lines={data.log.slice(-120)} /> : <Waiting seen={seen} />}
        </section>
      </article>
    </div>
  );
}
