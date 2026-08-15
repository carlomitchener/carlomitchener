import { useState, useEffect } from "react";
import { OverlayBox } from "../../components/System";
import { MrlyIcon } from "../../components/MrlyIcon";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

interface Props {
  onWake?: () => void;
  [key: string]: unknown;
}

export function MrlyClock({ onWake }: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <OverlayBox onClick={onWake} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      <MrlyIcon text={formatTime(now)} scramble={false} />
    </OverlayBox>
  );
}
