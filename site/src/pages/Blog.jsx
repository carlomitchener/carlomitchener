function List({ posts }) {
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>Blog</h1>
        <p className="lead">Long-form posts, newest first.</p>
      </div>
      <div className="grid posts">
        {posts.map((one) => (
          <article key={one.slug} className="card">
            <a className="shot" href={one.route}>
              {one.image ? <img src={one.image} alt="" loading="lazy" /> : null}
            </a>
            <h3>
              <a href={one.route}>{one.title}</a>
            </h3>
            <time>{one.date}</time>
            <p>{one.lead}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function Blog({ posts = [], post, body }) {
  if (!post) return <List posts={posts} />;
  return (
    <div className="wrap narrow">
      <article className="doc">
        <h1>{post.title}</h1>
        <p className="lead">{post.lead}</p>
        <p className="when">
          <time>{post.date}</time>
        </p>
        <div className="prose" data-body dangerouslySetInnerHTML={{ __html: body }}></div>
      </article>
    </div>
  );
}
