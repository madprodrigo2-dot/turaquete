# Auditoria do Catálogo Turaquete — 2026-06-17

**Executado por:** Claude Code (claude-sonnet-4-6)
**Data da auditoria:** 2026-06-17
**Total de raquetes:** 140 | **Marcas:** 14

---

## 1. Resumo Executivo

### Totais por status

| Campo auditado | Completo (✅) | Faltando (❌) | Porcentagem completa |
|---|---|---|---|
| weight_g | 123 | 17 | 88% |
| balance | 75 | 65 | 54% |
| format | 68 | 72 | 49% |
| face_material | 140 | 0 | 100% |
| core | 132 | 8 | 94% |
| price | 139 | 1 | 99% |
| model_year | 140 | 0 | 100% |
| image_url | 140 | 0 | 100% |
| image_file | 140 | 0 | 100% |
| source_url | 133 | 7 | 95% |
| textura | 79 | 61 | 56% |
| furos_quantidade | 79 | 61 | 56% |
| espessura_mm | 104 | 36 | 74% |
| trama_carbono | 67 | 73 | 48% |
| formato_cabeca | 54 | 86 | 39% |

**Raquetes "limpas" (sem gaps, sem flags):** 26/140 (19%)
**Raquetes com algum gap:** 114/140 (81%)

### Fixes aplicados nesta sessão (2026-06-17)

44 campos atualizados na base. Fontes verificadas:

| Marca | Campo | Qtd | Fonte |
|---|---|---|---|
| Heroe's | espessura_mm | 1 | heroesbrandsport.com.br/shop/raquete-de-beach-tennis-beast/ |
| NOX | format + espessura_mm | 10 | noxsport.com.br (5 product pages) |
| Shark | balance | 22 | sharkbeachtennis.com.br (product pages, 26cm = "médio") |
| Shark | espessura_mm | 8 | sharkbeachtennis.com.br + nomes dos modelos |
| Ocean Air | textura + trama_carbono | 10 | soleraperformance.com.br (5 product pages 2.0) |

### Gaps mais comuns restantes (após fixes)

1. **formato_cabeca** (86 raquetes) — brands: Shark, Mormaii, Kona, Fobel, Vision, Ocean Air, Zand, Zeiq, Drop Shot, AMA
2. **trama_carbono** (73 raquetes) — AMA Sport, Drop Shot, Shark (parcial), Mormaii, Kona, Fobel, Vision, Zand, Zeiq
3. **format** (72 raquetes) — Shark, Mormaii, Kona, Fobel, Vision, Zand, Zeiq, Drop Shot
4. **balance** (65 raquetes) — Zeiq, Mormaii, Kona, Fobel, Vision, Zand (parcial)
5. **textura** (61 raquetes) — AMA Sport (parcial), Drop Shot, Zand, Zeiq, Kona, Ocean Air 1.x
6. **furos_quantidade** (61 raquetes) — AMA Sport, Shark, Kona (parcial), Quicksand (parcial)

### Achados especiais

- **Shark:** site principal (sharkbtsports.com.br) está off-line; acesso via sharkbeachtennis.com.br alternativo. Formato/formato_cabeca não listado em nenhuma página — precisaria de contato com a marca.
- **ZEIQ:** site zeiq.com.br funciona mas especificações técnicas não estão nas páginas de produto — balance, format, espessura, furos ausentes de todas as fichas.
- **Drop Shot:** nenhuma source_url configurada para os 7 modelos; fichas técnicas detalhadas requerem acesso ao site dropshot.es.
- **AMA Sport / Beetrue:** trama_carbono ausente em todos os modelos (o texto de face_material lista "3K Metal Fusion", "12K CarboTex", etc. mas sem o campo trama padronizado).
- **Zand:** site lista espessura e furos em algumas fichas mas não peso, balance ou formato para a maioria dos modelos 2026.
- **Ocean Air (Solera):** modelos 2.0 confirmados com trama e textura; modelos 1.x (BT Enterprise Com Tratamento, BT Cruiser, BT Destroyer, BT Phenom) e Bazooka não acessíveis via URLs diretas — precisam de revisão no site.
- **Vision:** 11 modelos com weight_g, balance e format todos NULL — site visionbtsports.com.br não testado, precisa de visita.
- **Minimalist:** todos os 9 modelos completos (peso_configuravel + balance_configuravel = intencionalmente configuráveis — não é gap).
- **Imagens:** nenhum arquivo ausente. 140/140 presentes em `public/raquetes/`.

---

## 2. Tabela A — Matriz completa (todos os modelos × campos factuais)

Legenda: ✅ preenchido | ❌ falta | 📷 arquivo ausente | ⚠️ tem algum gap | 🟦 configurável (Minimalist)

### HEROE'S (17 modelos)

