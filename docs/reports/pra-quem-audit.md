# Auditoria: chip "Pra quem…" nas cards do Turaquete

> Auditoria read-only — nenhum arquivo foi modificado.
> Data: 2026-07-12

---

## 1. Origem do texto

O chip **não é um campo salvo no banco de dados**. Ele é **calculado em tempo de render** pela função `deriveScoreTag()`, definida em:

```
app/marcas/[slug]/page.tsx  (linhas 99–123)
```

A função recebe o objeto `racket_insights` (lido do banco via join) e retorna uma string label ou `null`. O chip só aparece nas cards do grid da página de marca (`RacketGridCard`). Ele **não aparece** na página de detalhe individual (`app/raquetes/[slug]/page.tsx`).

```typescript
// ── Score tag (derived from racket_insights scores) ───────────────────────────

const SCORE_TAGS: Record<string, string> = {
  control:         'Ótima pra controle',
  power:           'Pra quem ataca',
  spin:            'Pra quem busca efeito',
  stability:       'Estável e firme',
  maneuverability: 'Leve e ágil',
  comfort:         'Confortável',
  forgiveness:     'Fácil de jogar',
}
const SCORE_PRIORITY = ['control','power','spin','stability','maneuverability','comfort','forgiveness'] as const

function deriveScoreTag(ins: RacketWithInsights['racket_insights']): string | null {
  if (!ins) return null
  type Dim = typeof SCORE_PRIORITY[number]
  const dims = SCORE_PRIORITY.filter((k): k is Dim => ins[k] != null)
  if (dims.length === 0) return null
  const vals = dims.map(k => ins[k] as number)
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  if (max - min <= 1 && max <= 7) return 'Equilibrada'
  const winner = SCORE_PRIORITY.find(k => ins[k] === max)
  return winner ? (SCORE_TAGS[winner] ?? null) : null
}
```

O chip é então renderizado na card assim:

```tsx
{scoreTag && (
  <span className="text-[10px] font-medium text-aqua bg-aqua/10 rounded-full px-2 py-0.5 w-fit leading-tight">
    {scoreTag}
  </span>
)}
```

---

## 2. Mapeamento score → chip (derivação)

### Dimensões elegíveis e rótulos

| Dimensão (`racket_insights`) | Chip exibido |
|---|---|
| `control` | Ótima pra controle |
| `power` | Pra quem ataca |
| `spin` | **Pra quem busca efeito** |
| `stability` | Estável e firme |
| `maneuverability` | Leve e ágil |
| `comfort` | Confortável |
| `forgiveness` | Fácil de jogar |
| *(especial)* | Equilibrada |

O `spin` **está incluído** na posição 3 da fila de prioridade.

### Algoritmo de seleção do vencedor

1. Filtra scores não-nulos do objeto `racket_insights`.
2. Calcula `max` e `min` entre os valores disponíveis.
3. **Condição "Equilibrada"**: se `max - min <= 1` **E** `max <= 7` → retorna `'Equilibrada'`. Nenhuma raquete publicada atinge esse critério atualmente.
4. **Vencedor**: percorre `SCORE_PRIORITY` em ordem e retorna o **primeiro** campo cujo valor seja igual ao `max`.
5. Se o campo vencedor não estiver em `SCORE_TAGS` (impossível pelo mapping completo), retorna `null`.

### Quando `spin` vence

`spin` só ganha o chip "Pra quem busca efeito" quando:
- O spread não é "Equilibrada" (passo 3 falhou), **E**
- `control` é estritamente menor que `max`, **E**
- `power` é estritamente menor que `max`, **E**
- `spin` é igual ao `max`.

Em caso de empate entre `spin` e outra dimensão mais à direita na fila (ex: `stability`, `maneuverability`, `forgiveness`), `spin` vence por prioridade. Já se `control` ou `power` também atingirem o `max`, eles ganham por estar antes de `spin` na fila.

---

## 3. Distribuição entre raquetes publicadas

SQL executado via `mcp__supabase__execute_sql` replicando a lógica de `deriveScoreTag`:

```sql
WITH scores AS (
  SELECT r.slug, r.name, ri.*,
    GREATEST(COALESCE(ri.control,0), COALESCE(ri.power,0), COALESCE(ri.spin,0),
             COALESCE(ri.stability,0), COALESCE(ri.maneuverability,0),
             COALESCE(ri.comfort,0), COALESCE(ri.forgiveness,0)) AS max_score,
    LEAST(COALESCE(ri.control,999), COALESCE(ri.power,999), COALESCE(ri.spin,999),
          COALESCE(ri.stability,999), COALESCE(ri.maneuverability,999),
          COALESCE(ri.comfort,999), COALESCE(ri.forgiveness,999)) AS min_score
  FROM rackets r JOIN racket_insights ri ON ri.racket_id = r.id
  WHERE r.publicada = TRUE
),
tagged AS (
  SELECT *,
    CASE
      WHEN max_score - min_score <= 1 AND max_score <= 7 THEN 'Equilibrada'
      WHEN control = max_score           THEN 'Ótima pra controle'
      WHEN power   = max_score           THEN 'Pra quem ataca'
      WHEN spin    = max_score           THEN 'Pra quem busca efeito'
      WHEN stability = max_score         THEN 'Estável e firme'
      WHEN maneuverability = max_score   THEN 'Leve e ágil'
      WHEN comfort = max_score           THEN 'Confortável'
      WHEN forgiveness = max_score       THEN 'Fácil de jogar'
      ELSE NULL
    END AS chip
  FROM scores
)
SELECT chip, COUNT(*) AS qty FROM tagged GROUP BY chip ORDER BY qty DESC;
```

