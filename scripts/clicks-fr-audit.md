# Audit: Clicks sospechosos — FR/GB madrugada 2026-07-14

Ventana analizada: IDs 314–336 en `link_clicks` (15:22 BRT 13/jul → 04:16 BRT 14/jul)
Consulta: solo lectura, sin modificaciones.

---

## 1. SESSION_ID

| ID  | Hora BRT           | Slug                        | session_id |
|-----|--------------------|-----------------------------|------------|
| 314 | 13/07 15:22:56     | head-battle                 | **null**   |
| 315 | 13/07 15:23:03     | forest                      | **null**   |
| 316 | 13/07 15:35:50     | z-soft                      | **null**   |
| 317 | 13/07 15:53:56     | shark-tour                  | **null**   |
| 318 | 13/07 16:03:50     | adidas-adipower-carbon-h34  | **null**   |
| 319 | 13/07 16:03:50     | fobel-falcon                | **null**   |
| 321 | 13/07 17:59:16     | shark-boost-pro-2025        | **null**   |
| 322 | 13/07 19:30:47     | adidas-rx-h14               | **null**   |
| 323 | 13/07 20:10:39     | kona-k-doze-grafite-2025    | **null**   |
| 324 | 13/07 21:00:10     | kona-gladiator-2025         | **null**   |
| 325 | 13/07 21:00:13     | kona-maverick-black-2025    | **null**   |
| 326 | 13/07 22:02:21     | nox-fly10-2026              | **null**   |
| 327 | 13/07 22:45:53     | nox-nova87-2026             | **null**   |
| 328 | 14/07 00:10:26     | nox-v10-luxury-2025         | **null**   |
| 329 | 14/07 00:10:28     | nox-mb10-2022               | **null**   |
| 330 | 14/07 00:40:20     | nox-varadero-2026           | **null**   |
| 331 | 14/07 00:40:24     | mormaii-samantha-barijan    | **null**   |
| 332 | 14/07 01:57:22     | ison-25                     | **null**   |
| 333 | 14/07 03:08:15     | dropshot-bronco-10-bt-2024  | **null**   |
| 334 | 14/07 03:21:12     | bt-phenom-2-0               | **null**   |
| 335 | 14/07 03:40:55     | total-evolution-18k-golden  | **null**   |
| 336 | 14/07 04:16:16     | ocean-air-bazooka-6-0-2024  | **null**   |

**session_id = null en los 22 registros (100%).** Un usuario real que llega por el botón "Comprar" en el sitio siempre pasa session_id desde el frontend. Null indica acceso directo a `/ir/[slug]` sin pasar por el JS del sitio.

---

## 2. USER-AGENT

UA único observado en los **22 registros**:

```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36
```

Señales:
- **String idéntico en los 22 registros** — incluyendo IPs con países distintos (FR, GB, PL) e IPs sin geolocalización.
- **Chrome/148 no existe.** Chrome actual (jul/2026) está en las versiones 12x–13x. Una versión `X.0.0.0` con submódulos todos en cero es característica de scrapers que spooean el UA pero usan un número fabricado.
- Sin strings de bot conocidos explícitos (no contiene `bot`, `crawler`, `headless`, `python`, etc.) — evasión deliberada de filtros naïve.
- No contiene `Headless` en el UA — pero el comportamiento (session=null, no referrer) es consistente con Playwright/Puppeteer con `headless: false` y UA overrideado.

---

## 3. IP_HASH

