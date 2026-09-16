import { PostGrid } from "../components/PostGrid.jsx";

export function Feed({ posts, now }) {
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Feed</h1>
      </div>
      <PostGrid posts={posts} now={now} />
    </div>
  );
}
