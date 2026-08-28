import { useState, useCallback } from "react";
import { GridBox, CardBox, LinkBox } from "../../components/System";
import { Game, type GameState } from "../../components/Game";
import { MrlyIcon } from "../../components/MrlyIcon";
import {
  COLS,
  MINE_COUNT,
  createEmptyBoard,
  placeMines,
  floodFill,
  revealAllMines,
  checkWin,
  type Cell,
  type Board,
} from "./logic";

// SUBCOMPONENT

function MineCell({ cell, onClick }: { cell: Cell; flagMode: boolean; onClick: () => void }) {
  const emojiStyle: React.CSSProperties = { fontSize: "min(4vw, 20px)" };
  if (cell.state === "flagged") {
    return (
      <CardBox onClick={onClick} style={{ cursor: "pointer" }}>
        <span style={emojiStyle}>⛳</span>
      </CardBox>
    );
  }
  if (cell.state === "revealed") {
    if (cell.mine) {
      return (
        <CardBox active>
          <span style={emojiStyle}>💣</span>
        </CardBox>
      );
    }
    if (cell.adjacentMines === 0) {
      return <CardBox active>&nbsp;</CardBox>;
    }
    return (
      <CardBox active>
        <MrlyIcon text={String(cell.adjacentMines)} scramble={false} style={{ filter: "invert(1)" }} />
      </CardBox>
    );
  }
  return (
    <CardBox onClick={onClick} style={{ cursor: "pointer" }}>
      &nbsp;
    </CardBox>
  );
}

// COMPONENT

export function MrlyMines() {
  const [gameState, setGameState] = useState<GameState>("playing");
  const [board, setBoard] = useState<Board>(createEmptyBoard);
  const [firstClick, setFirstClick] = useState(true);
  const [flagMode, setFlagMode] = useState(false);
  const [gameOverEmoji, setGameOverEmoji] = useState("💀");
  const [gameOverLabel, setGameOverLabel] = useState("game over");

  const flagCount = board.flat().filter((c) => c.state === "flagged").length;

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (gameState !== "playing") return;
      let currentBoard = board;
      if (firstClick) {
        currentBoard = placeMines(currentBoard, row, col);
        setFirstClick(false);
      }
      const cell = currentBoard[row][col];
      if (cell.state === "revealed") return;
      if (flagMode) {
        const newBoard = currentBoard.map((r) => r.map((c) => ({ ...c })));
        newBoard[row][col].state = cell.state === "flagged" ? "hidden" : "flagged";
        setBoard(newBoard);
        return;
      }
      if (cell.state === "flagged") return;
      if (cell.mine) {
        setBoard(revealAllMines(currentBoard));
        setGameOverEmoji("💣");
        setGameOverLabel("boom!");
        setGameState("gameover");
        return;
      }
      const newBoard = floodFill(currentBoard, row, col);
      setBoard(newBoard);
      if (checkWin(newBoard)) {
        setGameOverEmoji("🏆");
        setGameOverLabel("cleared!");
        setGameState("gameover");
      }
    },
    [gameState, board, firstClick, flagMode]
  );

  const resetGame = useCallback(() => {
    setBoard(createEmptyBoard());
    setFirstClick(true);
    setFlagMode(false);
    setGameState("playing");
  }, []);

  const headerContent = <>💣 {MINE_COUNT - flagCount}</>;

  const footerContent = <LinkBox onClick={() => setFlagMode((f) => !f)}>{flagMode ? "⛳ flag" : "⛏️ dig"}</LinkBox>;

  return (
    <Game
      appId="mines"
      gameState={gameState}
      gameOverEmoji={gameOverEmoji}
      gameOverLabel={gameOverLabel}
      onReset={resetGame}
      headerContent={headerContent}
      footerContent={footerContent}
    >
      <GridBox cols={COLS}>
        {board.flatMap((row, r) =>
          row.map((cell, c) => (
            <MineCell key={`${r}-${c}`} cell={cell} flagMode={flagMode} onClick={() => handleCellClick(r, c)} />
          ))
        )}
      </GridBox>
    </Game>
  );
}
