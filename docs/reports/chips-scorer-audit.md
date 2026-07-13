# Auditoria de Coherencia: Chip → Scorer
> Read-only. Nenhum arquivo modificado.
> Data: 2026-07-12 | Fonte: `lib/scorer.ts` — função `baseWeights()`

---

## Contexto

Após remover `spin` do `deriveScoreTag()` (chip "Pra quem busca efeito", peso=0 em todos os
perfis), esta auditoria verifica se os **6 chips restantes** prometem um matching que o scorer
realmente faz. Critério: um chip é honesto se a dimensão correspondente tem `peso > 0` em pelo
menos um perfil de `baseWeights()`.

---

## 1. MANUSEIO — pesos por perfil

`maneuverability` → chip "Leve e ágil"

| Perfil | Peso |
|---|---|
| Dor (cotovelo / ombro / punho) | **15** |
| Iniciante | **15** |
| Intermediário — potência | **15** |
| Intermediário — controle / defesa | **15** |
| Intermediário — sem prioridade | **18** |
| Avançado — potência | **15** |
| Avançado — controle / defesa | **17** |
| Avançado — equilíbrio *(fallthrough)* | **22** |

**Mínimo: 15 | Máximo: 22**

### O que é folklore e o que é real

| Afirmação | Veredito |
|---|---|
| "Manuseio pesa em defesa" | **Parcialmente real.** Avançado+controle/defesa tem 17 — levemente acima do base (15), mas não é o pico. |
| "Manuseio pesa mais em agilidade / equilíbrio" | **Real.** O pico (22) está em `avancado+equilíbrio`, não em defesa. |
| "Manuseio é alto para 65+" | **Folklore.** `baseWeights()` não tem parâmetro `idade`. A faixa etária afeta `calcular_faixa_ideal()` (faixa de peso, prioridades textuais), mas **não muda os pesos do scorer**. Um usuário de 65+ usa o perfil `iniciante` ou `intermediario` sem ajuste adicional em manuseio. |
| "Manuseio pesa 0 em algum perfil" | **Falso.** Mínimo é 15 em 6 dos 8 perfis — nunca é zero. Chip honesto. |

---

## 2. Os outros 5 — pesos por perfil

### control → "Ótima pra controle"

| Perfil | Peso |
|---|---|
| Dor | 10 |
| Iniciante | 16 |
| Intermediário — potência | 12 |
| Intermediário — controle / defesa | **25** |
| Intermediário — sem prioridade | 18 |
| Avançado — potência | 15 |
| Avançado — controle / defesa | **27** |
| Avançado — equilíbrio | **25** |

Mín: 10 (dor) | Máx: 27 (avançado+controle). Peso > 0 em todos. ✓

---

### power → "Pra quem ataca"

| Perfil | Peso |
|---|---|
| Dor | 5 |
| Iniciante | 8 |
| Intermediário — potência | 26 |
| Intermediário — controle / defesa | 5 |
| Intermediário — sem prioridade | 13 |
| Avançado — potência | **32** |
| Avançado — controle / defesa | 14 |
| Avançado — equilíbrio | 15 |

Mín: 5 (dor / int.ctrl). Máx: 32 (avançado+potência). Peso > 0 em todos. ✓

---

### stability → "Estável e firme"

| Perfil | Peso base | + `contexto_vento` |
|---|---|---|
| Dor | 15 | 23 |
| Iniciante | 16 | 24 |
| Intermediário — potência | 20 | 28 |
| Intermediário — controle / defesa | 20 | 28 |
| Intermediário — sem prioridade | 17 | 25 |
| Avançado — potência | **23** | **31** |
| Avançado — controle / defesa | **23** | **31** |
| Avançado — equilíbrio | 18 | 26 |

Mín base: 15 (dor). Máx base: 23. Com modificador vento (+8): até 31. Peso > 0 em todos. ✓

---

### comfort → "Confortável"

| Perfil | Peso base | + `frequencia_alta` |
|---|---|---|
| Dor | **40** | **45** |
| Iniciante | 23 | 28 |
| Intermediário — potência | 14 | 19 |
| Intermediário — controle / defesa | 20 | 25 |
| Intermediário — sem prioridade | 17 | 22 |
| Avançado — potência | 10 | 15 |
| Avançado — controle / defesa | 10 | 15 |
| Avançado — equilíbrio | 12 | 17 |

Mín base: 10 (avançado). Máx base: 40 (dor). Com modificador alta-frequência (+5): até 45. Peso > 0 em todos. ✓

---

### forgiveness → "Fácil de jogar"

| Perfil | Peso base | Nota |
|---|---|---|
| Dor | 15 | |
| Iniciante | **22** | maior peso entre todos os perfis |
| Intermediário — potência | 13 | |
| Intermediário — controle / defesa | 15 | |
| Intermediário — sem prioridade | 17 | |
| Avançado — potência | 5 | peso mínimo de forgiveness |
| Avançado — controle / defesa | 9 | |
| Avançado — equilíbrio | 8 | |

