import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CATEGORIES, PAGES, SHOP } from "../config/shop.ts";
import { checkoutUrl, count, load, server, subscribe, total } from "../lib/cart.ts";
import { useMediaQuery } from "../lib/hooks.ts";
import { collectionUrl, lineUrl, money } from "../lib/shop.ts";
import { get as getMode, server as modeServer, subscribe as onMode, toggle } from "../client/mode.ts";
import { Icon } from "./Icon.jsx";

const CART = "/cart/";

const HOVER = 180;

const LEAVE = 260;

const LIMIT = 12;

/* SEARCH */

let index = null;

async function hits() {
  if (index) return index;
  try {
    index = await (await fetch("/search.json")).json();
  } catch {
    index = [];
  }
  return index;
}

function Finder({ links, on }) {
  const [text, setText] = useState("");
  const [found, setFound] = useState([]);
  const box = useRef(null);

  useEffect(() => {
    if (on) box.current?.focus();
  }, [on]);

  useEffect(() => {
    const want = text.trim().toLowerCase();
    if (!want) return;
    let live = true;
    const words = want.split(/\s+/);
    void hits().then((all) => {
      if (!live) return;
      setFound(all.filter((hit) => words.every((word) => `${hit.name} ${hit.kind} ${hit.tags ?? ""}`.toLowerCase().includes(word))).slice(0, LIMIT));
    });
    return () => {
      live = false;
    };
  }, [text]);

  const empty = !text.trim();
  return (
    <div className="pane finder" hidden={!on}>
      <form className="field" role="search" onSubmit={(event) => event.preventDefault()}>
        <Icon name="search" />
        <input ref={box} type="search" name="q" placeholder="Search" autoComplete="off" aria-label="Search" value={text} onChange={(event) => setText(event.target.value)} onFocus={() => void hits()} />
      </form>
      <p className="fine" hidden={!empty}>
        Quick Links
      </p>
      <ul className="quick" hidden={!empty}>
        {links.map((one, i) => (
          <li key={one.href} style={{ "--i": i }}>
            <a href={one.href}>
              <Icon name="arrow_forward" extra="small" />
              {one.name}
            </a>
          </li>
        ))}
      </ul>
      <ul className="quick results" aria-live="polite" hidden={empty}>
        {found.map((hit, i) => (
          <li key={hit.href} style={{ "--i": i }}>
            <a href={hit.href}>
              <Icon name="arrow_forward" extra="small" />
              {hit.name}
              <small>{hit.kind}</small>
            </a>
          </li>
        ))}
        {!found.length && !empty ? <li className="none">No results.</li> : null}
      </ul>
    </div>
  );
}

/* BAG */

function Purse({ items, on }) {
  const n = count(items);
  return (
    <div className="pane purse" hidden={!on}>
      <p className="fine">{n ? `Your Bag · ${n} item${n === 1 ? "" : "s"} · ${money(total(items))}` : "Your Bag"}</p>
      <ul className="lines">
        {items.map((item) => (
          <li key={item.id}>
            <a href={lineUrl(item.key)}>
              <img src={item.image} alt={item.key} width="48" height="48" />
              <span>{item.title}</span>
              <small>{`${item.size} · ${money(item.price)}${item.qty > 1 ? ` × ${item.qty}` : ""}`}</small>
            </a>
          </li>
        ))}
      </ul>
      <p className="lead" hidden={items.length > 0}>
        Your bag is empty.
      </p>
      <p className="get">
        <a className="pill go" href={CART}>
          Review Bag
        </a>
        {items.length ? (
          <a className="pill" href={checkoutUrl(items) || CART}>
            Checkout
          </a>
        ) : null}
      </p>
    </div>
  );
}

/* HEADER */

