import { hydrateRoot } from "react-dom/client";
import { App } from "../App.jsx";

export const mount = (host: HTMLElement, view: { page: unknown; chrome: unknown }) => hydrateRoot(host, <App page={view.page} chrome={view.chrome} />);
