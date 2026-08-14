# Turaquete — Convenções do Projeto

## Segurança

Segredos vêm de `.env.local` (gitignoreado). NUNCA hardcodear nem imprimir valores.
Logar só existência (`true`/`false`), nunca conteúdo. Isso vale para CRON_SECRET,
GECKOAPI_KEY e ANTHROPIC_API_KEY sem exceção.

## Versionamento

Incrementar `package.json` versão (`0.4.X`) em todo commit que vai para produção.
O Vercel não tem git history completo — o número de versão é a única forma de
rastrear builds no dashboard.

## Workflow git

Após `git push`, não mencionar deploy. O Vercel auto-deploya a cada push no `main`.

---

## Fluxo de alta de raquete nova

### Input do usuário
- Link da ficha do fabricante (e specs adicionais se o link não bastar)
- Link ML com tag afiliado: `?matt_word=madariagarodrigo20221014140538&matt_tool=94105833`

### Extração de specs — REGRA CRÍTICA

Ler a página e extrair os campos abaixo. **Copiar só o que a ficha informa.**
Se um campo não está na ficha, deixar `null` — nunca preencher por dedução.
Princípio: *código calcula, modelo narra, modelo nunca gera dado*.

| Campo DB | Origem |
|----------|--------|
| `name` | nome completo da raquete |
| `brand_id` | lookup em `brands` pelo nome da marca |
| `model_year` | ano de lançamento original (não edição/colorway) |
| `face_material` | material da face (ex: "Carbon 24K", "Kevlar") |
| `core` | núcleo (ex: "EVA Soft", "PP Soft") |
| `weight_g` | peso em gramas |
| `balance` | balance (valores: cabo / médio/cabo / médio / médio/cabeça / cabeça) |
| `specs_extra.espessura_mm` | espessura do núcleo em mm |
| `specs_extra.furos` | número de furos |
| `specs_extra.superficie` | textura da face (ex: "áspera", "lisa") |
| `specs_extra.tecnologias` | array de `{nome: string, tipo: string}` — ver tipos em BlocoA |
| `specs_extra.atleta` | ver regra de extração de atleta abaixo |

**Nota sobre balance:** `balance = null` é seguro — o motor calcula normalmente.
O único efeito de balance é `power +1` para balanço de cabeça pesada. Se a ficha
indica explicitamente balanço de cabeça, informar para não perder esse ponto.

**Ficha incompleta:** extrair o que houver e avisar explicitamente os campos
ausentes antes de prosseguir. Exemplo: *"Não encontrei na ficha: balance, furos —
confirma null ou informa a mão?"*. Nunca cadastrar em silêncio com dados faltando.

### Derivados automáticos — nunca pedir ao usuário

**`slug`:** kebab-case do `name` (ex: `mormaii-vitoria-marchezini-iii`).

**`nome_base`:** `name` sem o ano e sem o atleta (ver regra de atleta abaixo).
Formatos de ano reconhecidos: `2025`, `2026`, `25/26`, `26/27`, `2025/26`, `2026/27`.
Se o ano tiver formato incomum que não case com esses padrões (ex: `25-26`, `'26`),
avisar: *"Ano em formato incomum no nome — revisa nome_base à mão antes de salvar."*
Nunca deixar um `nome_base` com resíduo de ano passar em silêncio.

**`atleta`:** verificar primeiro no próprio nome do produto — muitas raquetes BR são
assinadas e o atleta aparece no nome, não num campo separado da ficha:
- Após traço: `"Heroe's Aura 2026 - Danny Cirella"` → atleta = `"Danny Cirella"`
- Como parte do nome: `"Mormaii Vitória Marchezini III"`, `"NOX NG17 2026 - Nicolas Gianotti"`

Quando o atleta é extraído do nome, também removê-lo do `nome_base` (ex:
`nome_base = "Heroe's Aura"`, não `"Heroe's Aura - Danny Cirella"`).
Só usar um campo separado da ficha se o atleta não aparecer no nome.
Se não identificar atleta em nenhuma das duas fontes, deixar `null`.

**Scores do motor** (`power`, `control`, `comfort`, `maneuverability`, `stability`,
`spin`, `forgiveness`, `elbow_friendly`): calculados por `calcularMotor()` via seed.

### INSERT + seed — parte do mesmo turno, nunca separável

```sql
INSERT INTO rackets (
  name, slug, nome_base, brand_id, model_year,
  face_material, core, weight_g, balance,
  specs_extra, affiliate_url, source_url,
  publicada, is_active
) VALUES (...) RETURNING id;
```

Imediatamente após, rodar:

```bash
npx tsx scripts/seed-insights.ts <id>
```

**Raquete sem `racket_insights` é bug.** O seed deve rodar no mesmo turno do
INSERT, nunca depois.

### Preço

Não preencher `price` à mão. O cron busca o valor do `affiliate_url` (MLB) no
próximo ciclo. Se o usuário quiser um preço inicial, ele informa.

### Textos editoriais — rascunho AI automático

Após o seed, gerar e salvar em `racket_insights`:

**`summary`** (~120 palavras): PT-BR. Voz de especialista em beach tennis — warm
mas técnica, não é marketing puro. Foco no que cada spec significa para o jogo:
como a face afeta potência/controle, como o núcleo afeta conforto e timing, para
que perfil de jogador o conjunto faz sentido. Nunca travessão (—). Nunca "pala"
(isso é padel) — sempre "raquete". Honesto: mencionar limitações se existirem.

**`perfil_resumo`** (1–2 frases): posicionamento direto. Diz para quem é a raquete
e por que, sem jargão de marketing.

Salvar ambos com `ai_drafted = true`. **Nunca setar `publicada = true`** — o
usuário revisa e publica no admin.

### Imagem

Usar `/image-fix` para processar: fundo transparente, canvas 800×1020, WebP 90.
Salvar como `{slug}.webp` em `public/raquetes/`.
Atualizar `image_url = '/raquetes/{slug}.webp'` na tabela `rackets`.

### O que fica com o usuário — nunca automático

- Revisar specs extraídas em `/admin/rackets/{slug}` (BlocoA)
- Editar/aprovar textos rascunhados (BlocoC)
- `publicada = true`: sempre decisão do usuário

---

## Scripts de manutenção

| Comando | Quando usar |
|---------|-------------|
| `npx tsx scripts/seed-insights.ts <id>` | Alta de raquete nova — obrigatório no mesmo turno do INSERT |
| `npm run motor:recalc` | Recalcular scores de todas as raquetes publicadas após mudança de specs |
