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

COMPRAR BÔNUS → confirmação → rodadas grátis direto
  → barra roxa no topo: rodada atual/total, multiplicador acumulado, ganho no bônus
  → 3+ BONUS durante o bônus: "+5 RODADAS"
  → fim: banner "TOTAL" com o ganho → volta para GIRAR

GIRO AUTOMÁTICO (10/25/50/100) → GIRAR vira PARAR (n) em vermelho → para sozinho se o saldo acabar
Saldo menor que a aposta → aviso "Saldo insuficiente. Recarregue a página para recomeçar."
```

Durante qualquer animação, os botões ficam desligados e o GIRAR mostra a fase ("Girando...", "Cascata!", "Multiplicador!", "Rodadas grátis").

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

## Números

- Padrão brasileiro: `1.000,00`, `0,20`. Saldo e ganho com 2 casas.
- Multiplicador como `x10`.

## Tamanhos de tela

- O tabuleiro ocupa 100% da largura da coluna (máx. 720 px) e mantém a proporção.
- **Acima de 520 px:** interface em 2 colunas (saldo | ganho, aposta | GIRAR, automático | bônus).
- **Até 520 px:** 1 coluna, GIRAR mais alto.

## Pontos em aberto (para a próxima revisão de design)

- No celular, o GIRAR fica abaixo do tabuleiro e pode exigir rolagem a cada giro.
- A confirmação da compra de bônus usa o `confirm()` do navegador, que destoa do visual.
- As animações não respeitam `prefers-reduced-motion`.
- O botão "−/+" da aposta não tem rótulo para leitor de tela.
- A página está marcada como `lang="en"`, mas a interface é em português.
