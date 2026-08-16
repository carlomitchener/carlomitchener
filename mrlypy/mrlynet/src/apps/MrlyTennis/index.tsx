import { useState, useEffect, useRef, useCallback } from "react";
import { Game, type GameState } from "../../components/Game";
import { Keypad, type Direction } from "../../components/Keypad";
import { MrlyTile } from "../../components/MrlyTile";
import { useGameLoop } from "../../hooks/useGameLoop";
import { useTheme } from "../../contexts/ThemeContext";
import { useMusic } from "../../hooks/useMusic";
import {
  BOARD_SIZE,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_Y,
  BALL_SIZE,
  BALL_SPEED,
  BLOCK_WIDTH,
  INITIAL_ROWS,
  FPS,
  PADDLE_STEP,
  PADDLE_MIN_Y,
  PADDLE_MAX_Y,
  getGameTileStyle,
  generatePaddleStyle,
  generateRow,
  updateBall,
  tickBlocks,
  getNextTickThreshold,
  type Block,
} from "./logic";

// COMPONENT

export function MrlyTennis() {
  const { playRandomNote } = useMusic();
  const { mode } = useTheme();

  const [gameState, setGameState] = useState<GameState>("playing");
  const [bricks, setBricks] = useState(0);
  const [ball, setBall] = useState(() => {
    const px = (BOARD_SIZE - PADDLE_WIDTH) / 2;
    const angle = (Math.random() * 60 - 30) * (Math.PI / 180);
    return {
      x: px + PADDLE_WIDTH / 2 - BALL_SIZE / 2,
      y: PADDLE_Y - BALL_SIZE,
      dx: BALL_SPEED * Math.sin(angle),
      dy: -BALL_SPEED * Math.cos(angle),
      style: getGameTileStyle(),
    };
  });
  const [paddle, setPaddle] = useState({
    x: (BOARD_SIZE - PADDLE_WIDTH) / 2,
    y: PADDLE_Y,
    style: generatePaddleStyle(),
  });
  const [blocks, setBlocks] = useState<Block[]>(() => {
    const b: Block[] = [];
    for (let r = 0; r < INITIAL_ROWS; r++) b.push(...generateRow(r, r));
    return b;
  });

  const inputRef = useRef<Direction | null>(null);
  const ballRef = useRef(ball);
  const paddleRef = useRef(paddle);
  const blocksRef = useRef<Block[]>([]);
  const hitCountRef = useRef(0);
  const scoreRef = useRef(0);
  const tickThresholdRef = useRef(getNextTickThreshold(0));

  useEffect(() => {
    ballRef.current = ball;
  }, [ball]);
  useEffect(() => {
    paddleRef.current = paddle;
  }, [paddle]);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const prepareGame = useCallback(() => {
    const newBlocks: Block[] = [];
    for (let r = 0; r < INITIAL_ROWS; r++) {
      const rowBlocks = generateRow(r, r);
      newBlocks.push(...rowBlocks);
    }
    setBlocks(newBlocks);
    setBricks(0);
    hitCountRef.current = 0;
    scoreRef.current = 0;
    tickThresholdRef.current = getNextTickThreshold(0);
    inputRef.current = null;
    const paddleStartX = (BOARD_SIZE - PADDLE_WIDTH) / 2;
    const angle = (Math.random() * 60 - 30) * (Math.PI / 180);
    setBall({
      x: paddleStartX + PADDLE_WIDTH / 2 - BALL_SIZE / 2,
      y: PADDLE_Y - BALL_SIZE,
      dx: BALL_SPEED * Math.sin(angle),
      dy: -BALL_SPEED * Math.cos(angle),
      style: getGameTileStyle(),
    });
    setPaddle({
      x: paddleStartX,
      y: PADDLE_Y,
      style: generatePaddleStyle(),
    });
  }, []);

  const resetGame = useCallback(() => {
    prepareGame();
    setGameState("playing");
  }, [prepareGame]);

  const handleDir = useCallback(
    (d: Direction) => {
      if (gameState !== "playing") return;
      inputRef.current = d;
    },
    [gameState]
  );

  const update = useCallback(() => {
    if (gameState !== "playing") return;
    // MOVE PADDLE
    const dir = inputRef.current;
    if (dir) {
      inputRef.current = null;
      setPaddle((prev) => {
        let { x, y } = prev;
        if (dir === "LEFT") x = Math.max(0, x - PADDLE_STEP);
        if (dir === "RIGHT") x = Math.min(BOARD_SIZE - PADDLE_WIDTH, x + PADDLE_STEP);
        if (dir === "UP") y = Math.max(PADDLE_MIN_Y, y - PADDLE_STEP);
        if (dir === "DOWN") y = Math.min(PADDLE_MAX_Y, y + PADDLE_STEP);
        return { ...prev, x, y };
      });
    }
    // UPDATE BALL
    const p = paddleRef.current;
    const result = updateBall(ballRef.current, p.x, p.y, blocksRef.current);
    let updatedBlocks = result.blocks;
    if (result.paddleHit) {
      hitCountRef.current++;
      if (hitCountRef.current >= tickThresholdRef.current) {
        hitCountRef.current = 0;
        updatedBlocks = tickBlocks(updatedBlocks);
        tickThresholdRef.current = getNextTickThreshold(scoreRef.current);
      }
    }
    setBlocks(updatedBlocks);
    if (result.gameOver) {
      setGameState("gameover");
      return;
    }
    if (result.bricksHit > 0) {
      scoreRef.current += result.bricksHit;
      setBricks(scoreRef.current);
    }
    for (let i = 0; i < result.soundEvents; i++) {
      playRandomNote();
    }
    setBall(result.ball);
  }, [gameState, playRandomNote]);

  useGameLoop(update, FPS, gameState === "playing");

  const headerContent = <>🧱 {bricks}</>;
  const footerContent = <Keypad onDirection={handleDir} disabled={gameState !== "playing"} />;

  return (
    <Game
      appId="tennis"
      gameState={gameState}
      onReset={resetGame}
      headerContent={headerContent}
      footerContent={footerContent}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "100%",
          background: mode ? "black" : "white",
          overflow: "hidden",
          borderRadius: "var(--border-radius)",
        }}
      >
        {blocks.map(
          (b) =>
            b.active && (
              <div
                key={b.id}
                style={{
                  position: "absolute",
                  left: `${(b.x / BOARD_SIZE) * 100}%`,
                  top: `${(b.y / BOARD_SIZE) * 100}%`,
                  width: `${(b.width / BOARD_SIZE) * 100}%`,
                  height: `${(b.height / BOARD_SIZE) * 100}%`,
                  display: "flex",
                }}
              >
                {Array.from({ length: BLOCK_WIDTH }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: "100%" }}>
                    <MrlyTile {...b.style} />
                  </div>
                ))}
              </div>
            )
        )}
        {Array.from({ length: PADDLE_WIDTH }, (_, i) => (
          <div
            key={`paddle-${i}`}
            style={{
              position: "absolute",
              left: `${((paddle.x + i) / BOARD_SIZE) * 100}%`,
              top: `${(paddle.y / BOARD_SIZE) * 100}%`,
              width: `${(1 / BOARD_SIZE) * 100}%`,
              height: `${(PADDLE_HEIGHT / BOARD_SIZE) * 100}%`,
              borderRadius: "50%",
              borderTopLeftRadius: i === 0 ? "50%" : undefined,
              borderBottomLeftRadius: i === 0 ? "50%" : undefined,
              borderTopRightRadius: i === PADDLE_WIDTH - 1 ? "50%" : undefined,
              borderBottomRightRadius: i === PADDLE_WIDTH - 1 ? "50%" : undefined,
              overflow: "hidden",
            }}
          >
            <MrlyTile {...paddle.style} />
          </div>
        ))}
        <div
          style={{
            position: "absolute",
            left: `${(ball.x / BOARD_SIZE) * 100}%`,
            top: `${(ball.y / BOARD_SIZE) * 100}%`,
            width: `${(BALL_SIZE / BOARD_SIZE) * 100}%`,
            height: `${(BALL_SIZE / BOARD_SIZE) * 100}%`,
          }}
        >
          <MrlyTile {...ball.style} clipPath="circle(50%)" />
        </div>
      </div>
    </Game>
  );
}
