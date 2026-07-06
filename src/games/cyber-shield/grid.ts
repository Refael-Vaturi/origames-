// Fixed serpentine path through the grid — no dynamic pathfinding needed,
// since towers can only ever be placed on non-path cells.
export const GRID_COLS = 11;
export const GRID_ROWS = 7;

function range(a: number, b: number): number[] {
  const out: number[] = [];
  if (a <= b) for (let i = a; i <= b; i++) out.push(i);
  else for (let i = a; i >= b; i--) out.push(i);
  return out;
}

function buildPath(): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];
  range(0, GRID_COLS - 1).forEach((c) => cells.push({ row: 1, col: c }));
  range(2, 3).forEach((r) => cells.push({ row: r, col: GRID_COLS - 1 }));
  range(GRID_COLS - 1, 0).forEach((c) => cells.push({ row: 3, col: c }));
  range(4, 5).forEach((r) => cells.push({ row: r, col: 0 }));
  range(0, GRID_COLS - 1).forEach((c) => cells.push({ row: 5, col: c }));
  return cells;
}

export const PATH_CELLS = buildPath();

const pathKeySet = new Set(PATH_CELLS.map((p) => `${p.row},${p.col}`));

export function isPathCell(row: number, col: number): boolean {
  return pathKeySet.has(`${row},${col}`);
}

export function isInGrid(row: number, col: number): boolean {
  return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;
}

export const SPAWN_CELL = PATH_CELLS[0];
export const DATABASE_CELL = PATH_CELLS[PATH_CELLS.length - 1];
