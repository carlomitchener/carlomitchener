import { useState } from "react";
import { BorderBox, GridBox, InfoBox, ListBox } from "./System";
import { Emoji } from "./Emoji";
import { useRouter, type View } from "../router";
import { APPS } from "../registry";

function shuffleApps() {
  const visible = [...APPS.filter((a) => !a.hidden)];
  for (let i = visible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [visible[i], visible[j]] = [visible[j], visible[i]];
  }
  return visible;
}

export function Home() {
  const { navigate } = useRouter();
  const [apps] = useState(shuffleApps);
  return (
    <ListBox>
      <GridBox cols={3}>
        {apps.map((app) => (
          <BorderBox key={app.id}>
            <ListBox>
              <Emoji emoji={app.emoji} onClick={() => navigate(app.id as View)} />
              <InfoBox>{app.id}</InfoBox>
            </ListBox>
          </BorderBox>
        ))}
      </GridBox>
    </ListBox>
  );
}
