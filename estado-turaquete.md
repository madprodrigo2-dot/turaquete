# Estado Turaquete

> Documento de contexto del proyecto. Actualizar al final de cada sesión de trabajo.
> Última actualización: 2026-08-20 (reconstruido tras gap de handoff — ver metodología al final)

---

## Qué es

Turaquete (turaquete.com.br): recomendador AI conversacional de raquetas de beach tennis para el mercado brasileño. Gratuito. Monetizado con afiliados de Mercado Livre. El usuario conversa con un agente especialista (Tury) que arma su perfil y recomienda 2-3 raquetas explicando el porqué.

**Ya no es solo MVP: está en producción con tráfico real.** 825 conversaciones reales (no test) en los últimos 14 días, ~10% de click-through a la tienda sobre recomendaciones mostradas. Ver "MÉTRICA QUE IMPORTA" abajo.

## Stack

- Next.js 15 (App Router) + Vercel (frontend/hosting), 2 crons activos (ver abajo)
- Supabase (base de datos, RLS activado — ver nota crítica abajo)
- GitHub (repo)
- Claude API — `claude-haiku-4-5-20251001` con tool-use (el agente conversacional)
- Telegram (bot propio) para alertas operativas — reemplazó/complementa a GA4 para señales urgentes
- GeckoAPI — fuente de sincronización de precios (Mercado Livre)

## Cómo se trabaja

- **Rodrigo**: producto, QA, copy. Español neutro (NO voseo). El sitio y el agente son en PT-BR.
- **Claude (chat del proyecto)**: arquitecto/asesor. Da prompts completos en español.
- **Claude Code**: ejecuta TODO el código.
- Rodrigo itera compartiendo capturas.
- **Desde 2026-08-14 hay `CLAUDE.md`** en la raíz del repo con las convenciones operativas (versionado obligatorio en cada commit, manejo de secretos, y el flujo completo de alta de raquete nueva paso a paso). Ese archivo es el SOP; este (`estado-turaquete.md`) es la foto de estado/progreso. No se pisan.

## Regla de oro (no negociable)

**El código calcula los números y decide (notas, faixa de peso, ranking, precios, confianza); el modelo solo NARRA.** Cuando el modelo calcula o genera datos libres, alucina. Esto se extiende al TEXTO: las preguntas de UI/chips son texto FIJO, no generado por el modelo. El modelo aporta la calidez conversacional; el andamiaje (preguntas, perfil, chips, datos) lo controla el código.

## Estilo de prompts a Claude Code

Mostrar cambios/SQL/diseño antes de aplicar. Verificación con prueba real punta a punta. NO inventar datos faltantes (dejar null/a confirmar). Backup/dump antes de borrados o recálculos grandes. Paleta: aqua #0CC0BE, teal #0E3A40, fondo creme #F7F3EC (cambió desde mint en agosto), coral #FF5E3A (CTA), amarelo #FFC42E. SIN em-dashes en copy. Voz: cercana pero especialista, NO informal-descuidada (sin "Cara", "Mano", gírias), +seriedad en temas de lesão. Vocabulario correcto de beach tennis BR: "raquete" (nunca "pala", que es de pádel).

---

## CATÁLOGO (cambio grande desde junio)

**270 raquetas publicadas (297 cadastradas) en 20 marcas** — creció de 38/2 marcas en junio a esto. Precio real: R$325 a R$4.399.

| Marca | Publicadas | Total |
|---|---|---|
| Shark | 24 | 25 |
| Drop Shot | 22 | 25 |
| Heroe's | 21 | 22 |
| Vision | 18 | 18 |
| Zeiq | 16 | 16 |
| Head | 15 | 15 |
| AMA Sport | 14 | 16 |
| Turquoise | 14 | 14 |
| Nox | 14 | 16 |
| Kona | 13 | 13 |
| Quicksand | 13 | 15 |
| Ocean Air | 13 | 14 |
| Zand | 13 | 13 |
| Pichau | 12 | 20 |
| Mormaii | 12 | 13 |
| Fobel | 9 | 11 |
| Minimalist | 8 | 8 |
| Adidas | 7 | 11 |
| Total | 7 | 7 |
| Flow Beach Tennis | 5 | 5 |

**El "HUECO CRÍTICO" que bloqueaba el lanzamiento en junio (sin gama de entrada <R$900) está resuelto**: hoy hay 32 raquetas publicadas por debajo de R$900.

**Pendiente de curación (no bloquea, pero crece)**: 257 de 297 `racket_insights` siguen con `ai_drafted = true` (summary/perfil_resumo sin revisión humana). Solo 40 fueron revisados y aprobados. Ver `project_summaries_curation.md` en memoria — ese pendiente ya estaba anotado antes y no se resolvió, solo creció en volumen junto con el catálogo.

