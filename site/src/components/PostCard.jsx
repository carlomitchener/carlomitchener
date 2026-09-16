import { postPoster, postRoute } from "../lib/feed.ts";

export function PostCard({ post, eager = false }) {
  return (
    <a className="post" href={postRoute(post.name)} aria-label={`Post ${post.name}, ${post.duration.toFixed(1)} seconds`}>
      <img src={postPoster(post.name)} alt="" width={post.size || 540} height={post.size || 540} loading={eager ? "eager" : "lazy"} decoding="async" />
    </a>
  );
}
