// Game rules and tuning. Everything that changes how the game plays (and pays) lives here.
// The numbers below were tuned with the RTP simulation (see rtp.test.ts).

export const COLS = 6;
export const ROWS = 5;
export const CELL = 96; // size of one grid cell, in pixels
export const BOARD_PADDING = 16;
export const MIN_MATCH = 8; // "pay anywhere": 8+ equal symbols anywhere on the grid win

export type Shape =
  | 'circle'
  | 'ring'
  | 'square'
  | 'triangle'
  | 'diamond'
  | 'hexagon'
  | 'octagon'
  | 'pentagon'
  | 'star';

export interface SymbolDef {
  name: string;
  shape: Shape;
  color: number;
  weight: number; // relative chance of appearing
  pays: [number, number, number]; // payout (x bet) for 8-9, 10-11 and 12+ symbols
}

// Low-value symbols appear often and pay little; high-value ones are rare and pay more.
export const SYMBOLS: SymbolDef[] = [
  { name: 'Peridot', shape: 'pentagon', color: 0x84cc16, weight: 17, pays: [0.19, 0.48, 1.44] },
  { name: 'Sapphire', shape: 'circle', color: 0x3b82f6, weight: 16, pays: [0.24, 0.72, 1.92] },
  { name: 'Emerald', shape: 'square', color: 0x22c55e, weight: 14, pays: [0.38, 0.86, 3.84] },
  { name: 'Amethyst', shape: 'triangle', color: 0xa855f7, weight: 13, pays: [0.48, 0.96, 4.8] },
  { name: 'Ruby', shape: 'diamond', color: 0xef4444, weight: 11, pays: [0.77, 1.15, 7.68] },
  { name: 'Topaz', shape: 'hexagon', color: 0xf59e0b, weight: 10, pays: [0.96, 1.44, 9.6] },
  { name: 'Ring', shape: 'ring', color: 0x14b8a6, weight: 8, pays: [1.44, 1.92, 11.52] },
  { name: 'Crest', shape: 'octagon', color: 0xec4899, weight: 6, pays: [1.92, 4.8, 14.4] },
  { name: 'Star', shape: 'star', color: 0xfacc15, weight: 5, pays: [9.6, 24, 48] },
];

// Special cells: they never form wins and are never removed by a tumble.
export const SCATTER = -2;
export const ORB = -1;

export type Mode = 'base' | 'free';

// Chance that a new cell is a scatter or a multiplier orb, per game mode.
export const SPECIAL_CHANCE: Record<Mode, { scatter: number; orb: number }> = {
  base: { scatter: 0.021, orb: 0.02 },
  free: { scatter: 0.012, orb: 0.05 },
};

export const MULTIPLIERS: { value: number; weight: number }[] = [
  { value: 2, weight: 40 },
  { value: 3, weight: 25 },
  { value: 5, weight: 18 },
  { value: 10, weight: 10 },
  { value: 25, weight: 5 },
  { value: 50, weight: 2 },
];

// Scatters pay anywhere (x bet) and trigger free spins.
export const SCATTER_PAYS: Record<number, number> = { 4: 3, 5: 5, 6: 100 };
export const FREE_SPINS_TRIGGER = 4; // scatters needed in the base game
export const FREE_SPINS_AWARD = 15;
export const RETRIGGER_SCATTERS = 3; // scatters needed during free spins
export const RETRIGGER_AWARD = 5;

export const MAX_WIN = 5000; // cap per round, in x bet
export const BONUS_BUY_PRICE = 52; // in x bet (avg free spins round ≈ 50.5x → ~97% RTP)

export const BET_OPTIONS = [0.2, 0.4, 1, 2, 4, 10, 20, 50, 100];
export const AUTO_OPTIONS = [10, 25, 50, 100];
export const START_BALANCE = 1000;
