import React, { type ReactNode, useEffect, useRef } from "react";
import { randomColor } from "../lib/colors";
import { useMusic } from "../hooks/useMusic";
import { useTheme } from "../contexts/ThemeContext";

interface BoxProps {
  children?: ReactNode;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  onClick?: () => void;
}

export const ContainerBox = ({ children, ...props }: BoxProps) => {
  return (
    <div className="container-box" {...props}>
      {children}
    </div>
  );
};

export const BorderBox = ({ children, style, ...props }: BoxProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { tokens } = useTheme();
  useEffect(() => {
    if (ref.current) {
      ref.current.style.backgroundColor = tokens.backgroundColor || randomColor();
    }
  }, [tokens.backgroundColor]);
  return (
    <div ref={ref} className="mrly-box border-box" style={style} {...props}>
      {children}
    </div>
  );
};

export const ListBox = ({ children, ...props }: BoxProps) => {
  return (
    <div className="list-box" {...props}>
      {children}
    </div>
  );
};

interface GridBoxProps extends BoxProps {
  cols?: number;
}

export const GridBox = ({ children, cols, style, ...props }: GridBoxProps) => {
  const gridStyle = cols
    ? {
        ...style,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
      }
    : style;
  return (
    <div className="grid-box" style={gridStyle} {...props}>
      {children}
    </div>
  );
};

interface MatrixBoxProps extends BoxProps {
  cols?: number;
  rows?: number;
}

export const MatrixBox = ({ children, cols = 16, rows, style, ...props }: MatrixBoxProps) => {
  const actualRows = rows ?? cols;
  const matrixStyle = {
    ...style,
    "--matrix-cols": cols,
    "--matrix-rows": actualRows,
  } as React.CSSProperties;
  return (
    <div className="matrix-box" style={matrixStyle} {...props}>
      {children}
    </div>
  );
};

interface MatrixCellProps extends BoxProps {
  x: number;
  y: number;
  zIndex?: number;
}

export const MatrixCell = ({ children, x, y, zIndex, style, ...props }: MatrixCellProps) => {
  const cellStyle: React.CSSProperties = {
    ...style,
    gridColumn: x + 1,
    gridRow: y + 1,
    ...(zIndex !== undefined && { zIndex }),
  };
  return (
    <div style={cellStyle} {...props}>
      {children}
    </div>
  );
};

export const InfoBox = ({ children, ...props }: BoxProps) => {
  return (
    <div className="mrly-box info-box" {...props}>
      {children}
    </div>
  );
};

export const TextBox = ({ children, ...props }: BoxProps) => {
  return (
    <div className="mrly-box text-box" {...props}>
      {children}
    </div>
  );
};

interface CardBoxProps extends BoxProps {
  active?: boolean;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  onPointerUp?: React.PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLDivElement>;
  onPointerCancel?: React.PointerEventHandler<HTMLDivElement>;
}

export const CardBox = React.forwardRef<HTMLDivElement, CardBoxProps>(
  ({ children, active, className, style, ...props }, ref) => {
    const classes = ["mrly-box card-box", active ? "active" : "", className].filter(Boolean).join(" ");
    return (
      <div ref={ref} className={classes} style={style} {...props}>
        {children}
      </div>
    );
  }
);
CardBox.displayName = "CardBox";

interface LinkBoxProps extends BoxProps {
  active?: boolean;
  disabled?: boolean;
  silent?: boolean;
}

export const LinkBox = ({ children, active, disabled, silent, onClick, ...props }: LinkBoxProps) => {
  const { playRandomNote } = useMusic();
  const { mute } = useTheme();
  const classes = ["mrly-box link-box", active ? "active" : "", disabled ? "disabled" : ""].filter(Boolean).join(" ");
  const handleClick = () => {
    if (!mute && !silent) {
      playRandomNote();
    }
    if (onClick) {
      onClick();
    }
  };
  return (
    <button className={classes} onClick={handleClick} disabled={disabled} {...props}>
      {children}
    </button>
  );
};

interface OutBoxProps extends BoxProps {
  href: string;
  target?: string;
  rel?: string;
}

export const OutBox = ({ children, href, target = "_blank", rel = "noopener noreferrer", ...props }: OutBoxProps) => {
  return (
    <a href={href} className="mrly-box out-box" target={target} rel={rel} {...props}>
      {children}
    </a>
  );
};

interface FormBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export const FormBox = ({ value, onChange }: FormBoxProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.length === 0) {
      onChange("");
      return;
    }
    const segments = [...new Intl.Segmenter().segment(raw)];
    onChange(segments[segments.length - 1].segment);
  };
  return <input className="form-box" type="text" value={value} onChange={handleChange} inputMode="text" />;
};

export const OverlayBox = ({ children, style, ...props }: BoxProps) => {
  return (
    <div className="overlay-box" style={style} {...props}>
      {children}
    </div>
  );
};
