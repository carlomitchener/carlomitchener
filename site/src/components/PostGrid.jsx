import { PostCard } from "./PostCard.jsx";

export function PostGrid({ posts, eager = 4, now }) {
  if (!posts.length) return <p className="lead empty">No posts yet.</p>;
  return (
    <div className="grid">
      {posts.map((post, i) => (
        <PostCard key={post.name} post={post} eager={i < eager} now={now} />
      ))}
    </div>
  );
}
