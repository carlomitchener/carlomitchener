import { Icon } from "./Icon.jsx";

function Stars({ rating }) {
  const steps = Math.min(10, Math.max(0, Math.round(rating * 2)));
  const full = Math.floor(steps / 2);
  const half = steps % 2;
  return (
    <span className="stars" aria-hidden="true">
      {Array.from({ length: full }, (_, i) => (
        <Icon key={`full-${i}`} name="star" extra="lit" />
      ))}
      {half ? <Icon name="star_half" extra="lit" /> : null}
      {Array.from({ length: 5 - full - half }, (_, i) => (
        <Icon key={`none-${i}`} name="star" />
      ))}
    </span>
  );
}

export function Reviews({ review, printful }) {
  if (!review || review.status !== "ok") return null;
  const count = Number(review.count).toLocaleString("en-US");
  return (
    <details className="drop">
      <summary>
        <span>Reviews</span>
        <Icon name="expand_more" extra="small" />
      </summary>
      <div className="inside">
        <p className="fine">
          <a href={printful} rel="noopener" title={`${review.rating} out of 5 on Printful`}>
            <Stars rating={review.rating} /> {`${review.rating.toFixed(1)} from ${count} ${review.count === 1 ? "review" : "reviews"}`}
          </a>
        </p>
        <p className="fine">{`Printful's customers wrote these about the blank ${review.title}, not about this design or this shop. Tap the rating to read them on Printful.`}</p>
      </div>
    </details>
  );
}
