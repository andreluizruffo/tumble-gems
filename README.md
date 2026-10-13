# Tumble Gems

A "pay anywhere" cascade slot built with **PixiJS 8, React 19 and TypeScript**. Demo only: fictitious credits, no real money.

> 🇧🇷 Versão em português abaixo.

## Features

- **6x5 board, pay anywhere:** 8 or more equal symbols anywhere on the board win.
- **Tumble (cascade):** winning symbols disappear, the ones above fall and new ones drop in, repeating while there are wins.
- **Multiplier orbs (x2 to x50):** they multiply the win of the spin. During free spins they add up.
- **Free spins:** 4+ BONUS symbols award 15 free spins with an accumulating multiplier. 3+ during the bonus award 5 more.
- **Bonus buy** (52x the bet), **autoplay** (10/25/50/100 spins) and bets from 0.20 to 100.
- **Responsive:** the canvas scales with the page and works on mobile.

## Balance (math)

The paytable and the chances were tuned with a **Monte Carlo simulation of 1,000,000 spins** (`src/game/simulate.ts`):

| Metric | Value |
| --- | --- |
| RTP (return to player) | 97.0% |
| Hit rate | 26% of spins |
| Free spins | about 1 in 204 spins |
| Average free spins win | 49.6x the bet |
| Bonus buy | average 50.5x for a 52x price (same ~97% RTP) |
| Max win | capped at 5,000x |

`src/game/rtp.test.ts` runs 200k spins on every test run, so any change to the paytable that breaks the balance fails the build.

## Architecture

The logic decides the **whole spin first**, including every cascade, and the view only plays it back. This is how a real online slot works: the server decides and the client animates. Swapping the local logic for a REST or WebSocket response would only change where the `SpinOutcome` comes from.

```
src/
  game/
    config.ts     symbols, paytable, chances, bets
    rng.ts        seeded RNG (mulberry32), so spins are reproducible in tests
    logic.ts      pure functions: grid, wins, tumble, multipliers, free spins
    simulate.ts   Monte Carlo RTP simulation
    tween.ts      small tween helper on the Pixi ticker (Promise-based)
    SlotView.ts   PixiJS rendering and animations, no game rules
    Game.ts       controller: gets the outcome, animates it, updates balance
  App.tsx         React HUD (balance, bet, autoplay, bonus buy, rules)
```

- **Pure logic, no rendering:** every rule is a plain function, tested with Vitest.
- **Rendering without game rules:** `SlotView` only draws and animates what it receives.
- **Async animations:** tweens return Promises, so a spin reads as a sequence (`await dropIn`, `await highlight`, `await remove`, `await settle`).
- **React and Pixi side by side:** React owns the HUD; Pixi owns the canvas. The game sends state to React through a callback.

## Running

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # logic + RTP tests
npm run build
```

## Docs (in Portuguese)

- [Technical decisions](docs/decisoes.md): stack, architecture and math, with the reasons and the discarded alternatives
- [Design brief](docs/design.md): audience, full game flow, palette, symbols, animation timing and open issues

---

## 🇧🇷 Português

Caça-níquel de cascata ("paga em qualquer lugar") feito com **PixiJS 8, React 19 e TypeScript**. Só demonstração: créditos fictícios, sem dinheiro real.

- **Grade 6x5:** 8 ou mais símbolos iguais em qualquer posição ganham. Os vencedores somem e caem novos (cascata).
- **Esferas multiplicadoras** de x2 a x50, que se acumulam nas rodadas grátis.
- **Rodadas grátis:** 4+ símbolos BONUS dão 15 rodadas, e 3+ durante o bônus dão mais 5. Também tem **compra de bônus** (52x), **giro automático** e apostas de 0,20 a 100.
- **Matemática:** calibrada com simulação de 1 milhão de giros. O RTP é de 97% e 26% dos giros ganham. Um teste automático protege esse equilíbrio.
- **Arquitetura:** a lógica decide o giro inteiro antes e a tela só anima, como num cassino online, onde o servidor decide e o navegador mostra.
- **Documentação:** [decisões técnicas](docs/decisoes.md) e [brief de design](docs/design.md).