**Flujo de alta de raquete nueva**: totalmente formalizado en `CLAUDE.md` desde el 14/08 (extracción de specs desde ficha del fabricante, derivados automáticos como slug/nome_base/atleta, seed obligatorio de `racket_insights` en el mismo turno, imagen vía `/image-fix`). Antes de agosto esto se hacía ad-hoc sesión a sesión.

---

## SISTEMA DE PREÇOS — nuevo desde 2026-08-12 (no existía en el handoff de junio)

Subsistema completo agregado en ~10 días de trabajo intenso (v0.4.12 → v0.4.38, 12-14/08):

- Cron diario (`/api/cron/sync-precos`, Vercel Hobby, 9am) sincroniza precios reales desde Mercado Livre vía GeckoAPI.
- Auto-chunking encadeado con presupuesto de tiempo (230s/chunk) para evitar 504, fila de prioridad, `price_previous` para detectar variaciones.
- Flag `fora_de_linha` (raqueta descontinuada) — se excluye del sync y de alertas de "precio desactualizado"; toggle inline en el admin.
- `last_sync_status`/`last_sync_at` por raqueta, pestaña "Falharam" en el admin de Preços.
- Alertas Telegram post-sync (resumen diario) y en fallos, con protección contra spam (silencio si la fila está vacía).
- Admin: filtros por stale/nunca actualizada (chips), scroll horizontal en mobile (las tablas de admin en general recibieron ese fix el 20/08 — 10 tablas en 5 páginas).

**No estaba mencionado en ningún doc de contexto anterior** — es la ausencia más grande entre el handoff viejo y el estado real.

## ANALYTICS / INTENÇÃO — nuevo desde 2026-08-04/05

- Sistema de tags de intención (`intencao_tags`) calculado en código a partir del perfil confirmado + orçamento + señales de la conversa (ver `computeIntencaoTags` en `app/api/chat/route.ts`), con migración retroactiva de conversas viejas.
- Panel admin muestra tooltip explicando cada tag, e insight legible en vez de la clave raw.
- Tracking de `compartilhar_click` (botón compartilhar en página de detalle, agregado 03/08) con notificación Telegram en tiempo real.
- Auditoría completa de eventos que disparan justo antes de navegar afuera del sitio — se movieron a `sendBeacon` porque `fetch` normal se cortaba a mitad por la navegación (bug real encontrado y corregido 04/08).

## BUG CRÍTICO: conversations no se guardaban (RLS) — encontrado y resuelto 19-20/08

Esto es lo que motivó la sesión de hoy. Resumen para el registro:

- Se activó/endureció RLS en Supabase en algún momento (policy `server_insert` removida). El insert de `conversations` en `app/api/chat/route.ts` usaba el cliente anon (`getSupabase()`), que quedó bloqueado por RLS — sin ninguna policy de INSERT para `anon`, deniega por defecto.
- El chat seguía funcionando normal para los usuarios (el insert es fire-and-forget), pero **el historial dejó de grabarse silenciosamente**: 108→71→75→23 conversas/día (13-16/08) y **0 en 17 y 18/08**.
- Corregido el 19/08 (`44fdae6`, v0.4.55 en el mismo día también se aplicó el mismo fix al admin de raquetes que tenía el mismo patrón): cambio a `getSupabaseAdmin()` (service_role, bypasea RLS). Verificado contra la base real: 28 conversas el 19/08, 57 el 20/08 — recuperado.
- Hoy (20/08, `56779b1`, v0.4.85) se agregó alerta Telegram con cooldown de 30min si el insert vuelve a fallar, para que una futura falla similar no pase desapercibida por días. Se auditó el resto del proyecto: no hay otra instancia del mismo patrón (todo insert/update/upsert/delete restante ya usa service_role).

**Ese fix ya estaba aplicado desde el 19/08** — si alguien retoma este tema, no hace falta re-tocar el insert, solo confirmar que la alerta Telegram esté configurada (`TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` en env).

## HOME / LANDING — iteración continua durante todo agosto

