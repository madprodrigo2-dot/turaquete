# Arquitetura do Agente Tury — Auditoria Técnica

> Gerado em 2026-06-22. Somente leitura — nenhum código foi alterado.

---

## 1. Arquitectura y flujo

### Entry point e loop do turno

**HTTP:** `POST /api/chat` recebe `{ messages, sessionId, primeiraMensagem?, starterUsado? }`, responde via SSE (Server-Sent Events) com tokens em tempo real.

**Deduplicação server-side:** mensagens idênticas dentro de 2s por sessão são rejeitadas (double-tap).

**`runAgentTurn` em `lib/agent/agent.ts`:**

```
POST /api/chat
  → rate-limit check (IP + session)
  → extractConfirmedProfileFromHistory()   ← varre histórico completo
  → runAgentTurn()
      ↓
      [loop MAX_TOOL_ROUNDS = 4]
        anthropic.messages.create()  ← input: system + tools + history (últimas 20 msgs)
        if stop_reason == 'tool_use':
          executeTool() para cada ferramenta
          append tool_results → volta ao loop
        if stop_reason == 'end_turn':
          break
      ↓
      [short-circuit se confidence INSUFICIENTE + chips pré-populados]
      streamResponse()  ← stream final para o cliente
```

**Stall detection:** se rodada 1 sem ferramentas e sem progresso → retry com `tool_choice: 'any'`.

---

### Ferramentas (6 total)

| Ferramenta | O que faz | Quando é chamada |
|---|---|---|
| `registrar_intencao` | Classifica intenção em 10 categorias (primeira_raquete, troca, ajuste, lesao_dor, comparacao, compra_direta, presente, preco_orcamento, curiosidade, outra) | Obrigatória na 1ª mensagem de cada conversa |
| `diagnosticar_perfil` | Computa faixa de peso/balance ideal, score de confiança (%), próxima pergunta se insuficiente. Lesão re-injetada do histórico (imune a regressão do modelo) | Toda vez que o modelo tem dados de perfil para avaliar (forçada para intents de perfil) |
| `buscar_raquetas` | Busca DB com filtros de perfil, retorna top 8 candidatas rankeadas pelo scorer. Pode ser chamada por nome/atleta (TROCA) | Quando o modelo precisa buscar candidatas ou identificar raquete atual (TROCA) |
| `detalle_raqueta` | Busca detalhes completos de uma raquete por ID | Quando o usuário pede info detalhada de um modelo específico |
| `recomendar_raquetas` | Registra 2–3 IDs escolhidos para exibição no UI (valida que IDs vieram de buscar_raquetas) | Quando modelo tem candidatas e perfil suficiente |
| `sugerir_opcoes` | Emite chips para seleção do usuário (max 4). Sistema sobrescreve com chips canônicos quando campo ativo | Preço, marca, e campos do Akinator (via override) |

---

### Loop de tool-use

- **`MAX_TOOL_ROUNDS = 4`** (definido em `agent.ts` linha 14)
- **Pior caso por turno:** 1 chamada inicial + 4 rodadas de tool-loop + 1 forced recomendar + 1 final streamResponse = **7 chamadas à API**
- **Caso típico:** 2–3 chamadas (registrar → diagnosticar/buscar → streamResponse)
- Compactação: resultados de ferramentas de rodadas anteriores viram `'(ok)'` para economizar tokens no histórico

---

### Manutenção do estado do perfil

Estado do perfil **nunca é armazenado em banco** — é derivado a cada turno do histórico de mensagens:

- **`extractConfirmedProfileFromHistory()`:** varre o histórico completo buscando chips (`CHIP_TO_PROFILE` map) para extrair nível, estilo, lesão, força, jogo aéreo
- **Lesão:** campos stripped do input do modelo e re-injetados do histórico confirmado (previne regressão)
- **Marca preferida:** derivada do último par pergunta-marca/resposta no histórico
- **Orçamento:** derivado de `PRICE_ANSWERS` no histórico
- **Número de perguntas feitas:** contagem determinística de turnos do usuário

---

### Fluxo de perguntas (Akinator — `confidence.ts`)

**5 campos com pesos (somam 100):**

