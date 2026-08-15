import { useState, useCallback } from "react";
import { BorderBox, ListBox, LinkBox, GridBox, InfoBox } from "../../components/System";
import { MrlyIcon } from "../../components/MrlyIcon";
import { copyToClipboard } from "../../lib/browser/clipboard";

function CalcButton({ label, icon, onClick }: { label: string; icon?: string; onClick: () => void }) {
  const [key, setKey] = useState(0);
  const handleClick = () => {
    setKey((k) => k + 1);
    onClick();
  };
  return (
    <LinkBox onClick={handleClick}>
      <MrlyIcon text={icon || label} key={key} />
    </LinkBox>
  );
}

export function MrlyCalculator() {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    copyToClipboard(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  }, [display]);

  const handleNumberCode = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const handleOperator = (op: string) => {
    if (operator && !waitingForNewValue && previousValue) {
      const result = calculate(previousValue, display, operator);
      setDisplay(String(result));
      setPreviousValue(String(result));
    } else {
      setPreviousValue(display);
    }
    setOperator(op);
    setWaitingForNewValue(true);
  };

  const calculate = (a: string, b: string, op: string) => {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    let result: number | string;
    switch (op) {
      case "+":
        result = numA + numB;
        break;
      case "−":
        result = numA - numB;
        break;
      case "×":
        result = numA * numB;
        break;
      case "÷":
        result = numB !== 0 ? numA / numB : "Error";
        break;
      default:
        result = numB;
    }
    return typeof result === "number" ? parseFloat(result.toPrecision(12)) : result;
  };

  const handleEqual = () => {
    if (operator && previousValue) {
      const result = calculate(previousValue, display, operator);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperator(null);
      setWaitingForNewValue(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperator(null);
    setWaitingForNewValue(false);
  };

  const handleDot = () => {
    if (waitingForNewValue) {
      setDisplay("0.");
      setWaitingForNewValue(false);
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  };

  const handlePercent = () => {
    const val = parseFloat(display);
    setDisplay(String(val / 100));
  };

  const handleToggleSign = () => {
    const val = parseFloat(display);
    setDisplay(String(val * -1));
  };

  return (
    <ListBox>
      <BorderBox>
        <ListBox>
          <InfoBox style={{ cursor: "pointer" }} onClick={handleCopy}>
            <MrlyIcon text={copied ? "copied!" : display} />
          </InfoBox>
          <GridBox cols={4}>
            <CalcButton label="AC" onClick={handleClear} />
            <CalcButton label="+/-" onClick={handleToggleSign} />
            <CalcButton label="%" onClick={handlePercent} />
            <CalcButton label="÷" onClick={() => handleOperator("÷")} />
            <CalcButton label="7" onClick={() => handleNumberCode("7")} />
            <CalcButton label="8" onClick={() => handleNumberCode("8")} />
            <CalcButton label="9" onClick={() => handleNumberCode("9")} />
            <CalcButton label="×" onClick={() => handleOperator("×")} />
            <CalcButton label="4" onClick={() => handleNumberCode("4")} />
            <CalcButton label="5" onClick={() => handleNumberCode("5")} />
            <CalcButton label="6" onClick={() => handleNumberCode("6")} />
            <CalcButton label="−" onClick={() => handleOperator("−")} />
            <CalcButton label="1" onClick={() => handleNumberCode("1")} />
            <CalcButton label="2" onClick={() => handleNumberCode("2")} />
            <CalcButton label="3" onClick={() => handleNumberCode("3")} />
            <CalcButton label="+" onClick={() => handleOperator("+")} />
          </GridBox>
          <GridBox cols={2}>
            <CalcButton label="0" onClick={() => handleNumberCode("0")} />
            <GridBox cols={2}>
              <CalcButton label="." onClick={handleDot} />
              <CalcButton label="=" onClick={handleEqual} />
            </GridBox>
          </GridBox>
        </ListBox>
      </BorderBox>
    </ListBox>
  );
}