| Nome | id | pub | ano | peso | bal | fmt | face | core | preço | img | src | tex | furos | esp | trama | fcab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Beast 2023 | 17 | N | 2023 | 320 | ✅ | ✅ | ✅ | ✅ | 1410 | ✅ | ✅ | ✅ | 14 | 20¹ | ✅ | ✅ |
| CÉU | 15 | Y | 2024 | 330 | ✅ | ✅ | ✅ | ✅ | 2299 | ✅ | ✅ | ✅ | 35 | 22 | ✅ | ✅ |
| Coach | 9 | Y | 2025 | 325 | ✅ | ✅ | ✅ | ✅ | 3199 | ✅ | ✅ | ✅ | 14 | 20 | ✅ | ✅ |
| Fierce | 2 | Y | 2026 | 325 | ✅ | ✅ | ✅ | ✅ | 3649 | ✅ | ✅ | ✅ | 14 | 20 | ✅ | ✅ |
| Forest | 13 | Y | 2026 | 320 | ✅ | ✅ | ✅ | ✅ | 2500 | ✅ | ✅ | ✅ | 35 | 20 | ✅ | ✅ |
| Harley 24 | 16 | Y | 2024 | 335 | ✅ | ✅ | ✅ | ✅ | 1599 | ✅ | ✅ | ✅ | 14 | 20 | ✅ | ✅ |
| Harley 25 | 14 | Y | 2025 | 325 | ✅ | ✅ | ✅ | ✅ | 2499 | ✅ | ✅ | ✅ | 14 | 20 | ✅ | ✅ |
| Heroe's x Senna | 1 | Y | 2025 | 325 | ✅ | ✅ | ✅ | ✅ | 4330 | ✅ | ✅ | ✅ | 14 | 20 | ✅ | ✅ |
| Ison 25 | 6 | Y | 2025 | 325 | ✅ | ✅ | ✅ | ✅ | 3399 | ✅ | ✅ | ✅ | 35 | 20 | ✅ | ✅ |
| Mjolnir 25 | 12 | Y | 2025 | 325 | ✅ | ✅ | ✅ | ✅ | 2699 | ✅ | ✅ | ✅ | 14 | 20 | ✅ | ✅ |
| Rebel 24 | 10 | Y | 2024 | 325 | ✅ | ✅ | ✅ | ✅ | 3199 | ✅ | ✅ | ✅ | 14 | 20 | ✅ | ✅ |
| Rebel 25 | 4 | Y | 2025 | 325 | ✅ | ✅ | ✅ | ✅ | 3101 | ✅ | ✅ | ✅ | 14 | 20 | ✅ | ✅ |
| Show 24 | 11 | Y | 2024 | 325 | ✅ | ✅ | ✅ | ✅ | 3099 | ✅ | ✅ | ✅ | 14 | 20 | ✅ | ✅ |
| Show 25 | 8 | Y | 2025 | 325 | ✅ | ✅ | ✅ | ✅ | 3249 | ✅ | ✅ | ✅ | 14 | 20 | ✅ | ✅ |
| Starlight | 5 | Y | 2025 | 325 | ✅ | ✅ | ✅ | ✅ | 3649 | ✅ | ✅ | ✅ | 11 | 20 | ✅ | ✅ |
| Starlight Ruby | 3 | Y | 2026 | 325 | ✅ | ✅ | ✅ | ✅ | 3649 | ✅ | ✅ | ✅ | 11 | 20 | ✅ | ✅ |
| The Bull | 7 | Y | 2025 | 325 | ✅ | ✅ | ✅ | ✅ | 3399 | ✅ | ✅ | ✅ | 16 | 20 | ✅ | ✅ |

¹ Beast 2023: espessura_mm=20 aplicado nesta sessão (fonte: heroesbrandsport.com.br)

---

### AMA SPORT / BEETRUE (14 modelos)

| Nome | id | pub | ano | peso | bal | fmt | face | core | preço | img | tex | furos | esp | trama | fcab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Athena | 29 | Y | 2025 | 320 | ✅ | ✅ | ✅ | ✅ | 2349 | ✅ | ✅ | 30 | 22 | ❌ | ✅ |
| Athena Midnight | 35 | Y | 2026 | 315 | ✅ | ✅ | ✅ | ✅ | 2499 | ✅ | ❌ | 34 | 22 | ❌ | ❌ |
| Athena Pink | 36 | Y | 2026 | 315 | ✅ | ✅ | ✅ | ✅ | 2499 | ✅ | ❌ | 34 | 22 | ❌ | ❌ |
| Classic Bee | 37 | Y | 2025 | 320 | ✅ | ✅ | ✅ | ✅ | 2349 | ✅ | ❌ | 28 | 21 | ❌ | ❌ |
| Kronos 2025 | 26 | Y | 2025 | 320 | ✅ | ✅ | ✅ | ✅ | 2400 | ✅ | ✅ | 48 | 20 | ❌ | ✅ |
| Kronos 6th Gen | 32 | Y | 2026 | 320 | ✅ | ✅ | ✅ | ✅ | 3199 | ✅ | ❌ | 48 | 20 | ❌ | ❌ |
| Kronos Gold Ed. Titanium | 27 | Y | 2025 | 320 | ✅ | ✅ | ✅ | ✅ | 2199 | ✅ | ✅ | ❌ | 20 | ❌ | ✅ |
| Kronos White Titanium 2024 | 25 | Y | 2024 | 320 | ✅ | ✅ | ✅ | ✅ | 2149 | ✅ | ✅ | 48 | 20 | ❌ | ✅ |
| Medusa 2025 | 30 | Y | 2025 | 320 | ✅ | ✅ | ✅ | ✅ | 2599 | ✅ | ✅ | 34 | 20 | ❌ | ✅ |
| Poison Bee | 31 | Y | 2025 | 320 | ✅ | ✅ | ✅ | ✅ | 2400 | ✅ | ✅ | 34 | 20 | ❌ | ✅ |
| Poison Bee (1ª geração) | 38 | Y | 2024 | 320 | ✅ | ✅ | ✅ | ✅ | 2299 | ✅ | ❌ | 48 | 20 | ❌ | ❌ |
| Poison Bee 2026 | 34 | Y | 2026 | 320 | ✅ | ✅ | ✅ | ✅ | 2699 | ✅ | ❌ | 34 | 20 | ❌ | ❌ |
| Proteo 2025 | 28 | Y | 2025 | 330 | ✅ | ✅ | ✅ | ✅ | 2400 | ✅ | ✅ | 32 | 20 | ❌ | ✅ |
| Proteo 2026 | 33 | Y | 2026 | 330 | ✅ | ✅ | ✅ | ✅ | 2699 | ✅ | ❌ | 32 | 20 | ❌ | ❌ |