Muchos commits chicos de diseño (no un rediseño único): paleta pasó de mint a creme (#F7F3EC), migración de íconos a Phosphor, ilustraciones nuevas en "Explorar por perfil", sección "Novidades 2026" (carousel de altas recientes), embed de un Reel ISEA como bloque de credibilidad científica, carrossel mobile en "Como funciona", hero mobile/desktop rehecho con fotos nuevas (`new_hero_mobile.jpg`/`new_hero_desktop.jpg` en `/public`, agregados 19-20/08). Bajo impacto individual, alto volumen — no hace falta detalle commit a commit acá, ver `git log` si hace falta el detalle de algún cambio puntual.

---

## MOTOR DE RECOMENDACIÓN

**⚠️ Discrepancia encontrada, no verificada en esta sesión**: la memoria del proyecto (sesión de 2026-06-18) dice "Nível V2". Existe un script `scripts/recalc-motor-v4.ts` desde el 2026-07-11 — sugiere que hay una v3/v4 de la fórmula que no quedó documentada en ningún doc de contexto. **Antes de tocar el motor, releer `lib/motor.ts` directamente en vez de confiar en esta sección** — lo de abajo es lo último documentado y puede estar desactualizado en detalles de fórmula (aunque el comportamiento general del Akinator probablemente sigue vigente, no se tocó en los commits de agosto revisados).

- Akinator: pregunta solo lo necesario hasta llegar al umbral de confianza. Preguntas: estilo (+32%), nível (+28%), lesão (+22%), força (+11%), jogo aéreo (+7%).
- **Umbral 80% con lesão obligatoria**: estilo+nível (60%) NO alcanza; necesita lesão (82%) antes de recomendar.
- Escala de nível: iniciante (E/D), intermediário (C/B), avançado (A/Pro). Es nivel MÍNIMO, nunca techo.
- Peso: rango con ventana mínima de 15g. Modulado por género (inferido) y lesão (teto 335g para cotovelo).
- Precio: filtro si el usuario da presupuesto; desempate (no filtro) si es abierto.
- Marca preferida: MIXTO, no filtra — boost +1.5 en scorer.
- Scorer pre-rankea por código; el modelo narra las finalistas (top 8, payload slim).

---

## PENDIENTES

**No bloqueante, pero real y creciendo:**
- 257 `racket_insights` con `ai_drafted = true` sin revisión humana (summary/perfil_resumo). Curación pendiente desde hace tiempo, ver `project_summaries_curation.md` en memoria.
- Verificar fórmula real del motor (¿v2, v3 o v4?) contra `lib/motor.ts` — la documentación de contexto quedó atrás de los scripts que existen.
- Confirmar que `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` están seteados en producción (Vercel env) para que la alerta nueva de `conversations` (agregada hoy) realmente dispare si hace falta.

**De la versión anterior de este doc, sin evidencia de que se haya resuelto (no encontrado en git log de agosto), a confirmar con Rodrigo:**
- "O que explica essas notas" — explicar notas ALTAS específicas de cada raqueta, no genéricas.
- Espessura: confirmar que el motor la usa en el cálculo.
- Normalizar altura/proporción de imágenes en cards.

## TAREA ACTUAL

**No hay una tarea única evidente en el código/git — esto quedó indefinido en el gap de handoff.** Los frentes abiertos más recientes por volumen de commits son: (1) sistema de precios (recién estabilizado, probablemente en modo mantenimiento), (2) curación de summaries AI (257 pendientes, nadie tocó ese número en meses), (3) pulido continuo de home/landing (bajo impacto, probablemente no urgente). Definir con Rodrigo cuál es la prioridad real antes de asumir.

## MÉTRICA QUE IMPORTA

**Ya no es 0%.** Últimos 14 días (tráfico real, `is_test = false`): 825 conversas, 931 recomendaciones mostradas, 94 clics a la tienda → **~10% CTR sobre recomendaciones mostradas**. El sitio está lanzado y con datos reales — el objetivo de junio ("lanzar a usuarios reales para ver esta métrica de verdad") se cumplió en algún punto entre junio y agosto sin que quedara registrado acá.

---

## Metodología de esta reconstrucción (2026-08-20)

Rodrigo detectó que su handoff propio (fechado ~20/08) no coincidía con el estado real del repo — sospecha de pérdida de contexto/historial. Se reconstruyó este documento cruzando tres fuentes, sin inventar nada no verificable:

1. `git log` completo desde 2026-08-01 (commits, fechas, mensajes) — este archivo (`estado-turaquete.md`) y la memoria de proyecto (`project_turaquete.md`, en `~/.claude/projects/.../memory/`) estaban **ambos** desactualizados desde mediados de junio, ~2 meses de gap. Ninguno de los dos es el handoff que tenía Rodrigo — ese parece haber existido fuera del repo y no se recuperó.
2. Consultas directas a Supabase (conteos de raquetas por marca, `racket_insights.ai_drafted`, conversas/clics reales de los últimos 14 días) para no basar números en lo que dicen los mensajes de commit (que pueden no reflejar el resultado final tras iteración).
3. `CLAUDE.md` (agregado 14/08) se revisó aparte — cumple rol de SOP/convenciones, no de estado de progreso, así que no reemplaza a este documento.
4. `vercel ls turaquete-ai` (CLI autenticado como `madprodrigo2-9590`) — confirma que producción está sincronizada con `main`: el deploy más reciente (`56779b1`, el fix de hoy) ya está Ready en producción, y el historial de deploys de las últimas ~24h coincide 1:1 con los commits del `git log` de este mismo período. No hay drift entre repo y producción.
