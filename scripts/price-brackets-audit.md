# Auditoria de Calibração de Preços — Turaquete
> Gerado em 2026-07-18. READ-ONLY — nenhuma mudança aplicada.

---

## 1. Catálogo: distribuição das publicadas por faixa

| Faixa | Total | Com link curado | Preço médio | Preço min–max |
|-------|------:|----------------:|------------:|--------------:|
| < R$300 | 0 | 0 | — | — |
| R$300–500 | 2 | 2 | R$322 | R$322–R$322 |
| R$500–800 | 9 | 8 | R$682 | R$549–R$769 |
| R$800–1.200 | 26 | 22 | R$1.059 | R$829–R$1.199 |
| R$1.200–1.800 | 64 | 41 | R$1.544 | R$1.205–R$1.799 |
| > R$1.800 | 147 | 93 | R$2.355 | R$1.800–R$4.330 |
| **TOTAL** | **248** | **166** | | |

**Observações:**
- 59% das raquetes publicadas (147/248) estão acima de R$1.800.
- Apenas 37 raquetes (15%) estão abaixo de R$1.200 — faixa que concentra 38% da demanda declarada.
- 166 de 248 raquetes (67%) têm link curado ativo (monetizáveis).
- Acima de R$1.800 há 147 raquetes mas apenas 93 com link (63%); entre R$800–1.200 há 22/26 (85%).

---

## 2. Demanda declarada: distribuição de orçamentos

O campo `profile` nas conversas está sempre vazio `{}` — o orçamento **não é armazenado de forma estruturada**. Ele fica somente no texto das mensagens como resposta ao chip de faixa de preço.

Análise de todas as respostas de orçamento nas mensagens históricas (N=415 ocorrências, múltiplas por sessão possível):

| Resposta do usuário | Ocorrências | % |
|---------------------|------------:|--:|
| "Até R$1.200" *(chip atual)* | 100 | 24% |
| "Tanto faz / me mostra opções" *(chip atual)* | 94 | 23% |
| "Até R$1.000" *(chip antigo)* | 58 | 14% |
| "Tanto faz" *(chip antigo)* | 54 | 13% |
| "R$2.000 a R$3.000" | 42 | 10% |
| "R$1.000 a R$2.000" *(chip antigo)* | 35 | 8% |
| "R$1.200 a R$2.000" *(chip atual)* | 21 | 5% |
| "Mais de R$3.000" | 11 | 3% |

**Consolidado por faixa (unindo old+new chips):**

| Faixa consolidada | Ocorrências | % |
|-------------------|------------:|--:|
| Até R$1.200 | 158 | 38% |
| "Tanto faz" (sem filtro) | 148 | 36% |
| R$1.200 a R$2.000 | 56 | 13% |
| R$2.000 a R$3.000 | 42 | 10% |
| Mais de R$3.000 | 11 | 3% |

**Nota:** Os chips "Até R$1.000" e "R$1.000 a R$2.000" são o set antigo, ainda registrado em histórico. O set atual usa R$1.200 como divisor.

---

## 3. Comportamento: o que se recomenda vs o que se clica

### 3a. Preço das raquetes recomendadas

| Métrica | Valor |
|---------|------:|
| Sessões com recomendação | 129 |
| Total de raquetes recomendadas | 711 |
| Preço médio | R$1.427 |
| **Mediana** | **R$1.199** |
| Mínimo | R$322 |
| Máximo | R$3.399 |

### 3b. Preço das raquetes com click_comprar humano

| Métrica | Valor |
|---------|------:|
| Clicks reais (is_test=false) | 360 |
| Sessões únicas | 54 |
| Preço médio | R$1.931 |
| **Mediana** | **R$1.890** |
| Mínimo | R$322 |
| Máximo | R$4.330 |

### 3c. Distribuição dos clicks por faixa de preço

| Faixa | Clicks | % | Sessões únicas |
|-------|-------:|--:|---------------:|
| R$300–500 | 5 | 1.4% | 2 |
| R$500–800 | 18 | 5.0% | 9 |
| R$800–1.200 | 67 | 18.6% | 31 |
| R$1.200–1.800 | 79 | 21.9% | 5 |
| > R$1.800 | 191 | 53.1% | 14 |

### 3d. Interpretação

- **Gap de +58%** entre mediana recomendada (R$1.199) e mediana clicada (R$1.890).
- **75% dos clicks estão acima de R$1.200**, com 53% acima de R$1.800.
- A faixa 800–1.200 tem 31 sessões únicas clicando — a mais diversa; a >1.800 tem 14 sessões mas 191 clicks (múltiplos clicks por pessoa: comparam muito).
- A faixa 1.200–1.800 (79 clicks) tem apenas 5 sessões únicas — alguém comparou intensamente dentro dela.
- **Conclusão:** as pessoas clicam em raquetes mais caras do que a Tury recomenda como mediana. O catálogo pesado no topo (>R$1.800) e a disposição de gastar mais alinham; o gargalo é a faixa <R$1.200 com poucas opções.

---

## 4. UI Atual: chips de orçamento oferecidos

Definidos em `lib/agent/agent.ts` nas constantes `PRECO_BUCKETS` (linhas 32–37):

```
"Até R$1.200"         → presupuesto_max=1200
"R$1.200 a R$2.000"   → presupuesto_min=1201, presupuesto_max=2000
"R$2.000 a R$3.000"   → presupuesto_min=2001, presupuesto_max=3000
"Mais de R$3.000"     → presupuesto_min=3001 (sem teto)
"Tanto faz / me mostra opções"  → sem filtro de preço (sempre disponível)
```

**Inconsistência detectada:** `lib/agent/prompt.ts` linhas 341–344 ainda documenta os brackets antigos (`Até R$1.000`, `R$1.000 a R$2.000`). O código real (`PRECO_BUCKETS`) usa os novos (R$1.200), mas o prompt de instrução ao modelo está desatualizado — pode causar mapeamento errado quando o modelo interpreta respostas espontâneas de orçamento. Não alterado nesta auditoria.

---

## 5. Resumo de sinais para decisão

| Sinal | Dado |
|-------|------|
| Bracket mais declarado | "Até R$1.200" (38% da demanda) |
| Bracket menos coberto no catálogo | R$300–800: só 11 raquetes |
| Onde o dinheiro vai (mediana click) | R$1.890 |
| Faixa com mais clicks totais | > R$1.800 (53%) |
| Faixa com mais sessões distintas clicando | R$800–1.200 (31 sessões) |
| Raquetes disponíveis no bracket de maior demanda (≤R$1.200) | 37 publicadas, 32 com link |
| Gap recomendação → click | Mediana sobe R$691 (+58%) |
| Onde está 59% do catálogo | > R$1.800 |