| Campo | Peso | Pergunta fixa |
|---|---|---|
| estilo | 32% | "Como você mais gosta de jogar?" |
| nivel | 28% | "Qual é o seu nível hoje?" |
| lesao | 22% | "Você sente dor em algum lugar quando joga?" |
| forca_declarada | 11% | "Como você descreveria a força da sua batida?" |
| jogo_aereo | 7% | "Você joga mais na rede ou prefere o fundo de quadra?" |

**Threshold: 80%** — garante que lesão + nível são obrigatórios para todos os perfis:
- Sem nível: máximo 72% (28% ausente) < 80%
- Sem lesão: máximo 78% (22% ausente) < 80%
- Com estilo + nível + lesão = 82% ≥ 80% → recomenda

**Gating:** `diagnosticar_perfil` bloqueia `buscar_raquetas` (busca de perfil) quando INSUFICIENTE. Lookups por nome/atleta são isentos (fluxo TROCA).

**Escolha da próxima pergunta:** campo faltante com maior peso — EXCETO se `intencao = 'lesao_dor'`, onde lesão tem prioridade.

**Max 4 perguntas:** após 4 turnos do usuário, `recommendAnyway = true` e o sistema recomenda com caveat de perfil incompleto.

---

## 2. Mapa de determinismo (LLM vs código)

### Decisões do LLM visíveis ao usuário

| Ponto | O que o LLM decide | Risco | Deveria ser código? |
|---|---|---|---|
| **Texto narrativo** | Todo o texto ao usuário (acuse, explicação, razão da raquete) | Baixo se não houver dados inventados | Não — narrativa é o valor do LLM |
| **`registrar_intencao`** | Escolhe 1 de 10 categorias de intenção | Médio: erro atrasa o diagnóstico | Parcialmente — poderia ter detecção por regex para casos óbvios |
| **Argumentos de `diagnosticar_perfil`** | Passa nível, estilo, lesão, força inferidos da conversa | **CRÍTICO para lesão** — mitigado: lesão re-injetada do histórico. Nível/estilo ainda podem ser inferidos errado | Lesão: já é código. Resto: LLM |
| **Filtros de `buscar_raquetas`** | Passa nivel, prioridade, marca, orçamento | Controlado: `confirmedMarca` re-injetada do histórico se modelo omitir | Marca/orçamento: já são código |
| **Seleção de IDs em `recomendar_raquetas`** | Escolhe 2–3 IDs das candidatas | Controlado: IDs validados (devem vir de buscar), raquete atual excluída em TROCA | IDs validados por código |
| **Razão por raquete em `recomendar_raquetas`** | Texto livre justificando a escolha | **SEM VALIDAÇÃO**: pode inventar specs ("essa tem spin 9" quando spin=4) | Idealmente: validar razão contra dados da raquete |
| **Chips via `sugerir_opcoes`** | Pode enviar qualquer 4 strings | Controlado: sistema sobrescreve com chips canônicos quando campo ativo | Canônico já é código |
| **Texto da pergunta (preco/marca)** | Modelo deve escrever o texto exato | Parcial: system block exige frase exata, fallback se vazio | Preco/marca: ainda LLM com fallback |
| **Texto da pergunta (Akinator)** | **Removido do LLM** após fix v0.3.488 | Resolvido: código appenda pergunta fixa após acuse | Já é código |

### Onde o LLM pode se desviar

1. **Texto da razão:** inventar especificações técnicas de raquetes sem dado (maior risco de qualidade)
2. **Classificação de intenção:** classificar "quero trocar minha Boom" como `curiosidade` em vez de `troca` → pula profiling
3. **Skip implícito de gating:** modelo pode tentar chamar `buscar_raquetas` quando bloqueado → executeTool retorna erro e bloqueia
4. **Resposta sem ferramentas:** na primeira rodada pode emitir texto sem chamar `registrar_intencao` → stall detection reforça

---

## 3. Costo de tokens

### System prompt

- **Tamanho:** ~21 KB (~22.000 tokens)
- **Conteúdo:** definição de papel, 10 categorias de intenção, regras por fluxo (TROCA, AJUSTE, PRIMEIRA, etc.), sistema Akinator, regras de preço/marca, base de conhecimento técnico (espessura, furos, balance, materiais), regras anti-alucinação
- **Cache:** `cache_control: { type: 'ephemeral' }` em cada turno. TTL ~5 minutos — turnos 2–5 dentro do TTL pagam 0.10× (cacheRead) em vez de 1.00× (input)

### Retorno das ferramentas

