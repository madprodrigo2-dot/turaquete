# Auditoria: ataque + intermediário + Até R$1.200
Data: 2026-07-18 · READ-ONLY (nenhuma tabela alterada)

---

## 1. Pesos do scorer para estilo=ataque + nível=intermediário

O chip "Ataque (potência, smash)" seta `estilo='ofensivo'` no perfil confirmado.
O agente auto-injeta `prioridade='potencia'` ao chamar `buscar_raquetas` (`ESTILO_TO_PRIORIDADE` em `agent.ts:778`).
O scorer então aplica o branch `nivel='intermediario' && prioridade='potencia'` (`scorer.ts:178`):

| Dimensão       | Peso | % do total |
|----------------|-----:|-----------:|
| **potência**   |   26 |        26% |
| estabilidade   |   20 |        20% |
| manuseio       |   15 |        15% |
| conforto       |   14 |        14% |
| sweet spot     |   13 |        13% |
| controle       |   12 |        12% |
| spin           |    0 |         0% |
| **Total**      |  100 |       100% |

**Observação crítica:** potência tem o maior peso individual (26%), mas os outros 74% vêm de dimensões que não medem poder de ataque. Em R$1.200 esse desequilíbrio vai importar — veja seção 2.

A faixa de peso calculada para intermediário + ofensivo: **320–335g**, balance médio
(base 320–330g; janela mínima de 15g eleva o teto para 335g).

---

## 2. As 9 raquetas do pool dentro de R$1.200 — power e match_score

Sessão de referência encontrada no DB: `704ae6e0` (2026-07-19), `recommended_racket_ids: [133, 41, 249]`
(Vision Pyramid 2025, Renegade Comfort BT, Total Pro 12K).

Pool completo intermediário+potência+≤R$1.200 + model_year≥2024, ordenado por match_score:

| # | Raquete | Preço | power | match_score |
|---|---------|------:|------:|------------:|
| 1 | **Vision Pyramid 2025** | R$1.199 | **4** | **6.21** |
| 2 | Total Pro 12K | R$979 | 7 | 6.03 |
| 3 | Renegade Comfort BT | R$949 | 3 | 5.98 |
| 4 | Total Titanium 3K | R$1.199 | 6 | 5.94 |
| 5 | Kinetic X | R$1.099 | 4 | 5.84 |
| 6 | Master 2026 | R$847 | 3 | 5.84 |
| 7 | Giant | R$1.147 | 4 | 5.82 |
| 8 | Z Soft | R$644 | 3 | 5.82 |
| 9 | Forest | R$999 | 3 | 5.81 |

### Por que Pyramid (#1) venceu com power=4?

Decomposição componente a componente, Pyramid vs Total Pro 12K:

| Dimensão     | Pyramid (p=4) | Total Pro (p=7) | Delta |
|-------------|--------------|-----------------|------:|
| potência    | 4 × 0.26 = **1.04** | 7 × 0.26 = **1.82** | −0.78 |
| controle    | 8 × 0.12 = **0.96** | 4 × 0.12 = **0.48** | +0.48 |
| conforto    | 8 × 0.14 = **1.12** | 5 × 0.14 = **0.70** | +0.42 |
| manuseio    | 7 × 0.15 = **1.05** | 7 × 0.15 = **1.05** | 0.00 |
| estabilidade| 5 × 0.20 = **1.00** | 6 × 0.20 = **1.20** | −0.20 |
| sweet spot  | 8 × 0.13 = **1.04** | 6 × 0.13 = **0.78** | +0.26 |
| **Total**   | **6.21** | **6.03** | **+0.18** |

**Pyramid ganhou por fit global, não há nada raro no scorer.** O déficit de potência (−0.78) foi mais do que compensado pelo triplo de controle+conforto+sweet spot (controle 8→4, conforto 8→5, forgiveness 8→6), que juntos somam +1.16. O scorer intermediário+potência pondera potência em apenas 26%; os outros 74% penalizam fortemente perfis unidimensionais. Total Pro 12K é a única raquete com power≥7 no orçamento, mas seu controle=4, conforto=5 e forgiveness=6 são fracos o suficiente para perder para uma raquete de controle/conforto bem balanceada.

---

## 3. Comparação: mesmo perfil SEM limite de orçamento

Pool: intermediário + potência, model_year≥2024, sem filtro de preço.
Top 3 livre:

| # | Raquete | Preço | power | match_score |
|---|---------|------:|------:|------------:|
| 1 | Canyon Pro BT 1.0 2024 | R$2.540 | 7 | 6.60 |
| 2 | Poison Bee 2026 | R$2.618 | 7 | 6.60 |
| 3 | Drop Shot Legacy Soft 2.0 BT 2025 | R$2.099 | 7 | 6.50 |

**Custo do teto de R$1.200:**

| Métrica | Com teto R$1.200 | Sem teto | Delta |
|---------|-----------------|----------|------:|
| Melhor match_score disponível | 6.21 (Pyramid) | 6.60 (Canyon/Poison) | **−0.39 pts** |
| Power da #1 recomendada | 4 | 7 | **−3 pts de power** |
| Preço mínimo do top-3 livre | — | R$2.099 | — |

O teto de R$1.200 custa **0.39 pontos de match_score** — que num scorer 0–10 representa uma queda de ~6% na qualidade de fit, mas mais relevante: **−3 pontos de power** (de 7 para 4 na #1). O "entry price" para o primeiro candidato livre abaixo do top-3 com power=7 é **R$1.499** (Drop Shot Legacy Soft 1.0 BT 2024, score=6.5) — um gap de R$299 (25%) acima do teto.

---

## 4. Disponibilidade de power ≥ 8 e ≥ 7 dentro de R$1.200

Universo: publicada=true, model_year≥2024, price≤R$1.200.

| Threshold power | Raquetes | Nomes |
|----------------|---------|-------|
| ≥ 8 | **0** | — nenhuma — |
| ≥ 7 | **1** | Total Pro 12K (R$979) |
| ≥ 6 | 2 | + Total Titanium 3K (R$1.199) |
| Total no pool (com insights) | 25 | |

**O teto de R$1.200 é uma parede estrutural para perfis de ataque.** Não existe nenhuma raquete publicada abaixo desse preço com power≥8 no catálogo atual (2024+). Há exatamente 1 com power=7. O scorer consegue dar #2 a essa raquete (Total Pro 12K), mas mesmo ela perde para Pyramid porque seu perfil fora de power é fraco (controle=4, conforto=5, forgiveness=6).

---

## Síntese

1. **O scorer não está errado:** Pyramid venceu dentro das regras. O perfil intermediário+potência distribui 74% do peso em dimensões não-potência, então uma raquete redonda com control=8/comfort=8/forgiveness=8 bate uma potente mas desequilibrada.

2. **O problema é estrutural no catálogo:** não é o scorer que "rebaixa" o ataque, é que no segmento ≤R$1.200 simplesmente não existem raquetes com poder de ataque real (power≥7) e perfil redondo ao mesmo tempo. Só há 1 com power≥7 e ela tem controle=4.

3. **Ação possível:** se o usuário declarar "quero potência acima de tudo", considerar relaxar o orçamento para R$1.500 (entrada real no mercado de ataque intermediário: Drop Shot Legacy, score=6.5, power=7). Isso pode ser comunicado proativamente quando o pool ≤R$1.200 retornar power máximo=7 e apenas 1 candidata nessa faixa.
