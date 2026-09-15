export function NotFound() {
  return (
    <div className="wrap text">
      <section className="doc gone">
        <h1>404</h1>
        <p className="lead">That page is gone, or its moon has passed.</p>
        <p className="acts">
          <a className="pill go" href="/">
            Back home
          </a>
        </p>
      </section>
    </div>
  );
}
