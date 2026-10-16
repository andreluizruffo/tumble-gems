# Brief de design

Referência para qualquer mudança visual no jogo. Mudança que contrarie este documento: atualize o documento junto, ou não faça.

## Para quem e para quê

- **Quem abre:** recrutador ou cliente vendo o portfólio, quase sempre por um link, muitas vezes no celular. Fica 1 ou 2 minutos.
- **Tarefa principal:** girar e ver a cascata acontecer. O primeiro giro tem que estar a **um clique** de distância, sem tutorial.
- **Objetivo secundário:** chegar nas rodadas grátis (pela compra de bônus) e ver o momento mais vistoso do jogo.
- **Teste dos 5 segundos:** entende que é um caça-níquel de demonstração, com crédito fictício, e acha o botão GIRAR.

## Fluxo

```
abre a página → "Carregando..." → peças caem no tabuleiro → GIRAR liberado

GIRAR (ou barra de espaço)
  → peças antigas saem, novas caem
  → enquanto houver 8+ iguais: destaca → somem → as de cima caem (cascata)
  → se houver esferas: mostra o multiplicador total
  → 4+ BONUS: celebra → banner "15 RODADAS GRÁTIS!" → rodadas grátis
  → ganho de 10x a aposta ou mais: banner "BIG WIN!"
  → volta para GIRAR

COMPRAR BÔNUS → diálogo "Comprar bônus?" (preço e saldo que sobra; Cancelar / Comprar) → rodadas grátis direto
  → a tela volta para o tabuleiro (no celular o botão fica abaixo dele)
  → barra roxa no lugar do título (no notebook, no topo da coluna da direita): rodada atual/total, multiplicador acumulado, ganho no bônus
  → 3+ BONUS durante o bônus: "+5 RODADAS"
  → fim: banner "TOTAL" com o ganho → volta para GIRAR

GIRO AUTOMÁTICO (10/25/50/100) → a tela volta para o tabuleiro → GIRAR vira PARAR (n) em vermelho
  → para sozinho se o saldo acabar
Saldo menor que a aposta → GIRAR vira "SEM SALDO" e aparece, logo abaixo do tabuleiro:
  "Saldo menor que a aposta. Diminua a aposta ou recomece com 1.000,00" (se nem a menor aposta cabe: "O saldo acabou.")
  → "recomece" recarrega a página
```

Durante qualquer animação, os botões ficam desligados e o GIRAR mostra a fase ("Girando...", "Cascata!", "Multiplicador!", "Rodadas grátis").

A barra de espaço gira (ou para o automático) de qualquer lugar. Exceção: quem chegou num botão com Tab aperta aquele botão com espaço, como em qualquer site.

## Identidade

- **Tom:** cassino de joias, noturno e festivo, mas legível. Brilho só onde há ganho.
- **Sem nome, arte ou marca de jogos existentes.** As peças são formas geométricas próprias.
- **Fundo:** degradê radial roxo (`#312e81` → `#0f0a2e`). Só existe tema escuro, e é de propósito.

| Papel | Cor | Uso |
| --- | --- | --- |
| Painéis | `#1e1b4b` com borda `#312e81` | saldo, ganho, aposta, regras, tabuleiro |
| Texto | `#e0e7ff` | texto principal |
| Rótulo | `#a5b4fc` | rótulos em maiúsculas |
| Ação principal | amarelo → laranja (`#fde047` → `#f59e0b`), texto `#451a03` | GIRAR e o título |
| Bônus | rosa → roxo (`#e879f9` → `#a21caf`) | COMPRAR BÔNUS, barra de rodadas grátis, peça BONUS |
| Ganho | verde `#4ade80` | valor do ganho, BIG WIN |
| Detalhe do ganho | verde claro `#86efac` (11,4:1 no painel) | "2 cascatas · x5" ao lado do GANHO |
| Parar / alerta | vermelho (`#fca5a5` → `#ef4444`) | PARAR do giro automático, saldo insuficiente |

Cada cor tem **um** significado. Amarelo é "aja aqui", roxo é "bônus", verde é "ganhou", vermelho é "pare". Cascatas e multiplicador só aparecem quando há ganho, por isso o texto delas é verde (mais claro e menor que o valor).

- **Fonte:** a do sistema (`system-ui`, `Segoe UI`) na interface. Arial em negrito no canvas (banners e números das peças).
- **Botões grandes:** cantos de 14 px e sombra embaixo, como tecla. Ao clicar, o GIRAR afunda 3 px.

## Símbolos

9 joias com **forma e cor diferentes** (pentágono, círculo, quadrado, triângulo, losango, hexágono, anel, octógono, estrela), além da peça BONUS (círculo roxo sobre uma estrela dourada) e da esfera multiplicadora (dourada com o "x2" a "x50" escrito). Quem não distingue cor reconhece pela forma.

## Ritmo das animações

