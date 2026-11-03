import { Glyph } from "@mrlyprod/modern/glyph.tsx";
import type { Bind, Props } from "@mrlyprod/shell/design.ts";

const href = (bind: Bind) => String(bind().href ?? "");

export function Bar({ site, app, bind }: Props["bar"]) {
  return (
    <header className="bar sky">
      <nav className="trio" data-lens="bar" aria-label="System">
        <a className="glyph launch" href={href(bind.launch)} {...bind.launch()} aria-label="Launchpad">
          <Glyph art="launch" />
        </a>
        <a className="mark" href={href(bind.mark)} {...bind.mark()} aria-label={`${site.name} home`}>
          <img src={site.logo} width="24" height="24" alt="" />
          <span className="word">{site.name}</span>
        </a>
        <span className="app">{app}</span>
        <span className="menus" role="menubar" aria-label="App" />
      </nav>
      <div className="tray" data-lens="bar">
        <time className="date" />
        <time className="clock" />
        <a className="glyph find" href={href(bind.find)} {...bind.find()} aria-label="Search">
          <Glyph art="find" />
        </a>
      </div>
    </header>
  );
}
