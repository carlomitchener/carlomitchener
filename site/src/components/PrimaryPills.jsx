import { PRIMARIES, primaryName } from "../lib/shop.ts";

export function PrimaryPills({ picked }) {
  return (
    <div className="pick">
      <p className="fine" id="primary">
        Primary
      </p>
      <div className="sizes primaries" role="group" aria-labelledby="primary" data-primaries>
        {PRIMARIES.map((primary) => (
          <button type="button" key={primary} data-primary={primary} aria-pressed={primary === picked ? "true" : "false"}>
            {primaryName(primary)}
          </button>
        ))}
      </div>
    </div>
  );
}