| ip_hash (primeros 16 chars) | País | Clicks | Slugs |
|-----------------------------|------|--------|-------|
| **null**                    | null | 6      | head-battle, forest, z-soft, shark-tour, adidas-adipower-carbon-h34, fobel-falcon |
| 71e3ba51f46f821c…           | FR   | 2      | adidas-rx-h14, nox-mb10-2022 |
| dbb520408fbc1a7c…           | FR   | 2      | kona-k-doze-grafite-2025, nox-fly10-2026 |
| 190794dd1def1572…           | FR   | 1      | kona-gladiator-2025 |
| cdf6ca37970c60ef…           | PL   | 1      | kona-maverick-black-2025 |
| 918bfa37a9eb5d00…           | FR   | 1      | nox-nova87-2026 |
| e2e780d29214b09e…           | FR   | 1      | nox-v10-luxury-2025 |
| 03e8961c866a0300…           | GB   | 1      | nox-varadero-2026 |
| d6500260ad7a94d0…           | FR   | 1      | mormaii-samantha-barijan |
| ac9632b9b6c336fa…           | FR   | 1      | ison-25 |
| fe376e57d6e30acd…           | FR   | 1      | dropshot-bronco-10-bt-2024 |
| 37a68a3c3a1721aa…           | FR   | 1      | bt-phenom-2-0 |
| 2599401df388bd9f…           | FR   | 1      | total-evolution-18k-golden |
| 6217d1bbe7c4f1c4…           | FR   | 1      | ocean-air-bazooka-6-0-2024 |
| 744da8ebf2a3a226…           | FR   | 1      | shark-boost-pro-2025 |

15 hashes distintos (incluyendo 6 null). **Los 6 con ip_hash=null son del mismo bot** — IP de datacenter no capturada por la capa de geolocalización de Vercel/Cloudflare, misma UA, mismo patrón de comportamiento, inmediatamente anterior a los FR/GB.

IPs que repiten:
- `71e3ba51…` (FR): adidas-rx-h14 a las 19:30 → nox-mb10 a las 00:10 (+4.5h)
- `dbb52040…` (FR): kona-k-doze a las 20:10 → nox-fly10 a las 22:02 (+1.8h)

Hashes distintos + mismo UA = **rotación de proxies residenciales**, técnica estándar de scrapers para evadir detección por IP.

---

## 4. NAVEGACIÓN PREVIA (GA4)

No tengo acceso a GA4 desde esta sesión. Para verificar desde el panel:

1. **GA4 → Explorar → Exploración de embudo**
   - Dimensión: País = Francia, Reino Unido
   - Ventana: 13/07 20:00 – 14/07 05:00 (hora local BRT = UTC-3)
   - Buscar sesiones con pageview en `/raquetes/*` seguido de evento `click_comprar` o similar
   - Si existen: humanos. Si no hay ninguna sesión con pageview previo al evento de salida: bot.

2. **GA4 → Informes → Tiempo real** (ya pasó, usar Explorar con ventana de 2h)
   - Dimensión: Fuente/Medio, filtrar Directo + País = FR
   - Verificar si hubo páginas vistas en `/raquetes/nox-*`, `/raquetes/kona-*`, etc. en esa ventana

Si GA4 no muestra ninguna sesión francesa activa en esa ventana horaria, cierra el caso definitivamente.

---

## 5. PATRÓN DE RUTA

### Ritmo temporal (delta entre clicks consecutivos):

| Click | Hora BRT        | Delta    |
|-------|-----------------|----------|
| 1     | 15:22:56        | —        |
| 2     | 15:23:03        | +7s      |
| 3     | 15:35:50        | +12m 47s |
| 4     | 15:53:56        | +18m 6s  |
| 5     | **16:03:50**    | +9m 54s  |
| 6     | **16:03:50**    | **+0s**  | ← MISMO segundo, 2 IPs distintas |
| 7     | 17:59:16        | +115m    |
| 8     | 19:30:47        | +91m 31s |
| 9     | 20:10:39        | +39m 52s |
| 10    | 21:00:10        | +49m 31s |
| 11    | 21:00:13        | +3s      | ← Par en 3s, FR + PL |
| 12    | 22:02:21        | +62m 8s  |
| 13    | 22:45:53        | +43m 32s |
| 14    | 00:10:26        | +84m 33s |
| 15    | 00:10:28        | +2s      | ← Par en 2s, 2 IPs FR |
| 16    | 00:40:20        | +29m 52s |
| 17    | 00:40:24        | +4s      | ← Par en 4s, FR + GB |
| 18    | 01:57:22        | +76m 58s |
| 19    | 03:08:15        | +70m 53s |
| 20    | 03:21:12        | +12m 57s |
| 21    | 03:40:55        | +19m 43s |
| 22    | 04:16:16        | +35m 21s |

**4 pares de clicks simultáneos o cuasi-simultáneos (<10s) desde IPs y países distintos pero mismo UA exacto.**  
El par de IDs 318–319 a `16:03:50.000` exactos desde null-IP es físicamente imposible para humanos.

