# Perfil de Conversão — Audit Últimos 14 dias

**Data da análise:** 2026-07-28  
**Janela:** `created_at >= NOW() - INTERVAL '14 days'`, `is_test = false`  
**Fonte:** Supabase (conversations + feedback_events + link_clicks + recommendation_events)  
**Objetivo:** Confirmar ou refutar a hipótese de que o público intermediário/avançado converte melhor mas não está sendo alcançado pelos Ads.

---

## 1. Funil geral

| Etapa | N | % |
|---|---|---|
| Sessões únicas (últimos 14d) | 95 | — |
| Chegaram ao chat | 95 | 100% |
| Receberam recomendações | 77 | 81% das sessões |
| Sessões que clicaram "Ver na loja" | 34 | 44% das 77 com rec |
| Clicks totais "Ver na loja" | 58 | 1,7 clicks/sessão conv. |

**Leitura:** O funil interno é sólido. De quem recebe recomendações, quase metade clica para ver na loja — esse número é bom para um comparador sem compra integrada.

---

## 2. Estilo de jogo (starter_usado)

De **86 sessões** que clicaram o chip de estilo (9 responderam só em texto livre):

| Estilo | N | % |
|---|---|---|
| Equilibrado | 43 | 50% |
| Ataque (potência, smash) | 24 | 28% |
| Defesa e controle | 19 | 22% |

A maioria do público atual se declara Equilibrado, o que é esperado em audiência ampla. Ataque supera Defesa, o que sugere que a entrada pelo Ads criativo de "smash/potência" pode ressoar.

---

## 3. Nível declarado — ⚠️ DADOS FRACOS

**Metodologia:** busca de palavras-chave em mensagens `role = 'user'` das últimas 14 sessões.

| Nível (keyword match) | N | % |
|---|---|---|
| "Iniciante" (incl. "começando", "cat. D") | 62 | 65% |
| "Intermediário" (incl. "cat. B/C") | 31 | 33% |
| "Avançado" (incl. "cat. A") | 2 | 2% |

**Limitações críticas — não usar esses números para decisão:**

1. **Zero "Não identificados"** (62+31+2 = 95) é estatisticamente impossível em conversas naturais. Indica que as keywords estão matchando contexto errado ("minha amiga é iniciante", "não sou mais iniciante", "jogo há 2 anos com iniciantes").

2. **Nível não é campo estruturado no DB.** A coluna `nível` do perfil não existe; o scorer usa inferência em runtime. Chips de nível no HomeClient (`Iniciante / Intermediário / Avançado`) só aparecem quando Tury detecta a pergunta de nível — e a maioria dos usuários responde em texto livre.

3. **Em 14 dias, apenas 2 sessões clicaram o chip "Avançado (cat. A/Pro)"** com texto exato — o único número confiável é esse.

**Conclusão sobre nível:** O DB atual não tem estrutura para segmentar por nível de forma confiável. Qualquer query de keyword tem margem de erro alta demais para guiar decisão de Ads.

---

## 4. Cruzamento nível × conversão (dado como referência, não como conclusão)

Usando os mesmos keywords acima (com as ressalvas):

| Nível | Total | Clicaram loja | Conv. |
|---|---|---|---|
| "Iniciante" | 62 | 26 | 42% |
| "Intermediário" | 31 | 7 | 23% |
| "Avançado" | 2 | 1 | 50% |

Se os dados fossem confiáveis, a hipótese seria **refutada** — "Iniciante" estaria convertendo mais, não menos. Mas dado o alto volume de falsos positivos no keyword match, **não é possível concluir nada** a partir disso.

---

## 5. Preço das raquetes clicadas

| Métrica | Valor |
|---|---|
| Sessões que clicaram "Ver na loja" | 34 |
| Total de clicks | 58 |
| Preço médio das raquetes clicadas | **R$ 1.439** |
| Preço mínimo clicado | R$ 379 |
| Preço máximo clicado | R$ 2.999 |

**Distribuição por faixa:**