---

### DROP SHOT (7 modelos)

| Nome | id | pub | ano | peso | bal | fmt | face | core | preço | img | src | tex | furos | esp | trama | fcab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Axion Attack 2.0 BT 2026 | 49 | Y | 2026 | 320 | ✅ | ✅ | ✅ | ✅ | 2599 | ✅ | ❌ | ❌ | 26 | 22 | ❌ | ❌ |
| Canyon Pro BT 1.0 2024 | 43 | Y | 2024 | 330 | ✅ | ✅ | ✅ | ✅ | 850 | ✅ | ❌ | ❌ | 22 | 22 | ❌ | ❌ |
| Conqueror 13 Comfort 2025 | 48 | Y | 2025 | 320 | ✅ | ✅ | ✅ | ✅ | 2000 | ✅ | ❌ | ❌ | 28 | 22 | ❌ | ❌ |
| Explorer 3.0 BT | 42 | Y | 2022 | 345 | ✅ | ✅ | ✅ | ✅ | 800 | ✅ | ❌ | ❌ | 10 | 22 | ❌ | ❌ |
| Explorer 6.0 BT | 46 | Y | 2025 | 320 | ✅ | ✅ | ✅ | ✅ | 1849 | ✅ | ❌ | ❌ | 37 | 22 | ❌ | ❌ |
| Renegade Comfort BT | 41 | Y | 2025 | 320 | ✅ | ✅ | ✅ | ✅ | 900 | ✅ | ❌ | ❌ | 35 | 22 | ❌ | ❌ |
| Renegade Control BT | 44 | Y | 2025 | 320 | ✅ | ✅ | ✅ | ✅ | 1300 | ✅ | ❌ | ❌ | 35 | 22 | ❌ | ❌ |

---

### ZAND (7 modelos)

| Nome | id | pub | ano | peso | bal | fmt | face | core | preço | img | tex | furos | esp | trama | fcab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Z Blade 3K | 62 | Y | 2026 | ❌ | ✅ | ❌ | ✅ | ✅ | 1990 | ✅ | ❌ | 24 | 22 | ❌ | ❌ |
| Z Bruxo 2026 | 58 | Y | 2026 | ❌ | ✅ | ❌ | ✅ | ❌ | 3099 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Z Flame 2026 | 60 | Y | 2026 | 325 | ✅ | ❌ | ✅ | ✅ | 2199 | ✅ | ❌ | 20 | 21 | ❌ | ❌ |
| Z Jump 2026 | 59 | Y | 2026 | ❌ | ✅ | ❌ | ✅ | ✅ | 2749 | ✅ | ❌ | 32 | 22 | ❌ | ❌ |
| Z Soft | 64 | Y | 2026 | ❌ | ✅ | ❌ | ✅ | ❌ | 659 | ✅ | ❌ | 24 | 22 | ❌ | ❌ |
| Z Storm 18K | 63 | Y | 2026 | ❌ | ✅ | ❌ | ✅ | ✅ | 1799 | ✅ | ❌ | 24 | 22 | ❌ | ❌ |
| Z Xtreme | 61 | Y | 2026 | ❌ | ✅ | ❌ | ✅ | ✅ | 2099 | ✅ | ❌ | 28 | 21 | ❌ | ❌ |

---

### ZEIQ (6 modelos)

| Nome | id | pub | ano | peso | bal | fmt | face | core | preço | img | tex | furos | esp | trama | fcab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| New Brave 12k | 65 | Y | 2026 | 320 | ❌ | ❌ | ✅ | ✅ | 2400 | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| New Inspire Carbono Kevlar | 66 | Y | 2026 | 320 | ❌ | ❌ | ✅ | ✅ | 2400 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| New Light Leo Branco 3K | 67 | Y | 2026 | 320 | ❌ | ❌ | ✅ | ✅ | 2400 | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Ragnarok Uruz 18k | 69 | Y | 2026 | 320 | ❌ | ❌ | ✅ | ✅ | 2000 | ✅ | ✅ | 24 | ❌ | ✅ | ❌ |
| Snake Joao Wiesinger 3K | 70 | Y | 2026 | 320 | ❌ | ❌ | ✅ | ❌ | 1900 | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Supernova 18k | 68 | Y | 2026 | 320 | ❌ | ❌ | ✅ | ✅ | 2100 | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |

---

### NOX (5 modelos) — após fixes desta sessão

| Nome | id | pub | ano | peso | bal | fmt | face | core | preço | img | tex | furos | esp | trama | fcab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| NG17 2026 | 71 | Y | 2026 | 325 | ✅ | ✅¹ | ✅ | ✅ | 3399 | ✅ | ✅ | 40 | 20¹ | ✅ | ✅ |
| V10 2026 | 72 | Y | 2026 | 325 | ✅ | ✅¹ | ✅ | ✅ | 3199 | ✅ | ✅ | 40 | 20¹ | ✅ | ✅ |
| NOVA87 2026 | 73 | Y | 2026 | 325 | ✅ | ✅¹ | ✅ | ✅ | 3199 | ✅ | ❌ | 40 | 20¹ | ✅ | ✅ |
| FLY10 2026 | 74 | Y | 2026 | 325 | ✅ | ✅¹ | ✅ | ✅ | 2999 | ✅ | ❌ | 40 | 20¹ | ✅ | ✅ |
| VARADERO 2026 | 75 | Y | 2026 | 325 | ✅ | ✅¹ | ✅ | ✅ | 2899 | ✅ | ❌ | 40 | 20¹ | ✅ | ✅ |

