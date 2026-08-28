import { useState, useEffect, useRef, useCallback } from "react";
import { MatrixBox, MatrixCell } from "../../components/System";
import { Game, type GameState } from "../../components/Game";
import { Keypad } from "../../components/Keypad";
import { MrlyTile, getMrlyStyle, type TileStyle } from "../../components/MrlyTile";
import { useGameLoop } from "../../hooks/useGameLoop";
import { useMusic } from "../../hooks/useMusic";
import { useSettings } from "../../contexts/SettingsContext";
import {
  getRandomDirection,
  createSnake,
  getRandomPos,
  moveSnake,
  getBorderRadius,
  type Point,
  type Direction,
} from "./logic";

// COMPONENT

export function MrlySnake() {
  const { playRandomNote } = useMusic();
  const { snake: settings } = useSettings();
  const { gridSize, wrap, apples: appleCount, tickMs } = settings;

  const [headStyle, setHeadStyle] = useState<TileStyle>(() => getMrlyStyle());
  const [bodyStyle, setBodyStyle] = useState<TileStyle>(() => getMrlyStyle());
  const [foodStyle, setFoodStyle] = useState<TileStyle>(() => getMrlyStyle());
  const [gameState, setGameState] = useState<GameState>("playing");
  const [score, setScore] = useState(0);

  const [initialDir] = useState<Direction>(() => getRandomDirection());
  const [snake, setSnake] = useState<Point[]>(() => createSnake(initialDir, gridSize));
  const [foods, setFoods] = useState<Point[]>(() => {
    const start = createSnake(initialDir, gridSize);
    const list: Point[] = [];
    for (let i = 0; i < appleCount; i++) {
      list.push(getRandomPos([...start, ...list], gridSize));
    }
    return list;
  });
  const [dir, setDir] = useState<Direction>(initialDir);

  const snakeRef = useRef(snake);
  const foodsRef = useRef(foods);
  const dirRef = useRef(dir);
  const moveQueueRef = useRef<Direction[]>([]);
  const settingsRef = useRef(settings);

  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);
  useEffect(() => {
    foodsRef.current = foods;
  }, [foods]);
  useEffect(() => {
    dirRef.current = dir;
    moveQueueRef.current = [];
  }, [dir]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // HELPERS

  const randomizeStyles = useCallback(() => {
    setHeadStyle(getMrlyStyle());
    setBodyStyle(getMrlyStyle());
    setFoodStyle(getMrlyStyle());
  }, []);

  // GAME ACTIONS

  const prepareGame = useCallback(() => {
    const s = settingsRef.current;
    const newDir = getRandomDirection();
    const startSnake = createSnake(newDir, s.gridSize);
    setSnake(startSnake);
    setDir(newDir);
    const list: Point[] = [];
    for (let i = 0; i < s.apples; i++) {
      list.push(getRandomPos([...startSnake, ...list], s.gridSize));
    }
    setFoods(list);
    setScore(0);
    randomizeStyles();
  }, [randomizeStyles]);

  const resetGame = useCallback(() => {
    prepareGame();
    setGameState("playing");
  }, [prepareGame]);

  useEffect(() => {
    prepareGame();
    setGameState("playing");
  }, [gridSize, appleCount, prepareGame]);

  const handleGameOver = useCallback(() => {
    setGameState("gameover");
  }, []);

  // DIRECTION CONTROLS

  const handleDir = useCallback((d: Direction) => {
    const queue = moveQueueRef.current;
    const lastDir = queue.length > 0 ? queue[queue.length - 1] : dirRef.current;
    const isOpposite =
      (lastDir === "UP" && d === "DOWN") ||
      (lastDir === "DOWN" && d === "UP") ||
      (lastDir === "LEFT" && d === "RIGHT") ||
      (lastDir === "RIGHT" && d === "LEFT");
    if (!isOpposite && lastDir !== d) {
      if (queue.length < 3) {
        queue.push(d);
      }
    }
  }, []);

  // GAME LOOP

  const tick = useCallback(() => {
    let nextDir = dirRef.current;
    if (moveQueueRef.current.length > 0) {
      nextDir = moveQueueRef.current.shift()!;
      dirRef.current = nextDir;
    }
    const s = settingsRef.current;
    const result = moveSnake(snakeRef.current, nextDir, foodsRef.current, s.gridSize, s.wrap);
    setSnake(result.snake);
    if (result.dead) {
      handleGameOver();
      return;
    }
    if (result.ateIndex >= 0) {
      playRandomNote();
      setScore((a) => a + 1);
      setFoods((prev) => {
        const next = [...prev];
        next[result.ateIndex] = getRandomPos([...result.snake, ...next.filter((_, i) => i !== result.ateIndex)], s.gridSize);
        return next;
      });
    }
  }, [handleGameOver, playRandomNote]);

  useGameLoop(tick, 1000 / tickMs, gameState === "playing");

  const headerContent = <>🍎 {score}</>;
  return (
    <Game
      appId="snake"
      gameState={gameState}
      onReset={resetGame}
      headerContent={headerContent}
      footerContent={<Keypad onDirection={handleDir} disabled={gameState !== "playing"} />}
    >
      <MatrixBox cols={gridSize}>
        {foods.map((f, i) => (
          <MatrixCell key={`food-${i}`} x={f.x} y={f.y}>
            <MrlyTile {...foodStyle} clipPath="circle(50%)" />
          </MatrixCell>
        ))}
        {snake.map((seg, i) => {
          const borderRadius = getBorderRadius(snake, seg, i);
          return (
            <MatrixCell key={i} x={seg.x} y={seg.y} zIndex={1}>
              <div style={{ width: "100%", height: "100%", borderRadius, overflow: "hidden" }}>
                <MrlyTile {...(i === 0 ? headStyle : bodyStyle)} />
              </div>
            </MatrixCell>
          );
        })}
      </MatrixBox>
    </Game>
  );
}
