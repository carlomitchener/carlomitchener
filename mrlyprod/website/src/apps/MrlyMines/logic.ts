// CONFIG

export const COLS = 9;
export const ROWS = 9;
export const MINE_COUNT = 10;

// TYPES

export type CellState = "hidden" | "revealed" | "flagged";
export interface Cell {
  mine: boolean;
  adjacentMines: number;
  state: CellState;
}
export type Board = Cell[][];

// HELPERS

export function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ mine: false, adjacentMines: 0, state: "hidden" as CellState }))
  );
}

export function placeMines(board: Board, safeRow: number, safeCol: number): Board {
  const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));
  let placed = 0;
  while (placed < MINE_COUNT) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (r === safeRow && c === safeCol) continue;
    if (newBoard[r][c].mine) continue;
    newBoard[r][c].mine = true;
    placed++;
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (newBoard[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && newBoard[nr][nc].mine) count++;
        }
      }
      newBoard[r][c].adjacentMines = count;
    }
  }
  return newBoard;
}

export function floodFill(board: Board, row: number, col: number): Board {
  const newBoard = board.map((r) => r.map((c) => ({ ...c })));
  const stack: [number, number][] = [[row, col]];
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    if (newBoard[r][c].state === "revealed") continue;
    if (newBoard[r][c].state === "flagged") continue;
    if (newBoard[r][c].mine) continue;
    newBoard[r][c].state = "revealed";
    if (newBoard[r][c].adjacentMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          stack.push([r + dr, c + dc]);
        }
      }
    }
  }
  return newBoard;
}

export function revealAllMines(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell.mine ? { ...cell, state: "revealed" as CellState } : cell)));
}

export function checkWin(board: Board): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!board[r][c].mine && board[r][c].state !== "revealed") return false;
    }
  }
  return true;
}
