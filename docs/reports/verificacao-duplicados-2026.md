# Verificação de Duplicados — Candidatas 2026
**Gerado:** 2026-07-12 | **Base:** catálogo completo (publicadas + não publicadas)

## Metodologia

- Normalização: minúsculas, sem acentos, sem "bt/beach/tennis", sem anos, sem nomes de atletas, sem cores, sem "pro/plus/limited edition/holographic/le"
- DUPLICADO: URL idêntica OU (nome normalizado idêntico E specs iguais)
- RENOVAÇÃO LEGÍTIMA: parente existe, specs ou ano diferem claramente
- NOVA: sem nenhum parente no catálogo
- AMBÍGUA: parente existe, evidência insuficiente — comparação abaixo para decidir

---

## Tabela de veredictos (38 candidatas)

| ID | Candidata | Veredicto | Parente no catálogo (slug) | Evidência |
|---|---|---|---|---|
| A1 | Athena Boreal 2026 | **NOVA** | `athena-midnight-26`, `athena-pink-26` | Linha Athena 2026 existe (Midnight, Pink), mas "Boreal" é colorway inédita |
| A2 | Medusa 2026 (Mattia Bazzi) | **AMBÍGUA** | `medusa-25` | Nome normalizado idêntico ("medusa"); iamBT source URL diz `medusa-2025`; BR diz 2026 — verificar se é nova SKU ou mesmo produto com rótulo corrigido |
| D1 | Blitz Attack BT | **DUPLICADO** | `dropshot-blitz-attack-bt-2025` | source_url idêntica: `/raquete-de-beach-tennis-drop-shot-blitz-attack-bt` |
| D2 | Furia Attack BT | **AMBÍGUA** | `dropshot-furia-attack-bt-2025` | Nome normalizado idêntico ("furia attack"); candidata usa URL genérica `/raquetes-1` — provável versão 2026 sem página própria ainda; confirmar |
| D3 | Conqueror 13 Soft BT | **NOVA** | `dropshot-conqueror-13-comfort-2025`, `dropshot-conqueror-13-tech-bt-2025` | "Soft" é terceira variante da linha Conqueror 13 — inédita no catálogo |
| D4 | Conqueror 13 Tech BT | **DUPLICADO** | `dropshot-conqueror-13-tech-bt-2025` | source_url idêntica: `/raquete-de-beach-tennis-drop-shot-conqueror-13-tech-bt-p` |
| F1 | Husky 2026 | **RENOVAÇÃO LEGÍTIMA** | `fobel-husky` (2024) | Nome idêntico; ML candidata MLBU3953185973 ≠ catálogo MLBU3752170073; ano 2026 vs 2024 |
| F2 | Fox 2026 — Isabela Garrido | **RENOVAÇÃO LEGÍTIMA** | `fobel-fox` (2024) | Nome idêntico; ML candidata MLB-4693557268 ≠ catálogo MLBU3803975188; ano 2026 vs 2024 |
| F3 | Macaw 2026 — Gustavo Russo | **RENOVAÇÃO LEGÍTIMA** | `fobel-macaw` (2025) | Nome idêntico; mesmo atleta; ano 2026 vs 2025 |
| F4 | Macaw Onyx Limited Edition 2026 | **AMBÍGUA** | `fobel-macaw-onyx` (2025) | Nome idêntico após normalizar; affiliate_url do catálogo já referencia "limited-edition-2026" — verificar se é o mesmo cadastro ou entrada nova |
| F5 | Panther 26/27 | **NOVA** | — | Linha "Panther" não existe no catálogo Fobel (tem: Husky, Fox, Macaw, Falcon, Cheetah, Python) |
| H1 | The Bull 2026 — Diego Bollettinari | **RENOVAÇÃO LEGÍTIMA** | `the-bull-2026` ⚠️ model_year=2025 | ML candidata MLB47397751 ≠ catálogo MLB46660826; produtos ML distintos. **Atenção:** slug atual `the-bull-2026` tem model_year=2025 — inconsistência a corrigir |
| H2 | Ison 2026 — Allan Oliveira | **RENOVAÇÃO LEGÍTIMA** | `ison-25` (2025) | Nome idêntico; ano 2026 vs 2025 |
| M1 | Vini Font II | **DUPLICADO** | `mormaii-vini-font-ii` (2025) | Nome idêntico; sem distinção de ano — indistinguível do item já catalogado |
| M2 | Flag Time Brasil | **NOVA** | — | "Flag Time Brasil" não existe em nenhuma entrada Mormaii; ML MLB28699417 confirma produto real |
| Q1 | Alien 2026 — Carlos Vigon | **RENOVAÇÃO LEGÍTIMA** | `alien-purple-2025` (2025) | Nome idêntico pós-normalização (remove cor); ano 2026 vs 2025 |
| S1 | Shark Black 2026 | **AMBÍGUA** | `shark-black-22` (2025) | Affiliate do catálogo 2025 já referencia "shark-black-2026"; Decathlon tem SKU exclusivo 2145923629 — verificar se é produto distinto do catálogo 2025 ou re-listagem |
| S2 | Shark Epic Pro 2026 — Luca Cramarossa | **AMBÍGUA** | `shark-epic-22` (2025) | Affiliate do catálogo 2025 já referencia "shark-epic-2026-by-luca-cramarossa"; ML candidata MLB36202965 ≠ catálogo MLBU3840864233 — verificar se é versão 2026 distinta ou mesmo produto re-rotulado |
| S3 | Shark Elite 3K 2026 — Ariadna Costa | **RENOVAÇÃO LEGÍTIMA** | `shark-elite-3k-21` (2025) | Mesmo atleta; source catálogo = "elite-3k-21-mm-by-ariadna-costa-copia"; candidata é versão 2026 |
| T1 | Total Pro Sunset 12K | **DUPLICADO** | `total-pro-sunset-12k` (2023) | Nome idêntico pós-normalização; já no catálogo com source_url dedicada |
| TQ1 | Revolution Infinity Gold | **NOVA** | — | Linha "Revolution" não existe no catálogo Turquoise |
| TQ2 | Revolution Infinity Silver | **NOVA** | — | Idem TQ1 |
| TQ3 | DNA Carbon 3K Gold | **NOVA** | `turquoise-dna-gold-1-3` (token "dna") | Catálogo DNA usa Full Kevlar; candidata usa Carbon 3K — sublinha distinta |
| TQ4 | DNA Carbon 3K Silver | **NOVA** | `turquoise-dna-silver-1-3` (token "dna") | Idem TQ3 |
| TQ5 | DNA Colors Extreme Azul | **NOVA** | `turquoise-dna-gold-1-3` (token "dna") | Sublinha "Colors Extreme" (Full Kevlar) não existe no catálogo |
| TQ6 | DNA Colors Extreme Branca | **NOVA** | — | Idem TQ5 |
| TQ7 | DNA Colors Extreme Vermelha | **NOVA** | — | Idem TQ5 |
| TQ8 | TQFire Holographic 1.1 Azul | **RENOVAÇÃO LEGÍTIMA** | `turquoise-tq-fire-azul` (2025) | Mesma cor; candidata adiciona versão "1.1" + finish Holographic — produto distinto 2026 |
| TQ9 | TQFire Holographic 1.1 Laranja | **RENOVAÇÃO LEGÍTIMA** | `turquoise-tq-fire-laranja` (2025) | Idem TQ8, cor Laranja |
| TQ10 | Expanse 1.2 Violeta Fluo | **RENOVAÇÃO LEGÍTIMA** | `turquoise-expanse-violet` (2025) | Nome token "expanse"; candidata adiciona versão "1.2" — renovação 2026 |
| TQ11 | Expanse 1.2 Rosa Fluo | **RENOVAÇÃO LEGÍTIMA** | `turquoise-expanse-flud` (2025) | Cor Rosa não existe no catálogo Expanse; versão 1.2 nova |
| TQ12 | Black Death Holographic 11.1 Azul | **AMBÍGUA** | `turquoise-black-death-blue-11-1` (2025) | Mesma versão "11.1" e mesma cor Azul; diferença é apenas finish "Holographic" — confirmar se specs/preço diferem ou é re-finish do mesmo SKU |
| TQ13 | Black Death Holographic 11.1 Vermelho | **AMBÍGUA** | `turquoise-black-death-extreme-11-1` (2025) | Mesma versão "11.1"; cor Extreme pode coincidir com Vermelho do catálogo — confirmar no site Turquoise se são SKUs distintos |
| V1 | Progress Drive 2026 | **NOVA** | — | "Progress" não existe no catálogo Vision (linhas: Magnum, Strange, Supercarbon, Master, White Carbon, Gold Carbon, F-Pro, Precision, Elite, Tech) |
| V2 | Kinetic Drive 2026 | **NOVA** | — | "Kinetic Drive" inédito na Vision |
| Z1 | Z Xtreme | **AMBÍGUA** | `z-xtreme-2025` (2025) | Nome normalizado idêntico ("z xtreme"); candidata sem ano nem URL confirmada — impossível distinguir se é 2026 novo ou a entrada 2025 já cadastrada |
| ZQ1 | Advanced Julia Nogueira White | **AMBÍGUA** | `zeiq-advanced-julia-nogueira-2025` (2025) | Nome base idêntico ("advanced"); candidata adiciona cor "White" — confirmar se é colorway 2026 ou variante 2025 não catalogada |
| ZQ2 | Pro Violet Collani White — Douglas Collani | **NOVA** | — | Nenhum modelo "Pro" existe no catálogo Zeiq — linha inédita |

