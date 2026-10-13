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
  → barra roxa no lugar do título: rodada atual/total, multiplicador acumulado, ganho no bônus
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
| Parar / alerta | vermelho (`#fca5a5` → `#ef4444`) | PARAR do giro automático, saldo insuficiente |

Cada cor tem **um** significado. Amarelo é "aja aqui", roxo é "bônus", verde é "ganhou", vermelho é "pare".

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

- O tabuleiro ocupa a largura da coluna (máx. 720 px) e mantém a proporção. Em tela baixa ele encolhe para caber: largura = (altura da tela − `--reserve`) × proporção do tabuleiro. `--reserve` (em `App.css`) é a altura do resto que precisa caber (margens, título e a linha do GIRAR). Se mudar a altura do título ou da linha do GIRAR, ajuste `--reserve` junto. Mínimo de 260 px de largura (celular deitado rola a página).
- Título e barra de rodadas grátis dividem o mesmo espaço, com a mesma altura: o tabuleiro não pula quando o bônus começa.
- **Acima de 640 px:** 3 colunas. Linha 1: saldo | ganho | GIRAR. Linha 2: aposta | automático | comprar bônus.
- **Até 640 px:** 2 colunas. Saldo | ganho, depois GIRAR na largura toda, depois aposta, automático e bônus, um por linha.
- Conferido em 390×664 (celular com as barras do navegador), 768×1024 e 1366×680 (notebook).

## Acessibilidade

- Página em `lang="pt-BR"`.
- Botões − e + da aposta com rótulo ("Diminuir aposta" / "Aumentar aposta"); o valor da aposta é lido quando muda. Botões do automático lidos como "10 giros" etc.
- Ganho de cada rodada anunciado ao leitor de tela ("Ganho de 12,40").
- Foco do teclado com anel claro (`#e0e7ff`), visível no fundo escuro.
- Alvos de toque com pelo menos 40 px.
- Diálogo da compra de bônus: `<dialog>` nativo (`BonusDialog.tsx`). Abre com o foco em **Cancelar** (Enter não compra sem querer), Esc ou clique fora fecha, a página atrás fica bloqueada.

## Pontos em aberto (para a próxima revisão de design)

- Em tela larga e baixa (notebook), uma tela com o tabuleiro à esquerda e os controles numa coluna à direita deixaria o tabuleiro maior. Hoje ele encolhe para o GIRAR caber embaixo.
- O texto "2 cascatas · x5" ao lado do GANHO é amarelo, cor que neste brief quer dizer "aja aqui". Trocar por verde claro ou pelo lilás dos rótulos deixaria as cores com um significado só.
