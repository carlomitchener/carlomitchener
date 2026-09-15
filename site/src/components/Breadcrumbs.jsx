import { Icon } from "./Icon.jsx";

export function Breadcrumbs({ trail }) {
  if (!trail.length) return null;
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol>
        {trail.map((one, i) => (
          <li key={one.href ?? one.name}>
            {i ? <Icon name="chevron_right" extra="small" /> : null}
            {one.href && i < trail.length - 1 ? <a href={one.href}>{one.name}</a> : <span aria-current="page">{one.name}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
