import { useEffect, useRef, useState } from "react";
import { add } from "../lib/cart.ts";

const HELD = 1500;

export function AddToBag({ line, disabled = false }) {
  const [added, setAdded] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      className="pill go wide"
      type="button"
      disabled={disabled}
      onClick={() => {
        add(line);
        setAdded(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setAdded(false), HELD);
      }}
    >
      {added ? "Added" : "Add to Bag"}
    </button>
  );
}
