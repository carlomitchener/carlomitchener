import { Breadcrumbs } from "../components/Breadcrumbs.jsx";
import { Icon } from "../components/Icon.jsx";
import { FEED_ROUTE, postManifest, postMaster, postPoster, postRoute, postVideo } from "../lib/feed.ts";

const seconds = (n) => `${Number(n).toFixed(1)}s`;

export function Post({ post, prev, next }) {
  return (
    <div className="wrap">
      <Breadcrumbs trail={[{ name: "Feed", href: FEED_ROUTE }, { name: post.name }]} />
      <article className="play product" data-player data-manifest={postManifest(post.name)} data-prev={prev ? postRoute(prev.name) : undefined} data-next={next ? postRoute(next.name) : undefined}>
        <div className="left">
          <div className="frame">
            <video controls loop playsInline preload="metadata" poster={postPoster(post.name)} width={post.size || 1080} height={post.size || 1080}>
              <source src={postVideo(post.name)} type="video/mp4" />
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
              <kbd>↓</kbd> post
            </span>
          </p>
          <pre className="json" data-json>
            <a href={postManifest(post.name)}>{post.name}.json</a>
          </pre>
        </div>
        <div className="side">
          <h1 className="mono">{post.name}</h1>
          {post.story ? <p className="story">{post.story}</p> : null}
          <dl className="meta">
            <div>
              <dt>Seed</dt>
              <dd>{post.seed}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{seconds(post.duration)}</dd>
            </div>
            <div>
              <dt>Canvas</dt>
              <dd>{post.canvas}</dd>
            </div>
            <div>
              <dt>Frames</dt>
              <dd>{post.frames}</dd>
            </div>
          </dl>
          <p className="get">
            <a className="pill go wide" href={postMaster(post.name)} download>
              <Icon name="download" />
              Download 1080
            </a>
          </p>
          <p className="get">
            {prev ? (
              <a className="pill" href={postRoute(prev.name)} rel="prev">
                <Icon name="chevron_left" />
                Newer
              </a>
            ) : null}
            {next ? (
              <a className="pill" href={postRoute(next.name)} rel="next">
                Older
                <Icon name="chevron_right" />
              </a>
            ) : null}
          </p>
        </div>
      </article>
    </div>
  );
}
