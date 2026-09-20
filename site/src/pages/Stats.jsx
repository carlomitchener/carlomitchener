import { Code, Rows, Waiting, ago, bytes, useMirror } from "../components/Mirror.jsx";

function Cloud({ data }) {
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

export function Stats() {
  const seen = useMirror("/stats/stats.json");
  const data = seen?.data ?? null;
  const found = Object.entries(data?.errors ?? {}).flatMap(([name, list]) => list.map((one) => `${one.at ?? "sometime"} ${one.level} ${name} ${one.message}`));

  return (
    <div className="wrap">
      <article className="doc status narrow">
        <h1>Stats</h1>
        <p className="lead">
          The CDN, the Lambdas and the bucket, read from the bucket every minute. Raw: <a href="/stats/stats.json">stats.json</a>, <a href="/cdn/feed/index.json">feed</a>. The shop's own tick lives on <a href="/automator/">automator</a>.
        </p>
        <section>
          <h2>Cloud</h2>
          {data ? <Cloud data={data} /> : <Waiting seen={seen} />}
        </section>
        <section>
          <h2>Errors</h2>
          {found.length ? <Code lines={found} /> : data ? <p className="fine">None in the window.</p> : <Waiting seen={seen} />}
        </section>
      </article>
    </div>
  );
}
