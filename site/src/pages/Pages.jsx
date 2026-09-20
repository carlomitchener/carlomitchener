export function Pages({ groups }) {
  return (
    <div className="wrap text">
      <div className="page-head">
        <h1>Pages</h1>
        <p className="lead">Every route this site serves.</p>
      </div>
      {groups.map((group) => (
        <section key={group.name} className="routes-group" aria-labelledby={`routes-${group.name}`}>
          <h2 id={`routes-${group.name}`}>{group.name}</h2>
          <ul className="routes">
            {group.rows.map((row) => (
              <li key={row.href}>
                <span className="who">
                  <a href={row.href}>{row.name}</a>
                  <code>{row.href}</code>
                </span>
                <p>{row.note}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