Mín base: 5 (avançado+potência). Máx base: 22 (iniciante). Peso > 0 em todos. ✓

**Atenção — edge case com modificadores combinados:** o modificador `contexto_vento` desconta
primariamente de forgiveness (`fromForg = Math.min(m.forgiveness, 8)`). No perfil
`avancado+potencia` com `contexto_vento`, forgiveness parte de 5 e é totalmente consumido
(5 → 0). Resultado: forgiveness efetivo = 0 **nesta combinação específica**. O chip "Fácil de
jogar" continua sendo exibido na card (chip é derivado do score em DB, não dos pesos), mas para
esse perfil o matching é menos direto. Não é um `spin` — tem peso > 0 em 7 dos 8 base profiles
— mas vale monitorar se esse edge case justifica uma nota futura.

---

## 3. Matriz completa score × perfil

Perfis:
- **A** — Dor (qualquer lesão)
- **B** — Iniciante
- **C** — Intermediário + potência
- **D** — Intermediário + controle/defesa
- **E** — Intermediário sem prioridade
- **F** — Avançado + potência
- **G** — Avançado + controle/defesa
- **H** — Avançado + equilíbrio *(fallthrough)*

| Dimensão | A | B | C | D | E | F | G | H | Mín | **Máx** | Chip |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `control` | 10 | 16 | 12 | 25 | 18 | 15 | 27 | 25 | 10 | **27** | Ótima pra controle |
| `power` | 5 | 8 | 26 | 5 | 13 | 32 | 14 | 15 | 5 | **32** | Pra quem ataca |
| `stability` | 15 | 16 | 20 | 20 | 17 | 23 | 23 | 18 | 15 | **23** (+31 vento) | Estável e firme |
| `maneuverability` | 15 | 15 | 15 | 15 | 18 | 15 | 17 | 22 | 15 | **22** | Leve e ágil |
| `comfort` | 40 | 23 | 14 | 20 | 17 | 10 | 10 | 12 | 10 | **40** (+45 freq.) | Confortável |
| `forgiveness` | 15 | 22 | 13 | 15 | 17 | 5 | 9 | 8 | 5 | **22** | Fácil de jogar |
| ~~`spin`~~ | ~~0~~ | ~~0~~ | ~~0~~ | ~~0~~ | ~~0~~ | ~~0~~ | ~~0~~ | ~~0~~ | — | ~~**0**~~ | ~~Pra quem busca efeito~~ (removido) |

Todos os totais de `baseWeights()` somam 100. Spin nunca contribui.

### Resumo de elegibilidade

| Dimensão | Peso > 0 em algum perfil | Chip honesto? |
|---|---|---|
| control | ✓ (todos, mín 10) | ✓ |
| power | ✓ (todos, mín 5) | ✓ |
| stability | ✓ (todos, mín 15) | ✓ |
| maneuverability | ✓ (todos, mín 15) | ✓ |
| comfort | ✓ (todos, mín 10) | ✓ |
| forgiveness | ✓ (todos no base, mín 5) | ✓ (com ressalva do edge case vento+avançado+potência) |
| ~~spin~~ | ✗ (zero em todos) | ✗ → removido |

**Nenhum spin escondido nos 6 chips restantes.**

---

## 4. BONUS — Origem do chip de nível ("Intermediário" etc.)

Fonte: `lib/nivel.ts` → função `derivarNivel(racket)`

```typescript
// 1. Fonte primária: campo nivel_sugerido (DB) — setado pelo motor ou pelo admin
if (ins.nivel_sugerido) return ins.nivel_sugerido

// 2. Fallback: fórmula derivada de forgiveness + power + control + comfort
if (f <= 4 || (f <= 6 && (p >= 7 || c >= 7)) || (f <= 7 && p >= 9)) return 'avancado'
if (f >= 7 && co >= 6 && p <= 6) return 'iniciante'
return 'intermediario'
```

**Correto.** O chip de nível exibido na card usa `derivarNivel()` como display helper,
prioritizando o campo `nivel_sugerido` do banco. A fórmula de fallback (baseada em forgiveness,
power, control, comfort) só entra quando `nivel_sugerido` é null. Não tem relação direta com
`baseWeights()` nem com o scoring numérico — é uma classificação editorial, como documentado
no cabeçalho do arquivo: "função de EXIBIÇÃO".

---

## Conclusão

Os 6 chips restantes são coerentes com o scorer: cada dimensão tem peso > 0 em **todos** os
8 perfis de `baseWeights()`. Não há outro `spin` escondido.

A única ressalva é o edge case de `forgiveness` com `avancado+potência + contexto_vento`
(modificador consome o peso até 0), que é uma combinação de 2 modificadores simultâneos e afeta
apenas o ranqueamento para esse sub-perfil — não invalida o chip como afirmação geral.

Esta matriz pode ser incluída na seção "Motor / Scorer" do `docs/mapa-do-sistema.md` se o
`gen-mapa.ts` ainda não a gera (a seção atual de pesos no mapa é gerada pela página admin/motor,
não por `gen-mapa`).
