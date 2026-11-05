import { Scene, type WidgetProps } from "@mrlyprod/ui/kit/page.tsx";
import { type Drawn, make } from "./scene.ts";

type Props = Pick<WidgetProps<never, Drawn>, "value" | "onReady">;

export const Widget = (props: Props) => <Scene make={make} {...props} />;
