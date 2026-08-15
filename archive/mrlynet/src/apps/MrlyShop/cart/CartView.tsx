import { useState, useCallback } from "react";
import { BorderBox, ListBox, InfoBox, LinkBox, OutBox, GridBox } from "../../../components/System";
import { useRouter } from "../../../router";
import {
  loadCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  getCartCount,
  getCartTotal,
  getCheckoutUrl,
} from "./cart";
import type { CartItem } from "./types";

function CartItemRow({
  item,
  onUpdate,
  onNavigate,
}: {
  item: CartItem;
  onUpdate: () => void;
  onNavigate: (handle: string) => void;
}) {
  const handleRemove = useCallback(() => {
    removeFromCart(item.variantId);
    onUpdate();
  }, [item.variantId, onUpdate]);

  const handleQuantity = useCallback(
    (quantity: number) => {
      updateQuantity(item.variantId, quantity);
      onUpdate();
    },
    [item.variantId, onUpdate]
  );

  const lineTotal = (parseFloat(item.price) * item.quantity).toFixed(2);

  return (
    <BorderBox>
      <ListBox>
        <img
          className="image"
          src={item.image}
          alt={item.handle}
          decoding="async"
          loading="lazy"
          onClick={() => onNavigate(item.handle)}
          style={{ cursor: "pointer" }}
        />
        <ListBox>
          <InfoBox>{`${item.title} (${item.handle})`}</InfoBox>
          <GridBox cols={2}>
            <InfoBox>{item.size}</InfoBox>
            <InfoBox>${parseFloat(item.price).toFixed(2)}</InfoBox>
          </GridBox>
          <GridBox cols={3}>
            <LinkBox onClick={() => handleQuantity(item.quantity - 1)}>-</LinkBox>
            <InfoBox>{item.quantity}</InfoBox>
            <LinkBox onClick={() => handleQuantity(item.quantity + 1)}>+</LinkBox>
          </GridBox>
          <GridBox cols={2}>
            <InfoBox>{`$${lineTotal}`}</InfoBox>
            <LinkBox onClick={handleRemove}>remove</LinkBox>
          </GridBox>
        </ListBox>
      </ListBox>
    </BorderBox>
  );
}

interface CartViewProps {
  onBack: () => void;
}

export function CartView({ onBack }: CartViewProps) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const { navigateTo } = useRouter();

  const refresh = useCallback(() => {
    setItems(loadCart());
  }, []);

  const handleClear = useCallback(() => {
    clearCart();
    refresh();
  }, [refresh]);

  const handleNavigate = useCallback(
    (handle: string) => {
      navigateTo(`/shop/products/${handle}`);
    },
    [navigateTo]
  );

  if (!items.length) {
    return (
      <BorderBox>
        <ListBox>
          <InfoBox>cart is empty</InfoBox>
          <LinkBox onClick={onBack}>go to shop</LinkBox>
        </ListBox>
      </BorderBox>
    );
  }

  const count = getCartCount(items);
  const total = getCartTotal(items);
  const checkoutUrl = getCheckoutUrl(items);

  return (
    <ListBox>
      <BorderBox>
        <InfoBox>{`cart (${count} item${count === 1 ? "" : "s"})`}</InfoBox>
      </BorderBox>
      {items.map((item) => (
        <CartItemRow key={item.variantId} item={item} onUpdate={refresh} onNavigate={handleNavigate} />
      ))}

      <BorderBox>
        <ListBox>
          <OutBox href={checkoutUrl}>{`checkout ($${total})`}</OutBox>
          <LinkBox onClick={onBack}>continue shopping</LinkBox>
          <LinkBox onClick={handleClear}>clear cart</LinkBox>
        </ListBox>
      </BorderBox>
    </ListBox>
  );
}
