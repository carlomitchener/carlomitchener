export function Code({ body }) {
  return (
    <div className="wrap">
      <div id="code" className="git" data-body dangerouslySetInnerHTML={{ __html: body }}></div>
    </div>
  );
}
