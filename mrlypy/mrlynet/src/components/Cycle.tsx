import { useState, useEffect } from "react";
import { LinkBox } from "./System";

const CHARS = "abcdef0123456789";

interface ScrambleTextProps {
  text: string;
  duration?: number;
}

const ScrambleText = ({ text, duration = 1000 }: ScrambleTextProps) => {
  const [display, setDisplay] = useState(text);
  useEffect(() => {
    const steps = 10;
    const stepDuration = duration / steps;
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep >= steps) {
        setDisplay(text);
        clearInterval(interval);
        return;
      }
      const scrambled = text
        .split("")
        .map((char, index) => {
          if (char === " ") return " ";
          if (index < (currentStep / steps) * text.length) return char;
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        })
        .join("");

      setDisplay(scrambled);
      currentStep++;
    }, stepDuration);
    return () => clearInterval(interval);
  }, [text, duration]);
  return <>{display}</>;
};

interface CycleProps {
  items: string[];
  prefix?: string;
}

export const Cycle = ({ items, prefix = "" }: CycleProps) => {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * items.length));
  const handleClick = () => {
    setIndex((prev) => (prev + 1) % items.length);
  };
  const currentText = `${prefix}${items[index]}`;
  return (
    <LinkBox onClick={handleClick}>
      <ScrambleText text={currentText} key={currentText} />
    </LinkBox>
  );
};
