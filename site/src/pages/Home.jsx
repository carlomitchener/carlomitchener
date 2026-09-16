import { FEED_ROUTE } from "../lib/feed.ts";
import { PostGrid } from "../components/PostGrid.jsx";
import { ProductGrid } from "../components/ProductGrid.jsx";
import { Icon } from "../components/Icon.jsx";

function Head({ title, href, more }) {
  return (
    <div className="strip">
      <h2>{title}</h2>
      <a href={href} className="fine">
        {more}
        <Icon name="chevron_right" extra="small" />
      </a>
    </div>
  );
}

export function Home({ posts, sections, now }) {
  return (
    <>
      {posts.length ? (
        <section className="wrap home-row" aria-labelledby="feed">
          <Head title="Feed" href={FEED_ROUTE} more="All posts" />
          <PostGrid posts={posts} now={now} />
        </section>
      ) : null}
      {sections.map((one) => (
        <section key={one.slug} className="wrap home-row" aria-labelledby={one.slug}>
          <Head title={one.name} href={`/shop/${one.slug}/`} more={`All ${one.name}`} />
          <ProductGrid products={one.products} now={now} />
        </section>
      ))}
    </>
  );
}
