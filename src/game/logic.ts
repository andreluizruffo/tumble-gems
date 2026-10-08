// Pure game logic: no drawing, no timers.
// playSpin() decides the WHOLE outcome of a spin up front (every cascade), the way a real
// game server does. The view only animates what was already decided.
import {
  COLS,
  FREE_SPINS_AWARD,
  FREE_SPINS_TRIGGER,
  MAX_WIN,
  MIN_MATCH,
  MULTIPLIERS,
  ORB,
  RETRIGGER_AWARD,
  RETRIGGER_SCATTERS,
  ROWS,
  SCATTER,
  SCATTER_PAYS,
  SPECIAL_CHANCE,
  SYMBOLS,
  type Mode,
} from './config';
import { pickWeighted, type Rng } from './rng';

export interface Cell {
  id: number; // unique, so the view can follow each symbol as it falls
  symbol: number; // index in SYMBOLS, or ORB / SCATTER
  multiplier: number; // only used by orbs
}

// grid[col][row], row 0 is the top of the board
export type Grid = Cell[][];

export interface WinGroup {
  symbol: number;
  count: number;
  cellIds: number[];
  payout: number; // in "x bet"
}

export interface TumbleStep {
  wins: WinGroup[];
  removed: number[];
  win: number; // x bet, this cascade only
  gridAfter: Grid;
}

export interface SpinOutcome {
  initial: Grid;
  steps: TumbleStep[];
  final: Grid;
  cascadeWin: number; // x bet, sum of all cascades
  orbSum: number; // sum of the multiplier orbs on the final grid
  orbIds: number[];
  scatterIds: number[];
  scatterPay: number; // x bet
  freeSpinsAwarded: number;
}

let nextId = 1;

export function randomCell(rand: Rng, mode: Mode = 'base'): Cell {
  const chance = SPECIAL_CHANCE[mode];
  const roll = rand();
  if (roll < chance.scatter) return { id: nextId++, symbol: SCATTER, multiplier: 0 };
  if (roll < chance.scatter + chance.orb) {
    const orb = pickWeighted(MULTIPLIERS, (m) => m.weight, rand);
    return { id: nextId++, symbol: ORB, multiplier: orb.value };
  }
  const symbol = pickWeighted(
    SYMBOLS.map((_, index) => index),
    (index) => SYMBOLS[index].weight,
    rand,
  );
  return { id: nextId++, symbol, multiplier: 0 };
}

export function createGrid(rand: Rng, mode: Mode = 'base'): Grid {
  return Array.from({ length: COLS }, () => Array.from({ length: ROWS }, () => randomCell(rand, mode)));
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
      if (cell.symbol < 0) continue; // orbs and scatters never form regular wins
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
export function tumble(grid: Grid, removed: Set<number>, rand: Rng, mode: Mode = 'base'): { grid: Grid; added: Cell[] } {
  const added: Cell[] = [];
  const next = grid.map((column) => {
    const kept = column.filter((cell) => !removed.has(cell.id));
    const fresh = Array.from({ length: ROWS - kept.length }, () => randomCell(rand, mode));
    added.push(...fresh);
    return [...fresh, ...kept]; // new cells on top, survivors keep their order at the bottom
  });
  return { grid: next, added };
}

const cellsOf = (grid: Grid, symbol: number) => grid.flat().filter((cell) => cell.symbol === symbol);

export function multiplierTotal(grid: Grid): number {
  return cellsOf(grid, ORB).reduce((sum, cell) => sum + cell.multiplier, 0);
}

export function scatterPayFor(count: number): number {
  if (count >= 6) return SCATTER_PAYS[6];
  return SCATTER_PAYS[count] ?? 0;
}

/** Decides a full spin: initial grid, every cascade, and what the final grid awards. */
export function playSpin(rand: Rng, mode: Mode = 'base'): SpinOutcome {
  const initial = createGrid(rand, mode);
  const steps: TumbleStep[] = [];
  let grid = initial;
  let cascadeWin = 0;

  for (;;) {
    const wins = findWins(grid);
    if (wins.length === 0) break;
    const removed = wins.flatMap((w) => w.cellIds);
    const win = wins.reduce((sum, w) => sum + w.payout, 0);
    grid = tumble(grid, new Set(removed), rand, mode).grid;
    steps.push({ wins, removed, win, gridAfter: grid });
    cascadeWin += win;
  }

  const scatters = cellsOf(grid, SCATTER);
  const needed = mode === 'base' ? FREE_SPINS_TRIGGER : RETRIGGER_SCATTERS;
  const award = mode === 'base' ? FREE_SPINS_AWARD : RETRIGGER_AWARD;

  return {
    initial,
    steps,
    final: grid,
    cascadeWin,
    orbSum: multiplierTotal(grid),
    orbIds: cellsOf(grid, ORB).map((c) => c.id),
    scatterIds: scatters.map((c) => c.id),
    scatterPay: scatterPayFor(scatters.length),
    freeSpinsAwarded: scatters.length >= needed ? award : 0,
  };
}

export interface SpinPayout {
  win: number; // x bet
  appliedMultiplier: number; // 0 = no multiplier applied
  accumulated: number; // free spins: running total multiplier
}

/**
 * Turns an outcome into a payout.
 * Base game: orbs multiply the cascade win of that spin.
 * Free spins: orbs from winning spins add up into a running multiplier, applied to that spin.
 */
export function settleSpin(outcome: SpinOutcome, mode: Mode, accumulated = 0): SpinPayout {
  const hasOrbWin = outcome.cascadeWin > 0 && outcome.orbSum > 0;
  if (mode === 'free' && hasOrbWin) accumulated += outcome.orbSum;
  const appliedMultiplier = hasOrbWin ? (mode === 'free' ? accumulated : outcome.orbSum) : 0;
  const win = outcome.cascadeWin * (appliedMultiplier || 1) + outcome.scatterPay;
  return { win, appliedMultiplier, accumulated };
}

/** Plays a whole free spins round without animation (used by the RTP simulation). */
export function playFreeSpins(rand: Rng, count: number): number {
  let left = count;
  let accumulated = 0;
  let total = 0;
  while (left > 0) {
    left--;
    const outcome = playSpin(rand, 'free');
    const payout = settleSpin(outcome, 'free', accumulated);
    accumulated = payout.accumulated;
    total += payout.win;
    left += outcome.freeSpinsAwarded;
  }
  return Math.min(total, MAX_WIN);
}
