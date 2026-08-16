import { BorderBox, ListBox, LinkBox, InfoBox, GridBox } from "../../components/System";
import { SettingRow } from "../../components/Settings/SettingRow";
import { SettingStepper } from "../../components/Settings/SettingStepper";
import { SettingSwatches } from "../../components/Settings/SettingSwatches";
import { useTheme } from "../../contexts/ThemeContext";

// COMPONENT

export function MrlyTheme() {
  const { mode, font, mute, disco, tokens, toggleMode, toggleFont, toggleMute, startDisco, stopDisco, setTokens, resetTokens } = useTheme();
  return (
    <ListBox>
      <BorderBox>
        <ListBox>
          <InfoBox>✨ Modes</InfoBox>
          <GridBox cols={4}>
            <LinkBox active={mode} onClick={toggleMode}>mode</LinkBox>
            <LinkBox active={font} onClick={toggleFont}>font</LinkBox>
            <LinkBox active={mute} onClick={toggleMute}>mute</LinkBox>
            <LinkBox active={disco} onClick={disco ? stopDisco : startDisco}>disco</LinkBox>
          </GridBox>
        </ListBox>
      </BorderBox>

      <BorderBox>
        <ListBox>
          <InfoBox>📐 Sizing</InfoBox>
          <SettingRow label="Border width">
            <SettingStepper
              value={tokens.borderWidth}
              onChange={(v) => setTokens({ borderWidth: v })}
              step={1}
              min={0}
              max={10}
              format={(v) => `${v}px`}
            />
          </SettingRow>
          <SettingRow label="Border radius">
            <SettingStepper
              value={tokens.borderRadius}
              onChange={(v) => setTokens({ borderRadius: v })}
              step={1}
              min={0}
              max={40}
              format={(v) => `${v}px`}
            />
          </SettingRow>
          <SettingRow label="Font size">
            <SettingStepper
              value={tokens.fontSize}
              onChange={(v) => setTokens({ fontSize: v })}
              step={1}
              min={8}
              max={32}
              format={(v) => `${v}px`}
            />
          </SettingRow>
        </ListBox>
      </BorderBox>

      <BorderBox>
        <ListBox>
          <InfoBox>📏 Spacing</InfoBox>
          <SettingRow label="Gap">
            <SettingStepper
              value={tokens.gap}
              onChange={(v) => setTokens({ gap: v })}
              step={1}
              min={0}
              max={30}
              format={(v) => `${v}px`}
            />
          </SettingRow>
          <SettingRow label="Padding">
            <SettingStepper
              value={tokens.padding}
              onChange={(v) => setTokens({ padding: v })}
              step={1}
              min={0}
              max={30}
              format={(v) => `${v}px`}
            />
          </SettingRow>
        </ListBox>
      </BorderBox>

      <BorderBox>
        <ListBox>
          <InfoBox>🎨 Background</InfoBox>
          <SettingSwatches
            value={tokens.backgroundColor}
            onChange={(v) => setTokens({ backgroundColor: v })}
          />
        </ListBox>
      </BorderBox>

      <BorderBox>
        <ListBox>
          <InfoBox>🖼️ Border color</InfoBox>
          <SettingSwatches
            value={tokens.borderColor}
            onChange={(v) => setTokens({ borderColor: v })}
          />
        </ListBox>
      </BorderBox>

      <BorderBox>
        <ListBox>
          <InfoBox>🔤 Font color</InfoBox>
          <SettingSwatches
            value={tokens.fontColor}
            onChange={(v) => setTokens({ fontColor: v })}
          />
        </ListBox>
      </BorderBox>

      <BorderBox>
        <LinkBox onClick={resetTokens}>Reset to defaults</LinkBox>
      </BorderBox>
    </ListBox>
  );
}
