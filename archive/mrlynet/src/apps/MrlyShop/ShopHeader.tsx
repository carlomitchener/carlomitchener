import { useState, useEffect } from "react";
import { BorderBox, GridBox, LinkBox } from "../../components/System";
import { MrlyIcon } from "../../components/MrlyIcon";
import { loadCart, getCartCount } from "./cart";

interface ShopHeaderProps {
  leftIcon: string;
  leftActive?: boolean;
  homeActive?: boolean;
  cartActive?: boolean;
  onLeft: () => void;
  onHome: () => void;
  onCart: () => void;
}

export function ShopHeader({ leftIcon, leftActive, homeActive, cartActive, onLeft, onHome, onCart }: ShopHeaderProps) {
  const [cartCount, setCartCount] = useState(() => getCartCount(loadCart()));

  useEffect(() => {
    const update = () => setCartCount(getCartCount(loadCart()));
    window.addEventListener("mrly_cart_change", update);
    return () => window.removeEventListener("mrly_cart_change", update);
  }, []);

  const leftLabel = leftActive ? "menu" : leftIcon;
  const cartLabel = cartActive ? "cart" : cartCount > 0 ? String(cartCount) : "O";
  const homeLabel = homeActive ? "home" : "x";

  return (
    <BorderBox>
      <GridBox cols={3}>
        <LinkBox active={leftActive} onClick={onLeft}>
          <MrlyIcon text={leftLabel} />
        </LinkBox>
        <LinkBox active={homeActive} onClick={onHome}>
          <MrlyIcon text={homeLabel} />
        </LinkBox>
        <LinkBox active={cartActive} onClick={onCart}>
          <MrlyIcon text={cartLabel} />
        </LinkBox>
      </GridBox>
    </BorderBox>
  );
}
