import { Nav, useRouter } from "./client/router.ts";
import { Footer } from "./components/Footer.jsx";
import { Header } from "./components/Header.jsx";
import { Automator } from "./pages/Automator.jsx";
import { Cart } from "./pages/Cart.jsx";
import { Designs } from "./pages/Designs.jsx";
import { Doc } from "./pages/Doc.jsx";
import { Feed } from "./pages/Feed.jsx";
import { GiftCard, GiftCards } from "./pages/GiftCard.jsx";
import { Home } from "./pages/Home.jsx";
import { NotFound } from "./pages/NotFound.jsx";
import { Pages } from "./pages/Pages.jsx";
import { Post } from "./pages/Post.jsx";
import { Product } from "./pages/Product.jsx";
import { Shop } from "./pages/Shop.jsx";
import { Stats } from "./pages/Stats.jsx";

const KINDS = {
  home: Home,
  shop: Shop,
  designs: Designs,
  product: Product,
  post: Post,
  feed: Feed,
  cart: Cart,
  automator: Automator,
  stats: Stats,
  pages: Pages,
  gifts: GiftCards,
  gift: GiftCard,
  page: Doc,
  missing: NotFound,
};

export function App({ page, chrome }) {
  const [view, navigate] = useRouter({ page, chrome });
  const One = KINDS[view.page.kind] ?? NotFound;
  return (
    <Nav.Provider value={navigate}>
      <Header route={view.chrome.route} catalog={view.chrome.catalog} fly={view.chrome.fly} />
      <div className="veil"></div>
      <main id="main">
        <One key={view.chrome.route} {...view.page.props} now={view.chrome.now} />
      </main>
      <Footer catalog={view.chrome.catalog} now={view.chrome.now} />
    </Nav.Provider>
  );
}
