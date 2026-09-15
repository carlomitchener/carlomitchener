import { GameCard } from "./GameCard.jsx";

export function GameGrid({ games, eager = 6 }) {
  if (!games.length) return null;
  return (
    <div className="games">
      {games.map((game, i) => (
        <GameCard key={game.name} game={game} eager={i < eager} />
      ))}
    </div>
  );
}
