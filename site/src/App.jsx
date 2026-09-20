import { Nav, useRouter } from "./client/router.ts";
import { got } from "./kinds.js";
import { Footer } from "./components/Footer.jsx";
import { Header } from "./components/Header.jsx";
import { NotFound } from "./pages/NotFound.jsx";

export function App({ page, chrome }) {
  const [view, navigate] = useRouter({ page, chrome });
  const One = got(view.page.kind) ?? NotFound;
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
