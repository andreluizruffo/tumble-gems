// Game controller: asks the logic for the outcome of a spin, then plays it back on the view.
// Same idea as a real slot: the outcome is decided first (normally on a server), the client animates.
import { BONUS_BUY_PRICE, FREE_SPINS_AWARD, MAX_WIN, START_BALANCE, type Mode } from './config';
import { createGrid, playSpin, settleSpin, type SpinOutcome } from './logic';
import { createRng, type Rng } from './rng';
import type { SlotView } from './SlotView';

export type Phase = 'idle' | 'spinning' | 'tumbling' | 'paying' | 'bonus';

export interface GameState {
  balance: number;
  phase: Phase;
  spinWin: number; // win of the current/last spin (money)
  tumbles: number; // cascades in the current/last spin
  multiplier: number; // multiplier applied to the current/last spin (0 = none)
  freeSpinsLeft: number;
  freeSpinsTotal: number;
  freeSpinsWin: number; // money won so far in the free spins round
  freeSpinsMultiplier: number; // running multiplier during free spins
  lastRoundWin: number; // total paid by the last finished round (spin + free spins)
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const INITIAL: GameState = {
  balance: START_BALANCE,
  phase: 'idle',
  spinWin: 0,
  tumbles: 0,
  multiplier: 0,
  freeSpinsLeft: 0,
  freeSpinsTotal: 0,
  freeSpinsWin: 0,
  freeSpinsMultiplier: 0,
  lastRoundWin: 0,
};

export class Game {
  private view: SlotView;
  private onChange: (state: GameState) => void;
  private rand: Rng;
  private state: GameState = INITIAL;

  constructor(view: SlotView, onChange: (state: GameState) => void, seed = Date.now()) {
    this.view = view;
    this.onChange = onChange;
    this.rand = createRng(seed);
  }

  private set(patch: Partial<GameState>) {
    this.state = { ...this.state, ...patch };
    this.onChange(this.state);
  }

  async start() {
    this.onChange(this.state);
    await this.view.dropIn(createGrid(this.rand));
  }

  /** Normal paid spin. Returns the total won in the round. */
  async spin(bet: number): Promise<number> {
    if (this.state.phase !== 'idle' || this.state.balance < bet) return 0;
    this.set({ balance: round2(this.state.balance - bet), lastRoundWin: 0 });

    const outcome = playSpin(this.rand, 'base');
    const payout = settleSpin(outcome, 'base');
    await this.animateSpin(outcome, 'base', bet, payout.appliedMultiplier);
    let roundWin = round2(payout.win * bet);
    this.set({ balance: round2(this.state.balance + roundWin), spinWin: roundWin });

    if (outcome.freeSpinsAwarded > 0) {
      this.set({ phase: 'bonus' });
      await this.view.celebrateScatters(outcome.scatterIds);
      roundWin = round2(roundWin + (await this.playFreeSpins(bet, outcome.freeSpinsAwarded)));
    } else if (payout.win >= 10) {
      await this.view.showBanner('BIG WIN!', 0x4ade80);
    }

    this.set({ phase: 'idle', lastRoundWin: roundWin });
    return roundWin;
  }

  /** Pays BONUS_BUY_PRICE x bet to go straight to the free spins. */
  async buyBonus(bet: number): Promise<number> {
    const price = round2(bet * BONUS_BUY_PRICE);
    if (this.state.phase !== 'idle' || this.state.balance < price) return 0;
    this.set({ balance: round2(this.state.balance - price), phase: 'bonus', spinWin: 0, tumbles: 0, multiplier: 0, lastRoundWin: 0 });
    const won = await this.playFreeSpins(bet, FREE_SPINS_AWARD);
    this.set({ phase: 'idle', lastRoundWin: won });
    return won;
  }

  private async playFreeSpins(bet: number, award: number): Promise<number> {
    let left = award;
    let accumulated = 0;
    let total = 0; // x bet

    this.view.setFreeSpinsMode(true);
    await this.view.showBanner(`${award} RODADAS\nGRÁTIS!`, 0xf0abfc, 56);
    this.set({ freeSpinsLeft: left, freeSpinsTotal: award, freeSpinsWin: 0, freeSpinsMultiplier: 0 });

    while (left > 0) {
      left--;
      this.set({ freeSpinsLeft: left });

      const outcome = playSpin(this.rand, 'free');
      const payout = settleSpin(outcome, 'free', accumulated);
      accumulated = payout.accumulated;

      await this.animateSpin(outcome, 'free', bet, payout.appliedMultiplier);
      total = Math.min(total + payout.win, MAX_WIN);
      this.set({ freeSpinsWin: round2(total * bet), freeSpinsMultiplier: accumulated });

      if (outcome.freeSpinsAwarded > 0) {
        await this.view.celebrateScatters(outcome.scatterIds);
        await this.view.showBanner(`+${outcome.freeSpinsAwarded} RODADAS`, 0xf0abfc, 56);
        left += outcome.freeSpinsAwarded;
        this.set({ freeSpinsLeft: left, freeSpinsTotal: this.state.freeSpinsTotal + outcome.freeSpinsAwarded });
      }
      if (total >= MAX_WIN) break;
    }

    const won = round2(total * bet);
    this.set({ balance: round2(this.state.balance + won), phase: 'paying' });
    await this.view.showBanner(`TOTAL\n${won.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 0xfacc15, 56);
    this.view.setFreeSpinsMode(false);
    this.set({ freeSpinsLeft: 0, freeSpinsTotal: 0 });
    return won;
  }

  /** Plays back one already-decided spin: drop, cascades and multipliers. */
  private async animateSpin(outcome: SpinOutcome, mode: Mode, bet: number, appliedMultiplier: number) {
    this.set({ phase: mode === 'free' ? 'bonus' : 'spinning', spinWin: 0, tumbles: 0, multiplier: 0 });
    await this.view.clearAll();
    await this.view.dropIn(outcome.initial);

    let win = 0;
    for (const [index, step] of outcome.steps.entries()) {
      if (mode === 'base') this.set({ phase: 'tumbling' });
      win += step.win;
      this.set({ spinWin: round2(win * bet), tumbles: index + 1 });
      const removed = new Set(step.removed);
      await this.view.highlight(removed);
      await this.view.remove(removed);
      await this.view.settle(step.gridAfter);
    }

    if (appliedMultiplier > 0) {
      if (mode === 'base') this.set({ phase: 'paying' });
      await this.view.showMultiplier(appliedMultiplier, outcome.orbIds);
      win *= appliedMultiplier;
      this.set({ multiplier: appliedMultiplier });
    }
    this.set({ spinWin: round2((win + outcome.scatterPay) * bet) });
  }
}
