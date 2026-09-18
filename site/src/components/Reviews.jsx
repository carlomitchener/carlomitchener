import { Icon } from "./Icon.jsx";

export function Reviews({ review, printful }) {
  if (!review || review.status !== "ok") return null;
  const full = Math.round(review.rating);
  const stars = "★".repeat(full) + "☆".repeat(5 - full);
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
            <span aria-hidden="true">{stars}</span> {`${review.rating.toFixed(1)} from ${count} ${review.count === 1 ? "review" : "reviews"}`}
          </a>
        </p>
        <p className="fine">{`Printful's customers wrote these about the blank ${review.title}, not about this design or this shop. Tap the rating to read them on Printful.`}</p>
      </div>
    </details>
  );
}
