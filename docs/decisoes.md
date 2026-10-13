# Decisões técnicas

Por que o jogo é feito assim. Cada item diz o que foi escolhido, por quê e o que ficou de fora.

## Escopo

**Faz:** caça-níquel de cascata jogável no navegador, com rodadas grátis, multiplicadores, compra de bônus e giro automático, usando créditos fictícios.

**Não faz (de propósito):** dinheiro real, conta de usuário, servidor, som e placar. É uma demonstração de front-end e de matemática de jogo.

## Stack

| Parte | Escolha | Por quê | Alternativa descartada |
| --- | --- | --- | --- |
| Tabuleiro | PixiJS 8 (WebGL) | animação de dezenas de peças a 60 fps; é o que estúdios de slot usam | DOM/CSS (trava com muitas peças animadas) |
| Interface (saldo, aposta, botões) | React 19 | formulário e estado de tela são o forte do React | desenhar os botões no canvas (sem acessibilidade, mais código) |
| Linguagem | TypeScript | regra de jogo errada custa caro; o tipo pega erro antes de rodar | JavaScript puro |
| Build e testes | Vite + Vitest | rápido e com a mesma configuração para os dois | Webpack + Jest |
| Hospedagem | GitHub Pages via Actions | grátis, e o deploy só acontece se os testes passarem | Netlify/Vercel (mais uma conta) |

## Arquitetura

- **A lógica decide o giro inteiro antes; a tela só anima.** `playSpin()` devolve um `SpinOutcome` com a grade inicial e todas as cascatas. É assim num cassino online de verdade: o servidor decide, o navegador mostra. Trocar a lógica local por uma chamada a servidor mudaria só de onde vem o `SpinOutcome`.
- **Regras em funções puras (`logic.ts`), sem desenho.** Dá para testar cada regra sem abrir navegador.
- **Desenho sem regra (`SlotView.ts`).** Ele só recebe o que mostrar.
- **`Game.ts` liga os dois:** pede o resultado, chama as animações em sequência e avisa o React do novo estado.
- **Animações retornam Promise** (helper próprio em `tween.ts`, em cima do ticker do Pixi). Um giro se lê de cima para baixo: `await dropIn`, `await highlight`, `await remove`, `await settle`. Não precisou de biblioteca de animação.
- **Peças desenhadas com `Graphics` (formas geométricas), sem imagens.** Não depende de arte de terceiros, não tem tela de carregamento e cada símbolo se distingue pela forma, não só pela cor.

## Matemática

- **Gerador aleatório com semente (mulberry32).** Mesma semente, mesma sequência: os testes são reproduzíveis.
- **Tudo que muda o pagamento está em `config.ts`:** tabela de pagamento, chance de cada símbolo, multiplicadores, bônus.
- **Calibrado com simulação de 1 milhão de giros** (`simulate.ts`): RTP de 97%, 26% dos giros com ganho, bônus a cada ~204 giros.
- **O equilíbrio é protegido por teste** (`rtp.test.ts`, 200 mil giros): se uma mudança levar o RTP para fora de 93–99%, o build quebra e o deploy não acontece.
- **Ganho máximo limitado a 5.000x** a aposta por rodada.
- **Compra de bônus a 52x:** a rodada grátis rende em média ~50,5x, então comprar mantém o RTP perto de 97%, sem vantagem nem desvantagem grande.
