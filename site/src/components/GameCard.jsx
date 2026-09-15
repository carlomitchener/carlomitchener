import { gamePoster, gameRoute } from "../lib/game.ts";

export function GameCard({ game, eager = false }) {
  return (
    <a className="game" href={gameRoute(game.name)} aria-label={`Game ${game.name}, ${game.duration.toFixed(1)} seconds`}>
      <img src={gamePoster(game.name)} alt="" width={game.size || 540} height={game.size || 540} loading={eager ? "eager" : "lazy"} decoding="async" />
    </a>
  );
}
