import { useState, useEffect, useRef, useCallback } from "react";
import { MatrixBox, MatrixCell } from "../../components/System";
import { Game, type GameState } from "../../components/Game";
import { Keypad } from "../../components/Keypad";
import { MrlyTile } from "../../components/MrlyTile";
import { useGameLoop } from "../../hooks/useGameLoop";
import { useTheme } from "../../contexts/ThemeContext";
import { useMusic } from "../../hooks/useMusic";
import {
  GRID_COLS,
  GRID_ROWS,
  BASE_FPS,
  getRandomTile,
  canMove,
  checkForMatches,
  crushAndGravity,
  type TileData,
} from "./logic";

// COMPONENT

export function MrlyCrush() {
  const { mode } = useTheme();
  const { playRandomNote } = useMusic();
  const [grid, setGrid] = useState<(TileData | null)[][]>(
    Array(GRID_ROWS)
      .fill(null)
      .map(() => Array(GRID_COLS).fill(null))
  );
  const [activeTile, setActiveTile] = useState<{ x: number; y: number; data: TileData } | null>(null);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [crushed, setCrushed] = useState(0);

  const gridRef = useRef(grid);
  const activeTileRef = useRef(activeTile);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);
  useEffect(() => {
    activeTileRef.current = activeTile;
  }, [activeTile]);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const spawnTile = useCallback(() => {
    const newTile = getRandomTile();
    const startX = Math.floor(Math.random() * GRID_COLS);
    const startY = 0;
    if (gridRef.current[startY][startX] !== null) {
      setGameState("gameover");
      return;
    }
    setActiveTile({ x: startX, y: startY, data: newTile });
  }, []);

  const lockActiveTile = useCallback(() => {
    const at = activeTileRef.current;
    if (!at) return;
    const newGrid = gridRef.current.map((row) => [...row]);
    newGrid[at.y][at.x] = at.data;
    playRandomNote();
    const { grid: finalGrid } = checkForMatches(newGrid);
    setGrid(finalGrid);
    gridRef.current = finalGrid;
    activeTileRef.current = null;
    setActiveTile(null);
    const isFull = finalGrid[0].some((cell) => cell !== null);
    if (isFull) {
      setGameState("gameover");
    } else {
      spawnTile();
    }
  }, [spawnTile, playRandomNote]);

  const tick = useCallback(() => {
    const at = activeTileRef.current;
    if (at) {
      if (canMove(at.x, at.y + 1, gridRef.current)) {
        setActiveTile({ ...at, y: at.y + 1 });
      } else {
        lockActiveTile();
      }
    } else {
      spawnTile();
    }
  }, [spawnTile, lockActiveTile]);

  useGameLoop(tick, BASE_FPS, gameState === "playing");

  const handleCrush = useCallback(() => {
    if (gameStateRef.current !== "playing") return;
    const { grid: finalGrid, points } = crushAndGravity(gridRef.current);
    if (points === 0) return;
    setCrushed((c) => c + points);
    setGrid(finalGrid);
    gridRef.current = finalGrid;
  }, []);

  const moveLeft = useCallback(() => {
    if (gameStateRef.current !== "playing" || !activeTileRef.current) return;
    const at = activeTileRef.current;
    if (canMove(at.x - 1, at.y, gridRef.current)) {
      setActiveTile({ ...at, x: at.x - 1 });
    }
  }, []);

  const moveRight = useCallback(() => {
    if (gameStateRef.current !== "playing" || !activeTileRef.current) return;
    const at = activeTileRef.current;
    if (canMove(at.x + 1, at.y, gridRef.current)) {
      setActiveTile({ ...at, x: at.x + 1 });
    }
  }, []);

  const moveDown = useCallback(() => {
    if (gameStateRef.current !== "playing" || !activeTileRef.current) return;
    const at = { ...activeTileRef.current };
    while (canMove(at.x, at.y + 1, gridRef.current)) {
      at.y += 1;
    }
    activeTileRef.current = at;
    setActiveTile(at);
    lockActiveTile();
  }, [lockActiveTile]);

  const prepareGame = useCallback(() => {
    setGrid(
      Array(GRID_ROWS)
        .fill(null)
        .map(() => Array(GRID_COLS).fill(null))
    );
    gridRef.current = Array(GRID_ROWS)
      .fill(null)
      .map(() => Array(GRID_COLS).fill(null));
    setActiveTile(null);
    activeTileRef.current = null;
    setCrushed(0);
  }, []);

  const resetGame = useCallback(() => {
    prepareGame();
    setGameState("playing");
  }, [prepareGame]);

  const handleDirection = useCallback(
    (dir: "UP" | "DOWN" | "LEFT" | "RIGHT") => {
      switch (dir) {
        case "LEFT":
          moveLeft();
          break;
        case "RIGHT":
          moveRight();
          break;
        case "DOWN":
          moveDown();
          break;
        case "UP":
          handleCrush();
          break;
      }
    },
    [moveLeft, moveRight, moveDown, handleCrush]
  );

  const headerContent = <>💎 {crushed}</>;
  const footerContent = <Keypad onDirection={handleDirection} disabled={gameState !== "playing"} />;

  return (
    <Game
      appId="crush"
      gameState={gameState}
      onReset={resetGame}
      headerContent={headerContent}
      footerContent={footerContent}
    >
      <MatrixBox cols={GRID_COLS}>
        {grid.map((row, y) =>
          row.map(
            (cell, x) =>
              cell && (
                <MatrixCell key={`${x}-${y}`} x={x} y={y}>
                  <MrlyTile {...cell} color={cell.isCrushable ? (mode ? "white" : "black") : cell.color} />
                </MatrixCell>
              )
          )
        )}
        {activeTile && (
          <MatrixCell x={activeTile.x} y={activeTile.y} zIndex={10}>
            <MrlyTile {...activeTile.data} />
          </MatrixCell>
        )}
      </MatrixBox>
    </Game>
  );
}
