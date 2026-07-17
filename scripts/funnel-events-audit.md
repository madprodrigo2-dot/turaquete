# Auditoría GA4 — Funnel Events (Read-only)
**Fecha:** 2026-07-17  
**Contexto:** GA4 muestra CERO eventos de funnel en los últimos 3 días con ~39 usuarios reales.  
**Scope:** Read-only. No se modificó ningún archivo de código.

---

## VEREDICTO ANTICIPADO (TL;DR)

**Hipótesis principal: `NEXT_PUBLIC_GA_ID` NO está configurado en las variables de entorno de Vercel.**

En Next.js, las variables con prefijo `NEXT_PUBLIC_` se "hornean" en el bundle en build-time. Si la variable no existe en el entorno de Vercel cuando se hace el deploy, la condición `{process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics />}` evalúa a falso, el componente nunca se renderiza, el script `gtag.js` nunca se carga, y TODOS los `sendGAEvent(...)` se pierden silenciosamente. Esto explica ceros en absolutamente todos los eventos — no solo en algunos.

---

## SECCIÓN 1 — INVENTARIO DE EVENTOS

### Eventos del funnel solicitado

| Evento | Archivo:Línea | Mecanismo | Trigger de usuario |
|--------|--------------|-----------|-------------------|
| `quiz_start` | `components/HomeClient.tsx:284` | `sendGAEvent` | Primera vez que el usuario envía un mensaje en el chat (no al hacer clic en "Começar") |
| `chat_iniciado` | `components/HomeClient.tsx:229` | `sendGAEvent` | Clic en cualquier botón "Começar agora" (hero, preview, CTA principal, bottom sticky) |
| `chat_iniciado` | `components/LandingScreen.tsx:689` | `sendGAEvent` | Clic en el botón sticky del header (dispara además el de HomeClient: doble disparo) |
| `conversa_reiniciada` | `components/HomeClient.tsx:223` | `sendGAEvent` | Confirmar "Nova conversa" en el chat |
| `intencao_detectada` | `components/HomeClient.tsx:367` | `sendGAEvent` | Cuando el backend detecta la intención del usuario en `evt.intencao` |
| `recomendacao_mostrada` | `components/HomeClient.tsx:375` | `sendGAEvent` | Primera vez que el agente devuelve recomendaciones |
| `ver_analise` | `components/RacketCard.tsx:73` | `window.gtag()` directo | Clic en "Ver o perfil completo no radar" — abre InsightsModal |
| `analise_aberta` | `components/RacketCard.tsx:68` | `sendGAEvent` | Mismo clic — se dispara ANTES que `ver_analise`, en la misma función |
| `clique_afiliado` | `components/RacketCard.tsx:171` | `sendGAEvent` | Clic en "Ver na loja →" cuando tiene URL de afiliado |
| `clique_afiliado` | `components/LandingScreen.tsx:275` | `sendGAEvent` | Clic en "Ver na loja" en FeaturedCard de la landing |
| `clique_afiliado` | `components/BuyButton.tsx:24` | `sendGAEvent` | Clic en BuyButton usado en páginas de raquetes |
| `clique_loja_oficial` | mismos tres archivos | `sendGAEvent` | Mismo trigger cuando NO es afiliado |
| `racket_atleta_aberta` | `components/LandingScreen.tsx:144` | `sendGAEvent` | Clic en una tarjeta de raquete de atleta |
| `marca_aberta` | `components/LandingScreen.tsx:214` | `sendGAEvent` | Clic en una marca disponible |
| `recomendacao_exibida` | `components/HomeClient.tsx:394` | `sendGAEvent` | Cualquier turno con recomendaciones (incluye segunda+ vez) |
| `comparacao_exibida` | `components/HomeClient.tsx:397` | `sendGAEvent` | Cuando el agente devuelve una comparación |
| `diagnostico_exibido` | `components/HomeClient.tsx:400` | `sendGAEvent` | Cuando el agente devuelve un diagnóstico de nivel |
| `click_comprar` | `app/ir/[slug]/page.tsx:113` | Measurement Protocol (server-side) | Redirect desde `/ir/[slug]` — **NUNCA SE ENVÍA** (ver Sección 5) |

### Eventos de QuizPerfilClient (ruta /perfil)

| Evento | Archivo:Línea | Mecanismo | Trigger |
|--------|--------------|-----------|---------|
| `quiz_start` | `components/QuizPerfilClient.tsx:732` | `window.gtag()` directo (función local `track()`) | Clic en "Começar" en la landing del quiz de perfil |
| `quiz_complete` | `components/QuizPerfilClient.tsx:748` | `window.gtag()` directo | Al responder la última pregunta del quiz |

