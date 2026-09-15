export function Chips({ label, cards, current }) {
  if (!cards.length) return null;
  return (
    <nav className="chips" aria-label={label}>
      {cards.map((card) => (
        <a key={card.href} href={card.href} aria-current={card.href === current ? "page" : undefined}>
          <span>{card.name}</span>
          <span className="n">{card.count}</span>
        </a>
      ))}
    </nav>
  );
}
