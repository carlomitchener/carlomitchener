import { useState } from "react";
import { InfoBox } from "./System";
import { useExpiry } from "../hooks/useExpiry";

interface ExpiryInfoProps {
  ts: string;
  expiryMs?: number;
}

export function ExpiryInfo({ ts, expiryMs }: ExpiryInfoProps) {
  const [showAgo, setShowAgo] = useState(false);
  const { timeLeft, timeAgo } = useExpiry(ts, expiryMs);
  const label = showAgo ? `created ${timeAgo} ago` : timeLeft === "expired" ? "expired" : `expires in ${timeLeft}`;
  return (
    <InfoBox style={{ cursor: "pointer" }} onClick={() => setShowAgo((v) => !v)}>
      {label}
    </InfoBox>
  );
}
