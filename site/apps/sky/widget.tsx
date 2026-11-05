import { Scene, type WidgetProps } from "@mrlyprod/ui/kit/page.tsx";
import { make, type Painted } from "./scene.ts";

type Props = Pick<WidgetProps<never, Painted>, "value" | "onReady">;

export const Widget = (props: Props) => <Scene make={make} {...props} />;
