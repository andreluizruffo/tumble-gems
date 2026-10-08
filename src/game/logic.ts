// Pure game logic: no drawing, no timers. It only takes a grid and returns a new grid.
// Keeping it separate from the rendering is what makes it easy to test and reason about.
import { COLS, MIN_MATCH, MULTIPLIER_CHANCE, MULTIPLIERS, ROWS, SYMBOLS } from './config';
import { pickWeighted, type Rng } from './rng';

export interface Cell {
  id: number; // unique, so the view can follow each symbol as it falls
  symbol: number; // index in SYMBOLS, or -1 for a multiplier orb
  multiplier: number; // only used when symbol === -1
}

// grid[col][row], row 0 is the top of the board
export type Grid = Cell[][];

export interface WinGroup {
  symbol: number;
  count: number;
  cellIds: number[];
  payout: number; // in "x bet"
}

let nextId = 1;

export function randomCell(rand: Rng): Cell {
  if (rand() < MULTIPLIER_CHANCE) {
    const orb = pickWeighted(MULTIPLIERS, (m) => m.weight, rand);
    return { id: nextId++, symbol: -1, multiplier: orb.value };
  }
  const symbol = pickWeighted(
    SYMBOLS.map((_, index) => index),
    (index) => SYMBOLS[index].weight,
    rand,
  );
  return { id: nextId++, symbol, multiplier: 0 };
}

export function createGrid(rand: Rng): Grid {
  return Array.from({ length: COLS }, () =>
    Array.from({ length: ROWS }, () => randomCell(rand)),
  );
}

export function payoutFor(symbol: number, count: number): number {
  const pays = SYMBOLS[symbol].pays;
  if (count >= 12) return pays[2];
  if (count >= 10) return pays[1];
  return pays[0];
}

// "Pay anywhere": count each symbol on the whole grid; 8 or more is a win.
export function findWins(grid: Grid): WinGroup[] {
  const groups = new Map<number, number[]>();
  for (const column of grid) {
    for (const cell of column) {
      if (cell.symbol < 0) continue; // multiplier orbs never form wins
      const ids = groups.get(cell.symbol) ?? [];
      ids.push(cell.id);
      groups.set(cell.symbol, ids);
    }
  }

  const wins: WinGroup[] = [];
  for (const [symbol, cellIds] of groups) {
    if (cellIds.length >= MIN_MATCH) {
      wins.push({ symbol, count: cellIds.length, cellIds, payout: payoutFor(symbol, cellIds.length) });
    }
  }
  return wins;
}

// Tumble: remove the winning cells, let the rest fall, and fill the gaps from the top.
export function tumble(grid: Grid, removed: Set<number>, rand: Rng): { grid: Grid; added: Cell[] } {
  const added: Cell[] = [];
  const next = grid.map((column) => {
    const kept = column.filter((cell) => !removed.has(cell.id));
    const fresh = Array.from({ length: ROWS - kept.length }, () => randomCell(rand));
    added.push(...fresh);
    return [...fresh, ...kept]; // new cells on top, survivors keep their order at the bottom
  });
  return { grid: next, added };
}

export function multiplierTotal(grid: Grid): number {
  let total = 0;
  for (const column of grid) {
    for (const cell of column) {
      if (cell.symbol === -1) total += cell.multiplier;
    }
  }
  return total;
}
