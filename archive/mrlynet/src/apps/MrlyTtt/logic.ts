// TYPES

export type Cell = "X" | "O" | null;
export type Board = Cell[];

// LOGIC

export const WINS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function checkWinner(board: Board): Cell {
  for (const [a, b, c] of WINS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

export function isDraw(board: Board): boolean {
  return !checkWinner(board) && board.every((c) => c !== null);
}

function getEmpty(board: Board): number[] {
  return board.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
}

export function aiMove(board: Board): number {
  const empty = getEmpty(board);
  return empty[Math.floor(Math.random() * empty.length)];
}
