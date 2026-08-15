// TYPES

export type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
export type Team = "white" | "black";

export type Piece = {
  type: PieceType;
  team: Team;
  hasMoved: boolean;
};

export type BoardState = (Piece | null)[][];
export type Position = { x: number; y: number };

export type MoveResult = {
  board: BoardState;
  enPassantTarget: Position | null;
};

// CONFIG

export const GRID_SIZE = 8;

const PIECE_VALUES: Record<PieceType, number> = {
  P: 1,
  N: 3,
  B: 3,
  R: 5,
  Q: 9,
  K: 100,
};

const MAX_DEPTH = 3;

const SLIDES = {
  ORTHO: [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ],
  DIAG: [
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: 1, y: 1 },
  ],
};

const KNIGHT_JUMPS = [
  { x: 1, y: -2 },
  { x: 2, y: -1 },
  { x: 2, y: 1 },
  { x: 1, y: 2 },
  { x: -1, y: 2 },
  { x: -2, y: 1 },
  { x: -2, y: -1 },
  { x: -1, y: -2 },
];

// EVAL TABLES

const PST: Record<PieceType, readonly number[]> = {
  P: [
    0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  N: [
    -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15,
    20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  B: [
    -20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10,
    5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10,
    -10, -10, -10, -10, -10, -20,
  ],
  R: [
    0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0,
    0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0,
  ],
  Q: [
    -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0,
    -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10,
    -10, -20,
  ],
  K: [
    -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40,
    -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20,
    -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

// BOARD SETUP

export function createInitialBoard(): BoardState {
  const board: BoardState = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(null));
  const backRank: PieceType[] = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  backRank.forEach((type, x) => {
    board[0][x] = { type, team: "black", hasMoved: false };
    board[7][x] = { type, team: "white", hasMoved: false };
  });
  for (let x = 0; x < GRID_SIZE; x++) {
    board[1][x] = { type: "P", team: "black", hasMoved: false };
    board[6][x] = { type: "P", team: "white", hasMoved: false };
  }
  return board;
}

// ENGINE

function inBounds(x: number, y: number) {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

function cloneBoard(board: BoardState): BoardState {
  return board.map((row) => row.map((p) => (p ? { ...p } : null)));
}

function getProvisionalMoves(p: Piece, px: number, py: number, board: BoardState, ep: Position | null): Position[] {
  const moves: Position[] = [];
  const foe: Team = p.team === "white" ? "black" : "white";
  const slide = (dx: number, dy: number) => {
    let x = px + dx,
      y = py + dy;
    while (inBounds(x, y)) {
      const t = board[y][x];
      if (!t) moves.push({ x, y });
      else {
        if (t.team === foe) moves.push({ x, y });
        break;
      }
      x += dx;
      y += dy;
    }
  };
  const step = (dx: number, dy: number) => {
    const x = px + dx,
      y = py + dy;
    if (inBounds(x, y)) {
      const t = board[y][x];
      if (!t || t.team === foe) moves.push({ x, y });
    }
  };
  // PAWN
  if (p.type === "P") {
    const dir = p.team === "white" ? -1 : 1;
    if (inBounds(px, py + dir) && !board[py + dir][px]) {
      moves.push({ x: px, y: py + dir });
      if (!p.hasMoved && inBounds(px, py + dir * 2) && !board[py + dir * 2][px]) {
        moves.push({ x: px, y: py + dir * 2 });
      }
    }
    for (const dx of [-1, 1]) {
      const nx = px + dx,
        ny = py + dir;
      if (!inBounds(nx, ny)) continue;
      const t = board[ny][nx];
      if (t && t.team === foe) moves.push({ x: nx, y: ny });
      if (ep && ep.x === nx && ep.y === ny) moves.push({ x: nx, y: ny });
    }
  }
  // KNIGHT
  if (p.type === "N") KNIGHT_JUMPS.forEach((j) => step(j.x, j.y));
  // BISHOP / QUEEN
  if (p.type === "B" || p.type === "Q") SLIDES.DIAG.forEach((d) => slide(d.x, d.y));
  // ROOK / QUEEN
  if (p.type === "R" || p.type === "Q") SLIDES.ORTHO.forEach((d) => slide(d.x, d.y));
  // KING
  if (p.type === "K") [...SLIDES.ORTHO, ...SLIDES.DIAG].forEach((d) => step(d.x, d.y));
  return moves;
}

function findKing(team: Team, board: BoardState): Position | null {
  for (let y = 0; y < GRID_SIZE; y++)
    for (let x = 0; x < GRID_SIZE; x++) {
      const p = board[y][x];
      if (p && p.team === team && p.type === "K") return { x, y };
    }
  return null;
}

function isAttacked(tx: number, ty: number, by: Team, board: BoardState): boolean {
  for (let y = 0; y < GRID_SIZE; y++)
    for (let x = 0; x < GRID_SIZE; x++) {
      const p = board[y][x];
      if (!p || p.team !== by) continue;
      if (p.type === "P") {
        const dir = p.team === "white" ? -1 : 1;
        if (y + dir === ty && (x - 1 === tx || x + 1 === tx)) return true;
      } else {
        if (getProvisionalMoves(p, x, y, board, null).some((m) => m.x === tx && m.y === ty)) return true;
      }
    }
  return false;
}

export function isKingInCheck(team: Team, board: BoardState): boolean {
  const k = findKing(team, board);
  if (!k) return false;
  return isAttacked(k.x, k.y, team === "white" ? "black" : "white", board);
}

export function getValidMoves(p: Piece, px: number, py: number, board: BoardState, ep: Position | null): Position[] {
  const foe: Team = p.team === "white" ? "black" : "white";
  const provisional = getProvisionalMoves(p, px, py, board, ep);
  const valid: Position[] = [];
  for (const m of provisional) {
    const next = cloneBoard(board);
    next[m.y][m.x] = { ...p, hasMoved: true };
    next[py][px] = null;
    // EN PASSANT REMOVAL
    if (p.type === "P" && ep && m.x === ep.x && m.y === ep.y) {
      next[py][m.x] = null;
    }
    const k = findKing(p.team, next);
    if (k && !isAttacked(k.x, k.y, foe, next)) valid.push(m);
  }
  // CASTLING
  if (p.type === "K" && !p.hasMoved && !isAttacked(px, py, foe, board)) {
    const y = py;
    // KINGSIDE
    const kr = board[y][7];
    if (kr && kr.type === "R" && !kr.hasMoved && kr.team === p.team) {
      if (!board[y][5] && !board[y][6]) {
        if (!isAttacked(5, y, foe, board) && !isAttacked(6, y, foe, board)) {
          valid.push({ x: 6, y });
        }
      }
    }
    // QUEENSIDE
    const qr = board[y][0];
    if (qr && qr.type === "R" && !qr.hasMoved && qr.team === p.team) {
      if (!board[y][1] && !board[y][2] && !board[y][3]) {
        if (!isAttacked(2, y, foe, board) && !isAttacked(3, y, foe, board)) {
          valid.push({ x: 2, y });
        }
      }
    }
  }
  return valid;
}

// MOVE EXECUTION

export function executeMove(from: Position, to: Position, board: BoardState, ep: Position | null): MoveResult {
  const next = cloneBoard(board);
  const piece = next[from.y][from.x]!;
  let newEp: Position | null = null;
  // EN PASSANT CAPTURE
  if (piece.type === "P" && ep && to.x === ep.x && to.y === ep.y) {
    next[from.y][to.x] = null;
  }
  // CASTLING
  if (piece.type === "K" && Math.abs(to.x - from.x) === 2) {
    if (to.x === 6) {
      next[from.y][5] = { ...next[from.y][7]!, hasMoved: true };
      next[from.y][7] = null;
    }
    if (to.x === 2) {
      next[from.y][3] = { ...next[from.y][0]!, hasMoved: true };
      next[from.y][0] = null;
    }
  }
  // DOUBLE PAWN PUSH
  if (piece.type === "P" && Math.abs(to.y - from.y) === 2) {
    newEp = { x: from.x, y: (from.y + to.y) / 2 };
  }
  // MOVE
  next[to.y][to.x] = { ...piece, hasMoved: true };
  next[from.y][from.x] = null;
  // PROMOTION
  if (piece.type === "P" && (to.y === 0 || to.y === 7)) {
    next[to.y][to.x] = { ...next[to.y][to.x]!, type: "Q" };
  }
  return { board: next, enPassantTarget: newEp };
}

// GAME STATUS

export function getGameStatus(
  team: Team,
  board: BoardState,
  ep: Position | null
): "checkmate" | "stalemate" | "check" | null {
  const inCheck = isKingInCheck(team, board);
  for (let y = 0; y < GRID_SIZE; y++)
    for (let x = 0; x < GRID_SIZE; x++) {
      const p = board[y][x];
      if (p && p.team === team && getValidMoves(p, x, y, board, ep).length > 0) {
        return inCheck ? "check" : null;
      }
    }
  return inCheck ? "checkmate" : "stalemate";
}

// STATIC EVAL

function evaluate(board: BoardState, team: Team): number {
  let whiteScore = 0;
  let blackScore = 0;
  let whiteBishops = 0;
  let blackBishops = 0;
  for (let y = 0; y < GRID_SIZE; y++)
    for (let x = 0; x < GRID_SIZE; x++) {
      const p = board[y][x];
      if (!p) continue;
      const material = PIECE_VALUES[p.type] * 100;
      const pstIdx = p.team === "white" ? y * 8 + x : (7 - y) * 8 + x;
      const positional = PST[p.type][pstIdx];
      const mobility = getProvisionalMoves(p, x, y, board, null).length * 2;
      if (p.team === "white") {
        whiteScore += material + positional + mobility;
        if (p.type === "B") whiteBishops++;
      } else {
        blackScore += material + positional + mobility;
        if (p.type === "B") blackBishops++;
      }
    }
  if (whiteBishops >= 2) whiteScore += 30;
  if (blackBishops >= 2) blackScore += 30;
  return team === "white" ? whiteScore - blackScore : blackScore - whiteScore;
}

// MOVE GEN

function generateOrderedMoves(team: Team, board: BoardState, ep: Position | null): { from: Position; to: Position }[] {
  const moves: { from: Position; to: Position; order: number }[] = [];
  for (let y = 0; y < GRID_SIZE; y++)
    for (let x = 0; x < GRID_SIZE; x++) {
      const p = board[y][x];
      if (!p || p.team !== team) continue;
      for (const to of getValidMoves(p, x, y, board, ep)) {
        let order = 0;
        const victim = board[to.y][to.x];
        if (victim) {
          order = PIECE_VALUES[victim.type] * 100 - PIECE_VALUES[p.type] * 10;
        } else if (p.type === "P" && ep && to.x === ep.x && to.y === ep.y) {
          order = PIECE_VALUES.P * 100 - PIECE_VALUES.P * 10;
        }
        if (p.type === "P" && (to.y === 0 || to.y === 7)) order += 900;
        moves.push({ from: { x, y }, to, order });
      }
    }
  moves.sort((a, b) => b.order - a.order);
  return moves;
}

// SEARCH

function minimax(
  board: BoardState,
  ep: Position | null,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiTeam: Team
): number {
  const currentTeam: Team = maximizing ? aiTeam : aiTeam === "white" ? "black" : "white";
  const moves = generateOrderedMoves(currentTeam, board, ep);
  if (moves.length === 0) {
    if (isKingInCheck(currentTeam, board)) {
      return maximizing ? -99999 + (MAX_DEPTH - depth) : 99999 - (MAX_DEPTH - depth);
    }
    return 0;
  }
  if (depth === 0) return evaluate(board, aiTeam);
  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      const result = executeMove(move.from, move.to, board, ep);
      const score = minimax(result.board, result.enPassantTarget, depth - 1, alpha, beta, false, aiTeam);
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const move of moves) {
    const result = executeMove(move.from, move.to, board, ep);
    const score = minimax(result.board, result.enPassantTarget, depth - 1, alpha, beta, true, aiTeam);
    best = Math.min(best, score);
    beta = Math.min(beta, score);
    if (alpha >= beta) break;
  }
  return best;
}

// AI

export function getMonkeyMove(
  team: Team,
  board: BoardState,
  ep: Position | null
): { from: Position; to: Position } | null {
  const moves = generateOrderedMoves(team, board, ep);
  if (moves.length === 0) return null;
  let bestScore = -Infinity;
  let bestMoves: { from: Position; to: Position }[] = [];
  for (const move of moves) {
    const result = executeMove(move.from, move.to, board, ep);
    const score = minimax(result.board, result.enPassantTarget, MAX_DEPTH - 1, -Infinity, Infinity, false, team);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}
