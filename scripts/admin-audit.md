# Auditoria Admin — Turaquete
_Read-only · 2026-07-20 · Após semana de mudanças (bot filter, GA4 dedup, preco-buckets, /admin/precos, disclosure afiliado)_

---

## 1. Coerência entre painéis — critério de cliques

**Critério canônico:** `is_test = false` + `session_id NOT NULL` (sem bots externos).

| Painel | Fonte | is_test=false | session_id NOT NULL | Conforme? |
|---|---|---|---|---|
| `/admin/analise` Seção 1 (`link_clicks`) | direto | ✅ linha 177 | ✅ linha 178 | ✅ |
| `/admin/analise` Evolução (`link_clicks`) | direto | ✅ | ✅ linha 241 | ✅ |
| `/admin/cliques` | RPCs `admin_click_*` com `p_session_only=true` (default) | ✅ (via RPC) | ✅ (via RPC param) | ✅ |
| `/admin/ranking` (`link_clicks`) | direto | ✅ linha 66 | ✅ linha 64 | ✅ |
| `/admin/analise` `sem_cobertura` (Seção 4) | `rackets` sem `affiliate_url` | N/A | N/A | ⚠️ ver abaixo |

**Único desvio encontrado:** `/admin/qualidade` lê `feedback_events` com `is_test=false` mas sem `session_id NOT NULL`. Atualmente irrelevante (0 linhas com `session_id IS NULL` na tabela), mas diverge da convenção de outros painéis.

---

### 1a. O 82 vs 96 — explicação

O contador "Sem cobertura" em `/admin/analise` Seção 4 usa:
```sql
WHERE publicada = true AND affiliate_url IS NULL
```
Esse número mostra raquetes **sem affiliate_url configurada**.

A cadeia `/ir/[slug]` envia para busca ML dois casos distintos:
1. `affiliate_url IS NULL` → busca
2. `affiliate_url IS NOT NULL + is_active = false` → busca ML (fallback)

Quando havia 14 raquetes com `is_active=false`, o painel mostrava 82 (só sem affiliate) e a chain servia busca para 82+14=96. **Ambos os números eram corretos para propósitos diferentes.** O label "Sem cobertura" era incompleto: não capturava os inativos que também falham a servir um link afiliado.

**Estado atual (2026-07-20):** 73 sem affiliate + 0 inativos → painéis alinhados. Se raquetes voltarem a ficar `is_active=false`, a discrepância retorna. O label deveria dizer "Sem affiliate_url" em vez de "Sem cobertura" para ser preciso.

- **Severidade:** cosmético agora, rompe leitura se inativos voltarem
- **Fix sugerido:** renomear label para "Sem affiliate_url (ativo)" e adicionar linha separada "Inativos (busca fallback)" com `affiliate_url IS NOT NULL AND is_active = false`

---

## 2. Labels cruzados ou errôneos

### 2a. Custo API total / Sessões com quiz — NÃO TROCADOS ✅
O swap reportado anteriormente foi corrigido. Confirmado:
- "Custo API total" → mostra `totalBrl` com subtítulo `${sessions.length} sessões com quiz`
- "Sessões com quiz" → mostra `sessions.length` com subtítulo "API calls com custo > 0"
Corretos.

### 2b. "Última sync" → label enganoso ⚠️
**Seção:** `/admin/analise` Seção 4, linha 810 (`page.tsx`)

O bloco mostra:
```
Última sync
price_updated_at
[data da atualização mais recente]
```

Problema: o sync automático foi desativado em jul/2026. O processo não corre mais. A data mostrada é a última atualização **manual** de preço. O label "Última sync" implica processo automatizado rodando.

- **Severidade:** cosmético (leitura errada para novos operadores)
- **Fix sugerido:** renomear para "Última atualização de preço" com subtítulo "atualizada manualmente em /admin/precos"

### 2c. "Cliques ML" em /admin/ranking ≠ cliques do painel ML ⚠️
**Seção:** `/admin/ranking` tabela "Afiliados ML — cliques rastreados"

O campo `mlClicks` é calculado como:
```ts
myClicks.filter(r => r.destination_type === 'ml').length
```

`destination_type = 'ml'` inclui tanto `tipo='afiliado'` quanto `tipo='busca'` (busca ML também vai para ML). O tooltip diz "Comparar com o painel Mercado Livre" — mas o painel ML de afiliados só contabiliza cliques com tag de afiliado (tipo=afiliado), não busca orgânica.

Resultado: "Cliques ML" no admin pode ser maior que o número no painel ML de afiliados, levando o operador a suspeitar de rastreamento quebrado.

- **Severidade:** cosmético / confusão operacional
- **Fix sugerido:** filtrar `destination_type = 'ml' AND tipo = 'afiliado'` para a coluna "Cliques ML", ou renomear para "Cliques ML (afiliado + busca)" e adicionar tooltip explicando a diferença

---

## 3. Dados que chegam / paráram de chegar após fixes de GA4

### GA4 dedup (chat_iniciado, ver_analise)
Nenhum painel admin lê eventos GA4 diretamente. Todos os painéis leem Supabase (`feedback_events`, `link_clicks`, `conversations`, `recommendation_events`). **Impacto zero nos painéis admin.** ✅

