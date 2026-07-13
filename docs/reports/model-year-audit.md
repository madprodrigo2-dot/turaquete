# Auditoria de Model Year — Catálogo Turaquete
**Gerado:** 2026-07-13 | **Base:** 266 entradas (249 pub + 17 não pub) | **READ-ONLY**

---

## 1. Cobertura da coluna `model_year`

| Segmento | Total | Com model_year | Null |
|---|---|---|---|
| Publicadas | 249 | **249 (100%)** | 0 |
| Não publicadas | 17 | **17 (100%)** | 0 |
| **Total** | **266** | **266 (100%)** | **0** |

Coluna `model_year INTEGER` existe, é nullable, mas na prática nunca é null. Cobertura perfeita — não precisa de backfill.

---

## 2. Anos embebidos em nomes × `model_year`

### 2.1 Contradições (nome diz X, model_year diz Y)

| slug | name atual | model_year | Problema |
|---|---|---|---|
| `the-bull-2026` | The Bull **2025** | 2025 | **Slug diz 2026, nome e model_year dizem 2025.** Provavelmente carga prematura: slug foi gerado para o modelo 2026 mas o produto inserido era o 2025. |
| `ocean-air-bt-bullet-6-0-2025` | Ocean Air BT Bullet **6.0 2025** | **2024** | Nome tem "2025", model_year=2024. Um dos dois está errado. |

