import { useEffect } from "react";
import { BorderBox, ListBox, InfoBox } from "./System";
import { Emoji } from "./Emoji";
import { useTheme } from "../contexts/ThemeContext";

export function Skeleton() {
  const { startDisco, stopDisco } = useTheme();

  useEffect(() => {
    startDisco();
    return () => stopDisco();
  }, [startDisco, stopDisco]);

  return (
    <ListBox>
      <BorderBox>
        <ListBox>
          <InfoBox>loading...</InfoBox>
          <Emoji emoji="⏳" label="loading..." />
        </ListBox>
      </BorderBox>
    </ListBox>
  );
}
