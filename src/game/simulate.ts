// Monte Carlo simulation: plays many spins without animation to measure how the game pays.
// RTP (return to player) = total won / total bet. Real slots usually sit around 94-97%.
import { MAX_WIN } from './config';
import { playFreeSpins, playSpin, settleSpin } from './logic';
import { createRng } from './rng';

export interface SimulationReport {
  spins: number;
  rtp: number; // overall, base game + free spins
  baseRtp: number;
  freeSpinsRtp: number;
  hitRate: number; // share of spins that win anything
  freeSpinsEvery: number; // average spins between free spin triggers
  avgFreeSpinsWin: number; // x bet, average value of one free spins round
  maxWin: number; // x bet
}

export function simulate(spins: number, seed = 1): SimulationReport {
  const rand = createRng(seed);
  let baseWins = 0;
  let freeWins = 0;
  let hits = 0;
  let triggers = 0;
  let maxWin = 0;

  for (let i = 0; i < spins; i++) {
    const outcome = playSpin(rand, 'base');
    const base = settleSpin(outcome, 'base').win;
    const free = outcome.freeSpinsAwarded > 0 ? playFreeSpins(rand, outcome.freeSpinsAwarded) : 0;
    if (outcome.freeSpinsAwarded > 0) triggers++;
    const round = Math.min(base + free, MAX_WIN);
    if (round > 0) hits++;
    baseWins += base;
    freeWins += free;
    maxWin = Math.max(maxWin, round);
  }

  return {
    spins,
    rtp: (baseWins + freeWins) / spins,
    baseRtp: baseWins / spins,
    freeSpinsRtp: freeWins / spins,
    hitRate: hits / spins,
    freeSpinsEvery: triggers ? spins / triggers : Infinity,
    avgFreeSpinsWin: triggers ? freeWins / triggers : 0,
    maxWin,
  };
}

/** Average value of a free spins round bought directly (used to price the bonus buy). */
export function simulateBonusBuy(rounds: number, seed = 1): number {
  const rand = createRng(seed);
  let total = 0;
  for (let i = 0; i < rounds; i++) total += playFreeSpins(rand, 15);
  return total / rounds;
}
