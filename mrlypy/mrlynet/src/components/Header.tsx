import { BorderBox, LinkBox } from "./System";
import { useRouter } from "../router";
import { useHeaderConfig } from "../contexts/HeaderContext";
import { MrlyIcon } from "./MrlyIcon";

export function Header() {
  const { currentView, navigate, subPath } = useRouter();
  const { text } = useHeaderConfig();
  const isHome = currentView === "home" && !subPath;
  const label = (text || (isHome ? "MRLYPROD" : currentView)).toUpperCase();
  return (
    <BorderBox>
      <LinkBox onClick={() => navigate("home")}>
        <MrlyIcon text={label} />
      </LinkBox>
    </BorderBox>
  );
}