---

## Resumo de contagem

| Veredicto | Qtd | IDs |
|---|---|---|
| DUPLICADO | 4 | D1, D4, M1, T1 |
| RENOVAÇÃO LEGÍTIMA | 11 | F1, F2, F3, H1, H2, Q1, S3, TQ8, TQ9, TQ10, TQ11 |
| NOVA | 14 | A1, D3, F5, M2, TQ1, TQ2, TQ3, TQ4, TQ5, TQ6, TQ7, V1, V2, ZQ2 |
| AMBÍGUA | 9 | A2, D2, F4, S1, S2, TQ12, TQ13, Z1, ZQ1 |
| **Total** | **38** | |

---

## Duplicados — excluir do lote

| ID | Candidata | Por que excluir |
|---|---|---|
| D1 | Drop Shot Blitz Attack BT | Já no catálogo como `dropshot-blitz-attack-bt-2025` — mesma URL |
| D4 | Drop Shot Conqueror 13 Tech BT | Já no catálogo como `dropshot-conqueror-13-tech-bt-2025` — mesma URL |
| M1 | Mormaii Vini Font II | Já no catálogo como `mormaii-vini-font-ii` (2025) — sem distinção de versão |
| T1 | Total Pro Sunset 12K | Já no catálogo como `total-pro-sunset-12k` (2023) |

