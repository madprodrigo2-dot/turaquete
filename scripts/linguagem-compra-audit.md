# Auditoria de Linguagem "Comprar/Venda" — Turaquete
**Data:** 2026-07-30  
**Escopo:** Todo o codebase (components/, app/, lib/) exceto node_modules/.next/tmp  
**Premissa:** Turaquete NÃO vende raquetes. Apenas redireciona para loja externa (Mercado Livre / loja oficial via `/ir/[slug]`). Qualquer texto que implique transação direta é enganoso.

---

## SUMÁRIO EXECUTIVO

| Severidade | Qtd | Resumo |
|---|---|---|
| 🔴 Alto — implica transação direta | **1** | "Comprar por R$X" na página de detalhe da raquete |
| 🟡 Médio — ambíguo ou inconsistente | **2** | "Ver onde comprar" (fallback no mesmo botão) + variação de texto no LandingScreen |
| 🟢 OK — correto | **6** | "Ver na loja →" consistente em RacketCard, QuizPerfilClient, CompareView, etc. |
| ℹ️ Informativo — contexto correto | **4** | "comprar" em copy de guia/FAQ/para-lojas (uso semântico, não transacional) |

---

## 🔴 ALTO — Implica transação direta no Turaquete

### 1. `app/raquetes/[slug]/page.tsx` — linha 213

```tsx
{price ? `Comprar por ${price}` : 'Ver onde comprar'}
```

**Problema:** O texto `"Comprar por R$X"` (ex: "Comprar por R$ 1.290") está no botão principal da página de detalhe de cada raquete. Este é o CTA mais proeminente do site — botão coral, full-width, acima da dobra. Um usuário que clica esperando comprar diretamente no Turaquete será surpreendido ao ser redirecionado para o Mercado Livre ou outra loja. Além de enganoso, pode aumentar abandono no destino e prejudicar a reputação do site.

**Contexto completo do botão:**
```tsx
<BuyButton
  href={irUrl}                    // → /ir/{slug} → redirect para ML
  racketName={racket.name}
  racketSlug={racket.slug}
  linkTipo={linkTipo}
  className="w-full bg-coral text-white font-semibold text-base py-4 ..."
>
  {price ? `Comprar por ${price}` : 'Ver onde comprar'}
</BuyButton>
```

O `BuyButton` abre em `target="_blank"` com `rel="noopener noreferrer sponsored"` — tecnicamente correto. Mas o texto "Comprar por R$X" não indica redirecionamento externo.

**Fix sugerido:**
```tsx
{price ? `Ver na loja — ${price}` : 'Ver na loja'}
```
ou
```tsx
{price ? `Ver no Mercado Livre — ${price}` : 'Ver na loja'}
```

---

## 🟡 MÉDIO — Ambíguo ou inconsistente

### 2. `app/raquetes/[slug]/page.tsx` — linha 213 (fallback)

```tsx
{price ? `Comprar por ${price}` : 'Ver onde comprar'}
```

Quando não há preço, o botão diz **"Ver onde comprar"** — texto ambíguo (não indica que o destino é externo) mas não afirma que está vendendo. Inconsistente com o restante do site que usa "Ver na loja →".

**Fix sugerido:** Unificar para `'Ver na loja'` (sem preço) ou `'Ver na loja →'` para consistência com RacketCard/CompareView.

### 3. `components/LandingScreen.tsx` — linha 387

```tsx
Ver na loja
```

Sem a seta `→` que aparece em todos os outros componentes (`RacketCard`, `QuizPerfilClient`, `CompareView`). Inconsistência menor, mas a seta é o único indicador visual de "vai sair do site".

---

## 🟢 OK — Já usa linguagem correta

| Arquivo | Linha | Texto | Nota |
|---|---|---|---|
| `components/RacketCard.tsx` | 171 | `Ver na loja →` | ✅ Cards do quiz e listagens |
| `components/QuizPerfilClient.tsx` | 442 | `Ver na loja →` | ✅ Resultados do quiz |
| `components/CompareView.tsx` | 290 | `Ver na loja →` | ✅ Comparador |
| `components/LandingScreen.tsx` | 387 | `Ver na loja` | ✅ Carousel de featured (sem seta — ver acima) |
| `components/PriceNote.tsx` | 20 | `Confira o valor atual no Mercado Livre` | ✅ Nomeia explicitamente o site externo |
| `components/LandingScreen.tsx` | 391 | `Em breve nas lojas` | ✅ Raquetes sem link — placeholder correto |