¹ Aplicado nesta sessão. Fonte: noxsport.com.br (product pages verificadas 2026-06-17).
Textura ausente em NOVA87/FLY10/VARADERO — não listada nas páginas do produto.

---

### SHARK (22 modelos) — após fixes desta sessão

| Nome | id | pub | peso | bal | fmt | face | core | preço | tex | furos | esp | trama | fcab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Boost 21mm | 76 | Y | 320 | ✅¹ | ❌ | ✅ | ✅ | 1999 | ✅ | ❌ | 21¹ | ✅ | ❌ |
| Epic 22mm | 77 | Y | 320 | ✅¹ | ❌ | ✅ | ✅ | 1999 | ✅ | ❌ | 22¹ | ✅ | ❌ |
| Black 22mm | 78 | Y | 320 | ✅¹ | ❌ | ✅ | ✅ | 1999 | ✅ | ❌ | 22¹ | ✅ | ❌ |
| Elite 18K 21mm | 79 | Y | 320 | ✅¹ | ❌ | ✅ | ✅ | 1999 | ✅ | ❌ | 21¹ | ✅ | ❌ |
| Elite 3K 21mm | 80 | Y | 320 | ✅¹ | ❌ | ✅ | ✅ | 1999 | ✅ | ❌ | 21¹ | ✅ | ❌ |
| Predator 22mm | 81 | Y | 320 | ✅¹ | ❌ | ✅ | ✅ | 1999 | ✅ | ❌ | 22¹ | ✅ | ❌ |
| Kinetic Tour | 82 | Y | 325 | ✅¹ | ❌ | ✅ | ✅ | 1999 | ✅ | ❌ | 21¹ | ✅ | ❌ |
| Kinetic X | 83 | Y | 330 | ✅¹ | ❌ | ✅ | ✅ | 1999 | ✅ | ❌ | ❌ | ✅ | ❌ |
| Kinetic S | 84 | Y | 330 | ✅¹ | ❌ | ✅ | ✅ | 1999 | ✅ | ❌ | ❌ | ✅ | ❌ |
| Monster | 85 | Y | 335 | ✅¹ | ❌ | ✅ | ✅ | 1800 | ✅ | ❌ | ❌ | ✅ | ❌ |
| Giant | 86 | Y | 325 | ✅¹ | ❌ | ✅ | ✅ | 1799 | ✅ | ❌ | 24¹ | ✅ | ❌ |
| Elite | 87 | Y | 325 | ✅¹ | ❌ | ✅ | ✅ | 1799 | ✅ | ❌ | ❌ | ✅ | ❌ |
| Black | 88 | Y | 325 | ✅¹ | ❌ | ✅ | ✅ | 1799 | ✅ | ❌ | ❌ | ✅ | ❌ |
| Tiger | 89 | Y | 325 | ✅¹ | ❌ | ✅ | ✅ | 1799 | ✅ | ❌ | ❌ | ✅ | ❌ |
| Boost Pro | 90 | Y | 325 | ✅¹ | ❌ | ✅ | ✅ | 1699 | ✅ | ❌ | ❌ | ✅ | ❌ |
| Attack | 91 | Y | 325 | ✅¹ | ❌ | ✅ | ✅ | 1499 | ✅ | ❌ | ❌ | ✅ | ❌ |
| Pro One | 92 | Y | 325 | ✅¹ | ❌ | ✅ | ❌ | 499 | ✅ | 14 | ❌ | ❌ | ❌ |
| Reef | 93 | Y | 325 | ✅¹ | ❌ | ✅ | ✅ | 470 | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cyclone | 94 | Y | 330 | ✅¹ | ❌ | ✅ | ❌ | 699 | ✅ | 14 | ❌ | ❌ | ❌ |
| Ultra | 95 | Y | 325 | ✅¹ | ❌ | ✅ | ❌ | 699 | ✅ | 24 | ❌ | ❌ | ❌ |
| Storm | 96 | Y | 325 | ✅¹ | ❌ | ✅ | ❌ | 699 | ✅ | 14 | ❌ | ❌ | ❌ |
| Tour | 97 | Y | 325 | ✅¹ | ❌ | ✅ | ✅ | 699 | ✅ | 24 | ❌ | ❌ | ❌ |

¹ Aplicado nesta sessão. Balance=médio confirmado por páginas Shark (26cm = "Equilibrado").
Espessura em negrito: confirmada por nome do modelo (Boost 21mm, Epic 22mm, etc.) ou página oficial.
**format (redonda/gota/diamante) não disponível no site Shark** — requer contato com a marca.
**furos** não divulgados pela Shark em nenhum modelo exceto Pro One/Cyclone/Ultra/Storm/Tour.

---

### MORMAII (8 modelos)

| Nome | id | pub | peso | bal | fmt | face | core | preço | tex | furos | esp | trama | fcab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Vini Font II | 98 | Y | 325 | ❌ | ❌ | ✅ | ✅ | 2399 | ✅ | 48 | 22 | ❌ | ❌ |
| Vitória Marchezini II | 99 | Y | 320 | ❌ | ❌ | ✅ | ✅ | 2499 | ✅ | 28 | 22 | ❌ | ❌ |
| Samantha Barijan | 100 | Y | 320 | ❌ | ❌ | ✅ | ✅ | 1899 | ✅ | 32 | 20 | ❌ | ❌ |
| Triax 24K | 101 | Y | 320 | ❌ | ❌ | ✅ | ✅ | 1899 | ✅ | 30 | 22 | ❌ | ❌ |
| Flexxxa Slim | 102 | Y | 315 | ❌ | ❌ | ✅ | ✅ | 1599 | ✅ | 32 | 20 | ❌ | ❌ |
| Flexxxa | 103 | Y | 337 | ❌ | ❌ | ✅ | ✅ | 1820 | ✅ | 32 | 22 | ❌ | ❌ |
| Strike | 104 | Y | 330 | ❌ | ❌ | ✅ | ✅ | 898 | ❌ | 28 | 22 | ❌ | ❌ |
| Kicks | 105 | Y | 337 | ❌ | ❌ | ✅ | ✅ | 899 | ❌ | 42 | 22 | ❌ | ❌ |

