import { useCallback, useEffect, useRef, useState } from 'react';
import { BET_OPTIONS, MIN_MATCH, START_BALANCE, SYMBOLS } from './game/config';
import { Game, type GameState } from './game/Game';
import { SlotView } from './game/SlotView';
import './App.css';

const STATUS: Record<GameState['phase'], string> = {
  idle: 'Pronto para girar',
  spinning: 'Girando...',
  tumbling: 'Cascata!',
  paying: 'Multiplicador!',
};

const money = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [state, setState] = useState<GameState>({
    balance: START_BALANCE,
    phase: 'idle',
    spinWin: 0,
    tumbles: 0,
    multiplier: 0,
  });
  const [bet, setBet] = useState(BET_OPTIONS[0]);
  const [ready, setReady] = useState(false);

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

  const spin = useCallback(() => {
    if (canSpin) gameRef.current?.spin(bet);
  }, [canSpin, bet]);

  // Space bar spins too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        spin();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [spin]);

  return (
    <main className="app">
      <header className="title">
        <h1>Tumble Gems</h1>
        <p>Demo de caça-níquel com cascata · créditos fictícios</p>
      </header>

      <div className="board" ref={canvasRef} />

      <section className="hud">
        <div className="stat">
          <span>Saldo</span>
          <strong>{money(state.balance)}</strong>
        </div>

        <div className="stat win">
          <span>Ganho</span>
          <strong>{money(state.spinWin)}</strong>
          {state.tumbles > 0 && (
            <small>
              {state.tumbles} cascata{state.tumbles > 1 ? 's' : ''}
              {state.multiplier > 0 && ` · x${state.multiplier}`}
            </small>
          )}
        </div>

        <div className="bet">
          <span>Aposta</span>
          <div className="bet-options">
            {BET_OPTIONS.map((value) => (
              <button
                key={value}
                className={value === bet ? 'active' : ''}
                disabled={busy}
                onClick={() => setBet(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <button className="spin" onClick={spin} disabled={!canSpin}>
          {!ready ? 'Carregando...' : busy ? STATUS[state.phase] : 'GIRAR'}
        </button>
      </section>

      {state.balance < bet && state.phase === 'idle' && <p className="broke">Saldo insuficiente. Recarregue a página.</p>}

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
            <b>Multiplicadores:</b> as esferas douradas somam e multiplicam o ganho total do giro.
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
