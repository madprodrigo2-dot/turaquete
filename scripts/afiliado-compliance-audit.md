# Auditoria de Compliance — Programa de Afiliados ML
Data: 2026-07-19 · READ-ONLY (nenhum arquivo alterado)

---

## 1. Disclosure de Afiliado

**EXISTE — mas só em `/termos`, seção "5. Links de afiliado":**

> "Alguns links no site podem ser links de afiliado. A Turaquete pode receber uma comissão sobre compras realizadas por esses links, sem custo adicional para você. Isso não influencia as recomendações, que são baseadas exclusivamente em critérios técnicos e no seu perfil de jogo."
> — `app/termos/page.tsx:64`

**NÃO EXISTE em:**
- Footer (não há componente Footer no projeto)
- Páginas de raquete (`/raquetes/[slug]`)
- Próximo dos botões "Ver na loja"
- Home, /guia, /raquetes/*

O disclosure existe, mas está enterrado num documento legal que o usuário médio nunca lê. O requisito de identificação do ML exige que o aviso seja **visível no ponto de clique**, não só nos termos.

---

## 2. Microcopy nos Links

**NÃO EXISTE.**

Todos os botões "Ver na loja →" aparecem sem nenhuma indicação de que são links de afiliado:
- `components/RacketCard.tsx:177` — `"Ver na loja →"`
- `components/LandingScreen.tsx:279` — `"Ver na loja"`
- `components/BuyButton.tsx` — texto `children` (controle do pai, mas sem texto padrão de afiliado)
- `components/CompareView.tsx:290` — `"Ver na loja →"`
- `components/QuizPerfilClient.tsx:437` — `"Ver na loja →"`

Nenhum tooltip, ícone ⓘ, asterisco, nem texto "link patrocinado / comissão / afiliado" ao lado ou abaixo dos botões.

---

## 3. Página "Sobre" / Transparência

**NÃO EXISTE.**

Glob por `app/sobre*` retornou zero resultados. Não existe `/sobre`, `/sobre-nos`, nem página de transparência que explique o modelo de negócio, como o ranking é determinado, ou como o site se sustenta financeiramente.

A `/para-lojas` existe mas fala para marcas/lojas (B2B), não é uma página de transparência para usuários.

---

## 4. `rel="sponsored"` nos links salientes

Situação mista — dois componentes corretos, três incorretos:

| Componente | Destino do link | `rel` atual | Correto? |
|-----------|----------------|-------------|---------|
| `BuyButton.tsx:21` | `/ir/[slug]` (redirect → ML) | `"noopener noreferrer sponsored"` (condicional `linkTipo==='afiliado'`) | ✅ |
| `LandingScreen.tsx:275` | `/ir/[slug]` | `"noopener noreferrer sponsored"` (mesma condicional) | ✅ |
| `RacketCard.tsx:170` | `/ir/[slug]` | `"noopener noreferrer"` | ❌ falta `sponsored` |
| `CompareView.tsx:286` | `racket.affiliate_url` (direto ML) | `"noopener noreferrer"` | ❌ falta `sponsored` |
| `PriceNote.tsx:21` | `affiliateUrl` (direto ML) | `"noopener noreferrer"` | ❌ falta `sponsored` |
| `QuizPerfilClient.tsx:432` | `/ir/[slug]` | `"noopener noreferrer"` | ❌ falta `sponsored` |

Nota: `CompareView` e `PriceNote` linkam **diretamente** para a URL de afiliado ML (não passam por `/ir/`), tornando o `sponsored` especialmente necessário nesses dois.

---

## 5. Disclaimer de Preços

**EXISTE nos contextos principais:**

| Onde | Texto | Arquivo |
|------|-------|---------|
| Chat/Tury — abaixo das recomendações | `"Preços de referência, podem variar por loja."` | `components/ChatMessage.tsx:276` |
| Página de raquete (`/raquetes/[slug]`) | `"Preço de referência. Confira o valor atual no Mercado Livre."` + data de atualização | `components/PriceNote.tsx:16` |
| Tabela comparativa | `"referência"` (label 8px, cinza claro, abaixo do valor) | `components/CompareTable.tsx:131` |

**NÃO EXISTE em:**
- Cards da home (`LandingScreen.tsx`) — exibe preço sem disclaimer
- Cards de listagem (`RacketCard.tsx`) — exibe preço sem disclaimer

---

## Resumo: o que falta para cumprir o requisito de identificação de publicidade do ML

| Ponto | Status |
|-------|--------|
| Disclosure textual em algum lugar | ✅ Existe (em `/termos`) |
| Disclosure **no ponto de clique** (ao lado / próximo do botão) | ❌ Não existe |
| Microcopy / label "link patrocinado" ou similar | ❌ Não existe |
| Página de transparência explicando monetização | ❌ Não existe |
| `rel="sponsored"` em todos os links afiliados | ❌ Parcial (2/6 componentes corretos) |
| Disclaimer de preços no chat | ✅ Existe |
| Disclaimer de preços nas páginas de raquete | ✅ Existe |
| Disclaimer de preços nos cards de listagem/home | ❌ Não existe |

**Prioridade para compliance:**
1. Adicionar disclosure próximo ao botão "Ver na loja" (ex.: linha de 10px "Link de afiliado — podemos ganhar comissão") — requisito mais crítico do ML.
2. Completar `rel="sponsored"` em `RacketCard`, `CompareView`, `PriceNote`, `QuizPerfilClient`.
3. Criar página `/sobre` ou seção de transparência linkada no footer.