---

## Ambíguas — resolver antes de carregar

| ID | Candidata | Parente | O que verificar |
|---|---|---|---|
| A2 | AMA Medusa 2026 (Mattia Bazzi) | `medusa-25` | É nova SKU 2026 ou a Medusa 2025 com rótulo corrigido para o mercado BR? Confirmar com fornecedor ou site AMA Sport |
| D2 | Drop Shot Furia Attack BT | `dropshot-furia-attack-bt-2025` | Confirmar se o lançamento "2026" tem specs ou URL diferente do cadastrado como 2025 |
| F4 | Fobel Macaw Onyx LE 2026 | `fobel-macaw-onyx` (2025) | affiliate_url do catálogo já referencia "limited-edition-2026" — verificar se é a mesma entrada já corrigida ou produto novo |
| S1 | Shark Black 2026 | `shark-black-22` (2025) | O `shark-black-22` cadastrado (2025) e o candidato têm mesmo mold ou o candidato é de novo mold com viga central (26 furos, balanço 25,2cm)? Se specs diferentes: RENOVAÇÃO LEGÍTIMA |
| S2 | Shark Epic Pro 2026 | `shark-epic-22` (2025) | Verificar se Epic Pro 2026 (Luca Cramarossa) e Epic 22mm 2025 são o mesmo produto re-rotulado ou versão 2026 com specs atualizadas |
| TQ12 | Turquoise Black Death Holographic 11.1 Azul | `turquoise-black-death-blue-11-1` (2025) | Confirmar no site turquoisebeachtennis.com.br se "Holographic 11.1" tem preço/specs distintos do "Blue 11.1" 2025. Se o único diff é finish: provável DUPLICADO |
| TQ13 | Turquoise Black Death Holographic 11.1 Vermelho | `turquoise-black-death-extreme-11-1` (2025) | Confirmar se "Holographic Vermelho 11.1" e "Extreme 11.1" são versões do mesmo produto (Extreme = vermelho?) |
| Z1 | Zand Z Xtreme | `z-xtreme-2025` | Confirmar com Zand se Z Xtreme tem versão 2026 distinta da 2025 já catalogada |
| ZQ1 | Zeiq Advanced Julia Nogueira White | `zeiq-advanced-julia-nogueira-2025` | Confirmar se é colorway 2026 (EVA Soft White novo material) ou variante do modelo 2025 não catalogada — zeiq.com.br menciona "envios a partir de 20/06 [2026]", sugere produto 2026 |

