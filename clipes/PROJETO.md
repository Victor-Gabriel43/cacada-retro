# Clipador — Idealização do projeto

> Este documento é o rumo do projeto. **Qualquer mudança ou upgrade começa aqui**:
> primeiro atualiza o documento, depois o código. Se uma ideia não cabe nas regras
> da seção 2, ou a regra muda (de propósito, escrito aqui) ou a ideia não entra.

Status: rascunho v0.1 — 21 nov 2026. Itens marcados **[DECIDIR]** ainda estão em aberto.

---

## 1. O que é e para que serve

Um sistema que roda no meu PC e me entrega, todo dia, os **melhores momentos das
lives e vídeos de GTA 6** já cortados em vertical (9:16) e legendados. Eu só
aprovo e posto.

- **Objetivo:** ganhar dinheiro com clipes enquanto o GTA 6 está no auge (data de lançamento: **[DECIDIR] confirmar**).
- **Quanto do meu tempo:** abrir o site, aprovar ou descartar, postar. Meta: **menos de 30 min por dia**.
- **Quanto de IA (tokens):** **zero no dia a dia.** O Claude só entra para construir ou dar upgrade, sempre seguindo este documento.

### Como o dinheiro entra **[DECIDIR]**
| Caminho | Como funciona | Observação |
|---|---|---|
| Programa de clipadores do streamer | O streamer ou uma agência paga por views | Melhor caminho: dá permissão e paga. Ver se Alan Zoka e Void têm |
| Monetização da plataforma | TikTok (vídeos com mais de 1 min), YouTube Shorts, Kwai | Precisa de conta com seguidores e conteúdo transformado |
| Página própria cresce e vira ativo | Conta de "melhores momentos GTA 6 BR" | Depende de constância |

---

## 2. Regras que nunca mudam (sem decisão escrita aqui)

1. **Roda no meu PC.** Nada de servidor pago. Site local em `http://localhost`.
2. **Zero token no dia a dia.** Quem escolhe o momento bom é o público (views de clipe, chat, replays), não a IA.
3. **Eu aprovo tudo.** Nada é postado sem eu clicar em Aprovar.
4. **Uma etapa, uma peça.** Cada etapa (seção 5) é um módulo separado que lê e escreve no mesmo banco. Trocar uma etapa não quebra as outras.
5. **Canal é configuração, não código.** Adicionar um streamer novo = adicionar uma linha em `canais` pelo site. Nunca mexer no código para isso.
6. **Um lugar só para os dados:** um banco SQLite + uma pasta de vídeos.
7. **Respeitar quem é clipado.** Dar crédito ao streamer em todo post e seguir as regras de clipe de cada um.

---

## 3. Fontes (de onde vêm os clipes)

| Tipo | Quem | Plataforma | Para quê |
|---|---|---|---|
| Streamers BR | Alan Zoka, Void, David Jones **[DECIDIR] lista completa** | Twitch | Momentos engraçados e épicos ao vivo |
| Criadores gringos | **[DECIDIR] quais** | YouTube | Curiosidades, segredos e easter eggs do GTA 6 |

Horários conhecidos:
- Alan Zoka: começa por volta das 10–11h e vai até a noite. Domingo sem live.
- Void: **[DECIDIR] horário**.

---

## 4. Como achar o momento bom (sem IA)

Cada momento candidato recebe uma **nota** a partir de sinais gratuitos:

| Sinal | De onde | Peso inicial |
|---|---|---|
| Views do clipe que o público criou | API de clipes da Twitch | Principal |
| Vários clipes do mesmo minuto | API de clipes da Twitch | Alto (todo mundo clipou a mesma coisa) |
| Pico de mensagens no chat ("KKKK", "CLIPA", emotes) | Chat da Twitch | Médio (fase 2) |
| Parte "mais repetida" do vídeo | Gráfico de replay do YouTube (via `yt-dlp`) | Principal para os gringos |

Os pesos ficam numa configuração e eu ajusto pelo site, sem mexer no código.

---

## 5. O caminho de um clipe (etapas)

Cada etapa muda o **estado** do clipe no banco. É isso que mantém o sistema organizado.

```
 COLETAR → RANQUEAR → BAIXAR → EDITAR → LEGENDAR → REVISAR → EXPORTAR → POSTAR → MEDIR
 candidato  com nota   baixado  editado  legendado  aprovado   pronto    postado  com números
                                                  ↘ descartado
```

| # | Etapa | Entrada | Saída | Ferramenta |
|---|---|---|---|---|
| 1 | Coletar | Canais + janela de horário | Candidatos no banco | API da Twitch, `yt-dlp` |
| 2 | Ranquear | Candidatos | Nota de 0–100 | Regras da seção 4 |
| 3 | Baixar | Os N melhores | Arquivo `.mp4` original | `yt-dlp` |
| 4 | Editar | Original + layout | Vídeo 9:16 | `ffmpeg` |
| 5 | Legendar | Vídeo 9:16 | Legenda queimada no vídeo | Whisper local (`faster-whisper`) |
| 6 | Revisar | Vídeo pronto | Aprovado ou descartado, com ajuste de início e fim | Site local |
| 7 | Exportar | Aprovado | Arquivo final + título + descrição com crédito | Modelos de texto (sem IA) |
| 8 | Postar | Exportado | Link do post | **Manual no começo**, automático depois |
| 9 | Medir | Link do post | Views e likes | Manual no começo, depois as APIs |

---

## 6. Formatos de vídeo (layouts)