| Faixa | Clicks | % |
|---|---|---|
| Até R$ 1.000 | 23 | 40% |
| R$ 1.000 – R$ 2.000 | 23 | 40% |
| Acima de R$ 2.000 | 12 | 21% |

**Destaque:** A raquete mais clicada foi a **Renegade Comfort BT (R$ 799,90)** — aparece em múltiplas sessões distintas. O pódio inclui também **Athena Pink/Midnight (R$ 2.999)**, **Vision Pyramid (R$ 1.199)** e **Giant (R$ 1.147)**.

**Leitura:** O ticket médio de R$1.439 está na faixa intermediária-premium. Não é o comportamento de um público "só iniciante buscando raquete barata" — há interesse real em raquetes acima de R$1k.

---

## 6. Origem / UTM

| Source | Sessões c/ rec | Clicaram loja | Conv. |
|---|---|---|---|
| Orgânico / Direto (sem UTM) | 77 | 30 | 39% |
| **Paid (Google, Meta, etc.)** | **0** | **0** | **—** |

**Nenhuma sessão das últimas 14 dias chegou com UTM tag.**

Interpretações possíveis (não mutuamente exclusivas):

1. **Os Ads atuais não têm parâmetro UTM no link de destino.** Se o link do anúncio vai para `turaquete.com.br` sem `?utm_source=meta&utm_campaign=...`, o Supabase não registra nada — e a sessão entra como orgânica.

2. **Volume paid atual é muito baixo** e não gerou nenhuma sessão com rec em 14 dias.

3. **Abandono antes do chat.** Usuários vindos de Ads podem estar chegando na home, não iniciando o chat, e saindo — esse abandono só aparece no GA4 (pageview sem `chat_iniciado`), não no Supabase.

**Ação imediata sugerida:** Adicionar UTM params em todos os links de Ads antes de qualquer mudança de targeting. Sem isso, é impossível medir o impacto de qualquer mudança.

---

## 7. Resposta à hipótese central

> "O público intermediário/avançado converte melhor mas não está sendo alvo dos Ads atuais (focados em iniciante)."

**Status:** INCONCLUSIVO — dados insuficientes para confirmar ou refutar.

O que os dados **permitem dizer**:
- O preço médio das raquetes clicadas (R$1.439) sugere que o público que chega ao Turaquete **já tem algum conhecimento de raquetes** ou pelo menos disposição de gasto além do entry-level.
- Apenas 2 sessões identificaram-se explicitamente como "Avançado (cat. A/Pro)" — o Ads pode não estar alcançando esse público, ou esse público pode estar chegando por outros meios (orgânico, indicação) sem se identificar pelo chip.
- 100% do tráfego chegou sem UTM, o que torna impossível saber se existe tráfego paid e qual é o seu perfil.

O que os dados **não permitem dizer**:
- Se intermediário/avançado converte melhor (nível não é campo estruturado).
- Se o Ads atual está trazendo iniciantes — pode estar trazendo todos os públicos, ou ninguém.

---

## 8. Próximos passos recomendados

**Para resolver o gap de dados (ordem de prioridade):**

1. **Adicionar UTM em todos os links de Ads** (meta: `utm_source=meta&utm_medium=paid_social&utm_campaign=...`). Custo: 5 minutos. Sem isso, nada é mensurável.

2. **Testar um criativo voltado para "jogadores de beach que querem subir de nível"** — CTA diferente do iniciante. Medir por UTM: taxa de início de chat, taxa de rec, preço médio clicado.

3. **Para dados de nível confiáveis:** considerar adicionar ao perfil do scorer um campo `nivel_detectado` gravado na `conversations.profile` — seria o nível inferido pelo motor em runtime, não por keyword. Isso é um dado limpo e usável.

4. **GA4 para abandono:** cruzar pageviews de `/` com `chat_iniciado` (evento GA4 já disparado no HomeClient) por source/medium para ver qual canal traz usuários que não chegam ao chat.

---

**Limitação geral deste audit:** o Supabase captura bem o que acontece *dentro do chat* (estilo, orçamento, recomendações, clicks). Tudo antes (origem, abandono no landing) e tudo pós-click (se comprou de fato) é cego no DB atual.