### Resultado

| Chip | Quantidade |
|---|---|
| Ótima pra controle | 72 |
| Leve e ágil | 51 |
| Pra quem ataca | 45 |
| **Pra quem busca efeito** | **34** |
| Fácil de jogar | 31 |
| Confortável | 13 |
| Estável e firme | 3 |
| Equilibrada | 0 |
| **Total** | **249** |

"Pra quem busca efeito" é a **4ª variante mais comum** com 34 raquetes (13,7% do catálogo publicado). "Equilibrada" não aparece em nenhuma raquete publicada — a condição `max - min <= 1 AND max <= 7` nunca é atingida com os dados atuais (praticamente todas as raquetes têm spread ≥ 2).

---

## 4. Case study: Macaw Onyx

Scores da `racket_insights` para o slug `fobel-macaw-onyx`:

| Dimensão | Score |
|---|---|
| control | 5 |
| power | 6 |
| spin | **7** |
| stability | **7** |
| maneuverability | **7** |
| comfort | 6 |
| forgiveness | **7** |

### Por que ganhou "Pra quem busca efeito"

1. `max = 7`, `min = 5` → spread = 2 → **não é "Equilibrada"** (`2 > 1`).
2. Percorre `SCORE_PRIORITY`:
   - `control = 5` ≠ 7 → **pula**
   - `power = 6` ≠ 7 → **pula**
   - `spin = 7` = 7 → **vencedor!** → retorna `'Pra quem busca efeito'`
3. `stability`, `maneuverability` e `forgiveness` também valem 7, mas **nunca são avaliados** porque `spin` chegou primeiro na fila.

`perfil_resumo` da raquete confirma o perfil: _"Macaw Onyx é a raquete do intermediário que quer mais potência com conforto. Carbono 12K com EVA Soft para jogo agressivo sem sobrecarregar o braço."_ O score alto de spin (7) reflete o perfil de carbono 12K e surface texturizada que a Fobel Macaw entrega.

---

## 5. Tury usa a mesma derivação?

**Não.** Tury não usa `deriveScoreTag`, `SCORE_TAGS` nem `SCORE_PRIORITY`. A derivação do chip é exclusiva da página de marca (`app/marcas/[slug]/page.tsx`).

### Como Tury lida com spin

O scorer de Tury está em `lib/scorer.ts`. A função `baseWeights()` retorna **`spin: 0`** em **todos** os perfis de usuário:

```typescript
// Dor overrides all other profiles
if (dor) return {
  power: 5, control: 10, comfort: 40,
  maneuverability: 15, spin: 0, stability: 15, forgiveness: 15,
}
if (profile.nivel === 'iniciante') return {
  power: 8, control: 16, comfort: 23,
  maneuverability: 15, spin: 0, stability: 16, forgiveness: 22,
}
// ... todos os outros casos também têm spin: 0
```

Consequência: `spin` **nunca entra no cálculo de `match_score`** que Tury usa para ranquear candidatas. A função `computeScorerWeights()` filtra dimensões com peso zero, então spin nem aparece no breakdown de pesos.

### Como Tury menciona spin/efeito

Tury acessa os scores brutos da `racket_insights` (campo `spin`) via `buscar_raquetas`, e pode mencioná-los ao comparar raquetes. O prompt (`lib/agent/prompt.ts`) não inclui `spin` na lista de vocabulário interno proibido (que cobre `forgiveness`, `maneuverability`, `power`, `control`, `comfort`, `stability`, `nivel_sugerido`), então Tury pode citar o valor de spin diretamente. No entanto, a orientação de linguagem simples indica que para iniciantes o termo "efeito" ou "giro" é preferível a "spin".

### Resumo da diferença

| Aspecto | Chip na página de marca | Tury |
|---|---|---|
| Lógica | `deriveScoreTag()` — maior score, prioridade fixa | `scoreRacket()` — weighted sum, `spin: 0` |
| Spin no resultado | 3ª prioridade, pode ganhar sozinho | Nunca contribui para o `match_score` |
| Output | Label fixo "Pra quem busca efeito" | Menção narrativa livre ao comparar raquetes |
| Arquivo fonte | `app/marcas/[slug]/page.tsx` | `lib/scorer.ts` + `lib/agent/prompt.ts` |

A ausência de peso para spin no scorer de Tury é intencional: spin depende de areado aplicável depois da compra e de técnica do jogador, portanto não é um critério confiável de fitting inicial. O chip na UI serve como sinalização descritiva do perfil da raquete, não como fator de recomendação.