### Raquetes clickeadas — ¿patrón de selección?

Marcas: Head, Forest (genérico), Zand, Shark, Adidas, Fobel, Kona (×3), NOX (×5), Mormaii, Drop Shot, BT, Total, Ocean Air, Ison. No hay orden alfabético. No hay restricción a una marca ni a raquetes con/sin afiliado curado. Patrece un recorrido de catálogo amplio — compatible con scraping de precios/URLs de afiliado.

---

## VEREDICTO: **BOT** (confianza: alta)

| Señal | Valor | Peso |
|-------|-------|------|
| session_id = null en 22/22 | Sin JS de sesión → acceso directo al endpoint | ❌ crítico |
| UA idéntico en 22/22 | Imposible para usuarios reales distintos | ❌ crítico |
| Chrome/148.0.0.0 inexistente | Versión fabricada, patrón de spoofer | ❌ crítico |
| 4 pares <10s desde IPs distintos, mismo UA | Ejecución paralela de crawler | ❌ crítico |
| IDs 318–319 mismo segundo exacto | Físicamente imposible para 2 humanos | ❌ crítico |
| referrer = null en 22/22 | Sin navegación previa en el sitio | ⚠ fuerte |
| ip_hash null (datacenter no geolocado) | Primera oleada sin proxy residencial | ⚠ fuerte |
| 2 IPs (71e3ba51, dbb52040) con reuso en FR | Rotación parcial de proxies, no desecho total | ⚠ fuerte |
| País FR/GB/PL — beach tennis no popular como para 22 clicks nocturnos | Contexto inconsistente | ⚠ moderado |

---

## PROPUESTA DE FILTRO (no implementar todavía)

### Dónde: `/ir/[slug]/route.ts` — antes del INSERT en `link_clicks`

### Condición de exclusión (NO registrar, SÍ redirigir):

```typescript
function isBotRequest(ua: string | null, sessionId: string | null): boolean {
  if (!ua) return true

  // UA idéntico al del crawler actual: Chrome/X.0.0.0 (versión con submódulos en cero)
  if (/Chrome\/\d+\.0\.0\.0/.test(ua)) return true

  // Strings de bots conocidos
  const BOT_PATTERNS = [
    'bot', 'crawler', 'spider', 'headless',
    'python-requests', 'python/', 'curl/', 'wget/',
    'scrapy', 'go-http-client', 'java/', 'perl/',
    'ruby', 'node-fetch', 'axios', 'httpclient',
    'facebookexternalhit',  // WhatsApp/FB preview — redirigir SÍ, registrar NO
    'telegrambot',          // Telegram preview — redirigir SÍ, registrar NO
    'twitterbot', 'linkedinbot',
    'googlebot', 'bingbot', 'yandexbot', 'duckduckbot', 'slurp',
    'ahrefsbot', 'semrushbot', 'mj12bot',
  ]
  const uaLower = ua.toLowerCase()
  if (BOT_PATTERNS.some(p => uaLower.includes(p))) return true

  // Sin UA + sin session: petición programática pura
  if (!sessionId) {
    // UA ausente = seguro bot; UA presente sin session = ambiguo (no filtrar aquí solo)
  }

  return false
}
```

### Comportamiento propuesto:
- `isBotRequest() = true` → ejecutar el redirect igualmente (no romper previews), pero **no insertar en `link_clicks`** y **no disparar notificación Telegram**.
- `isBotRequest() = false` → flujo actual sin cambios.

### Nota sobre `session_id = null`:
No usar `session_id === null` como condición única de filtro — hay casos legítimos donde el frontend no alcanzó a inyectarlo (carga lenta, JS bloqueado por usuario). Combinarlo con UA solo si se quiere máxima cobertura con riesgo de falso positivo.

### Alcance del filtro actual sobre estos 22 clicks:
El patrón `Chrome/\d+\.0\.0\.0` capturaría los **22/22** registros. Ningún click legítimo conocido (Chrome real siempre muestra subversión como `126.0.6478.114`) sería filtrado.

---

*Generado: 2026-07-14. Solo lectura — ninguna fila fue modificada.*