- Peças caem com quique (`easeOutBounce`), de coluna em coluna, com um pequeno atraso entre elas.
- Destaque do ganho ~0,3 s, sumir ~0,2 s, assentar ~0,4 s, banner ~0,3 s para entrar.
- Hoje um giro sem cascata leva cerca de 1,5 s (peças saem e as novas caem). Não deixar mais lento: cansa no giro automático.
- **Movimento reduzido** (`prefers-reduced-motion`, opção do sistema): as animações duram metade do tempo, sem quique nem "passar do ponto", e as peças BONUS não giram. As pausas dos banners continuam iguais, para dar tempo de ler. Fica em `tween.ts` (`REDUCED_SPEED`).

## Números

- Padrão brasileiro: `1.000,00`, `0,20`. Saldo e ganho com 2 casas.
- Multiplicador como `x10`.

## Tamanhos de tela

**Regra principal: o GIRAR aparece sem rolar a página**, no celular e no notebook. O que fica abaixo dele (aposta, automático, bônus, regras) pode pedir rolagem, porque é usado de vez em quando.

Três arranjos, escolhidos pelo tamanho da tela (media queries em `App.css`):

- **Lado a lado — tela com 1000 px ou mais de largura e proporção de 5:4 ou mais larga** (notebook, monitor, tablet deitado): tabuleiro à esquerda; à direita, uma coluna de 300 px com título (ou barra das rodadas grátis), saldo, ganho, GIRAR, aposta, automático, comprar bônus e "Como funciona".
  - O tabuleiro usa a altura toda da tela menos as margens (`--reserve: 32px`), limitado pela largura que sobra ao lado da coluna e a 1200 px (o canvas é desenhado em 2x, 1216 px; passa disso fica borrado).
  - Por que 1000 px: abaixo disso a coluna de 300 px come tanta largura que o tabuleiro ficaria menor que empilhado (em 900×700: 544 px lado a lado contra 565 px empilhado). Por que 5:4: só telas claramente mais largas que altas; tablet em pé e telas quase quadradas continuam empilhadas.
  - Título e barra das rodadas grátis dividem um espaço fixo de 96 px no topo da coluna; a barra vira 3 linhas (rótulo à esquerda, número à direita). Nada se move quando o bônus começa.
- **Empilhado, acima de 640 px:** título, tabuleiro e controles em 3 colunas. Linha 1: saldo | ganho | GIRAR. Linha 2: aposta | automático | comprar bônus.
- **Empilhado, até 640 px:** 2 colunas. Saldo | ganho, depois GIRAR na largura toda, depois aposta, automático e bônus, um por linha.

No empilhado, o tabuleiro ocupa a largura da coluna (máx. 720 px) e mantém a proporção. Em tela baixa ele encolhe para caber: largura = (altura da tela − `--reserve`) × proporção do tabuleiro. `--reserve` é a altura do resto que precisa caber (margens, título e a linha do GIRAR); a conta de cada número está comentada em `App.css`. Se mudar a altura do título ou da linha do GIRAR, ajuste `--reserve` junto. Mínimo de 260 px de largura (celular deitado rola a página). Título e barra de rodadas grátis têm a mesma altura: o tabuleiro não pula quando o bônus começa.

| Tela | Arranjo | Largura do tabuleiro | Base do GIRAR |
| --- | --- | --- | --- |
| 1920×1080 | lado a lado | 1200 px | 352 px |
| 1440×900 | lado a lado | 1031 px | 352 px |
| 1280×800 | lado a lado | 908 px | 352 px |
| 1366×680 (notebook com barras do navegador) | lado a lado | 770 px | 352 px |
| 1024×768 | lado a lado | 652 px | 352 px |
| 768×1024 (tablet em pé) | empilhado | 688 px | 785 px |
| 390×664 (celular com barras do navegador) | empilhado | 358 px | 543 px |

## Acessibilidade

- Página em `lang="pt-BR"`.
- Botões − e + da aposta com rótulo ("Diminuir aposta" / "Aumentar aposta"); o valor da aposta é lido quando muda. Botões do automático lidos como "10 giros" etc.
- Ganho de cada rodada anunciado ao leitor de tela ("Ganho de 12,40").
- Foco do teclado com anel claro (`#e0e7ff`), visível no fundo escuro.
- Alvos de toque com pelo menos 40 px.
- Diálogo da compra de bônus: `<dialog>` nativo (`BonusDialog.tsx`). Abre com o foco em **Cancelar** (Enter não compra sem querer), Esc ou clique fora fecha, a página atrás fica bloqueada.

## Pontos em aberto (para a próxima revisão de design)

- Celular deitado (ex.: 844×390) continua empilhado e o GIRAR pede rolagem. Dá para levar o lado a lado para ele, mas a coluna da direita teria de começar pelo GIRAR, porque a altura não cabe título + saldo + ganho antes dele.
