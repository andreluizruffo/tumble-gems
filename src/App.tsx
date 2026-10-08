import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AUTO_OPTIONS,
  BET_OPTIONS,
  BONUS_BUY_PRICE,
  FREE_SPINS_AWARD,
  FREE_SPINS_TRIGGER,
  MIN_MATCH,
  RETRIGGER_AWARD,
  RETRIGGER_SCATTERS,
  START_BALANCE,
  SYMBOLS,
} from './game/config';
import { Game, type GameState } from './game/Game';
import { SlotView } from './game/SlotView';
import './App.css';

const STATUS: Record<GameState['phase'], string> = {
  idle: 'Pronto',
  spinning: 'Girando...',
  tumbling: 'Cascata!',
  paying: 'Multiplicador!',
  bonus: 'Rodadas grátis',
};

const money = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const INITIAL_STATE: GameState = {
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

export default function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [betIndex, setBetIndex] = useState(2);
  const [autoLeft, setAutoLeft] = useState(0);
  const [ready, setReady] = useState(false);

  const bet = BET_OPTIONS[betIndex];
  const bonusPrice = bet * BONUS_BUY_PRICE;

  // Create the Pixi view once; destroy it when the component unmounts.
  useEffect(() => {
    const parent = canvasRef.current;
    if (!parent) return;
    let view: SlotView | null = null;
    let cancelled = false;

    SlotView.create(parent).then((created) => {
      if (cancelled) {
        created.destroy();
        return;
      }
      view = created;
      const game = new Game(created, setState);
      gameRef.current = game;
      game.start().then(() => setReady(true));
    });

    return () => {
      cancelled = true;
      gameRef.current = null;
      view?.destroy();
    };
  }, []);

  const busy = !ready || state.phase !== 'idle';
  const canSpin = !busy && state.balance >= bet;
  const autoRunning = autoLeft > 0;

  const spin = useCallback(() => {
    if (canSpin) gameRef.current?.spin(bet);
  }, [canSpin, bet]);

  // Autoplay: whenever the game is idle and spins are left, start the next one.
  useEffect(() => {
    if (!ready || autoLeft <= 0 || state.phase !== 'idle') return;
    if (state.balance < bet) {
      setAutoLeft(0);
      return;
    }
    const timer = setTimeout(() => {
      setAutoLeft((n) => n - 1);
      gameRef.current?.spin(bet);
    }, 300);
    return () => clearTimeout(timer);
  }, [ready, autoLeft, state.phase, state.balance, bet]);

  const buyBonus = () => {
    if (busy || state.balance < bonusPrice) return;
    if (window.confirm(`Comprar ${FREE_SPINS_AWARD} rodadas grátis por ${money(bonusPrice)}?`)) {
      gameRef.current?.buyBonus(bet);
    }
  };

  // Space bar spins (or stops autoplay).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      if (autoRunning) setAutoLeft(0);
      else spin();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [spin, autoRunning]);

  const inFreeSpins = state.freeSpinsTotal > 0;
  const shownWin = state.phase === 'idle' && state.lastRoundWin > 0 ? state.lastRoundWin : state.spinWin;

  return (
    <main className="app">
      <header className="title">
        <h1>Tumble Gems</h1>
        <p>Demo de caça-níquel com cascata · créditos fictícios · RTP simulado 97%</p>
      </header>

      {inFreeSpins && (
        <section className="free-spins">
          <div>
            <span>Rodadas grátis</span>
            <strong>
              {state.freeSpinsTotal - state.freeSpinsLeft}/{state.freeSpinsTotal}
            </strong>
          </div>
          <div>
            <span>Multiplicador</span>
            <strong>x{state.freeSpinsMultiplier || 1}</strong>
          </div>
          <div>
            <span>Ganho no bônus</span>
            <strong>{money(state.freeSpinsWin)}</strong>
          </div>
        </section>
      )}

      <div className="board" ref={canvasRef} />

      <section className="hud">
        <div className="stat">
          <span>Saldo</span>
          <strong>{money(state.balance)}</strong>
        </div>

        <div className="stat win">
          <span>Ganho</span>
          <strong>{money(shownWin)}</strong>
          {state.tumbles > 0 && (
            <small>
              {state.tumbles} cascata{state.tumbles > 1 ? 's' : ''}
              {state.multiplier > 0 && ` · x${state.multiplier}`}
            </small>
          )}
        </div>

        <div className="bet">
          <span>Aposta</span>
          <div className="stepper">
            <button disabled={busy || autoRunning || betIndex === 0} onClick={() => setBetIndex((i) => i - 1)}>
              −
            </button>
            <strong>{money(bet)}</strong>
            <button
              disabled={busy || autoRunning || betIndex === BET_OPTIONS.length - 1}
              onClick={() => setBetIndex((i) => i + 1)}
            >
              +
            </button>
          </div>
        </div>

        {autoRunning ? (
          <button className="spin stop" onClick={() => setAutoLeft(0)}>
            PARAR ({autoLeft})
          </button>
        ) : (
          <button className="spin" onClick={spin} disabled={!canSpin}>
            {!ready ? 'Carregando...' : busy ? STATUS[state.phase] : 'GIRAR'}
          </button>
        )}

        <div className="auto">
          <span>Giro automático</span>
          <div className="auto-options">
            {AUTO_OPTIONS.map((n) => (
              <button key={n} disabled={!canSpin || autoRunning} onClick={() => setAutoLeft(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <button className="buy" onClick={buyBonus} disabled={busy || autoRunning || state.balance < bonusPrice}>
          COMPRAR BÔNUS
          <small>{money(bonusPrice)}</small>
        </button>
      </section>

      {state.balance < bet && state.phase === 'idle' && (
        <p className="broke">Saldo insuficiente. Recarregue a página para recomeçar.</p>
      )}

      <details className="rules">
        <summary>Como funciona</summary>
        <ul>
          <li>
            <b>Paga em qualquer lugar:</b> {MIN_MATCH} ou mais símbolos iguais em qualquer posição da grade ganham.
          </li>
          <li>
            <b>Cascata:</b> os símbolos vencedores somem, os de cima caem e entram novos. Repete enquanto houver
            ganho.
          </li>
          <li>
            <b>Multiplicadores:</b> as esferas douradas multiplicam o ganho do giro. Nas rodadas grátis, elas se
            acumulam.
          </li>
          <li>
            <b>Bônus:</b> {FREE_SPINS_TRIGGER}+ símbolos BONUS dão {FREE_SPINS_AWARD} rodadas grátis.{' '}
            {RETRIGGER_SCATTERS}+ durante o bônus dão mais {RETRIGGER_AWARD}.
          </li>
          <li>
            <b>Compra de bônus:</b> {BONUS_BUY_PRICE}x a aposta para ir direto às rodadas grátis.
          </li>
        </ul>
        <table>
          <thead>
            <tr>
              <th>Símbolo</th>
              <th>8-9</th>
              <th>10-11</th>
              <th>12+</th>
            </tr>
          </thead>
          <tbody>
            {[...SYMBOLS].reverse().map((s) => (
              <tr key={s.name}>
                <td>
                  <i style={{ background: `#${s.color.toString(16).padStart(6, '0')}` }} />
                  {s.name}
                </td>
                {s.pays.map((p, i) => (
                  <td key={i}>x{p}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </main>
  );
}