Apenas 2 contradições reais no catálogo inteiro. O restante (anos de 2 dígitos nos nomes Heroe's como "Harley 24", "Rebel 25") coincide com model_year.

### 2.2 Anos parciais (2 dígitos) — Heroe's

Heroe's usa sufixo curto: `24`, `25`, `26`. Todos coerentes com `model_year`. Não são erros — é o padrão desta marca.

| nome | model_year |
|---|---|
| Harley 24 | 2024 ✓ |
| Harley 25 | 2025 ✓ |
| Ison 25 | 2025 ✓ |
| Mjolnir 25 | 2025 ✓ |
| Rebel 24 | 2024 ✓ |
| Rebel 25 | 2025 ✓ |
| Show 24 | 2024 ✓ |
| Show 25 | 2025 ✓ |

### 2.3 Estimativa de nomes com ano embebido

~145 de 266 entradas têm algum ano explícito no nome (formato 4-dígitos 20xx ou 2-dígitos 24/25/26). As outras ~121 entradas não têm ano no nome — incluindo marcas como Total (nunca usa ano), Turquoise (usa número de versão) e Shark (maioria sem ano).

---

## 3. Famílias — grupos com 2+ versões publicadas

Critério de família: mesma marca + nome-base normalizado (sem ano, sem cor, sem atleta, sem "pro/plus/LE").

### 3.1 Famílias multi-versão publicadas (exigem desambiguação visual)

**AMA Sport**
| Família | Versões pub | Chave de desambiguação |
|---|---|---|
| Kronos | 4 (2024–2026) | model_year + sufixo (Gold, White, 6th Gen) |
| Poison Bee | 2 (2025, 2026) | model_year |
| Proteo | 2 (2025, 2026) | model_year |
| Athena | 2 (ambas 2026) | cor (Midnight, Pink) — **mesmo ano** |

**Drop Shot**
| Família | Versões pub | Chave de desambiguação |
|---|---|---|
| Axion Attack | 2 (2025, 2026) | model_year + versão (BT, 2.0 BT) |
| Bronco | 2 (2024, 2025) | versão (1.0, 2.0) + model_year |
| Canyon Pro | 2 (2024, 2026) | versão (1.0, 3.0) + model_year |
| Conqueror 12 | 2 (ambas 2024) | variante (Comfort, Tech) — **mesmo ano** |
| Conqueror 13 | 2 (ambas 2025) | variante (Comfort, Tech) — **mesmo ano** |
| Legacy Soft | 3 (2024, 2025, 2026) | versão (1.0, 2.0, 3.0) + model_year |
| Renegade | 2 (ambas 2025) | variante (Comfort, Control) — **mesmo ano** |

**Fobel**
| Família | Versões pub | Chave de desambiguação | Alerta |
|---|---|---|---|
| Fox | 1 pub + 1 unpub (2024 unpub, 2026 pub) | model_year | Fox 2024 despublicada: só 1 pub ativo |
| Husky | 1 pub + 1 unpub (2024 unpub, 2026 pub) | model_year | idem |
| Macaw | **2 pub** (2024, 2025) | model_year | ⚠️ "Macaw" (2025) não tem ano no nome; "Macaw 2024" tem. Inconsistente. |

**Head**
| Família | Versões pub | Chave de desambiguação |
|---|---|---|
| Cruzeiro | 3 (2024, 2025, 2025) | variante (Cabuloso, La Bestia) + model_year |
| Galo | 2 (2024, 2025) | variante (Imortal) + model_year |
| Icon | 2 (ambas 2025) | cor (Ciano, Rosa) — **mesmo ano** |

**Heroe's**
| Família | Versões pub | Chave de desambiguação |
|---|---|---|
| Harley | 2 (2024, 2025) | sufixo curto (24, 25) |
| Rebel | 2 (2024, 2025) | sufixo curto (24, 25) |
| Show | 3 (2024, 2025, 2026) | sufixo curto (24, 25, 2026) |
| Starlight | 2 (2025, 2026) | variante (Ruby) — **ano ausente** em ambos os nomes |

**Kona**
| Família | Versões pub | Chave de desambiguação |
|---|---|---|
| Bulldog | 2 (2025, 2026) | cor + model_year |
| Gladiator | 2 (2025, 2026) | variante (Steel) + model_year |
| K-Doze | 3 (2025, 2026, 2026) | cor + model_year |
| Traktor | 2 (2025, 2026) | cor + model_year |

**Minimalist**
| Família | Versões pub | Chave de desambiguação |
|---|---|---|
| Flash | 2 (2025, 2026) | model_year |
| Sky Blanc | 2 (2025, 2026) | model_year |

**Mormaii**
| Família | Versões pub | Chave de desambiguação |
|---|---|---|
| Samantha Barijan | 2 (2024, 2025) | "II" + model_year — **sem ano no nome da versão 2024** |
| Sunrise | 2 (2025, 2026) | model_year |
| Flexxxa | 2 (2022, 2023) | variante (Slim) |

**Nox**
| Família | Versões pub | Chave de desambiguação |
|---|---|---|
| AR10 | 2 (ambas 2022) | variante (NERBO, TEMPO) — **mesmo ano** |
| NG17 | 3 (2023, 2025, 2026) | model_year + variante (Luxury) |
| V10 | 2 (2025, 2026) | model_year + variante (Luxury) |
| VARADERO | 2 (2025, 2026) | model_year + variante (Pro Series) |

**Ocean Air**
| Família | Versões pub | Chave de desambiguação | Alerta |
|---|---|---|---|
| Bazooka | 3 pub (2024 4.1, 2024 6.0, 2025 5.0) | versão num. | ⚠️ 6.0 (2024) > 5.0 (2025): versão maior é mais antiga — inversão lógica |
| BT Bullet | 2 (6.0 2024/2025?, 7.0 2025) | versão num. | ⚠️ Contradição de model_year (ver §2.1) |
| BT Cruiser | 2 (2025 1.0, 2026 2.0) | versão num. — **sem ano no nome** |
| BT Destroyer | 2 (2025 1.0, 2026 2.0) | versão num. — **sem ano no nome** |
| BT Enterprise | 2 (2025 1.0, 2026 2.0) | versão num. — **sem ano no nome** |
| BT Phenom | 2 (2025 1.0, 2026 2.0) | versão num. — **sem ano no nome** |

**Quicksand**
| Família | Versões pub | Chave de desambiguação |
|---|---|---|
| Alien | 2 (2025, 2026) | cor (Purple) + model_year — nomenclatura inconsistente |
| Silver Club | **4 pub** (2025, 2025 LE, 2026, 2026 LE) | model_year + "Ed. Limitada" |
| No Look | 2 (ambas 2026) | cor (Black, Classic) — **mesmo ano** |

**Shark**
| Família | Versões pub | Chave de desambiguação |
|---|---|---|
| Black | 2 (2024, 2025) | variante (Pro, 22mm) + model_year |
| Boost | 2 (2025, 2026) | variante (Pro) + model_year |
| Elite | **4 pub** (2024, 2025, 2025, 2026) | variante (18K 21mm, 3K 21mm, 3K) + model_year |
| Jaws | 2 (ambas 2025) | variante (Pro, Tour) — **mesmo ano** |
| Kinetic | 3 (2024, 2024, 2025) | variante (S, X, Tour) + model_year |

**Turquoise** (usa número de versão, nunca ano no nome)
| Família | Versões pub | Chave de desambiguação |
|---|---|---|
| Black Death | 2 (ambas 2025) | cor (Blue, Extreme) |
| DNA | 5 (2024×3, 2025×2) | cor + versão (2.3, 1.3) |
| Expanse | 2 (ambas 2025) | cor (Flud, Violet) |
| Samsara | 3 (todas 2024) | cor (Green, Orange, Yellow) |
| TQ Fire | 2 (ambas 2025) | cor (Azul, Laranja) |

**Vision**
| Família | Versões pub | Chave de desambiguação |
|---|---|---|
| Gold Carbon Titanium | 2 (2025, 2026) | model_year |
| Magnum | **4 pub** (2025, 2025, 2026, 2026) | variante (Uni, Pro) + model_year |
| Strange | 2 (2025, 2026) | variante (Pro) + model_year |
| Supercarbon Pro | 2 (2025, 2026) | model_year |
| White Carbon | 2 (2025, 2026) | model_year |

**Zand**
| Família | Versões pub | Chave de desambiguação |
|---|---|---|
| Z Blade | 2 (2025, 2026) | model_year |
| Z Bruxo | 3 (2025, 2025 SE, 2026) | "Special Edition" + model_year |
| Z Jump | 3 (2024, 2025 SE, 2026) | "Special Edition" + model_year |
| Z Storm | 2 (ambas 2026) | variante (18K) — **mesmo ano** |

**Zeiq**
| Família | Versões pub | Chave de desambiguação |
|---|---|---|
| Brave | 2 (2025, 2026) | "New" prefix no 2026 — **sem ano no nome** |
| Inspire | 2 (2025, 2026) | "New" prefix no 2026 — **sem ano no nome** |
| Ragnarok | 2 (2024, 2026) | variante (Uruz 18k) + model_year |

### 3.2 Famílias com versão única publicada

Marcas/modelos onde só há uma versão publicada (desambiguação não necessária):

**AMA Sport:** Classic Bee, Medusa 2025  
**Adidas:** BT RX H14, Metalbone Team 3.3 H31, Adipower Carbon H34, Adipower Carbon Light H31 *(e variantes despublicadas)*  
**Fobel:** Cheetah, Falcon, Macaw Onyx, Python  
**Head:** Battle, Boom, Duo Pro, Extreme NEW, Flash 2.0, Gravity, Radical NEW, Speed  
**Heroe's:** Arion 2026, Aura 2026, CÉU, Coach, Fierce, Forest, Heroe's x Senna, Mjolnir 25, The Bull (slug 2026)  
**Kona:** Maddox Guga, Maverick Black, One White, Thunder Rose  
**Minimalist:** Blanc 2024, Fênix 2025, Gold 2025, Lune 2025 LE, Star 2026  
**Mormaii:** Flexxxa Slim *(versão distinta da Flexxxa padrão)*, Sunset Plus 2025, Triax 24K, Vini Font II, Vitória Marchezini II  
**Nox:** FLY10 2026, MB10 2022, ML10 PRO CUP 2025, NOVA87 2026, SURVIVOR 2022  
**Ocean Air:** Bazooka 4.1 15K LE *(versão única nesse sub-modelo)*  
**Quicksand:** Gold Club 2026, Kombat 2026, Ninja Star 2025 *(vs Ninja 2026: nomes distintos)*, Quicksand Ninja 2026, Waya 2025  
**Shark:** Attack, Cyclone, Epic 22mm, Giant, Monster, Predator 2026, Pro One, Storm, Supreme 2026, Tiger, Tour, Ultra  
**Total:** Evolution 18K Golden, Evolution 18K Violeta *(1 família com 2 cores/ano, ver §3.1 implícito)*, Fun, Match 3K, Pro 12K, Pro Sunset 12K, Titanium 3K  
**Vision:** Elite 7 2025, F-Pro Forged Carbon, Master 2026, Precision Hybrid 2026, Pyramid 2025, Tech 2025  
**Zand:** Z Flame 2026, Z Soft, Z Storm 2026 *(ambas as Z Storm são mesma família — ver §4.2)*, Z Xtreme 2025  
**Zeiq:** Advanced Julia Nogueira 2025, Arrow 2024, Classic 2025, New Light Leo Branco 3K, Ragnarok Uruz 18k, Revolution 2025, Scorpion 2 2023, Snake Joao Wiesinger 3K, Supernova 18k, Unique 2025  

---

## 4. Casos raros

### 4.1 Singletons com ano embebido no nome (potencialmente desnecessário)

Modelos únicos publicados que têm ano no nome mas nenhuma versão irmã ativa:

| slug | name | model_year | Comentário |
|---|---|---|---|
| `medusa-25` | Medusa 2025 | 2025 | Singleton pub. Ano no nome não prejudica; pode manter. |
| `arion-2026` | Arion 2026 | 2026 | Singleton pub. Ano pode ser desnecessário. |
| `aura-2026` | Aura 2026 | 2026 | Singleton pub. Idem. |
| `mjolnir-25` | Mjolnir 25 | 2025 | Singleton pub. Heroe's usa sufixo curto por convenção da marca. |
| `ninja-star-2025` | Ninja Star 2025 | 2025 | "Ninja Star" e "Quicksand Ninja 2026" são linhas diferentes (Star ≠ Ninja), então é singleton dentro da linha Ninja Star. |

**Regra proposta:** o ano no nome não faz mal a um singleton — apenas não seria exibido na card se a família tiver 1 versão. Não necessário corrigir esses nomes.

### 4.2 Multi-versão sem ano no nome de algum membro

Casos onde há 2+ versões publicadas mas o nome não deixa claro qual versão é:

| Família | Membro sem ano | model_year | Membro com desambiguação | Problema |
|---|---|---|---|---|
| Fobel Macaw | `fobel-macaw` → "Macaw" | 2025 | `fobel-macaw-2024` → "Macaw 2024" | A versão mais nova (2025) não tem ano; a mais antiga (2024) tem. Invertido. |
| Mormaii Samantha Barijan | `mormaii-samantha-barijan` → "Samantha Barijan" | 2024 | `mormaii-samantha-barijan-ii-2025` → "Samantha Barijan II 2025" | "II" desambigua geração, ok; mas "1ª geração" não aparece no nome. |
| Heroe's Starlight | `heroes-starlight` → "Starlight" | 2025 | `starlight-ruby` → "Starlight Ruby" | Nenhum tem ano no nome; variante "Ruby" desambigua, mas ano está ausente. |
| Ocean Air BT Cruiser | `bt-cruiser-2025` → "BT Cruiser" | 2025 | `bt-cruiser-2-0` → "BT Cruiser 2.0" | Versão 1.0 = 2025 não tem nem versão nem ano no nome. |
| Ocean Air BT Destroyer | `bt-destroyer` → "BT Destroyer" | 2025 | `bt-destroyer-2-0` → "BT Destroyer 2.0" | Idem. |
| Ocean Air BT Enterprise | `bt-enterprise-2025` → "BT Enterprise" | 2025 | `bt-enterprise-2-0` → "BT Enterprise 2.0" | Idem. |
| Ocean Air BT Phenom | `bt-phenom` → "BT Phenom" | 2025 | `bt-phenom-2-0` → "BT Phenom 2.0" | Idem. |
| Zeiq Brave | `zeiq-brave-rafa-miller-2025` → "Brave Rafa Miller 12k 2025" | 2025 | `zeiq-new-brave-12k` → "New Brave 12k" | 2026 usa "New" como prefixo em vez de ano. |
| Zeiq Inspire | `zeiq-inspire-patty-diaz-2025` → "Inspire Patty Díaz 3k 2025" | 2025 | `zeiq-new-inspire-kevlar` → "New Inspire Carbono Kevlar" | Idem. |
| Zand Z Storm | `z-storm-2026` → "Z Storm 2026" | 2026 | `z-storm-18k` → "Z Storm 18K" | Ambas 2026; "18K" é o material/spec, não o ano. Nenhum problema de desambiguação de ano, mas a nomenclatura é assimétrica. |

### 4.3 Inconsistências de prefixo de marca

Algumas marcas misturam "Marca + Modelo" com apenas "Modelo" dentro da mesma família:

| Marca | Entradas com prefixo | Entradas sem prefixo |
|---|---|---|
| Vision | "Vision Gold Carbon Titanium 2025", "Vision Magnum 2025", "Vision Strange 2025", "Vision Supercarbon Pro 2025", "Vision White Carbon 2025" | "Gold Carbon Titanium 2026", "Magnum Pro 2026", "Strange Pro 2026", "Supercarbon Pro 2026", "White Carbon 2026" |
| Kona | "Kona Gladiator 2025" | "Gladiator Steel 2026" |
| Mormaii | "Mormaii Sunrise 2026" | "Sunrise 2025" |
| Nox | "Nox NG17 2023" | "NG17 Luxury 2025", "NG17 2026" |
| Ocean Air | "Ocean Air Bazooka 5.0 2023" (unpub), "Ocean Air Bazooka 6.0 2024", "Ocean Air BT Bullet 6.0 2025" | "Bazooka 5.0", "BT Bullet 7.0" |
| Quicksand | "Quicksand Gold Club 2026", "Quicksand No Look Black 2026", "Quicksand Waya 2025" | "Alien 2026", "Silver Club 2026" |
| Drop Shot | "Drop Shot Axion Attack BT 2025", etc. | "Axion Attack 2.0 BT 2026", "Conqueror 13 Comfort 2025" (sem prefixo) |

O padrão ideal seria: ou todas as entradas de uma marca têm o prefixo, ou nenhuma tem. A inconsistência dificulta buscas e comparações.

---

## 5. Proposta de esquema

### Regra geral

```
nome_base = nome sem: ano (4 ou 2 dígitos), "New" prefix (Zeiq), prefixo de marca
model_year = inteiro, já preenchido (não muda)
card_label = nome_base + " " + model_year  →  apenas se a família tiver 2+ versões pub
           = nome_base                     →  se singleton
```

Exceções à remoção de ano do `nome_base`:
- **Nox NG17 Luxury 2025** → `nome_base = "NG17 Luxury"` (ano removido, OK)
- **Zeiq Scorpion 2 2023** → `nome_base = "Scorpion 2"` (ano removido; "2" é geração, não ano)
- **Ocean Air Bazooka 4.1 / 5.0 / 6.0** → o número de versão faz parte do `nome_base` (não é ano): `"Bazooka 4.1"`, `"Bazooka 5.0"`, `"Bazooka 6.0"`

### Tabela de casos problemáticos — proposta concreta

| slug | nome atual | nome_base proposto | model_year | card label (se família ≥2 pub) |
|---|---|---|---|---|
| `fobel-macaw` | Macaw | Macaw | 2025 | **Macaw 2025** |
| `fobel-macaw-2024` | Macaw 2024 | Macaw | 2024 | Macaw 2024 ✓ |
| `the-bull-2026` | The Bull 2025 | The Bull | 2025 | The Bull 2025 *(e corrigir slug → `the-bull-2025`)* |
| `ocean-air-bt-bullet-6-0-2025` | Ocean Air BT Bullet 6.0 2025 | BT Bullet 6.0 | **2025** *(corrigir model_year)* | BT Bullet 6.0 2025 |
| `bt-cruiser-2025` | BT Cruiser | BT Cruiser | 2025 | **BT Cruiser 2025** |
| `bt-cruiser-2-0` | BT Cruiser 2.0 | BT Cruiser | 2026 | BT Cruiser 2026 *(dropar "2.0" da card)* |
| `bt-destroyer` | BT Destroyer | BT Destroyer | 2025 | **BT Destroyer 2025** |
| `bt-destroyer-2-0` | BT Destroyer 2.0 | BT Destroyer | 2026 | BT Destroyer 2026 |
| `bt-enterprise-2025` | BT Enterprise | BT Enterprise | 2025 | **BT Enterprise 2025** |
| `bt-enterprise-2-0` | BT Enterprise 2.0 | BT Enterprise | 2026 | BT Enterprise 2026 |
| `bt-phenom` | BT Phenom | BT Phenom | 2025 | **BT Phenom 2025** |
| `bt-phenom-2-0` | BT Phenom 2.0 | BT Phenom | 2026 | BT Phenom 2026 |
| `mormaii-samantha-barijan` | Samantha Barijan | Samantha Barijan | 2024 | **Samantha Barijan 2024** |
| `heroes-starlight` | Starlight | Starlight | 2025 | **Starlight 2025** |
| `starlight-ruby` | Starlight Ruby | Starlight Ruby | 2026 | Starlight Ruby 2026 *(ou manter "Ruby" como desambiguador)* |
| `zeiq-new-brave-12k` | New Brave 12k | Brave 12k | 2026 | Brave 12k 2026 |
| `zeiq-new-inspire-kevlar` | New Inspire Carbono Kevlar | Inspire Carbono Kevlar | 2026 | Inspire Carbono Kevlar 2026 |

### Correções de inconsistência de prefixo

Para as marcas com prefixo inconsistente, a proposta é **remover o prefixo** de todos os nomes e deixar o lookup de marca na tabela `brands`:

- Vision: "Vision Magnum 2025" → `nome_base = "Magnum"` (já consistente com as entradas 2026 sem prefixo)
- Kona: "Kona Gladiator 2025" → `nome_base = "Gladiator"` (idem)
- Mormaii: "Mormaii Sunrise 2026" → `nome_base = "Sunrise"` (idem)
- Nox: "Nox NG17 2023" → `nome_base = "NG17"` (idem)
- Drop Shot: padronizar — ou todas com "Drop Shot" ou nenhuma

### Impacto na coluna `name` atual

A migração pode:
1. Adicionar coluna `nome_base TEXT` derivada das regras acima (não toca `name` existente)
2. Ou atualizar `name` diretamente (mais simples, mas destrutivo)

**Recomendação:** opção 1 (nova coluna) — o `name` atual é referenciado em vários lugares (Telegram, GA4, admin), então uma coluna separada `nome_base` permite rollout gradual.

---

## Resumo executivo

| Achado | Qtd | Ação recomendada |
|---|---|---|
| Cobertura model_year | 100% | Nenhuma |
| Contradições nome × model_year | 2 | Corrigir `the-bull-2026` (slug→slug 2025) + `ocean-air-bt-bullet-6-0-2025` (model_year→2025) |
| Famílias multi-versão pub | ~35 | Implementar lógica de exibição "ano só se família ≥2 versões" |
| Multi-versão com membro sem ano no nome | 10 | Adicionar coluna `nome_base` ou normalizar `name` |
| Inconsistências de prefixo de marca | 6 marcas | Padronizar em `nome_base` na migração |
| Singletons com ano supérfluo | ~5 | Baixa prioridade; a lógica de card resolve silenciosamente |
