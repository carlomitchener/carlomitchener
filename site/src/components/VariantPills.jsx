export function VariantPills({ sizes, picked }) {
  if (sizes.length < 2) return null;
  return (
    <div className="pick">
      <p className="fine" id="size">
        Size
      </p>
      <div className="sizes" role="group" aria-labelledby="size" data-sizes>
        {sizes.map((size) => (
          <button type="button" key={size.id} data-variant={size.id} data-price={size.price} data-size={size.size} aria-pressed={size.id === picked ? "true" : "false"}>
            {size.size}
          </button>
        ))}
      </div>
    </div>
  );
}