### `ver_analise` em feedback_events
- `window.gtag('event', 'ver_analise')` foi removido (GA4)
- `fireEvent({ event_type: 'ver_analise' })` → `feedback_events` continua disparando ✅
- `/admin/qualidade` e `/admin/analise` leem `feedback_events.ver_analise` → sem quebra ✅

### `analise_aberta` (GA4)
Nunca foi lido por painéis admin → sem impacto. ✅

### `chat_iniciado` (GA4)
Nunca foi lido por painéis admin → sem impacto. ✅

**Conclusão:** Nenhum painel quebrou com as mudanças de GA4.

---

## 4. displayName nos painéis admin

`getDisplayName()` / `displayName` **não está sendo usado em nenhum painel admin** (grep retornou zero resultados em `app/admin`). Todos os painéis mostram `racket.name` cru.

Para o operador, isso é geralmente aceitável (o admin precisa do nome completo). Mas há casos de nomes ambíguos:

| Slug | name no DB | Problemático? |
|---|---|---|
| `shark-elite-18k-21` | "Elite 18K 21mm" | Aparece sem "Shark" em `/analise` top raquetes |
| `shark-elite-3k-21` | "Elite 3K 21mm" | Idem |
| `shark-elite` | "Elite Pro" | Idem |

Esses nomes curtos aparecem nas tabelas de `/analise` e `/ranking` sem o slug visível, tornando difícil identificar a marca.

- **Severidade:** cosmético para o operador
- **Fix sugerido:** mostrar `brandName · name` nesses painéis, ou exibir o slug como sublinha (como já faz `/admin/cliques`)

---

## 5. Referências mortas ou ambíguas

### 5a. `specs_extra.saida_de_bola` em BlocoC — parcialmente morto ⚠️
**Arquivo:** `app/admin/rackets/[slug]/BlocoC.tsx:33` + `actions.ts:48,237`

O editor admin permite definir `specs_extra.saida_de_bola`. Esse campo é lido em dois lugares com comportamentos distintos:

1. **`lib/explicador.ts:40`** — lê `extra.saida_de_bola` como "legacy field" para hints de texto descritivo (o que o agente usa para gerar bullets)
2. **`lib/recommend.ts:313,325`** — usa `getSaidaDeBola(ins.comfort, ins.power)` da função derivada (`lib/saidaBola.ts`), **ignora completamente `specs_extra.saida_de_bola`**

Resultado: o operador define `specs_extra.saida_de_bola = 'fácil'` no editor, mas o **filtro de recomendação usa o valor derivado do motor**, que pode ser diferente. Só o texto do agente (bullets) usa o valor do admin.

- **Severidade:** rompe expectativa do operador (define "fácil" no admin → recomendador continua usando o derivado)
- **Fix sugerido:** ou (a) remover o campo do BlocoC e derivar tudo de `getSaidaDeBola()`; ou (b) adicionar tooltip no BlocoC avisando "só afeta texto descritivo — o filtro de recomendação usa o valor calculado pelo motor"

### 5b. `specs_extra.sweet_spot` — não encontrado no admin ✅
Nenhuma referência ativa em `app/admin`. Sem problema.

### 5c. Label "Última sync" / `price_updated_at` — ver seção 2b acima

---

## 6. Checklist de conformidade por painel

| Painel | is_test=false | session_id NOT NULL | Labels corretos | displayName | Referências mortas |
|---|---|---|---|---|---|
| `/admin/analise` | ✅ | ✅ (link_clicks) | ⚠️ "Última sync" | N/A | ⚠️ "Sem cobertura" incompleto |
| `/admin/cliques` | ✅ (RPC) | ✅ (RPC) | ✅ | N/A | — |
| `/admin/ranking` | ✅ | ✅ | ⚠️ "Cliques ML" overcounts | ⚠️ nomes curtos | — |
| `/admin/precos` | N/A | ✅ (clicks30d) | ✅ | N/A | — |
| `/admin/afiliados` | ✅ (clicks30d) | ✅ | ✅ | N/A | — |
| `/admin/qualidade` | ✅ | ⚠️ sem filtro (0 sem_session atual) | ✅ | N/A | — |
| `/admin/rackets/[slug]` | N/A | N/A | N/A | N/A | ⚠️ `saida_de_bola` em BlocoC |

---

## Resumo — Findings por severidade

### Rompe leitura operacional
_(nada encontrado — nenhum painel mostra número factualmente errado)_

### Confunde leitura (fix recomendado)
1. **"Última sync"** → renomear para "Última atualização de preço" — `analise/page.tsx:810`
2. **"Sem cobertura"** → não captura `is_active=false`; atualmente 0 inativos mas voltará a divergir — `analise/page.tsx:200`
3. **`saida_de_bola` em BlocoC** → operador define valor que o recomendador ignora — `BlocoC.tsx:33` / `recommend.ts`
4. **"Cliques ML"** em ranking overcounts (afiliado + busca), dificulta comparação com painel ML — `ranking/page.tsx:110`

### Cosmético (baixa prioridade)
5. **displayName ausente** em `/analise` e `/ranking` — nomes curtos sem marca
6. **`feedback_events` sem `session_id NOT NULL`** em qualidade — inócuo (0 sem_session), mas inconsistente
7. **GA4 dedup** — sem impacto nos painéis admin ✅
