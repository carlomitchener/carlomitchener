import { useNow } from "../lib/hooks.ts";
import { juice, label } from "../lib/life.ts";

function Clock({ born, now }) {
  const words = label(born, now).split(" ");
  const head = words.shift();
  const end = words.length ? ` ${words.pop()}` : "";
  const trim = words.join(" ");
  return (
    <span>
      {head}
      {trim ? <span className="trim">{` ${trim}`}</span> : null}
      {end}
    </span>
  );
}

export function Life({ born, bar = false, now: built = 0 }) {
  const now = useNow(built);
  return (
    <span className={bar ? "life" : "life plain"}>
      <Clock born={born} now={now} />
      {bar ? (
        <span className="juice">
          <i style={{ width: `${juice(born, now).toFixed(1)}%` }}></i>
        </span>
      ) : null}
    </span>
  );
}
