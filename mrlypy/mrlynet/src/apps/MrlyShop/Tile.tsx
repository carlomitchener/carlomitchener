import { getTileUrl } from "./image";

interface TileProps {
  handle: string;
  tileIndex?: number;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Tile({ handle, tileIndex = 1, className, onClick, style }: TileProps) {
  return (
    <img
      src={getTileUrl(handle, tileIndex)}
      alt={`${handle}-${tileIndex}`}
      className={`image ${className || ""}`}
      style={{ imageRendering: "pixelated", cursor: onClick ? "pointer" : "default", ...style }}
      decoding="async"
      loading="lazy"
      onClick={onClick}
    />
  );
}
