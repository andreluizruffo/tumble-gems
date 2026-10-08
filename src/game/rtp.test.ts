// Guards the game balance: if someone changes the paytable or the chances, this test
// shows immediately whether the game still pays like a real slot (~96-97% RTP).
import { describe, expect, it } from 'vitest';
import { BONUS_BUY_PRICE } from './config';
import { simulate, simulateBonusBuy } from './simulate';

describe('game balance (Monte Carlo)', () => {
  const report = simulate(200_000, 2026);

  it('returns between 93% and 99% of what is bet', () => {
    expect(report.rtp).toBeGreaterThan(0.93);
    expect(report.rtp).toBeLessThan(0.99);
  });

  it('wins on roughly a quarter of the spins', () => {
    expect(report.hitRate).toBeGreaterThan(0.2);
    expect(report.hitRate).toBeLessThan(0.33);
  });

  it('triggers free spins every 150-300 spins on average', () => {
    expect(report.freeSpinsEvery).toBeGreaterThan(150);
    expect(report.freeSpinsEvery).toBeLessThan(300);
  });

  it('prices the bonus buy below 100% RTP', () => {
    const avg = simulateBonusBuy(20_000, 31);
    expect(avg / BONUS_BUY_PRICE).toBeLessThan(1);
    expect(avg / BONUS_BUY_PRICE).toBeGreaterThan(0.9);
  });
}, 120_000);
