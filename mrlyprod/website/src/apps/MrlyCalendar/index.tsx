import { useState, useMemo } from "react";
import { BorderBox, ListBox, CardBox, InfoBox, LinkBox, GridBox } from "../../components/System";
import { MrlyIcon } from "../../components/MrlyIcon";
import { Controls } from "../../components/Controls";
import { useTheme } from "../../contexts/ThemeContext";

// HELPERS

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function getMonthData(year: number, month: number) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = (first.getDay() + 6) % 7;
  return { daysInMonth, startDay };
}

function formatMonth(year: number, month: number): string {
  return new Date(year, month).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

// COMPONENT

export function MrlyCalendar() {
  const { mode } = useTheme();
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { daysInMonth, startDay } = useMemo(() => getMonthData(year, month), [year, month]);

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const prev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };

  const next = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells: { day: number; faded: boolean }[] = [];
  for (let i = startDay - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, faded: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, faded: false });
  let nextDay = 1;
  while (cells.length % 7 !== 0) cells.push({ day: nextDay++, faded: true });

  return (
    <ListBox>
      <BorderBox>
        <ListBox>
          <Controls current={month + 1} total={12} onPrev={prev} onNext={next} />
          <LinkBox onClick={goToday}>{formatMonth(year, month)}</LinkBox>
          <GridBox cols={7}>
            {DAYS.map((d, i) => (
              <InfoBox key={i}>{d}</InfoBox>
            ))}
            {cells.map(({ day, faded }, i) => (
              <CardBox
                key={i}
                style={{
                  backgroundColor: !faded && isToday(day) ? (mode ? "white" : "black") : undefined,
                  opacity: faded ? 0.5 : undefined,
                }}
              >
                <MrlyIcon
                  text={String(day)}
                  scramble={false}
                  style={{ filter: !faded && isToday(day) ? "invert(1)" : undefined }}
                />
              </CardBox>
            ))}
          </GridBox>
        </ListBox>
      </BorderBox>
    </ListBox>
  );
}
