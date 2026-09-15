import { countdown, left, moonName, moonPath, phase } from "../lib/moon.ts";

export function Moon({ born, gate = false, now = Date.now() }) {
  const f = phase(born, now);
  const ms = left(born, now);
  return (
    <span className="moon" data-born={born} data-gate={gate ? "" : undefined} title={`${moonName(f)}, ${countdown(ms)} left`}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle cx="12" cy="12" r="10" className="dark" />
        <path d={moonPath(f)} className="lit" data-lit />
      </svg>
      <span className="mono" data-left>
        {countdown(ms)}
      </span>
    </span>
  );
}