export function Header({ route, catalog = [], fly = false }) {
  const links = [{ slug: "all", name: "All", href: SHOP }, ...CATEGORIES.map(([slug, name]) => ({ slug, name, href: `${SHOP}${slug}/` })), { slug: "pages", name: "Pages", href: "/pages/" }];
  const items = useSyncExternalStore(subscribe, load, server);
  const mode = useSyncExternalStore(onMode, getMode, modeServer);
  const wide = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState("");
  const [level, setLevel] = useState(1);
  const timer = useRef(0);
  const n = count(items);

  const show = useCallback((name, deep = 1) => {
    clearTimeout(timer.current);
    setOpen(name);
    setLevel(deep);
  }, []);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setOpen("");
    setLevel(1);
  }, []);

  const later = useCallback(
    (name, wait) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => (name ? show(name) : hide()), wait);
    },
    [hide, show],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    document.documentElement.classList.toggle("held", Boolean(open) && !wide);
  }, [open, wide]);

  useEffect(() => hide(), [hide, route, wide]);

  useEffect(() => {
    if (!open) return;
    const key = (event) => {
      if (event.key === "Escape") hide();
    };
    const away = (event) => {
      if (event.target instanceof Element && !event.target.closest(".top")) hide();
    };
    document.addEventListener("keydown", key);
    document.addEventListener("click", away);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("click", away);
    };
  }, [hide, open]);

  const sticky = open === "search" || open === "bag" || (open && !wide);
  const current = (href) => (route === href || (href !== SHOP && route.startsWith(href)) ? "page" : undefined);
  const rows = (slug) =>
    slug === "all"
      ? CATEGORIES.map(([one, name]) => ({ title: name, href: `${SHOP}${one}/` }))
      : slug === "pages"
        ? PAGES.filter((one) => one.href !== CART).map((one) => ({ title: one.name, href: one.href }))
        : catalog.filter((row) => row.category === slug).map((row) => ({ title: row.title, href: collectionUrl(row.handle) }));

  return (
    <header className="top" data-open={open || undefined} data-level={open ? String(level) : undefined} onMouseLeave={() => !sticky && later("", LEAVE)}>
      <div className="bar">
        <div className="home" onMouseEnter={() => !sticky && later("", LEAVE)}>
          <a className="mark" href="/" aria-label={fly ? "TheBird" : "Home"} data-fly={fly ? "" : undefined}>
            <img className="light" src="/bird/mark-light-128.png" srcSet="/bird/mark-light-256.png 2x" alt="TheBird" width="28" height="28" />
            <img className="dark" src="/bird/mark-dark-128.png" srcSet="/bird/mark-dark-256.png 2x" alt="" width="28" height="28" />
          </a>
          <button className="tool back" type="button" aria-label="Back" onClick={() => show("menu")}>
            <Icon name="chevron_left" />
          </button>
        </div>
        <nav className="links" aria-label="Shop">
          <ul>
            {links.map((one) => (
              <li key={one.href}>
                <a
                  href={one.href}
                  className={open === one.slug ? "lit" : undefined}
                  aria-current={current(one.href)}
                  onMouseEnter={() => wide && later(one.slug, open ? 0 : HOVER)}
                  onFocus={() => wide && show(one.slug)}
                >
                  {one.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="tools">
          <button className="tool" type="button" aria-label="Search" onMouseEnter={() => {
              void hits();
              if (!sticky) later("", LEAVE);
            }} onClick={() => (open === "search" ? hide() : show("search"))}>
            <Icon name="search" />
          </button>
          <button className="tool mode" type="button" aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={toggle}>
            <Icon name="dark_mode" extra="moon" />
            <Icon name="light_mode" extra="sun" />
          </button>
          <a
            className="tool bag"
            href={CART}
            aria-label="Bag"
            onClick={(event) => {
              if (!wide) return;
              event.preventDefault();
              if (open === "bag") hide();
              else show("bag");
            }}
          >
            <Icon name="shopping_bag" />
            <span className="count" hidden={!n}>
              {n ? String(n) : ""}
            </span>
          </a>
          <button className="tool burger" type="button" aria-label="Menu" aria-expanded={String(Boolean(open) && !wide)} onClick={() => (open ? hide() : show("menu"))}>
            <Icon name="menu" extra="open" />
            <Icon name="close" extra="shut" />
          </button>
        </div>
      </div>
      <div className="flyout" onMouseEnter={() => clearTimeout(timer.current)}>
        <div className="inside">
          <div className="wrap">
            {links.map((one) => (
              <div key={one.slug} className="pane explore" hidden={open !== one.slug}>
                <div className="list">
                  <p className="fine">{one.name}</p>
                  <a className="lead" href={one.href}>
                    {one.slug === "all" ? "Explore All Variations" : one.slug === "pages" ? "Explore All Pages" : `Explore All ${one.name}`}
                  </a>
                  <ul className="cols">
                    {rows(one.slug).map((row, i) => (
                      <li key={row.href} style={{ "--i": i }}>
                        <a href={row.href}>{row.title}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
            <Finder links={links} on={open === "search"} />
            <div className="pane sheet" hidden={open !== "menu"}>
              <ul className="big">
                {links.map((one, i) => (
                  <li key={one.href} style={{ "--i": i }}>
                    <button type="button" aria-current={current(one.href)} onClick={() => show(one.slug, 2)}>
                      <span>{one.name}</span>
                      <Icon name="chevron_right" extra="small" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <Purse items={items} on={open === "bag"} />
          </div>
        </div>
      </div>
    </header>
  );
}
