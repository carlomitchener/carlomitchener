import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { Icon } from "../components/Icon.jsx";
import { gameManifest, gameMaster, gamePoster, gameRoute, gameVideo } from "../lib/game.ts";

const seconds = (n) => `${Number(n).toFixed(1)}s`;

export function Game({ game, prev, next }) {
  return (
    <div className="wrap">
      <Breadcrumbs trail={[{ name: "Games", href: "/" }, { name: game.name }]} />
      <article className="play product" data-player data-manifest={gameManifest(game.name)} data-prev={prev ? gameRoute(prev.name) : undefined} data-next={next ? gameRoute(next.name) : undefined}>
        <div className="left">
          <div className="frame">
            <video controls loop playsInline preload="metadata" poster={gamePoster(game.name)} width={game.size || 1080} height={game.size || 1080}>
              <source src={gameVideo(game.name)} type="video/mp4" />
            </video>
          </div>
          <p className="fine keys" aria-label="Keys">
            <span>
              <kbd>space</kbd> pause
            </span>
            <span>
              <kbd>←</kbd>
              <kbd>→</kbd> frame
            </span>
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> game
            </span>
          </p>
        </div>
        <div className="side">
          <h1 className="mono">{game.name}</h1>
          {game.story ? <p className="story">{game.story}</p> : null}
          <dl className="meta">
            <div>
              <dt>Seed</dt>
              <dd>{game.seed}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{seconds(game.duration)}</dd>
            </div>
            <div>
              <dt>Canvas</dt>
              <dd>{game.canvas}</dd>
            </div>
            <div>
              <dt>Frames</dt>
              <dd>{game.frames}</dd>
            </div>
          </dl>
          <p className="get">
            <a className="pill go wide" href={gameMaster(game.name)} download>
              <Icon name="download" />
              Download 1080
            </a>
          </p>
          <p className="get">
            {prev ? (
              <a className="pill" href={gameRoute(prev.name)} rel="prev">
                <Icon name="chevron_left" />
                Newer
              </a>
            ) : null}
            {next ? (
              <a className="pill" href={gameRoute(next.name)} rel="next">
                Older
                <Icon name="chevron_right" />
              </a>
            ) : null}
          </p>
          <details className="drop" open>
            <summary>
              <span>Data</span>
              <Icon name="expand_more" extra="small" />
            </summary>
            <pre className="json" data-json>
              <a href={gameManifest(game.name)}>manifest.json</a>
            </pre>
          </details>
        </div>
      </article>
    </div>
  );
}
