import { PRIMARIES, primaryName } from "../lib/shop.ts";

export function PrimaryPills({ picked }) {
  return (
    <div className="sizes primaries" role="group" aria-label="Primary" data-primaries>
      {PRIMARIES.map((primary) => (
        <button type="button" key={primary} data-primary={primary} aria-pressed={primary === picked ? "true" : "false"}>
          {primaryName(primary)}
        </button>
      ))}
    </div>
  );
}