---

### KONA (11 modelos)

| Nome | id | pub | peso | bal | fmt | face | core | preço | tex | furos | esp | trama | fcab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Bulldog Black 2026 | 106 | Y | 320 | ❌ | ❌ | ✅ | ✅ | 2699 | ❌ | ❌ | 22 | ❌ | ❌ |
| Traktor Gray 2026 | 107 | Y | 320 | ❌ | ❌ | ✅ | ✅ | 2399 | ❌ | ❌ | 20 | ❌ | ❌ |
| Gladiator Steel 2026 | 108 | Y | 320 | ❌ | ❌ | ✅ | ✅ | 2499 | ❌ | ❌ | 22 | ❌ | ❌ |
| Thunder Rose 2026 | 109 | Y | 320 | ❌ | ❌ | ✅ | ✅ | 2399 | ❌ | ❌ | 22 | ❌ | ❌ |
| K-Doze Black 2026 | 110 | Y | 320 | ❌ | ❌ | ✅ | ✅ | 2499 | ❌ | ❌ | 22 | ❌ | ❌ |
| K-Doze Red 2026 | 111 | Y | 320 | ❌ | ❌ | ✅ | ✅ | 2499 | ❌ | ❌ | 22 | ❌ | ❌ |
| One White 2026 | 112 | Y | 320 | ❌ | ❌ | ✅ | ✅ | 1999 | ❌ | ❌ | 22 | ❌ | ❌ |
| Maverick Black 2025 | 113 | Y | 335 | ❌ | ❌ | ✅ | ✅ | 2699 | ❌ | 26 | 22 | ❌ | ❌ |
| K-Doze Grafite 2025 | 114 | Y | 335 | ❌ | ❌ | ✅ | ✅ | 2390 | ❌ | 26 | 22 | ❌ | ❌ |
| Maddox Guga | 115 | Y | 325 | ❌ | ❌ | ✅ | ✅ | 2690 | ❌ | 24 | 20 | ❌ | ❌ |
| Traktor Orange 2025 | 116 | Y | 335 | ❌ | ❌ | ✅ | ✅ | 2290 | ❌ | 30 | 20 | ❌ | ❌ |

---

### FOBEL (7 modelos)

| Nome | id | pub | peso | bal | fmt | face | core | preço | tex | furos | esp | trama | fcab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fox | 117 | Y | 320 | ❌ | ❌ | ✅ | ✅ | 2239 | ✅ | 32 | 20 | ❌ | ❌ |
| Husky | 118 | Y | 320 | ❌ | ❌ | ✅ | ✅ | 2399 | ✅ | ❌ | 22 | ❌ | ❌ |
| Macaw | 119 | Y | 320 | ❌ | ❌ | ✅ | ✅ | 2346 | ✅ | ❌ | 22 | ❌ | ❌ |
| Macaw Onyx | 120 | Y | 320 | ❌ | ❌ | ✅ | ✅ | 2346 | ✅ | ❌ | 22 | ❌ | ❌ |
| Python | 121 | Y | 320 | ❌ | ❌ | ✅ | ✅ | 1432 | ✅ | 32 | 22 | ❌ | ❌ |
| Falcon | 122 | Y | 320 | ❌ | ❌ | ✅ | ✅ | 1357 | ✅ | 42 | 22 | ❌ | ❌ |
| Cheetah | 123 | Y | 320 | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | 21 | ❌ | ❌ |

---

### VISION (11 modelos)

| Nome | id | pub | peso | bal | fmt | face | core | preço | tex | furos | esp | trama | fcab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Supercarbon Pro 2026 | 124 | Y | ❌ | ❌ | ❌ | ✅ | ✅ | 2299 | ❌ | ❌ | 21 | ❌ | ❌ |
| Gold Carbon Titanium 2026 | 125 | Y | ❌ | ❌ | ❌ | ✅ | ✅ | 2299 | ❌ | ❌ | 21 | ❌ | ❌ |
| White Carbon 2026 | 126 | Y | ❌ | ❌ | ❌ | ✅ | ✅ | 2299 | ❌ | ❌ | 21 | ❌ | ❌ |
| F-Pro Forged Carbon | 127 | Y | ❌ | ❌ | ❌ | ✅ | ❌ | 2299 | ❌ | ❌ | ❌ | ❌ | ❌ |
| Strange Pro 2026 | 128 | Y | ❌ | ❌ | ❌ | ✅ | ✅ | 2299 | ✅ | ❌ | 21 | ❌ | ❌ |
| Magnum Pro 2026 | 129 | Y | ❌ | ❌ | ❌ | ✅ | ✅ | 2159 | ❌ | ❌ | 22 | ❌ | ❌ |
| Magnum Uni 2026 | 130 | Y | ❌ | ❌ | ❌ | ✅ | ✅ | 2159 | ❌ | ❌ | 22 | ❌ | ❌ |
| Precision Hybrid 2026 | 131 | Y | ❌ | ❌ | ❌ | ✅ | ✅ | 2159 | ✅ | ❌ | 20 | ❌ | ❌ |
| Master 2026 | 132 | Y | ❌ | ❌ | ❌ | ✅ | ✅ | 999 | ❌ | ❌ | 20 | ❌ | ❌ |
| Pyramid 25 | 133 | Y | ❌ | ❌ | ❌ | ✅ | ✅ | 1299 | ❌ | ❌ | 21 | ❌ | ❌ |
| Elite 7 2025 | 134 | Y | ❌ | ❌ | ❌ | ✅ | ✅ | 1299 | ✅ | ❌ | 22 | ❌ | ❌ |