### Eventos misceláneos (fuera del funnel)

| Evento | Archivo | Mecanismo |
|--------|---------|-----------|
| `site_search` | `components/SearchBar.tsx:19` | `window.gtag()` directo |
| `busca_sem_resultado` | `components/NaoAcheiWidget.tsx:20` | `window.gtag()` directo |
| `anatomia_aberta` | `components/InsightsModal.tsx:115` | `sendGAEvent` |
| `glossario_aberto` | `components/TermoGlossario.tsx:139` | `sendGAEvent` |

---

## SECCIÓN 2 — CADENA DE DISPARO: `quiz_start` y `chat_iniciado`

### `chat_iniciado`

```
Usuario hace clic en "Começar agora" (hero / preview / CTA principal / bottom sticky)
  → LandingScreen: onClick={onStart}
  → HomeClient.handleStart()  [línea 228]
  → sendGAEvent({ event: 'chat_iniciado' })  ← SIN guard de isGATestMode
  → setFading(true) → setView('chat')
```

```
Usuario hace clic en el botón sticky del HEADER (LandingScreen)
  → LandingScreen.handleHeaderCta()  [línea 688]
  → sendGAEvent({ event: 'chat_iniciado', origem: 'header_sticky' })  ← disparo #1
  → onStart()
  → HomeClient.handleStart()
  → sendGAEvent({ event: 'chat_iniciado' })  ← disparo #2 (doble fire)
```

**DOBLE DISPARO confirmado** para el sticky header CTA: `chat_iniciado` se envía dos veces.

**Condiciones que pueden bloquear:**
- GA script no cargado → `sendGAEvent` se pierde silenciosamente

### `quiz_start`

```
Usuario escribe/selecciona primer mensaje en el chat
  → HomeClient.sendMessage(text)  [línea 248]
  → baseMessages no tiene mensajes de rol 'user' → isFirstMessage = true
  → !isGATestMode() === true (cookie turaquete_test_mode=1 ausente)
  → sendGAEvent({ event: 'quiz_start' })  ← dentro de try/catch
```

**Condiciones que pueden bloquear:**
1. `isFirstMessage` es false (el usuario ya envió mensajes → sesión restaurada de sessionStorage)
2. `isGATestMode()` retorna true (cookie `turaquete_test_mode=1` está seteada)
3. GA script no cargado

**IMPORTANTE:** `quiz_start` NO se dispara al hacer clic en "Começar". Se dispara al enviar el PRIMER mensaje. Esto es correcto pero puede causar confusión en el análisis de GA4 (el funnel tiene `chat_iniciado` antes y `quiz_start` después).

### `recomendacao_mostrada`

```
Evento SSE 'done' con recs.length > 0 y firstRecShownRef.current === false
  → isGATestMode() comprobado
  → sendGAEvent({ event: 'recomendacao_mostrada', confianca: ..., rodadas: ... })
```

**Mismo doble guard que `quiz_start`**: `isGATestMode()` + GA script cargado.

---

## SECCIÓN 3 — REGRESIÓN RECIENTE

### Commits sobre archivos GA relevantes (desde 2026-07-07)

```
9822533  feat(catalog): nome_base + desambiguação de ano modelo  [2026-07-13]
         → Modifica LandingScreen.tsx, RacketCard.tsx — sin cambios de GA

73655f7  fix(ga4): renomear source->origem em LandingScreen chat_iniciado  [2026-07-09]
         → Cambio cosmético: source → origem en parámetro de event
         → No rompe nada, mejora atribución de sesión

31ab3bf  fix(ga4): renomear source->origem no evento ver_analise  [2026-07-09]
         → Mismo fix en RacketCard.tsx ver_analise
         → Valida prefijo GS1/GS2 en cookie _ga_STREAM_ID

afeaead  feat(ga4): adiciona quiz_start e recomendacao_mostrada  [2026-07-09]
         → quiz_start CREADO el 9 de julio — NO EXISTÍA antes
         → recomendacao_mostrada CREADO el 9 de julio — NO EXISTÍA antes
         → Ambos con guard isGATestMode()
```

**Análisis de regresión:**

- `quiz_start` y `recomendacao_mostrada` son nuevos (8 días de vida). Nunca han tenido datos históricos. No es una regresión — simplemente son eventos recientes.
- `chat_iniciado` y `ver_analise`/`analise_aberta` existían ANTES del 7 de julio. Si GA4 muestra cero para estos, el problema es estructural (script no carga), no una regresión de código.
- El commit `9822533` del 13 de julio no modificó ninguna lógica de analytics.

