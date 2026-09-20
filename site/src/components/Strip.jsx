import { Icon } from "./Icon.jsx";

export function Strip({ id, title, href, more, children }) {
  return (
    <div className="strip">
      <h2 id={id}>{title}</h2>
      {children}
      {href ? (
        <a href={href} className="fine">
          {more}
          <Icon name="chevron_right" extra="small" />
        </a>
      ) : null}
    </div>
  );
}