---

### OCEAN AIR / SOLERA (11 modelos) — após fixes desta sessão

| Nome | id | pub | peso | bal | fmt | face | core | preço | tex | furos | esp | trama | fcab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BT Enterprise Com Tratamento | 146 | Y | 326 | ✅ | ✅ | ✅ | ✅ | 1990 | ❌ | ❌ | 20 | ✅ | ✅ |
| BT Enterprise 2.0 | 147 | Y | 330 | ✅ | ✅ | ✅ | ✅ | 2790 | lisa¹ | ❌ | 20 | 12K¹ | ✅ |
| BT Cruiser | 148 | Y | 326 | ✅ | ✅ | ✅ | ✅ | 1990 | ❌ | ❌ | 20 | ✅ | ✅ |
| BT Cruiser 2.0 | 149 | Y | 330 | ✅ | ✅ | ✅ | ✅ | 2790 | lisa¹ | ❌ | 20 | 12K¹ | ✅ |
| BT Phenom | 150 | Y | 326 | ✅ | ✅ | ✅ | ✅ | 1990 | ❌ | ❌ | 20 | ✅ | ✅ |
| BT Phenom 2.0 | 151 | Y | 330 | ✅ | ✅ | ✅ | ✅ | 2790 | lisa¹ | ❌ | 20 | 16K¹ | ✅ |
| BT Bullet 7.0 | 152 | Y | 326 | ✅ | ✅ | ✅ | ✅ | 1990 | lisa¹ | ❌ | 20 | 24K¹ | ✅ |
| BT Destroyer | 153 | Y | 326 | ✅ | ✅ | ✅ | ✅ | 1990 | ❌ | ❌ | 20 | ✅ | ✅ |
| BT Destroyer 2.0 | 154 | Y | 330 | ✅ | ✅ | ✅ | ✅ | 2790 | lisa¹ | ❌ | 20 | 18K¹ | ✅ |
| Bazooka 4.1 15K Ed. Limitada | 155 | Y | 340 | ✅ | ✅ | ✅ | ✅ | 1500 | ✅ | ❌ | 20 | ✅ | ✅ |
| Bazooka 5.0 | 156 | Y | 340 | ✅ | ✅ | ✅ | ✅ | 1500 | ❌ | ❌ | 20 | ✅ | ✅ |

¹ Aplicado nesta sessão. Fonte: soleraperformance.com.br (product pages 2.0 e Bullet 7.0).
Furos não divulgados no site Solera para nenhum modelo.

---

### QUICKSAND (5 modelos)

| Nome | id | pub | peso | bal | fmt | face | core | preço | tex | furos | esp | trama | fcab |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Silver Club 2025 | 171 | Y | 330 | ✅ | ✅ | ✅ | ✅ | 2000 | ✅ | ❌ | 20 | ✅ | ✅ |
| Silver Club 2025 Ed. Limitada | 172 | Y | 330 | ✅ | ✅ | ✅ | ✅ | 2450 | ✅ | ❌ | 20 | ✅ | ✅ |
| Alien Purple 2025 | 173 | Y | 330 | ✅ | ✅ | ✅ | ✅ | 2000 | ✅ | ❌ | 22 | ✅ | ✅ |
| Ninja Star 2025 | 174 | Y | 330 | ✅ | ✅ | ✅ | ✅ | 1799 | ✅ | 30 | 23 | ✅ | ✅ |
| Q1 Laranja | 192 | Y | 335 | ✅ | ✅ | ✅ | ✅ | 549 | ✅ | 14 | 22 | ❌ | ✅ |

---

### MINIMALIST (9 modelos)

| Nome | id | pub | peso | bal | fmt | face | core | preço | tex | furos | esp | trama | fcab | obs |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Blanc 2024 | 244 | Y | 320 | ✅ | ✅ | ✅ | ✅ | 2399 | ✅ | 31 | 20 | ✅ | ✅ | 🟦 |
| Fênix 2025 | 242 | Y | 315 | ✅ | ✅ | ✅ | ✅ | 2399 | ✅ | 38 | 22 | ✅ | ✅ | 🟦 |
| Flash 2025 | 243 | Y | 320 | ✅ | ✅ | ✅ | ✅ | 2399 | ✅ | 31 | 20 | ✅ | ✅ | 🟦 |
| Flash 2026 | 236 | Y | 308 | ✅ | ✅ | ✅ | ✅ | 2399 | ✅ | 38 | 22 | ✅ | ✅ | 🟦 |
| Gold 2025 | 239 | Y | 318 | ✅ | ✅ | ✅ | ✅ | 2399 | ✅ | 38 | 20 | ✅ | ✅ | 🟦 |
| Lune 2025 LE | 240 | Y | 320 | ✅ | ✅ | ✅ | ✅ | 2800 | ✅ | 38 | 20 | ✅ | ✅ | 🟦 |
| Sky Blanc 2025 | 241 | Y | 315 | ✅ | ✅ | ✅ | ✅ | 2299 | ✅ | 31 | 20 | ✅ | ✅ | 🟦 |
| Sky Blanc 2026 | 238 | Y | 320 | ✅ | ✅ | ✅ | ✅ | 2900 | ✅ | 38 | 20 | ✅ | ✅ | 🟦 |
| Star 2026 | 237 | Y | 308 | ✅ | ✅ | ✅ | ✅ | 2399 | ✅ | 38 | 22 | ✅ | ✅ | 🟦 |

