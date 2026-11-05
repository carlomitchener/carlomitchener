import { island } from "@mrlyprod/ui/kit/island.tsx";
import { useEffect, useState } from "react";
import type { Data } from "./sums.ts";
import { load, SPAN, sums } from "./sums.ts";

const n = (v: number) => v.toLocaleString("en-US");

export function Stats() {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    load().then(setData, () => setFailed(true));
  }, []);
  if (failed) return <p className="sub">No stats yet.</p>;
  if (!data) return <p className="sub">Loading</p>;
  const { visitors, views, countries, bars } = sums(data.days);
  const tall = Math.max(1, ...bars.map((bar) => bar.views));
  const rows = [
    [`Visitors, last ${SPAN} days`, n(visitors)],
    [`Page views, last ${SPAN} days`, n(views)],
    ["Top countries", countries.join(", ") || "None yet"],
    ["Last updated", data.updated],
  ];
  return (
    <section className="world">
      <h1>Stats</h1>
      <p className="reads">Updated at each deploy, not live.</p>
      <div className="panel">
        <table>
          <tbody>
            {rows.map(([key, value]) => (
              <tr key={key}>
                <th scope="row">{key}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div
          role="img"
          aria-label="Page views per day"
          style={{ display: "flex", alignItems: "end", gap: 2, height: 96 }}
        >
          {bars.map((bar) => (
            <span
              key={bar.date}
              title={`${bar.date}: ${n(bar.views)}`}
              style={{
                flex: 1,
                height: `${(100 * bar.views) / tall}%`,
                minHeight: 2,
                maxWidth: 16,
                background: "var(--accent)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export const { mount, unmount } = island((host) => {
  const still = host.nextElementSibling;
  still?.remove();
  return { node: <Stats />, close: () => still && host.after(still) };
});
