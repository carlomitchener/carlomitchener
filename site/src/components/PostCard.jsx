import { postPoster, postRoute } from "../lib/feed.ts";
import { Life } from "./Life.jsx";

export function PostCard({ post, eager = false, now }) {
  return (
    <a className="card" href={postRoute(post.name)} aria-label={`Post ${post.name}, ${post.duration.toFixed(1)} seconds`}>
      <span className="shot">
        <img className="pixel" src={postPoster(post.name)} alt="" width={post.size || 540} height={post.size || 540} loading={eager ? "eager" : "lazy"} decoding="async" />
      </span>
      <h3 className="mono">{post.name}</h3>
      <span className="price">
        {`${post.duration.toFixed(1)}s · `}
        <Life born={post.at} now={now} />
      </span>
    </a>
  );
}