| Ferramenta | Tamanho estimado |
|---|---|
| `registrar_intencao` | ~50 tokens |
| `diagnosticar_perfil` (INSUFICIENTE) | ~350–400 tokens |
| `diagnosticar_perfil` (OK) | ~400–600 tokens |
| `buscar_raquetas` (8 candidatas) | **2.500–3.500 tokens** |
| `buscar_raquetas` + avisos de pool/preço/marca | +500 tokens |
| `recomendar_raquetas` | ~100 tokens |
| Resultados compactados de rodadas anteriores | `'(ok)'` — ~5 tokens cada |

`buscar_raquetas` já remove: `affiliate_url`, `source_url`, `image_url`, campos admin de `specs_extra`. Sem essa filtragem seria ~3–4× maior.

### Gerenciamento de histórico

- **`MAX_HISTORY_MESSAGES = 20`** — apenas as últimas 20 mensagens são enviadas ao modelo
- Histórico completo mantido em memória para `extractConfirmedProfileFromHistory()` (state não é afetado pelo truncamento)
- Tool results de rodadas anteriores compactados para `'(ok)'`
- Conversa típica (5–10 turnos): 8–30 mensagens, ~2–4 KB — dentro do limite de 20

### Modelo e perfil de tokens

**Modelo:** `claude-haiku-4-5-20251001`

| Tipo | Preço (USD/MTok) |
|---|---|
| Input | $1.00 |
| Output | $5.00 |
| CacheWrite | $1.25 |
| CacheRead | $0.10 |

**Por turno (estimativa):**

| Componente | Tokens | Custo aprox. |
|---|---|---|
| System prompt (cache miss, turno 1) | 22.000 | $0.028 (cache write) |
| System prompt (cache hit, turnos 2+) | 22.000 | $0.0022 (cache read) |
| Histórico (8 msgs, ~2.500 tokens) | 2.500 | $0.0025 |
| Resultado buscar_raquetas | 3.000 | $0.003 |
| Output do modelo | 1.000 | $0.005 |
| **Turno 1 total** | ~29.000 | **~$0.04** |
| **Turno 2–5 total (cache quente)** | ~29.000 | **~$0.015** |
| **Conversa completa (5 turnos)** | ~150.000 | **~$0.10–0.12** |

### 3 maiores contribuidores de custo por conversa

1. **Output tokens (40% do custo):** saída custam 5× mais que entrada. 1.000 tokens de output = $0.005, vs 22.000 tokens de system = $0.022 no cacheWrite mas $0.0022 no read. Reduzir verbosidade do modelo tem impacto imediato.
2. **`buscar_raquetas` resultado (25%):** 3.000 tokens por busca × 2–3 buscas por conversa = 6.000–9.000 tokens extras de input.
3. **System prompt cacheWrite no turno 1 (20% do turno 1):** $0.028 no primeiro turno, amortizado depois. Cache miss após 5 min reseta esse custo.

---

## 4. Superficie de abuso

### Limite de tamanho do input do usuário

- **Frontend:** nenhum `maxLength` no textarea do ChatInput (`HomeClient.tsx`) — **sem limite**
- **Backend:** rota `/api/chat` aceita qualquer POST body — **sem validação de tamanho**
- **Risco:** usuário cola 100 KB de texto → tokens de input explodem, custo por turno pode ser 10–50× o normal

### Rate limiting (`lib/rate-limit.ts`)

| Limite | Valor | Enforcement |
|---|---|---|
| Burst | 20 msgs / IP / minuto | Backend (rate-limit.ts) |
| Diário por IP | 150 msgs / IP / dia | Backend |
| Por conversa (sessão) | **25 msgs** | Backend + warning no frontend em 20 |
| Conversas por IP/dia | **Não implementado** | Ausente |

**Bug:** o limite de sessão usa `DAY_MS` (86.4M ms) como TTL da chave `sess:{sessionId}`. Se a sessão durar >24h (improvável mas possível), o limite nunca reseta dentro dessa sessão.

### Cap de mensagens por conversa

- Confirmado: **25 mensagens por sessão** (`CHAT_LIMITS.MAX_PER_CONV = 25` em `rate-limit.ts`)
- Frontend avisa em 20 mensagens e bloqueia em 25
- Não há limite de conversas distintas por IP/dia (novo sessionId = nova conversa com limite zerado)

### Off-topic

