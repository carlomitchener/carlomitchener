import { useEffect, useState, useMemo } from "react";
import { mrlyFont, type MrlyChar } from "../lib/mrlyfont";

interface MrlyIconProps {
  text?: string;
  grid?: string[];
  duration?: number;
  scramble?: boolean;
  color?: string;
  style?: React.CSSProperties;
}

const GAP = 1;
const FALLBACK: MrlyChar = { name: "FALLBACK", w: 3, h: 3, rows: ["111", "101", "111"] };

function getChar(char: string): MrlyChar {
  return mrlyFont[char] || mrlyFont["?"] || FALLBACK;
}

const CharGroup = ({
  char,
  rows: directRows,
  offsetX,
  duration,
  scramble,
  fill = "currentColor",
}: {
  char?: string;
  rows?: string[];
  offsetX: number;
  duration: number;
  scramble: boolean;
  fill?: string;
}) => {
  const { w, h, rows } = useMemo(() => {
    if (directRows) return { w: directRows[0]?.length ?? 0, h: directRows.length, rows: directRows };
    return getChar(char ?? "");
  }, [char, directRows]);

  const allPixels = useMemo(() => {
    const p = [];
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (rows[r][c] === "1") {
          p.push({ x: c, y: r, id: r * w + c });
        }
      }
    }
    return p;
  }, [rows, w, h]);

  const [visibleCount, setVisibleCount] = useState(() => (scramble ? 0 : allPixels.length));

  const shuffledOrder = useMemo(() => {
    const indices = allPixels.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [allPixels]);

  useEffect(() => {
    if (!scramble) {
      setVisibleCount(allPixels.length);
      return;
    }
    setVisibleCount(0);
    if (allPixels.length === 0) return;
    const stepTime = Math.max(10, duration / allPixels.length);
    let current = 0;
    const interval = setInterval(() => {
      current++;
      setVisibleCount(current);
      if (current >= allPixels.length) clearInterval(interval);
    }, stepTime);
    return () => clearInterval(interval);
  }, [scramble, duration, allPixels.length, shuffledOrder]);

  return (
    <g transform={`translate(${offsetX}, 0)`}>
      {shuffledOrder.slice(0, visibleCount).map((pixelIndex) => {
        const pixel = allPixels[pixelIndex];
        return <rect key={pixel.id} x={pixel.x} y={pixel.y} width={1} height={1} fill={fill} />;
      })}
    </g>
  );
};

export const MrlyIcon = ({ text, grid, duration = 300, scramble = true, color, style }: MrlyIconProps) => {
  const chars = (text ?? "").split("");
  const charData = useMemo(() => chars.map(getChar), [chars]);
  const maxH = useMemo(() => Math.max(...charData.map((c) => c.h)), [charData]);
  const offsets = useMemo(() => {
    const o: number[] = [];
    let x = 0;
    for (let i = 0; i < charData.length; i++) {
      o.push(x);
      x += charData[i].w + GAP;
    }
    return o;
  }, [charData]);
  if (grid) {
    const gw = grid[0]?.length ?? 0;
    const gh = grid.length;
    return (
      <div style={{ width: "50%", height: "50%", minHeight: "var(--font-size)", ...style }}>
        <svg
          viewBox={`0 0 ${gw} ${gh}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
        >
          <CharGroup rows={grid} offsetX={0} duration={duration} scramble={scramble} fill={color} />
        </svg>
      </div>
    );
  }
  const totalWidth = charData.length > 0 ? offsets[offsets.length - 1] + charData[charData.length - 1].w : 0;
  return (
    <div style={{ width: "50%", height: "50%", minHeight: "var(--font-size)", ...style }}>
      <svg
        viewBox={`0 0 ${totalWidth} ${maxH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        {chars.map((char, i) => (
          <CharGroup
            key={`${i}-${char}`}
            char={char}
            offsetX={offsets[i]}
            duration={duration}
            scramble={scramble}
            fill={color}
          />
        ))}
      </svg>
    </div>
  );
};
