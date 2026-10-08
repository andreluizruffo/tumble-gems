// Game rules and tuning. Everything that changes how the game plays lives here.

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
  { name: 'Sapphire', shape: 'circle', color: 0x3b82f6, weight: 20, pays: [0.25, 0.75, 2] },
  { name: 'Emerald', shape: 'square', color: 0x22c55e, weight: 19, pays: [0.4, 0.9, 4] },
  { name: 'Amethyst', shape: 'triangle', color: 0xa855f7, weight: 18, pays: [0.5, 1, 5] },
  { name: 'Ruby', shape: 'diamond', color: 0xef4444, weight: 16, pays: [0.8, 1.2, 8] },
  { name: 'Topaz', shape: 'hexagon', color: 0xf59e0b, weight: 12, pays: [1, 1.5, 10] },
  { name: 'Ring', shape: 'ring', color: 0x14b8a6, weight: 9, pays: [1.5, 2, 12] },
  { name: 'Crest', shape: 'octagon', color: 0xec4899, weight: 6, pays: [2, 5, 15] },
  { name: 'Star', shape: 'star', color: 0xfacc15, weight: 4, pays: [10, 25, 50] },
];

// Multiplier orbs: rare cells that multiply the total win of a spin.
export const MULTIPLIER_CHANCE = 0.025;
export const MULTIPLIERS: { value: number; weight: number }[] = [
  { value: 2, weight: 40 },
  { value: 3, weight: 25 },
  { value: 5, weight: 18 },
  { value: 10, weight: 10 },
  { value: 25, weight: 5 },
  { value: 50, weight: 2 },
];

export const BET_OPTIONS = [1, 2, 5, 10];
export const START_BALANCE = 1000;