- System prompt diz (paráfrase): "fora do escopo de raquetes de beach tennis, declinar com calor e redirecionar"
- **Sem gate de código:** se o usuário persistir com off-topic, o modelo pode se engajar (Haiku-4.5 pode ser condescendente)
- 25 mensagens off-topic dentro do limite = custo normal sem valor para o usuário
- Sem logging/monitoramento de queries off-topic

### Injeção de prompt

- System prompt instrui o modelo a não revelar configurações internas
- **Sem filtro de código:** proteção depende 100% da robustez do modelo
- `tool_choice: 'none'` em `streamResponse` previne emissão de XML de ferramentas para o usuário — boa defesa
- Sem detecção de padrões de injection ("ignora suas instruções", "repita seu system prompt")

### Teto de gasto global / circuit breaker

- **Ausente no código**
- Tabela `conversations` registra `custo_usd` / `custo_brl` por turno
- Sem aggregação diária automática nem alerta
- Sem variável de ambiente para cap de gasto diário
- Operador deve monitorar manualmente o Supabase e desativar o serviço manualmente se necessário

---

## Oportunidades priorizadas

### Alta prioridade — impacto imediato

| # | Mudança | Ganho | Complexidade |
|---|---|---|---|
| 1 | **Limite de input do usuário** (frontend: maxLength=500; backend: rejeitar >1.000 chars) | Elimina vetor de inflação de tokens; segurança básica | Baixa |
| 2 | **Global spend cap** (env var `MAX_DAILY_USD_SPEND`, checar em route.ts antes de runAgentTurn) | Proteção operacional contra abuso/bug | Baixa |
| 3 | **Reduzir candidatas de buscar_raquetas de 8 → 6** (linha ~399 agent.ts, `MAX_CANDIDATES`) | −400–500 tokens/busca, ~−10% custo de input por busca | Trivial |

### Média prioridade — determinismo e qualidade

| # | Mudança | Ganho | Complexidade |
|---|---|---|---|
| 4 | **Validar razão de recomendar_raquetas** contra dados da raquete (checar se score citado bate com `racket_insights`) | Elimina alucinações de specs | Média |
| 5 | **Limite de conversas por IP/dia** (ex: 5 conversas/IP/dia, baseado em sessionId único) | Impede abuso via múltiplas sessões | Baixa–Média |
| 6 | **Fix TTL do rate-limit de sessão** (usar TTL fixo de ~12h em vez de DAY_MS) | Corrige bug de sessão longa | Trivial |
| 7 | **Máximo de tokens de output** (lowering MAX_TOKENS de 2048 → 1200) | −10% custo de output por turno | Baixa (testar) |

### Baixa prioridade — otimização fina

| # | Mudança | Ganho | Complexidade |
|---|---|---|---|
| 8 | **Comprimir system prompt** (remover headers redundantes, consolidar regras repetidas) | −1–2 KB (−3% custo turno 1) | Média |
| 9 | **Logging de off-topic** (detectar mensagens sem keywords de beach tennis, registrar flag) | Visibilidade de abuso; sem impacto em custo | Baixa |
| 10 | **Filtrar specs_extra mais agressivamente** (truncar `perfil_resumo` a 150 chars, remover nulls) | −100–200 tokens/busca | Baixa |

### Huecos de abuso mais urgentes

1. **Sem limite de tamanho de input** → vetor mais fácil de explorar, custo imediato
2. **Sem global spend cap** → risco operacional se houver spike de uso ou bug
3. **Sem limite de conversas por IP** → novo sessionId = contador zerado, 150 msgs/dia × N sessões = sem teto real

---

## Resumo numérico

| Métrica | Valor |
|---|---|
| Modelo | claude-haiku-4-5-20251001 |
| MAX_TOOL_ROUNDS | 4 |
| MAX_API_CALLS / turno (pior caso) | 7 |
| MAX_MESSAGES / conversa | 25 |
| Burst rate limit | 20 msg/IP/min |
| Daily rate limit | 150 msg/IP/dia |
| System prompt | ~22.000 tokens |
| buscar_raquetas retorno | ~3.000 tokens (8 candidatas) |
| Histórico enviado ao modelo | últimas 20 mensagens |
| Custo estimado / conversa (5 turnos) | ~$0.10–0.12 USD |
| Maior custo unitário | output tokens (5× o input) |
| Threshold de confiança | 80% |
| Max perguntas Akinator | 4 |