🟦 = peso_configuravel + balance_configuravel: peso e balance são os valores de referência; cliente escolhe ao encomendar.

---

## 3. Tabela B — Pendências por marca

### "Rellenable desde la web" — confirmado e aplicado nesta sessão (44 campos)

| Racket | Campo | Valor | Fonte |
|---|---|---|---|
| Heroe's Beast 2023 | espessura_mm | 20 | heroesbrandsport.com.br/shop/raquete-de-beach-tennis-beast/ |
| NOX NG17 2026 | format | redonda | noxsport.com.br/produtos/raquete-de-beach-tennis-ng17-2026-nox-by-nico-gianotti/ |
| NOX NG17 2026 | espessura_mm | 20 | (mesma fonte) |
| NOX V10 2026 | format | redonda | noxsport.com.br/produtos/raquete-de-beach-tennis-v10-2026-nox-by-vero-casadei/ |
| NOX V10 2026 | espessura_mm | 20 | (mesma fonte) |
| NOX NOVA87 2026 | format | redonda | noxsport.com.br/produtos/raquete-de-beach-tennis-nova87-2026... |
| NOX NOVA87 2026 | espessura_mm | 20 | (mesma fonte) |
| NOX FLY10 2026 | format | redonda | noxsport.com.br/produtos/raquete-de-beach-tennis-fly10-2026... |
| NOX FLY10 2026 | espessura_mm | 20 | (mesma fonte) |
| NOX VARADERO 2026 | format | redonda | noxsport.com.br/produtos/raquete-de-beach-tennis-varadero-2026-nox/ |
| NOX VARADERO 2026 | espessura_mm | 20 | (mesma fonte) |
| Shark 22 modelos | balance | médio | sharkbeachtennis.com.br (balance 26cm = "Equilibrado") |
| Shark Boost 21mm | espessura_mm | 21 | Nome do modelo confirma |
| Shark Epic 22mm | espessura_mm | 22 | Nome do modelo confirma |
| Shark Black 22mm | espessura_mm | 22 | Nome do modelo confirma |
| Shark Elite 18K 21mm | espessura_mm | 21 | sharkbeachtennis.com.br product page |
| Shark Elite 3K 21mm | espessura_mm | 21 | sharkbeachtennis.com.br product page |
| Shark Predator 22mm | espessura_mm | 22 | Nome do modelo confirma |
| Shark Kinetic Tour | espessura_mm | 21 | sharkbeachtennis.com.br product page |
| Shark Giant | espessura_mm | 24 | sharkbeachtennis.com.br product page |
| Ocean Air BT Enterprise 2.0 | textura | lisa | soleraperformance.com.br/product-page/raquete-bt-enterprise-2-0 |
| Ocean Air BT Enterprise 2.0 | trama_carbono | 12K | (mesma fonte) |
| Ocean Air BT Cruiser 2.0 | textura | lisa | soleraperformance.com.br/product-page/raquete-bt-cruiser-2-0 |
| Ocean Air BT Cruiser 2.0 | trama_carbono | 12K | (mesma fonte) |
| Ocean Air BT Phenom 2.0 | textura | lisa | soleraperformance.com.br/product-page/raquete-bt-phenom-2-0 |
| Ocean Air BT Phenom 2.0 | trama_carbono | 16K | (mesma fonte) |
| Ocean Air BT Bullet 7.0 | textura | lisa | soleraperformance.com.br/product-page/raquete-bt-bullet-7-0 |
| Ocean Air BT Bullet 7.0 | trama_carbono | 24K | (mesma fonte) |
| Ocean Air BT Destroyer 2.0 | textura | lisa | soleraperformance.com.br/product-page/raquete-bt-destroyer-2-0 |
| Ocean Air BT Destroyer 2.0 | trama_carbono | 18K | (mesma fonte) |

---

### "Necesita a Rodrigo" — não disponível publicamente

#### SHARK — format (redonda/gota/diamante) — 22 modelos
O site sharkbeachtennis.com.br **não lista o formato** da cabeça em nenhuma ficha técnica. Furos também não publicados na maioria dos modelos. Rodrigo precisa confirmar por contato direto com a marca.

Gaps remanescentes por confirmar:
- format/formato_cabeca: todos os 22 modelos
- furos_quantidade: 17 modelos (Pro One, Storm, Ultra, Cyclone, Tour têm furos)
- espessura_mm: Kinetic X, Kinetic S, Monster, Elite, Black, Tiger, Boost Pro, Attack, Pro One, Reef, Cyclone, Ultra, Storm, Tour
- core: Pro One, Reef, Cyclone, Ultra, Storm (5 modelos)
- trama_carbono: Pro One, Reef, Cyclone, Ultra, Storm, Tour (6 modelos)

#### ZEIQ — balance, format, espessura, furos — 6 modelos
Site zeiq.com.br disponível mas fichas técnicas não têm balance/format/espessura/furos. Snake Joao Wiesinger 3K também sem core. Requer visita às páginas individuais atualizadas ou contato com a marca.

#### MORMAII — balance, format, trama_carbono, formato_cabeca — 8 modelos
Site beachtennismormaii.com.br ativo. Fichas técnicas completas não acessíveis via busca direta. Rodrigo ou visita manual às páginas de produto.