---

## SECCIÓN 4 — CARGA DEL SNIPPET GA

### Dónde está el proveedor de GA

**Archivo:** `app/layout.tsx` (líneas 5 y 68–70)

```tsx
import { GoogleAnalytics } from '@next/third-parties/google';

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <PresenceTracker ... />
        <VercelAnalytics />
      </body>
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </html>
  );
}
```

### Problemas identificados

#### PROBLEMA CRÍTICO #1: Colocación fuera de `<body>`

`<GoogleAnalytics>` está colocado DESPUÉS de `</body>` pero dentro de `</html>`. En Next.js App Router, React permite esto — el componente internamente usa `next/script` con `strategy="afterInteractive"`, que se inyecta vía el mecanismo de scripts de Next.js independientemente de su posición en el árbol JSX. Esto técnicamente funciona, pero es una posición no canónica y puede fallar en versiones futuras de Next.js.

**Veredicto:** SOSPECHOSO pero probablemente no es la causa raíz.

**Fix sugerido:** Mover `<GoogleAnalytics>` dentro de `<body>`, antes de `</body>`.

#### PROBLEMA CRÍTICO #2: `NEXT_PUBLIC_GA_ID` — variable de entorno de build-time

La variable `NEXT_PUBLIC_GA_ID=G-8Y308EBD1Z` está configurada en `.env.local` (local dev). **Las variables de `.env.local` NO se despliegan con el código a Vercel.** Deben configurarse explícitamente en el dashboard de Vercel → Project Settings → Environment Variables.

La condición `{process.env.NEXT_PUBLIC_GA_ID && (...)}` se evalúa en el Server Component en build-time. Si `NEXT_PUBLIC_GA_ID` no está configurada en Vercel, la condición es falsa, `<GoogleAnalytics>` nunca se renderiza, `gtag.js` nunca se carga, y TODOS los eventos se descartan silenciosamente.

**Esto explica CERO eventos en GA4 con 39 usuarios reales.**

**Verificación:** En el dashboard de Vercel → Settings → Environment Variables, verificar que `NEXT_PUBLIC_GA_ID=G-8Y308EBD1Z` exista para el entorno Production. Si no está → este es el bug.

**Fix:** Agregar la variable en Vercel y hacer un redeploy.

#### PROBLEMA #3: `PresenceTracker` usa variable sin prefijo NEXT_PUBLIC_

```tsx
<PresenceTracker
  url={process.env.SUPABASE_URL!}
  anonKey={process.env.SUPABASE_ANON_KEY!}
/>
```

`SUPABASE_URL` no tiene prefijo `NEXT_PUBLIC_`, por lo tanto no está disponible en el cliente. Esto no afecta GA directamente, pero significa que `PresenceTracker` podría estar fallando silenciosamente en producción.

#### CONSISTENCIA DE `NEXT_PUBLIC_GA_ID`

La variable se usa en dos lugares:
1. `app/layout.tsx:69` — condición y prop de `GoogleAnalytics` (SERVER)
2. `app/ir/[slug]/page.tsx:108` — `process.env.NEXT_PUBLIC_GA_ID` como `measurementId` en Measurement Protocol (SERVER)

Ambos usos son correctos — la variable es accesible tanto en cliente como en servidor. El problema es que debe existir en Vercel.

---

## SECCIÓN 5 — BONUS: ads_conversion_PURCHASE_1

### Búsqueda de Google Ads / GTM

Búsqueda en todo el codebase de `AW-`, `GTM-`, `google_conversion`, `ads_conversion`, `PURCHASE`, `gtag.*conversion`:

**RESULTADO: NINGÚN snippet de Google Ads encontrado en el codebase.**

No existe:
- Google Ads conversion tag
- Google Tag Manager container
- Pixel de conversión
- Evento de tipo `purchase` / `PURCHASE`
- Tag ID con prefijo `AW-`

El nombre `ads_conversion_PURCHASE_1` no existe en ningún archivo del proyecto.

### `click_comprar` vía Measurement Protocol (único evento server-side)

**Archivo:** `app/ir/[slug]/page.tsx`, función `sendGa4ClickEvent()` (líneas 99–138)

Este evento se dispara server-side cuando un usuario hace clic en "Ver na loja" y es redirigido. Usa la Measurement Protocol de GA4.

