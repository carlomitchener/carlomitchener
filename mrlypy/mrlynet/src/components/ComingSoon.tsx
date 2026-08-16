import { BorderBox, ListBox, InfoBox } from "./System";
import { Emoji } from "./Emoji";
import { APPS } from "../registry";
import type { View } from "../router";

interface ComingSoonProps {
  appId: View;
}

export function ComingSoon({ appId }: ComingSoonProps) {
  const app = APPS.find((a) => a.id === appId);
  const emoji = app?.emoji || "🚧";
  return (
    <BorderBox>
      <ListBox>
        <Emoji emoji={emoji} label={appId} />
        <InfoBox>coming soon</InfoBox>
        <InfoBox>this app is under construction</InfoBox>
      </ListBox>
    </BorderBox>
  );
}