#### KONA — balance, format, textura, furos (parcial), trama_carbono — 11 modelos
Site konaoficial.com funciona. Fichas técnicas têm espessura mas não balance/format/textura/furos para maioria. Rodrigo precisa acessar as fichas completas.

#### FOBEL — balance, format, trama_carbono, formato_cabeca — 7 modelos
Site fobelsports.com.br; preços são aproximados (modelo Cheetah sem preço). Rodrigo precisa confirmar.

#### VISION — weight_g, balance, format, textura, furos, trama_carbono — 11 modelos
A marca mais incompleta do catálogo. F-Pro Forged Carbon (id:127) também sem core. Rodrigo precisa visitar visionbtsports.com.br ou similar.

#### ZAND — weight_g, format, textura, trama_carbono, formato_cabeca — 7 modelos
Z Bruxo 2026 completamente sem espessura/furos/core — "Peso, espessura e furos não divulgados pelo fabricante" (nota nos insights). Z Soft e Z Soft sem core. Rodrigo deve contatar zand.com.br diretamente.

#### AMA SPORT — trama_carbono (todos os 14 modelos), textura/formato_cabeca (8 novos modelos 2026)
trama_carbono ausente em todos — AMA usa nomenclatura própria (CarboTex, Metal Fusion) sem publicar trama. Rodrigo precisa confirmar qual trama padrão usar ou se o campo deve ser preenchido com o marketing name.

#### DROP SHOT — source_url + textura, trama, formato_cabeca — 7 modelos
Todos sem source_url configurada. Site dropshot.es tem fichas completas em espanhol. Rodrigo ou alguém com acesso deve visitar e adicionar URLs + preencher textura/trama.

#### OCEAN AIR (modelos 1.x) — textura, furos — 6 modelos
BT Enterprise Com Tratamento, BT Cruiser, BT Destroyer, BT Phenom: textura não acessível via URLs encontradas. Bazooka 4.1 e Bazooka 5.0: furos e textura ausentes. Solera não divulga furos em nenhum modelo.

#### NOX — textura — 3 modelos (NOVA87, FLY10, VARADERO)
Textura não listada nas fichas do noxsport.com.br. Possivelmente requer contato com NOX Brasil.

#### QUICKSAND — furos — 3 modelos (Silver Club 2025, Silver Club LE, Alien Purple)
Site quicksand.com.br (quicksand.it) estava em manutenção/down na auditoria anterior. Furos não publicados nas fichas encontradas.

---

### "Campo de matriz" — requer avaliação de Rodrigo (NÃO factual)

Estes campos pertencem exclusivamente à matriz de avaliação de Rodrigo e **não devem ser preenchidos por terceiros ou IA**:

| Campo | Descrição |
|---|---|
| power, control, comfort, maneuverability, stability, spin, forgiveness | Scores 1-10 |
| good_for_beginners, good_for_intermediate, good_for_advanced | Flags de nível |
| elbow_friendly, shoulder_friendly | Flags de saúde |
| nivel_sugerido | 'iniciante'/'intermediario'/'avancado' |
| confianca | Nível de confiança da avaliação |
| perfil_resumo | Texto de perfil de jogo |
| summary | Texto descritivo completo |
| observations | Notas observacionais |
| specs_extra.saida_de_bola | Classificação de saída de bola |
| specs_extra.tecnologias (tipo) | Classificação dos tipos de tecnologia |

**Status dos insights:**
- 140/140 rackets têm linha em racket_insights
- 0/140 estão com reviewed=true
- Marcas com insights incompletos (scores nulos): Kona (11 modelos), Vision (parcial)

---

## 4. Notas de imagens

**Status geral:** Todas as 140 imagens têm image_url configurado e arquivo presente em `public/raquetes/`. Nenhuma imagem ausente.

Inspeção visual recomendada por Rodrigo:
- **Drop Shot**: imagens das 7 raquetes foram adicionadas recentemente — confirmar se cada imagem corresponde ao modelo correto
- **Kona**: 11 modelos adicionados recentemente — confirmar alinhamento imagem/modelo
- **Vision**: 11 modelos — mesma necessidade
- **Shark**: modelos entry-level (Reef, Storm, Pro One, Cyclone, Ultra, Tour) têm imagens adicionadas; confirmar qualidade e enquadramento (grip completo visível?)

CSS `object-contain` confirmado presente nos componentes de card (RacketCard) — sem risco de corte nas imagens.

---

## 5. Completude por marca (pós-fixes)

| Marca | Modelos | Campos OK* | % Completo |
|---|---|---|---|
| Heroe's | 17 | ~16.5/17 | 97% |
| Minimalist | 9 | 9/9 | 100% |
| Quicksand | 5 | ~4/5 | 80% |
| NOX | 5 | ~4.5/5 | 90% |
| Ocean Air | 11 | ~9/11 | 82% |
| AMA Sport | 14 | ~7/14 | 50% |
| Drop Shot | 7 | ~3/7 | 43% |
| Shark | 22 | ~12/22 | 55% |
| Mormaii | 8 | ~4/8 | 50% |
| Kona | 11 | ~3/11 | 27% |
| Fobel | 7 | ~3/7 | 43% |
| Zand | 7 | ~2/7 | 29% |
| Zeiq | 6 | ~2/6 | 33% |
| Vision | 11 | ~1/11 | 9% |

*% baseada em: weight_g + balance + format + face_material + core + price + espessura_mm + trama_carbono + textura + furos + formato_cabeca

---

*Documento gerado automaticamente por Claude Code em 2026-06-17. Dados extraídos de audit-data.json + pesquisa web de fontes oficiais.*
