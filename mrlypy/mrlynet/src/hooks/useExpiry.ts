import { useState, useEffect } from "react";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  const days = Math.floor(abs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((abs % (1000 * 60)) / 1000);
  if (abs < 60 * 60 * 1000) {
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.length ? parts.join(" ") : "0s";
}

export function useExpiry(createdAt: string, expiryMs: number = WEEK_MS) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const expiryTime = new Date(createdAt).getTime() + expiryMs;
  const remaining = expiryTime - now;
  const elapsed = now - new Date(createdAt).getTime();
  const isExpired = remaining <= 0;
  const timeLeft = isExpired ? "expired" : formatDuration(remaining);
  const timeAgo = formatDuration(elapsed);
  return { isExpired, timeLeft, timeAgo };
}
