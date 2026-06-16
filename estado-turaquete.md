# Estado Turaquete

> Documento de contexto del proyecto. Actualizar al final de cada sesión de trabajo.
> Última actualización: junio 2026

---

## Qué es

Turaquete (turaquete.com.br): recomendador AI conversacional de raquetas de beach tennis para el mercado brasileño. Gratuito. Monetizado con afiliados de Mercado Livre. El usuario conversa con un agente especialista (Tury) que arma su perfil y recomienda 2-3 raquetas explicando el porqué.

## Stack

- Next.js + Vercel (frontend/hosting)
- Supabase (base de datos)
- GitHub (repo)
- Claude API (Haiku) con tool-use (el agente)
- GA4 (analítica)

## Cómo se trabaja

- **Rodrigo**: producto, QA, copy. Español neutro (NO voseo). El sitio y el agente son en PT-BR.
- **Claude (chat del proyecto)**: arquitecto/asesor. Da prompts completos en español.
- **Claude Code (VS Code)**: ejecuta TODO el código.
- Rodrigo itera compartiendo capturas.

## Regla de oro (no negociable)

**El código calcula los números y decide (notas, faixa de peso, ranking, precios, confianza); el modelo solo NARRA.** Cuando el modelo calcula o genera datos libres, alucina. Esto se extiende al TEXTO: las preguntas de UI/chips son texto FIJO, no generado por el modelo. El modelo aporta la calidez conversacional; el andamiaje (preguntas, perfil, chips, datos) lo controla el código.

## Estilo de prompts a Claude Code

Mostrar cambios/SQL/diseño antes de aplicar. Verificación con prueba real punta a punta. NO inventar datos faltantes (dejar null/a confirmar). Backup/dump antes de borrados o recálculos grandes. Paleta: aqua #0CC0BE, teal #0E3A40, fondo #EAF7F6, coral #FF5E3A (CTA), amarelo #FFC42E. SIN em-dashes en copy. Voz: cercana pero especialista, NO informal-descuidada (sin "Cara", "Mano", gírias), +seriedad en temas de lesão. Vocabulario correcto de beach tennis BR: "raquete" (nunca "pala", que es de pádel).

---

## CATÁLOGO

3 marcas cargadas: AMA Sport, Drop Shot, Heroe's. ~30 raquetas publicadas.

**HUECO CRÍTICO (tarea actual):** no hay gama de entrada para iniciantes. El catálogo arranca en ~R$900. Los iniciantes son el público más grande y nadie que empieza paga R$2.000+. FALTA sumar una línea de iniciante accesible (rango ~R$400-900). Hay una lista de marcas y montos definida en sesiones anteriores (recuperar de notas de Rodrigo). Esto es lo que falta para poder lanzar a usuarios reales (incluyendo iniciantes).

Drop Shot: 7 modelos reales verificados (se borraron 2 inexistentes: "Conqueror 13 Soft" y "Explorer Tech"). Método de carga: specs reales verificadas de fichas oficiales (ProTenista/ProPlay entran bien con web_fetch), imágenes rehospedadas en /public (NO hotlink), nunca inventar specs/atletas.

---

## MOTOR DE RECOMENDACIÓN (estado: afinado y funcionando)

- Akinator: pregunta solo lo necesario hasta llegar al umbral de confianza. Preguntas: estilo (+32%), nível (+28%), lesão (+22%), força (+11%), jogo aéreo (+7%).
- **Umbral 80% con lesão obligatoria**: estilo+nível (60%) NO alcanza; necesita lesão (82%) antes de recomendar. La lesão es obligatoria para todos (protege al usuario).
- Escala de nível con categorías: iniciante (E/D), intermediário (C/B), avançado (A/Pro).
- Peso: rango con ventana mínima de 15g (no más estrecho que la variación de fábrica ±10g). Modulado por género (inferido) y lesão (teto 335g para lesão de cotovelo; la masa amortigua, una raqueta muy liviana puede ser peor).
- Balance en cm en "Seu perfil ideal" (NO filtra raquetas, todas son médio; es guía de configuração): defensa/control 24.5-25.5, equilibrado 25.0-26.0, potência 25.5-26.5.
- Precio: si el usuario da presupuesto, filtra. Si es "tanto faz"/abierto, el precio es DESEMPATE (a igualdad de aptitud, sube la más barata), no filtro. Etiqueta "Melhor custo-benefício" en la de mejor relación precio/rendimiento (no siempre la más barata).
- Marca preferida: MIXTO (prioriza la marca del usuario pero avisa si hay algo mejor fuera), NO filtra. Se pregunta opcional al final con chip "tanto faz".
- Scorer pre-rankea por código; el modelo narra las finalistas (top 8, payload slim).

