import { Generator, GameState } from "./types";
import { GRID_COLS, GRID_ROWS, STARTING_CURRENCY, TIERS, buyCost } from "./config";

export function createInitialState(): GameState {
  return {
    phase: "menu",
    generators: [],
    floatingTexts: [],
    currency: STARTING_CURRENCY,
    totalEarned: 0,
    best: 0,
    purchaseCount: 0,
    timeLeft: 90,
    selectedId: null,
    nextId: 1,
    incomeAccum: 0,
  };
}

function emptyCells(state: GameState): { row: number; col: number }[] {
  const occupied = new Set(state.generators.map((g) => `${g.row},${g.col}`));
  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (!occupied.has(`${r},${c}`)) cells.push({ row: r, col: c });
    }
  }
  return cells;
}

function addFloatingText(state: GameState, row: number, col: number, text: string) {
  state.floatingTexts.push({ x: col, y: row, text, life: 0.9, maxLife: 0.9 });
}

export function buyGenerator(state: GameState): boolean {
  if (state.phase !== "playing") return false;
  const cost = buyCost(state.purchaseCount);
  const empties = emptyCells(state);
  if (state.currency < cost || empties.length === 0) return false;
  state.currency -= cost;
  state.purchaseCount += 1;
  const cell = empties[Math.floor(Math.random() * empties.length)];
  state.generators.push({ id: state.nextId++, tier: 0, row: cell.row, col: cell.col, pulse: 0 });
  return true;
}

export function tapCell(state: GameState, row: number, col: number) {
  if (state.phase !== "playing") return;
  const gen = state.generators.find((g) => g.row === row && g.col === col);
  if (!gen) {
    state.selectedId = null;
    return;
  }
  if (state.selectedId === null) {
    state.selectedId = gen.id;
    return;
  }
  if (state.selectedId === gen.id) {
    state.selectedId = null;
    return;
  }
  const selected = state.generators.find((g) => g.id === state.selectedId);
  if (!selected) {
    state.selectedId = gen.id;
    return;
  }
  if (selected.tier === gen.tier && selected.tier < TIERS.length - 1) {
    state.generators = state.generators.filter((g) => g.id !== selected.id && g.id !== gen.id);
    const newTier = gen.tier + 1;
    state.generators.push({ id: state.nextId++, tier: newTier, row: gen.row, col: gen.col, pulse: 0.4 });
    addFloatingText(state, gen.row, gen.col, TIERS[newTier].name);
    state.selectedId = null;
  } else {
    state.selectedId = gen.id;
  }
}

export function update(state: GameState, dt: number) {
  if (state.phase !== "playing") return;
  dt = Math.min(dt, 0.05);

  let rate = 0;
  for (const g of state.generators) {
    rate += TIERS[g.tier].rate;
    g.pulse = Math.max(0, g.pulse - dt);
  }
  const earned = rate * dt;
  state.currency += earned;
  state.totalEarned += earned;

  for (const ft of state.floatingTexts) ft.life -= dt;
  state.floatingTexts = state.floatingTexts.filter((f) => f.life > 0);

  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    state.phase = "gameover";
    state.best = Math.max(state.best, Math.floor(state.totalEarned));
  }
}

export type { Generator };
