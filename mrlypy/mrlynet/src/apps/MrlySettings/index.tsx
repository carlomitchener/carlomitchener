import { BorderBox, ListBox, LinkBox, InfoBox } from "../../components/System";
import { SettingRow } from "../../components/Settings/SettingRow";
import { SettingToggle } from "../../components/Settings/SettingToggle";
import { SettingStepper } from "../../components/Settings/SettingStepper";
import { useSettings } from "../../contexts/SettingsContext";

// COMPONENT

export function MrlySettings() {
  const { snake, setSnake, resetSnake } = useSettings();
  return (
    <ListBox>
      <BorderBox>
        <ListBox>
          <InfoBox>🐍 Snake</InfoBox>
          <SettingRow label="Speed">
            <SettingStepper
              value={snake.tickMs}
              onChange={(v) => setSnake({ tickMs: v })}
              step={25}
              min={50}
              max={500}
              format={(v) => `${v}ms`}
            />
          </SettingRow>
          <SettingRow label="Grid">
            <SettingStepper
              value={snake.gridSize}
              onChange={(v) => setSnake({ gridSize: v })}
              step={2}
              min={8}
              max={32}
              format={(v) => `${v}x${v}`}
            />
          </SettingRow>
          <SettingRow label="Apples">
            <SettingStepper
              value={snake.apples}
              onChange={(v) => setSnake({ apples: v })}
              step={1}
              min={1}
              max={10}
            />
          </SettingRow>
          <SettingRow label="Wrap">
            <SettingToggle value={snake.wrap} onChange={(v) => setSnake({ wrap: v })} />
          </SettingRow>
          <LinkBox onClick={resetSnake}>Reset to defaults</LinkBox>
        </ListBox>
      </BorderBox>
    </ListBox>
  );
}
