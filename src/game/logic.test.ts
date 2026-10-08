import { describe, expect, it } from 'vitest';
import { COLS, MIN_MATCH, ROWS } from './config';
import { createGrid, findWins, multiplierTotal, payoutFor, tumble, type Cell, type Grid } from './logic';
import { createRng } from './rng';

let id = 1000;
const gem = (symbol: number): Cell => ({ id: id++, symbol, multiplier: 0 });
const orb = (multiplier: number): Cell => ({ id: id++, symbol: -1, multiplier });

// Builds a 6x5 grid where every cell is symbol 0, except the ones we override.
function gridOf(fill: (col: number, row: number) => Cell): Grid {
  return Array.from({ length: COLS }, (_, col) => Array.from({ length: ROWS }, (_, row) => fill(col, row)));
}

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('createGrid', () => {
  it('creates a 6x5 grid with unique ids', () => {
    const grid = createGrid(createRng(1));
    expect(grid).toHaveLength(COLS);
    grid.forEach((column) => expect(column).toHaveLength(ROWS));
    const ids = grid.flat().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('findWins', () => {
  it(`pays when ${MIN_MATCH}+ equal symbols are anywhere on the grid`, () => {
    // 8 cells of symbol 3 spread around; the rest alternate so they stay below 8 each
    let placed = 0;
    const grid = gridOf((col, row) => {
      if ((col + row) % 3 === 0 && placed < MIN_MATCH) {
        placed++;
        return gem(3);
      }
      return gem(4 + ((col * ROWS + row) % 4));
    });
    const wins = findWins(grid).filter((w) => w.symbol === 3);
    expect(wins).toHaveLength(1);
    expect(wins[0].count).toBe(MIN_MATCH);
    expect(wins[0].payout).toBe(payoutFor(3, MIN_MATCH));
  });

  it('does not pay 7 symbols', () => {
    let placed = 0;
    const grid = gridOf((col, row) => {
      if (placed < 7 && row === 0) {
        placed++;
        return gem(2);
      }
      return gem(4 + ((col * ROWS + row) % 4));
    });
    expect(findWins(grid).find((w) => w.symbol === 2)).toBeUndefined();
  });

  it('ignores multiplier orbs', () => {
    const grid = gridOf(() => orb(2));
    expect(findWins(grid)).toEqual([]);
  });
});

describe('payoutFor', () => {
  it('uses the right tier for 8-9, 10-11 and 12+', () => {
    expect(payoutFor(0, 8)).toBe(payoutFor(0, 9));
    expect(payoutFor(0, 10)).toBeGreaterThan(payoutFor(0, 9));
    expect(payoutFor(0, 12)).toBeGreaterThan(payoutFor(0, 11));
  });
});

describe('tumble', () => {
  it('removes winners, keeps survivors in order at the bottom and refills from the top', () => {
    const grid = gridOf(() => gem(1));
    const column = grid[0];
    const removed = new Set([column[1].id, column[3].id]);
    const survivors = column.filter((c) => !removed.has(c.id)).map((c) => c.id);

    const { grid: next, added } = tumble(grid, removed, createRng(7));

    expect(next[0]).toHaveLength(ROWS);
    expect(next[0].slice(2).map((c) => c.id)).toEqual(survivors); // survivors fell to the bottom
    expect(added).toHaveLength(2);
    expect(next[0].slice(0, 2)).toEqual(added); // new cells are on top
    expect(next[1].map((c) => c.id)).toEqual(grid[1].map((c) => c.id)); // other columns untouched
  });
});

describe('multiplierTotal', () => {
  it('sums all orbs on the grid', () => {
    let count = 0;
    const grid = gridOf(() => (count++ < 3 ? orb(5) : gem(0)));
    expect(multiplierTotal(grid)).toBe(15);
  });
});
