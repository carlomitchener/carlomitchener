import type { ReactNode } from "react";
import { GridBox, InfoBox } from "../System";

interface SettingRowProps {
  label: string;
  children: ReactNode;
}

export const SettingRow = ({ label, children }: SettingRowProps) => {
  return (
    <GridBox cols={2}>
      <InfoBox>{label}</InfoBox>
      {children}
    </GridBox>
  );
};
