import { PostCard } from "./PostCard.jsx";

export function PostGrid({ posts, eager = 6 }) {
  if (!posts.length) return null;
  return (
    <div className="posts">
      {posts.map((post, i) => (
        <PostCard key={post.name} post={post} eager={i < eager} />
      ))}
    </div>
  );
}
