export function Icon({ name, extra = "" }) {
  return (
    <span className={extra ? `icon ${extra}` : "icon"} aria-hidden="true">
      {name}
    </span>
  );
}
