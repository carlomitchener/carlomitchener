import { PRIMARIES, primaryName } from "../lib/shop.ts";

export function PrimaryPills({ picked, onPick }) {
  return (
    <div className="pick">
      <p className="fine" id="primary">
        Primary
      </p>
      <div className="sizes primaries" role="group" aria-labelledby="primary">
        {PRIMARIES.map((primary) => (
          <button type="button" key={primary} aria-pressed={primary === picked ? "true" : "false"} onClick={() => onPick(primary)}>
            {primaryName(primary)}
          </button>
        ))}
      </div>
    </div>
  );
}