| Layout | Como fica | Quando usar |
|---|---|---|
| **Câmera + jogo** | Câmera do streamer em cima (1/3), jogo embaixo (2/3) | Padrão para streamers |
| **Só jogo** | Jogo com zoom no centro | Quando não tem câmera ou o momento é visual |
| **Curiosidade** | Trecho do gringo + título fixo no topo + legenda em PT | Vídeos de curiosidades |

- A posição da câmera de cada streamer fica salva no canal. Marco uma vez no site e todo clipe usa a mesma.
- Legenda: grande, centralizada, palavra por palavra. **[DECIDIR] estilo e fonte**.
- Duração: **[DECIDIR]** 15–60 s para Shorts/Reels; acima de 1 min se o alvo for a monetização do TikTok.

---

## 7. O site (telas)

1. **Hoje:** quem está ao vivo, quantos candidatos, quantos prontos para revisar.
2. **Fila de revisão:** um clipe por vez, com o vídeo tocando. Botões **Aprovar / Descartar / Ajustar corte**. Atalhos de teclado para revisar rápido.
3. **Prontos para postar:** arquivo final, título e descrição para copiar, e botão "marquei como postado".
4. **Canais:** adicionar ou remover streamer, horário, plataforma e posição da câmera.
5. **Resultados (fase 3):** quais clipes e quais streamers dão mais views.

---

## 8. Organização técnica

- **Linguagem:** Python (o mesmo do projeto anterior).
- **Site:** FastAPI + HTML simples, sem framework pesado.
- **Banco:** SQLite em `clipes/dados/clipes.db`.
- **Vídeos:** `clipes/dados/videos/<canal>/<data>/`. Fora do git, porque é pesado.
- **Precisa instalar:** Python, `ffmpeg`, `yt-dlp` e uma chave gratuita de desenvolvedor da Twitch (Client ID e Secret).
- **PC:** **[DECIDIR]** Windows? Tem placa de vídeo NVIDIA? (Whisper fica muito mais rápido com GPU.)

Tabelas principais:
- `canais` (nome, plataforma, id, layout, posição da câmera, ativo)
- `momentos` (canal, origem, link, início, fim, sinais, nota, **estado**)
- `posts` (momento, plataforma, link, data, views)

Pastas do código (uma por etapa):
```
clipes/
  PROJETO.md      ← este documento
  coletar/  ranquear/  baixar/  editar/  legendar/  exportar/  postar/
  site/
  dados/          ← banco e vídeos (fora do git)
```

---

## 9. Rotina do dia a dia

- **Durante a live:** o sistema coleta a cada **[DECIDIR] 15 ou 30 min** e já baixa, edita e legenda os melhores.
- **Pausas e fim da live:** abro a fila, aprovo e posto.
- **Domingo (sem Alan):** pego os gringos e os melhores da semana (compilado).

---

## 10. Contas e postagem **[DECIDIR]**

- **Onde postar:** TikTok, YouTube Shorts, Instagram Reels, Kwai?
- **Uma conta por streamer ou uma conta "GTA 6 BR" com todos?**
- **Quantos posts por dia?**
- **Descrição padrão:** `🎮 @streamer na live de GTA 6 | twitch.tv/streamer` + hashtags.

---

## 11. Riscos e cuidados

| Risco | O que fazer |
|---|---|
| Strike ou derrubada por direitos | Pedir permissão ou entrar no programa de clipadores; sempre dar crédito; editar (legenda e corte) em vez de repostar cru |
| Reprovação por "conteúdo reutilizado" | Legenda, layout próprio, título e gancho |
| VOD apagado ou só para inscritos | Usar os clipes do público, que ficam salvos; baixar no mesmo dia |
| Mudança na API da Twitch ou no `yt-dlp` | Só a etapa "Coletar" ou "Baixar" muda (regra 4) |

---

## 12. Fases (o que fazer em cada uma)

### Fase 0 — Domingo 22 nov: teste com o que já passou
Objetivo: **postar os primeiros clipes** e provar que o caminho funciona.
- Pegar os clipes mais vistos do Alan Zoka (e do Void) de **quarta a sábado** (18–21 nov) pela API da Twitch.
- Etapas 1 a 5 funcionando + uma fila de revisão simples (etapa 6).
- Exportar e postar à mão.
- **Pronto quando:** pelo menos 10 clipes aprovados e postados.

### Fase 1 — Segunda em diante: ao vivo
- Coleta automática no horário das lives.
- Tela "Hoje" e tela "Canais".
- Ajuste de corte e de posição da câmera pelo site.

### Fase 2 — Curiosidades e gringos
- Fonte YouTube + gráfico de replay.
- Layout "Curiosidade" com título.
- Sinal do chat da Twitch.

### Fase 3 — Escala
- Postagem automática (onde a plataforma permitir).
- Coleta de views e tela de Resultados.
- Ajustar os pesos da nota pelo que dá mais views.

---

## 13. Como pedir upgrade (para não bagunçar)

1. Escrever a ideia aqui, na fase certa da seção 12.
2. Dizer qual etapa da seção 5 ela muda.
3. Ver se fere alguma regra da seção 2.
4. Só então pedir ao Claude: *"Implementa o item X da fase Y do clipes/PROJETO.md"*.
   Pedido curto e escopo fechado = poucos tokens.

---

## 14. Decisões em aberto (responder antes de construir)

1. Lista de streamers BR e de criadores gringos.
2. Onde postar e se é uma conta só ou uma por streamer.
3. Duração alvo dos clipes.
4. Como o dinheiro entra: programa de clipadores ou monetização da plataforma.
5. PC: Windows? Placa NVIDIA?
6. De quanto em quanto tempo coletar durante a live.
7. O que fazer com o código antigo da Caçada Retrô (apagar ou arquivar).
