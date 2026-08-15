import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { getUniqueColors } from "../../lib/colors.js";
import { GridBox, LinkBox, InfoBox, MatrixBox } from "../../components/System";
import { MrlyIcon } from "../../components/MrlyIcon";
import { Game, type GameState } from "../../components/Game";
import {
  GRID_SIZE,
  createInitialBoard,
  isKingInCheck,
  getValidMoves,
  getGameStatus,
  executeMove,
  getMonkeyMove,
  type PieceType,
  type Team,
  type BoardState,
  type Position,
} from "./logic";
import PIECES from "./pieces.json";

// TYPES

type HistoryEntry = {
  board: BoardState;
  turn: Team;
  ep: Position | null;
  lastMove: { from: Position; to: Position } | null;
};

// CONFIG

const AI_DELAY = 800;

const PIECE_KEY: Record<PieceType, keyof typeof PIECES> = {
  K: "KING",
  Q: "QUEEN",
  R: "ROOK",
  B: "BISHOP",
  N: "KNIGHT",
  P: "PAWN",
};

const DEAD_KING = ["00000", "01110", "01010", "01110", "00000"];

// COMPONENT

export function MrlyChess() {
  // COLORS
  const [colors, setColors] = useState(() => getUniqueColors(2));
  const randomizeColors = useCallback(() => setColors(getUniqueColors(2)), []);

  // GAME STATE
  const [gameState, setGameState] = useState<GameState>("playing");

  // BOARD
  const [board, setBoard] = useState<BoardState>(() => createInitialBoard());
  const [turn, setTurn] = useState<Team>("white");
  const [ep, setEp] = useState<Position | null>(null);
  const [selected, setSelected] = useState<Position | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([]);
  const [gameStatus, setGameStatus] = useState<"check" | "checkmate" | "stalemate" | null>(null);
  const [winner, setWinner] = useState<Team | null>(null);

  // PLAYER
  const [playerColor, setPlayerColor] = useState<Team>(() => (Math.random() < 0.5 ? "white" : "black"));
  const [aiThinking, setAiThinking] = useState(false);
  const aiColor: Team = playerColor === "white" ? "black" : "white";
  const gameOver = gameState === "gameover";

  // HISTORY
  const [history, setHistory] = useState<HistoryEntry[]>(() => [
    { board: createInitialBoard(), turn: "white", ep: null, lastMove: null },
  ]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // ORIENTATION
  const isFlipped = playerColor === "black";

  // RESET
  const resetGame = useCallback(() => {
    randomizeColors();
    const b = createInitialBoard();
    setBoard(b);
    setTurn("white");
    setEp(null);
    setSelected(null);
    setPossibleMoves([]);
    setGameStatus(null);
    setWinner(null);
    setPlayerColor(Math.random() < 0.5 ? "white" : "black");
    setAiThinking(false);
    setHistory([{ board: b, turn: "white", ep: null, lastMove: null }]);
    setHistoryIndex(-1);
    setGameState("playing");
  }, [randomizeColors]);

  // APPLY MOVE
  const applyMove = useCallback(
    (from: Position, to: Position, currentBoard: BoardState, currentEp: Position | null) => {
      const result = executeMove(from, to, currentBoard, currentEp);
      setBoard(result.board);
      setEp(result.enPassantTarget);
      const mover = currentBoard[from.y][from.x]!.team;
      const nextTurn: Team = mover === "white" ? "black" : "white";
      const status = getGameStatus(nextTurn, result.board, result.enPassantTarget);
      setGameStatus(status);
      if (status === "checkmate") {
        setWinner(mover);
        setGameState("gameover");
      } else if (status === "stalemate") {
        setWinner(null);
        setGameState("gameover");
      } else {
        setTurn(nextTurn);
      }
      setHistory((prev) => [
        ...prev,
        { board: result.board, turn: nextTurn, ep: result.enPassantTarget, lastMove: { from, to } },
      ]);
      setHistoryIndex(-1);
    },
    []
  );

  // AI MOVE
  const thinkingRef = useRef(false);
  useEffect(() => {
    if (gameOver || turn !== aiColor) return;
    if (gameStatus === "checkmate" || gameStatus === "stalemate") return;
    if (thinkingRef.current) return;
    thinkingRef.current = true;
    setAiThinking(true);
    const timer = setTimeout(() => {
      const move = getMonkeyMove(aiColor, board, ep);
      if (move) applyMove(move.from, move.to, board, ep);
      setAiThinking(false);
      thinkingRef.current = false;
    }, AI_DELAY);
    return () => {
      clearTimeout(timer);
      thinkingRef.current = false;
    };
  }, [gameOver, turn, aiColor, board, ep, gameStatus, applyMove]);

  // PLAYER CLICK
  const handleCellClick = (x: number, y: number) => {
    if (gameOver || turn !== playerColor || aiThinking || historyIndex !== -1) return;
    const clicked = board[y][x];
    if (selected && possibleMoves.some((m) => m.x === x && m.y === y)) {
      applyMove(selected, { x, y }, board, ep);
      setSelected(null);
      setPossibleMoves([]);
      return;
    }
    if (clicked && clicked.team === playerColor) {
      setSelected({ x, y });
      setPossibleMoves(getValidMoves(clicked, x, y, board, ep));
    } else {
      setSelected(null);
      setPossibleMoves([]);
    }
  };

  // VIEW STATE
  const viewBoard = historyIndex === -1 ? board : (history[historyIndex]?.board ?? board);
  const viewLastMove = historyIndex === -1 ? history[history.length - 1]?.lastMove : history[historyIndex]?.lastMove;
  const totalMoves = Math.max(0, history.length - 1);
  const currentMoveNum = historyIndex === -1 ? totalMoves : historyIndex;
  const [lightColor, darkColor] = colors;

  const viewCheck = useMemo(() => {
    if (!viewBoard.length) return { w: false, b: false };
    return { w: isKingInCheck("white", viewBoard), b: isKingInCheck("black", viewBoard) };
  }, [viewBoard]);

  // CHECK PULSE
  const [checkPulse, setCheckPulse] = useState(0);
  useEffect(() => {
    if (historyIndex !== -1 || gameStatus === "checkmate") return;
    if (!viewCheck.w && !viewCheck.b) return;
    const interval = setInterval(() => setCheckPulse((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [viewCheck.w, viewCheck.b, historyIndex, gameStatus]);

  // GAME PROPS
  const gameOverEmoji = winner === playerColor ? "👑" : winner ? "🐒" : "🤝";
  const gameOverLabel = winner ? `${winner} wins` : "draw";
  const headerContent = <>{aiThinking ? "thinking..." : turn}</>;

  const footerContent = (
    <GridBox cols={5}>
      <LinkBox onClick={() => setHistoryIndex(0)} disabled={currentMoveNum <= 0}>
        <MrlyIcon text="←←" />
      </LinkBox>
      <LinkBox onClick={() => setHistoryIndex(Math.max(0, currentMoveNum - 1))} disabled={currentMoveNum <= 0}>
        <MrlyIcon text="←" />
      </LinkBox>
      <InfoBox>
        {currentMoveNum} / {totalMoves}
      </InfoBox>
      <LinkBox
        onClick={() => setHistoryIndex(currentMoveNum + 1 >= totalMoves ? -1 : currentMoveNum + 1)}
        disabled={currentMoveNum >= totalMoves}
      >
        <MrlyIcon text="→" />
      </LinkBox>
      <LinkBox onClick={() => setHistoryIndex(-1)} disabled={currentMoveNum >= totalMoves}>
        <MrlyIcon text="→→" />
      </LinkBox>
    </GridBox>
  );

  return (
    <Game
      appId="chess"
      gameState={gameState}
      gameOverEmoji={gameOverEmoji}
      gameOverLabel={gameOverLabel}
      onReset={resetGame}
      headerContent={headerContent}
      footerContent={footerContent}
    >
      <MatrixBox cols={GRID_SIZE}>
        {Array.from({ length: GRID_SIZE }).map((_, i) => {
          const y = isFlipped ? GRID_SIZE - 1 - i : i;
          const row = viewBoard[y];
          if (!row) return null;
          return row.map((_, j) => {
            const x = isFlipped ? GRID_SIZE - 1 - j : j;
            const piece = viewBoard[y][x];
            const bg = (x + y) % 2 === 1 ? darkColor : lightColor;
            const isSel = selected?.x === x && selected?.y === y && historyIndex === -1;
            const isMove = possibleMoves.some((m) => m.x === x && m.y === y) && historyIndex === -1;
            const isLast =
              viewLastMove &&
              ((viewLastMove.from.x === x && viewLastMove.from.y === y) ||
                (viewLastMove.to.x === x && viewLastMove.to.y === y));
            const isHighlighted = isSel || isLast;
            const isLive = historyIndex === -1;
            const inCheck = piece?.type === "K" && (piece.team === "white" ? viewCheck.w : viewCheck.b);
            const isDead = !!(inCheck && gameStatus === "checkmate" && isLive);
            const isChecked = !!(inCheck && !isDead && isLive);
            const justMoved = !!(isLive && viewLastMove && viewLastMove.to.x === x && viewLastMove.to.y === y);
            const highlightBg = isHighlighted
              ? (piece ?? viewBoard[viewLastMove!.to.y][viewLastMove!.to.x])?.team === "white"
                ? "#111"
                : "#fff"
              : bg;
            return (
              <div
                key={`${x}-${y}`}
                onClick={() => handleCellClick(x, y)}
                style={{
                  backgroundColor: highlightBg,
                  padding: "var(--gap)",
                  position: "relative",
                  minHeight: 0,
                  overflow: "hidden",
                  cursor: !gameOver && historyIndex === -1 ? "pointer" : "default",
                }}
              >
                {piece && (
                  <div style={{ width: "100%", height: "100%" }}>
                    <MrlyIcon
                      key={isChecked ? `check-${checkPulse}` : justMoved ? `move-${totalMoves}` : "s"}
                      grid={isDead ? DEAD_KING : PIECES[PIECE_KEY[piece.type]]}
                      scramble={isChecked || justMoved}
                      color={piece.team === "white" ? "#fff" : "#111"}
                      style={{ width: "100%", height: "100%", minHeight: 0 }}
                    />
                  </div>
                )}
                {isMove && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "33%",
                      height: "33%",
                      borderRadius: "50%",
                      backgroundColor: playerColor === "white" ? "#111" : "#fff",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>
            );
          });
        })}
      </MatrixBox>
    </Game>
  );
}