---

## ℹ️ INFORMATIVO — "comprar" em contexto semântico correto

Estas ocorrências usam "comprar" como verbo genérico (intenção do usuário de ir ao mercado) — não prometem venda direta no Turaquete.

| Arquivo | Linha | Texto | Avaliação |
|---|---|---|---|
| `app/guia/furos/page.tsx` | 11,32 | `"Entenda antes de comprar"` (meta description) | ✅ Marketing legítimo — "antes de comprar" indica que o guia é educativo |
| `app/raquetes/[slug]/page.tsx` | 41 | `"onde comprar a ${displayName}"` (meta description) | ✅ Correto — "onde comprar" = redirecionamento para loja externa |
| `app/marcas/[slug]/page.tsx` | 158 | `"onde comprar cada modelo"` (meta description) | ✅ Idem |
| `app/page.tsx` | 77 | `"Indicamos onde comprar (Mercado Livre e lojas parceiras)"` (FAQ) | ✅ Explícito e correto — nomeia Mercado Livre |
| `components/LandingScreen.tsx` | 64 | Idem ao FAQ | ✅ |
| `app/para-lojas/page.tsx` | 44 | `"pronto para comprar"` | ✅ Contexto B2B correto |
| `lib/agent/prompt.ts` | 32,37,38 | `"comprar"` no sistema de intenções do agent | ✅ Lógica interna, não visível ao usuário |

---

## INVENTÁRIO COMPLETO DE VARIAÇÕES DO CTA "IR À LOJA"

| Texto no botão | Arquivo | Linha | Aponta para | Severidade |
|---|---|---|---|---|
| `Comprar por R$ X` | `app/raquetes/[slug]/page.tsx` | 213 | `/ir/{slug}` → loja externa | 🔴 |
| `Ver onde comprar` | `app/raquetes/[slug]/page.tsx` | 213 (else) | `/ir/{slug}` → loja externa | 🟡 |
| `Ver na loja →` | `components/RacketCard.tsx` | 171 | `/ir/{slug}` | 🟢 |
| `Ver na loja →` | `components/QuizPerfilClient.tsx` | 442 | `/ir/{slug}` | 🟢 |
| `Ver na loja →` | `components/CompareView.tsx` | 290 | `/ir/{slug}` | 🟢 |
| `Ver na loja` | `components/LandingScreen.tsx` | 387 | `/ir/{slug}` | 🟢 (🟡 sem seta) |
| `Em breve nas lojas` | `components/LandingScreen.tsx` | 391 | — (disabled) | 🟢 |
| `Em breve` | `components/RacketCard.tsx` | ~181 | — (disabled) | 🟢 |

**Total de variações distintas:** 5 textos diferentes para a mesma ação (ir à loja externa).  
**Padrão dominante:** `"Ver na loja →"` (3 de 4 componentes ativos).  
**Exceção problemática:** `"Comprar por R$X"` na página de detalhe.

---

## VERIFICAÇÕES NEGATIVAS (não encontrado)

| Item verificado | Resultado |
|---|---|
| `Finalizar compra` | ✅ Não encontrado |
| `Adicionar ao carrinho` | ✅ Não encontrado |
| `Checkout` (user-facing) | ✅ Não encontrado |
| `Pagamento` (user-facing) | ✅ Não encontrado |
| E-mails automáticos com linguagem de venda | ✅ Não há sistema de e-mail |
| Admin com linguagem "Comprar" | ℹ️ `app/admin/cliques/page.tsx:107` usa "Cliques em comprar" e `app/ir/[slug]/page.tsx:89` usa "Clique em Comprar" — apenas em analytics interno, nunca visível ao usuário final |
| Linguagem de venda em metadata OG/twitter | ✅ Não encontrado |

---

## RECOMENDAÇÃO DE FIX

**Mudança mínima de alto impacto:** Alterar 1 linha em `app/raquetes/[slug]/page.tsx:213`.

```tsx
// ANTES (enganoso):
{price ? `Comprar por ${price}` : 'Ver onde comprar'}

// DEPOIS (consistente com o restante do site):
{price ? `Ver na loja — ${price}` : 'Ver na loja'}
```

**Mudança adicional (consistência):**  
- `components/LandingScreen.tsx:387`: adicionar `→` para ficar `Ver na loja →`

Ambas as mudanças são puramente de texto — sem alteração de lógica, estilo ou roteamento.
