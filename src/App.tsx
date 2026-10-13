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
import { prefersReducedMotion } from './game/tween';
import { BonusDialog } from './BonusDialog';
import './App.css';

const STATUS: Record<GameState['phase'], string> = {
  idle: 'Pronto',
  spinning: 'Girando...',
  tumbling: 'Cascata!',
  paying: 'Multiplicador!',
  bonus: 'Rodadas grátis',
};

// On a phone, autoplay and the bonus buy sit below the board: bring the board back into view when they start.
const showBoard = () => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

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
  const [confirmingBonus, setConfirmingBonus] = useState(false);

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

  const canBuyBonus = !busy && !autoRunning && state.balance >= bonusPrice;

  const confirmBonus = () => {
    setConfirmingBonus(false);
    if (!canBuyBonus) return;
    showBoard();
    gameRef.current?.buyBonus(bet);
  };

  // Space bar spins (or stops autoplay).
  // Exception: someone who reached a button (or the rules) with Tab expects Space to press it.
  // After a mouse click or a tap, the focus stays on the clicked button, but Space still spins.
  const tabbing = useRef(false);
  useEffect(() => {
    const onPointer = () => (tabbing.current = false);
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') tabbing.current = true;
      if (e.code !== 'Space' || e.repeat || confirmingBonus) return;
      const target = e.target instanceof Element ? e.target : null;
      if (tabbing.current && target?.closest('button, summary, a, input, select, textarea')) return;
      e.preventDefault();
      if (autoRunning) setAutoLeft(0);
      else spin();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [spin, autoRunning, confirmingBonus]);

  const inFreeSpins = state.freeSpinsTotal > 0;
  const shownWin = state.phase === 'idle' && state.lastRoundWin > 0 ? state.lastRoundWin : state.spinWin;

  const broke = ready && state.phase === 'idle' && state.balance < bet;
  const canLowerBet = state.balance >= BET_OPTIONS[0];
  // Read aloud by screen readers when a round ends with a win.
  const announcement = state.phase === 'idle' && state.lastRoundWin > 0 ? `Ganho de ${money(state.lastRoundWin)}` : '';

  return (
    <main className="app">
      {/* The free spins bar takes the place of the title, so the board does not move when the bonus starts. */}
      <div className="top">
        {inFreeSpins ? (
          <section className="free-spins" aria-label="Rodadas grátis">
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
        ) : (
          <header className="title">
            <h1>Tumble Gems</h1>
            <p>Demo de caça-níquel com cascata · créditos fictícios · RTP simulado 97%</p>
          </header>
        )}
      </div>

      <div className="board" ref={canvasRef} />

      {broke && (
        <p className="broke" role="status">
          {canLowerBet ? 'Saldo menor que a aposta. Diminua a aposta ou ' : 'O saldo acabou. '}
          <button type="button" onClick={() => window.location.reload()}>
            recomece com {money(START_BALANCE)}
          </button>
        </p>
      )}

      <section className="hud" aria-label="Controles do jogo">
        <div className="stat balance">
          <span>Saldo</span>
          <strong>{money(state.balance)}</strong>
        </div>

        <div className="stat win">
          <div className="stat-head">
            <span>Ganho</span>
            {state.tumbles > 0 && (
              <small>
                {state.tumbles} cascata{state.tumbles > 1 ? 's' : ''}
                {state.multiplier > 0 && ` · x${state.multiplier}`}
              </small>
            )}
          </div>
          <strong>{money(shownWin)}</strong>
        </div>

        {autoRunning ? (
          <button className="spin stop" onClick={() => setAutoLeft(0)}>
            PARAR ({autoLeft})
          </button>
        ) : (
          <button className="spin" onClick={spin} disabled={!canSpin}>
            {!ready ? 'Carregando...' : busy ? STATUS[state.phase] : broke ? 'SEM SALDO' : 'GIRAR'}
          </button>
        )}

        <div className="bet" role="group" aria-labelledby="bet-label">
          <span id="bet-label">Aposta</span>
          <div className="stepper">
            <button
              aria-label="Diminuir aposta"
              disabled={busy || autoRunning || betIndex === 0}
              onClick={() => setBetIndex((i) => i - 1)}
            >
              −
            </button>
            <strong aria-live="polite">{money(bet)}</strong>
            <button
              aria-label="Aumentar aposta"
              disabled={busy || autoRunning || betIndex === BET_OPTIONS.length - 1}
              onClick={() => setBetIndex((i) => i + 1)}
            >
              +
            </button>
          </div>
        </div>

        <div className="auto" role="group" aria-labelledby="auto-label">
          <span id="auto-label">Giro automático</span>
          <div className="auto-options">
            {AUTO_OPTIONS.map((n) => (
              <button
                key={n}
                aria-label={`${n} giros`}
                disabled={!canSpin || autoRunning}
                onClick={() => {
                  showBoard();
                  setAutoLeft(n);
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button className="buy" onClick={() => setConfirmingBonus(true)} disabled={!canBuyBonus}>
          COMPRAR BÔNUS
          <small>{money(bonusPrice)}</small>
        </button>
      </section>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <BonusDialog
        open={confirmingBonus}
        spins={FREE_SPINS_AWARD}
        price={money(bonusPrice)}
        balanceAfter={money(state.balance - bonusPrice)}
        onConfirm={confirmBonus}
        onClose={() => setConfirmingBonus(false)}
      />

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
          <caption>Quanto paga cada símbolo, em vezes a aposta, pela quantidade de iguais na grade</caption>
          <thead>
            <tr>
              <th>Símbolo</th>
              <th>8 ou 9</th>
              <th>10 ou 11</th>
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