---

## ARREGLADO EN LA ÚLTIMA SESIÓN (junio 2026)

- **Feedback chip "Outro"**: tocar 👎 muestra chips predefinidos (Caras demais, Não bateu com meu estilo, Queria mais opções) + chip "Outro..." que abre textarea libre. Chips predefinidos registran en un toque. Admin Qualidade muestra conteo de motivos + lista de textos libres "Outro".
- **Bug presupuesto ignorado** (caso R$500 recomendaba caras): si el filtro da 0 resultados, avisa honestamente la opción más asequible real. No recomienda fuera de rango. `hasSearchResults` excluye `fora_do_orcamento=true`; `searchWasCalled` evita falsa detección de stall.
- **Contador de rondas descontrolado** (llegaba a 7/4, se saltaba lesão): reemplazado `conversationTurns` (total msgs usuario) por `profileQuestionsAsked` (cuenta cuántas preguntas Akinator con texto fijo aparecen en el historial). Exportado `AKINATOR_QUESTION_TEXTS` de confidence.ts.
- **Chips fantasma de nível al final**: `contextChips` ahora exige `!lastMsg?.recommendations`. Después de la recomendación, detectContextChips no corre sobre ese mensaje.
- **Desambiguación atleta con 2+ raquetes**: BUSCA POR ATLETA actualizado — si busca retorna 2+ modelos (distintos años O modelos distintos), lista con `sugerir_opcoes` y pregunta cuál es. Nunca aplica pista colateral (ej. marca mencionada) para resolver. Aplica también al identificar la raquete atual en flujo TROCA.
- **Rate limiting + debug panel**: 20/min + 150/día/IP + 25/conversa. Tope Tury-voiced. Banner de aviso en 20 msgs. `getLimitState()` para admin.
- **Brand preference**: factor mixto, `+1.5` boost en scorer. Pregunta opcional después del precio. `MarcaDecision` en debug. `marcaAskPendingRef` evita stall recovery espúrea.
- **Back button Android**: `history.pushState` al entrar al chat + listener `popstate` vuelve a landing. Logo usa `history.back()`.
- **Raquete not in catalog (TROCA)**: prompt corregido — foco en qué quiere mejorar, no specs técnicas de la raquete ajena. Nunca inferir specs.

## PENDIENTES

**Por confirmar:**
- TIMEOUT del chat: prompt enviado, FALTA confirmar que se verificó forzando la falla (backend caído), no solo revisando código. Era el único bloqueante técnico real para lanzar.

**No bloqueante (arreglar con usuarios reales usándolo):**
- "O que explica essas notas" debe explicar las notas ALTAS de cada raqueta (no genéricas), derivadas de los mismos factores del motor.
- Espessura: mostrar en análise completa + confirmar que el motor la usa en el cálculo.
- Normalizar altura/proporción de imágenes en cards (contenedor fijo + object-fit: contain + fondo parejo).
- Carrusel "raquetes dos atletas": navegación en desktop (flechas o grilla).
- Pulido hero/landing (ya lanzable, baja prioridad).

## TAREA ACTUAL (lo que destraba el lanzamiento)

Sumar gama de entrada para iniciantes (~R$400-900). Recuperar la lista de marcas/montos definida antes. Cargar modelos reales con specs verificadas (no inventar), imágenes rehospedadas. Recién con esto el lanzamiento silencioso (3-5 jugadores reales, distintos perfiles) tiene sentido para todos, no solo el premium.

## MÉTRICA QUE IMPORTA

Taxa de clique em loja (hoy 0%, solo tráfico de prueba). Es la métrica del negocio. El costo NO es problema. Lanzar a usuarios reales para ver esta métrica de verdad.
