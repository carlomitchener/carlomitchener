import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MatrixBox } from "../../components/System";
import { Game, type GameState } from "../../components/Game";
import { Keypad } from "../../components/Keypad";
import { MrlyTile, type TileStyle } from "../../components/MrlyTile";
import { useGameLoop } from "../../hooks/useGameLoop";
import { useTheme } from "../../contexts/ThemeContext";
import { getUniqueColorNames, colorCSS } from "../../lib/colors";
import { MRLY_NUMBERS } from "../../mrly";
import { useMusic } from "../../hooks/useMusic";
import {
  GRIDS,
  GRID_SIZE,
  TICK_MS,
  GHOST_MOVE_RATIO,
  FREEZE_DURATION,
  TILE_TYPE,
  parseGrid,
  randomDir,
  getOptimalRandomMove,
  getMoveTarget,
  type Point,
  type Direction,
  type FreezeMode,
} from "./logic";

// TYPES

interface Entity extends Point {
  direction: Direction;
  style: TileStyle;
}

interface Ghost extends Entity {
  id: number;
}

// COMPONENT

export function MrlyEscape() {
  const { mode } = useTheme();
  const { playRandomNote } = useMusic();
  const [activeGridString, setActiveGridString] = useState(() => GRIDS[Math.floor(Math.random() * GRIDS.length)]);

  const { baseGrid, ghostStarts } = useMemo(() => {
    const grid = parseGrid(activeGridString);
    const gSpawns: Point[] = [];
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === TILE_TYPE.GHOST) gSpawns.push({ x, y });
      });
    });
    return { baseGrid: grid, ghostStarts: gSpawns };
  }, [activeGridString]);

  const [levelNumber, setLevelNumber] = useState<number>(3);

  const wallColor = mode ? "white" : "black";
  const wallStyle = useMemo(
    () => ({ design: "carpet", number: levelNumber, color: wallColor }) as TileStyle,
    [levelNumber, wallColor]
  );

  const isPacmanWalkable = useCallback(
    (x: number, y: number): boolean => {
      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
      const type = baseGrid[y][x];
      if (type === TILE_TYPE.WALL) return false;
      if (type === TILE_TYPE.DOOR) return foodsRef.current.length === 0;
      return true;
    },
    [baseGrid]
  );

  const isGhostWalkable = useCallback(
    (x: number, y: number): boolean => {
      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
      const type = baseGrid[y][x];
      return type !== TILE_TYPE.WALL && type !== TILE_TYPE.DOOR;
    },
    [baseGrid]
  );

  const [gameState, setGameState] = useState<GameState>("playing");
  const [level, setLevel] = useState(1);
  const [pacmanColor] = useState(() => getUniqueColorNames(1)[0]);
  const [ghostPalette] = useState(() => getUniqueColorNames(4));
  const [pacman, setPacman] = useState<Entity>({
    x: 5,
    y: 5,
    direction: "IDLE",
    style: { design: "net", number: 3, color: pacmanColor },
  });
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [foods, setFoods] = useState<Point[]>([]);

  const pacmanRef = useRef(pacman);
  const ghostsRef = useRef(ghosts);
  const foodsRef = useRef(foods);
  const inputRef = useRef<Direction>("IDLE");
  const tickCountRef = useRef(0);
  const freezeUntilRef = useRef(0);
  const freezeModeRef = useRef<FreezeMode>("none");

  useEffect(() => {
    pacmanRef.current = pacman;
  }, [pacman]);
  useEffect(() => {
    ghostsRef.current = ghosts;
  }, [ghosts]);
  useEffect(() => {
    foodsRef.current = foods;
  }, [foods]);

  const initLevel = useCallback(() => {
    const num = MRLY_NUMBERS[Math.floor(Math.random() * MRLY_NUMBERS.length)];
    setLevelNumber(num);
    setPacman({
      x: 5,
      y: 5,
      direction: "IDLE",
      style: { design: "net", number: num, color: pacmanColor },
    });
    inputRef.current = "IDLE";
    const newGhosts: Ghost[] = ghostStarts.map((pos, i) => ({
      id: i,
      x: pos.x,
      y: pos.y,
      direction: randomDir(),
      style: { design: "void", number: num, color: ghostPalette[i % ghostPalette.length] },
    }));
    setGhosts(newGhosts);
    const newFoods: Point[] = [];
    baseGrid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === TILE_TYPE.FLOOR) {
          newFoods.push({ x, y });
        }
      });
    });
    setFoods(newFoods);
    tickCountRef.current = 0;
    freezeUntilRef.current = 0;
    freezeModeRef.current = "none";
  }, [pacmanColor, ghostStarts, ghostPalette, baseGrid]);

  useEffect(() => {
    initLevel();
  }, [ghostStarts, initLevel]);

  const resetGame = useCallback(() => {
    const others = GRIDS.filter((g) => g !== activeGridString);
    const newGrid = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : activeGridString;
    setLevel(1);
    setGameState("playing");
    if (newGrid === activeGridString) {
      initLevel();
    } else {
      setActiveGridString(newGrid);
    }
  }, [initLevel, activeGridString]);

  const handleGameOver = useCallback(() => {
    setGameState("gameover");
  }, []);

  const tick = useCallback(() => {
    if (freezeUntilRef.current > 0) {
      if (Date.now() > freezeUntilRef.current) {
        freezeUntilRef.current = 0;
        if (freezeModeRef.current === "win") {
          setLevel((l) => l + 1);
          const others = GRIDS.filter((g) => g !== activeGridString);
          const nextGrid = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : activeGridString;
          if (nextGrid === activeGridString) {
            initLevel();
          } else {
            setActiveGridString(nextGrid);
          }
        } else if (freezeModeRef.current === "lose") {
          handleGameOver();
        }
        freezeModeRef.current = "none";
      }
      return;
    }
    const curPac = pacmanRef.current;
    if (inputRef.current === "IDLE" && tickCountRef.current === 0) {
      return;
    }
    const nextPac = { ...curPac };
    const curGhosts = [...ghostsRef.current];
    if (inputRef.current !== "IDLE") {
      const t = getMoveTarget(curPac.x, curPac.y, inputRef.current);
      if (isPacmanWalkable(t.x, t.y)) {
        nextPac.x = t.x;
        nextPac.y = t.y;
        nextPac.direction = inputRef.current;
      }
      inputRef.current = "IDLE";
    }
    const currentFoods = foodsRef.current;
    const consumedIdx = currentFoods.findIndex((f) => f.x === nextPac.x && f.y === nextPac.y);
    if (consumedIdx !== -1) {
      const nextFoods = [...currentFoods];
      nextFoods.splice(consumedIdx, 1);
      setFoods(nextFoods);
      playRandomNote();
    }
    const pacTile = baseGrid[nextPac.y][nextPac.x];
    if (pacTile === TILE_TYPE.DOOR) {
      setPacman(nextPac);
      freezeUntilRef.current = Date.now() + FREEZE_DURATION;
      freezeModeRef.current = "win";
      return;
    }
    tickCountRef.current++;
    if (tickCountRef.current % GHOST_MOVE_RATIO === 0) {
      for (let i = 0; i < curGhosts.length; i++) {
        const g = curGhosts[i];
        const smartMove = getOptimalRandomMove(g.x, g.y, nextPac.x, nextPac.y, isGhostWalkable);
        const chosenDir = smartMove;
        const t = getMoveTarget(g.x, g.y, chosenDir);
        if (chosenDir !== "IDLE" && isGhostWalkable(t.x, t.y)) {
          g.x = t.x;
          g.y = t.y;
          g.direction = chosenDir;
        }
      }
      setGhosts(curGhosts);
    }
    setPacman(nextPac);
    let collision = false;
    for (const g of curGhosts) {
      if (g.x === nextPac.x && g.y === nextPac.y) {
        collision = true;
        break;
      }
    }
    if (collision) {
      freezeUntilRef.current = Date.now() + FREEZE_DURATION;
      freezeModeRef.current = "lose";
      setPacman(nextPac);
      setGhosts(curGhosts);
    }
  }, [isPacmanWalkable, isGhostWalkable, handleGameOver, initLevel, baseGrid, activeGridString, playRandomNote]);

  useGameLoop(tick, 1000 / TICK_MS, gameState === "playing");

  const handleDir = useCallback(
    (d: Direction) => {
      if (gameState === "playing") {
        inputRef.current = d;
      }
    },
    [gameState]
  );

  const headerContent = <>🚪 {level}</>;
  return (
    <Game
      appId="escape"
      gameState={gameState}
      onReset={resetGame}
      headerContent={headerContent}
      footerContent={<Keypad onDirection={handleDir} disabled={gameState !== "playing"} />}
    >
      <MatrixBox cols={GRID_SIZE} style={{ position: "relative" }}>
        {baseGrid.flat().map((type, i) => {
          const x = i % GRID_SIZE;
          const y = Math.floor(i / GRID_SIZE);
          const key = `${x},${y}`;
          const isWall = type === TILE_TYPE.WALL;
          const isDoor = type === TILE_TYPE.DOOR;
          const isLocked = foods.length > 0;
          const showWall = isWall || (isDoor && isLocked);
          let dynamicDesign = "carpet";
          if (showWall) {
            const isW = (cx: number, cy: number) => {
              if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) return false;
              const t = baseGrid[cy][cx];
              return t === TILE_TYPE.WALL || (t === TILE_TYPE.DOOR && isLocked);
            };
            const u = isW(x, y - 1);
            const d = isW(x, y + 1);
            const l = isW(x - 1, y);
            const r = isW(x + 1, y);
            if (u && d) dynamicDesign = "vtree";
            else if (l && r) dynamicDesign = "htree";
          }
          return (
            <div key={key} style={{ gridColumn: x + 1, gridRow: y + 1, width: "100%", height: "100%" }}>
              {showWall && <MrlyTile {...wallStyle} design={dynamicDesign} />}
            </div>
          );
        })}
        {foods.map((f, i) => (
          <div
            key={`food-${i}`}
            style={{
              position: "absolute",
              left: `${f.x * (100 / GRID_SIZE)}%`,
              top: `${f.y * (100 / GRID_SIZE)}%`,
              width: `${100 / GRID_SIZE}%`,
              height: `${100 / GRID_SIZE}%`,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "33.5%",
                top: "33.5%",
                width: "33%",
                height: "33%",
                borderRadius: "50%",
                backgroundColor: colorCSS(wallStyle.color),
              }}
            />
          </div>
        ))}
        {ghosts.map((g) => (
          <div
            key={g.id}
            style={{
              position: "absolute",
              left: `${g.x * (100 / GRID_SIZE)}%`,
              top: `${g.y * (100 / GRID_SIZE)}%`,
              width: `${100 / GRID_SIZE}%`,
              height: `${100 / GRID_SIZE}%`,
              zIndex: 10,
            }}
          >
            <div style={{ width: "100%", height: "100%" }}>
              <MrlyTile {...g.style} />
            </div>
          </div>
        ))}
        <div
          style={{
            position: "absolute",
            left: `${pacman.x * (100 / GRID_SIZE)}%`,
            top: `${pacman.y * (100 / GRID_SIZE)}%`,
            width: `${100 / GRID_SIZE}%`,
            height: `${100 / GRID_SIZE}%`,
            zIndex: 20,
          }}
        >
          <div style={{ position: "absolute", inset: 0 }}>
            <MrlyTile {...pacman.style} />
          </div>
        </div>
      </MatrixBox>
    </Game>
  );
}
