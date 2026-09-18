export function Status() {
  return (
    <div className="wrap narrow">
      <article className="doc status" data-status>
        <h1>Status</h1>
        <p className="lead">
          The automator, the CDN and the Lambdas, read from the bucket every minute. Raw: <a href="/status/automator.json">automator.json</a>, <a href="/status/stats.json">stats.json</a>, <a href="/cdn/feed/index.json">feed</a>.
        </p>
        <section data-automator>
          <h2>Automator</h2>
          <p className="fine">Loading</p>
        </section>
        <section data-cloud>
          <h2>Cloud</h2>
          <p className="fine">Loading</p>
        </section>
        <section data-errors>
          <h2>Errors</h2>
          <p className="fine">Loading</p>
        </section>
        <section data-log>
          <h2>Log</h2>
          <p className="fine">Loading</p>
        </section>
      </article>
    </div>
  );
}
