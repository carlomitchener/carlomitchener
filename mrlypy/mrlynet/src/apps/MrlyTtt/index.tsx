import { useState, useCallback, useMemo } from "react";
import { GridBox, CardBox } from "../../components/System";
import { MrlyTile } from "../../components/MrlyTile";
import { Game, type GameState } from "../../components/Game";
import { useMusic } from "../../hooks/useMusic";
import { getUniqueColorNames } from "../../lib/colors";
import { checkWinner, isDraw, aiMove, type Cell, type Board } from "./logic";

// COMPONENT

const EMPTY_BOARD: Board = Array(9).fill(null);

export function MrlyTtt() {
  const { playRandomNote } = useMusic();
  const [gameState, setGameState] = useState<GameState>("playing");
  const [board, setBoard] = useState<Board>([...EMPTY_BOARD]);
  const [winner, setWinner] = useState<Cell>(null);
  const [draw, setDraw] = useState(false);
  // COLORS
  const colors = useMemo(() => getUniqueColorNames(2), []);
  const xStyle = useMemo(() => ({ design: "void", number: 3, color: colors[0] }), [colors]);
  const oStyle = useMemo(() => ({ design: "carpet", number: 3, color: colors[1] }), [colors]);
  // RESET
  const reset = useCallback(() => {
    setBoard([...EMPTY_BOARD]);
    setWinner(null);
    setDraw(false);
  }, []);
  const resetGame = useCallback(() => {
    reset();
    setGameState("playing");
  }, [reset]);
  // MOVE
  const handleCell = useCallback(
    (i: number) => {
      if (gameState !== "playing" || board[i] || winner || draw) return;
      playRandomNote();
      const next = [...board];
      next[i] = "X";
      // CHECK PLAYER WIN
      const w = checkWinner(next);
      if (w) {
        setBoard(next);
        setWinner(w);
        setGameState("gameover");
        return;
      }
      if (isDraw(next)) {
        setBoard(next);
        setDraw(true);
        setGameState("gameover");
        return;
      }
      // AI MOVE
      next[aiMove(next)] = "O";
      const w2 = checkWinner(next);
      if (w2) {
        setBoard(next);
        setWinner(w2);
        setGameState("gameover");
        return;
      }
      if (isDraw(next)) {
        setBoard(next);
        setDraw(true);
        setGameState("gameover");
        return;
      }
      setBoard(next);
    },
    [gameState, board, winner, draw, playRandomNote]
  );
  // RENDER
  const gameOverEmoji = draw ? "🤝" : winner === "X" ? "🏆" : "💀";
  const gameOverLabel = draw ? "draw" : winner === "X" ? "you win" : "you lose";
  return (
    <Game
      appId="ttt"
      gameState={gameState}
      gameOverEmoji={gameOverEmoji}
      gameOverLabel={gameOverLabel}
      onReset={resetGame}
    >
      <GridBox cols={3}>
        {board.map((cell, i) => (
          <CardBox
            key={i}
            onClick={() => handleCell(i)}
            style={{ cursor: gameState === "playing" && !cell ? "pointer" : "default" }}
          >
            {cell ? <MrlyTile {...(cell === "X" ? xStyle : oStyle)} /> : <div style={{ aspectRatio: "1/1" }} />}
          </CardBox>
        ))}
      </GridBox>
    </Game>
  );
}
