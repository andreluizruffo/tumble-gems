// Game controller: runs one spin from start to finish.
// It uses the pure logic to decide what happens and the view to show it, in order.
import { START_BALANCE } from './config';
import { createGrid, findWins, multiplierTotal, tumble, type Grid } from './logic';
import { createRng, type Rng } from './rng';
import type { SlotView } from './SlotView';

export type Phase = 'idle' | 'spinning' | 'tumbling' | 'paying';

export interface GameState {
  balance: number;
  phase: Phase;
  spinWin: number; // win of the current/last spin
  tumbles: number; // how many cascades happened in this spin
  multiplier: number; // total multiplier applied to the last spin (0 = none)
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export class Game {
  private view: SlotView;
  private onChange: (state: GameState) => void;
  private rand: Rng;
  private grid: Grid;
  private state: GameState = { balance: START_BALANCE, phase: 'idle', spinWin: 0, tumbles: 0, multiplier: 0 };

  constructor(view: SlotView, onChange: (state: GameState) => void, seed = Date.now()) {
    this.view = view;
    this.onChange = onChange;
    this.rand = createRng(seed);
    this.grid = createGrid(this.rand);
  }

  private set(patch: Partial<GameState>) {
    this.state = { ...this.state, ...patch };
    this.onChange(this.state);
  }

  async start() {
    this.onChange(this.state);
    await this.view.dropIn(this.grid);
  }

  async spin(bet: number) {
    if (this.state.phase !== 'idle' || this.state.balance < bet) return;

    this.set({ phase: 'spinning', balance: round2(this.state.balance - bet), spinWin: 0, tumbles: 0, multiplier: 0 });
    await this.view.clearAll();
    this.grid = createGrid(this.rand);
    await this.view.dropIn(this.grid);

    // Cascade loop: pay, remove winners, refill, and check again until nothing wins.
    let win = 0;
    let tumbles = 0;
    for (;;) {
      const wins = findWins(this.grid);
      if (wins.length === 0) break;

      this.set({ phase: 'tumbling' });
      const removed = new Set(wins.flatMap((w) => w.cellIds));
      win = round2(win + wins.reduce((sum, w) => sum + w.payout * bet, 0));
      tumbles++;
      this.set({ spinWin: win, tumbles });

      await this.view.highlight(removed);
      await this.view.remove(removed);
      this.grid = tumble(this.grid, removed, this.rand).grid;
      await this.view.settle(this.grid);
    }

    // Multiplier orbs only count when the spin had a win.
    const multiplier = multiplierTotal(this.grid);
    if (win > 0 && multiplier > 0) {
      this.set({ phase: 'paying', multiplier });
      const orbIds = this.grid.flat().filter((c) => c.symbol === -1).map((c) => c.id);
      await this.view.showMultiplier(multiplier, orbIds);
      win = round2(win * multiplier);
      this.set({ spinWin: win });
    }

    if (win >= bet * 10) await this.view.showBanner('BIG WIN!', 0x4ade80);
    this.set({ phase: 'idle', balance: round2(this.state.balance + win), spinWin: win });
  }
}
