export function Doc({ title, lead, body }) {
  return (
    <div className="wrap narrow">
      <article className="doc">
        <h1>{title}</h1>
        {lead ? <p className="lead" dangerouslySetInnerHTML={{ __html: lead }}></p> : null}
        {body ? <div className="prose" dangerouslySetInnerHTML={{ __html: body }}></div> : null}
      </article>
    </div>
  );
}
