export function VariantPills({ variants, picked, onPick }) {
  if (variants.length < 2) return null;
  return (
    <div className="pick">
      <p className="fine" id="size">
        Size
      </p>
      <div className="sizes" role="group" aria-labelledby="size">
        {variants.map((variant) => (
          <button type="button" key={variant.id} aria-pressed={variant.size === picked ? "true" : "false"} onClick={() => onPick(variant.size)}>
            {variant.size}
          </button>
        ))}
      </div>
    </div>
  );
}
