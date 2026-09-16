import { juice, label } from "../lib/life.ts";

export function Life({ born, gate = false, bar = false, now = Date.now() }) {
  return (
    <span className={bar ? "life" : "life plain"} data-born={born} data-gate={gate ? "" : undefined}>
      <span data-label>{label(born, now)}</span>
      {bar ? (
        <span className="juice">
          <i data-juice style={{ width: `${juice(born, now).toFixed(1)}%` }}></i>
        </span>
      ) : null}
    </span>
  );
}