> **Sugestão S1/S2:** O site Shark lista "Black 22mm" (catálogo 2025) e "Black 2026" como modelos separados, com o 2026 tendo "novo mold" (26 furos arco, viga central, balanço 25,2cm). Isso sugere RENOVAÇÃO LEGÍTIMA. Verificar confirmação definitiva no site sharkbeachtennis.com.br comparando specs lado a lado.

> **Sugestão ZQ1:** Evidência favorece RENOVAÇÃO LEGÍTIMA — zeiq.com.br anuncia junho 2026 como lançamento e EVA Soft White é descrito como material novo vs EVA Soft Black do modelo anterior.

---

## Alerta extra

**H1 (The Bull 2026):** O banco tem slug `the-bull-2026` com `model_year=2025` — inconsistência pré-existente. Ao inserir o verdadeiro The Bull 2026, corrigir o slug do 2025 para `the-bull-2025` primeiro.

---

## Aprovadas para Lote 1

**34 candidatas** (todas as não-DUPLICADO). Classificadas em subcategorias para priorização:

### Pronto para carregar (RENOVAÇÃO LEGÍTIMA + NOVA com evidência forte)

**Fobel (4):** F1 Husky 2026 · F2 Fox 2026 · F3 Macaw 2026 · F5 Panther 26/27  
**Heroe's (2):** H1 The Bull 2026 *(corrigir slug 2025 antes)* · H2 Ison 2026  
**Quicksand (1):** Q1 Alien 2026  
**Shark (1):** S3 Elite 3K 2026  
**Turquoise (9):** TQ1 · TQ2 · TQ3 · TQ4 · TQ5 · TQ6 · TQ7 · TQ8 · TQ9 · TQ10 · TQ11 *(11 no total)*  
**AMA Sport (1):** A1 Athena Boreal 2026  
**Drop Shot (1):** D3 Conqueror 13 Soft BT  
**Mormaii (1):** M2 Flag Time Brasil  
**Vision (2):** V1 Progress Drive · V2 Kinetic Drive *(baixa prioridade, sem BR)*  
**Zeiq (1):** ZQ2 Pro Violet Collani White

### Aguardando resolução das ambíguas (9)
A2 · D2 · F4 · S1 · S2 · TQ12 · TQ13 · Z1 · ZQ1

*(Após resolução, provável saldo adicional de 4–7 aprovadas)*
