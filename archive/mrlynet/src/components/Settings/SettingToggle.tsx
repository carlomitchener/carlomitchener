import { LinkBox } from "../System";

interface SettingToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  onLabel?: string;
  offLabel?: string;
}

export const SettingToggle = ({ value, onChange, onLabel = "ON", offLabel = "OFF" }: SettingToggleProps) => {
  return (
    <LinkBox active={value} onClick={() => onChange(!value)}>
      {value ? onLabel : offLabel}
    </LinkBox>
  );
};
