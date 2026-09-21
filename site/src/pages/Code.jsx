export function Code({ body }) {
  return (
    <div className="wrap">
      <div id="code" className="git" dangerouslySetInnerHTML={{ __html: body }}></div>
    </div>
  );
}