**PROBLEMA CRÍTICO: `GA4_API_SECRET` no existe en `.env.local` ni en el codebase.**

```ts
const apiSecret = process.env.GA4_API_SECRET  // línea 109
if (!measurementId || !apiSecret) return        // línea 110 — EARLY RETURN
```

Sin `GA4_API_SECRET`, la función hace early return antes de enviar nada. El evento `click_comprar` NUNCA llega a GA4 aunque la URL `/ir/[slug]` sea visitada y el redirect funcione correctamente.

**Fix sugerido:** Generar un API Secret en GA4 Admin → Data Streams → Measurement Protocol API Secrets, y configurarlo en Vercel como `GA4_API_SECRET=<valor>`.

---

## TABLA DE VEREDICTOS

| Evento | Estado | Causa |
|--------|--------|-------|
| `quiz_start` | SOSPECHOSO | (1) Nuevo desde 9-jul. (2) Guard `isGATestMode()`. (3) GA script no carga si var no está en Vercel |
| `chat_iniciado` | ROTO (causa: GA script no carga) | `sendGAEvent` silencioso si `NEXT_PUBLIC_GA_ID` ausente en Vercel |
| `conversa_reiniciada` | ROTO (misma causa) | Ídem |
| `recomendacao_mostrada` | SOSPECHOSO | Nuevo desde 9-jul + guard `isGATestMode()` + GA no carga |
| `ver_analise` | ROTO (doble causa) | (1) Usa `window.gtag()` directo → falla sin script. (2) En GA4 aparece como `analise_aberta` (sendGAEvent), no como `ver_analise` |
| `analise_aberta` | ROTO (GA no carga) | sendGAEvent silencioso |
| `clique_afiliado` | ROTO (GA no carga) | sendGAEvent silencioso |
| `click_comprar` | ROTO (falta API secret) | `GA4_API_SECRET` no configurado → early return en Measurement Protocol |
| `racket_atleta_aberta` | ROTO (GA no carga) | sendGAEvent silencioso |
| `marca_aberta` | ROTO (GA no carga) | sendGAEvent silencioso |

---

## HIPÓTESIS PRINCIPAL

**`NEXT_PUBLIC_GA_ID` no está configurado en las variables de entorno de Vercel (Production).**

- Está en `.env.local` pero eso es solo para desarrollo local
- Vercel no lee `.env.local` en el entorno de producción
- Al no estar en Vercel → `process.env.NEXT_PUBLIC_GA_ID` = `undefined` en build-time
- La condición `{process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics />}` = false
- `gtag.js` nunca se carga
- Todos los `sendGAEvent()` son no-ops (pushean a `window.dataLayer` que no existe o a una queue que nunca drena)
- Resultado: GA4 recibe cero eventos

### Verificación en 60 segundos

1. Abrir `https://www.turaquete.com.br` en Chrome DevTools → Network tab
2. Filtrar por `gtag/js` o `google-analytics`
3. Si NO aparece ninguna request → GA script no cargó → la variable falta en Vercel

O en la consola del navegador:
```js
typeof window.gtag  // Si devuelve "undefined" → script no cargó
```

### Fixes ordenados por prioridad

1. **[CRÍTICO]** Agregar `NEXT_PUBLIC_GA_ID=G-8Y308EBD1Z` en Vercel → Settings → Environment Variables → Production + Preview → Redeploy
2. **[CRÍTICO]** Generar `GA4_API_SECRET` en GA4 Admin y agregarlo en Vercel para habilitar Measurement Protocol en `/ir/[slug]`
3. **[MEDIO]** Mover `<GoogleAnalytics>` dentro de `<body>` en `app/layout.tsx` (posición canónica)
4. **[BAJO]** Corregir doble disparo de `chat_iniciado` cuando el usuario hace clic en el sticky header CTA (LandingScreen.handleHeaderCta llama sendGAEvent Y luego onStart→handleStart también lo llama)
5. **[BAJO]** Agregar prefijo `NEXT_PUBLIC_` a `SUPABASE_URL` y `SUPABASE_ANON_KEY` en PresenceTracker, o usar las variables server-only correctamente

### Issues de naming que confunden el análisis en GA4

- GA4 recibirá `analise_aberta` (vía sendGAEvent) Y `ver_analise` (vía window.gtag directo) para el mismo clic. Si el funnel busca `ver_analise`, puede no ver `analise_aberta` en el mismo report.
- El funnel esperado en GA4 debería buscar: `chat_iniciado` → `quiz_start` → `recomendacao_mostrada` → `analise_aberta` (no `ver_analise`)
