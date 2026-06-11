# Turaquete — Matriz de pesos del sistema de evaluación

> Documento de metodología. Nivel 1 gobierna cómo se puntúan las raquetas (consistencia al
> expandir catálogo). Nivel 2 gobierna cómo el agente prioriza según el perfil del usuario.
> Los porcentajes son guías de juicio, no fórmula física — el evaluador (humano o IA) los usa
> como pauta y declara excepciones cuando un spec inusual lo amerite (ej. espesor 22mm de la CÉU).

## NIVEL 1 — Qué specs determinan cada dimensión (pesos de derivación)

### Potência
| Spec | Peso | Lógica |
|------|------|--------|
| Espessura (más mm = más potência) | 30% | El perfil grueso devuelve más energía |
| Rigidez de la fibra (12K/18K > 3K/Kevlar) | 30% | Material rígido = transferencia directa |
| EVA (dura > media > soft) | 20% | Núcleo firme = salida explosiva |
| Peso (más g = más masa en el golpe) | 10% | |
| Balance (head-heavy suma) | 5% | Todas las Heroe's son médio → neutro |
| Furos concentrados/conectados | 5% | |

### Controle
| Espessura fina (19-20mm) | 30% | Más toque y sensibilidad |
| Flexibilidad de fibra (3K/Kevlar > 12K) | 25% | |
| EVA macia (absorbe y dosifica) | 20% | |
| Balance (head-light suma) | 10% | |
| Densidad de furos alta | 10% | Respuesta más firme y predecible |
| Peso contenido | 5% | |

### Conforto
| EVA (soft/supersoft manda) | 40% | El factor nº1 de absorción |
| Fibra (Kevlar/3K absorben; 12K/18K castigan) | 25% | |
| Tecnologías antivibración (Predator, NOENE, etc.) | 20% | |
| Peso (más liviana = menos carga) | 10% | |
| Espessura (22mm amortigua extra) | 5% | |

### Manuseio / Agilidade
| Peso | 45% | El factor dominante |
| Balance | 25% | Head-light = reacción rápida (Heroe's: todo médio) |
| Furos (30+ = swing notablemente más leve) | 20% | |
| Estructura aerodinámica declarada | 10% | |

### Spin
| Textura/tratamiento de fábrica | 70% | Lisa = techo bajo de fábrica. NOTA: tratamiento post-venta (areado) puede sumarse a cualquiera |
| Padrão de furos | 15% | |
| Espessura fina (facilita efecto de muñeca) | 15% | |

### Estabilidade
| Peso (masa resiste torsión) | 30% | |
| Espessura | 25% | |
| Rigidez estructural (coração cerrado, tubo de carbono) | 25% | |
| Fibra rígida | 15% | |
| Balance | 5% | |

### Forgiveness (tolerância a erros)
| Formato de cabeça (redonda > diamante) | 30% | Sweet spot mayor y centrado |
| Flexibilidad de fibra | 25% | Perdona el golpe descentrado |
| EVA macia | 20% | |
| Padrão de furos (amplía sweet spot) | 15% | |
| Espessura generosa | 10% | |

## NIVEL 2 — Prioridades por perfil de usuario (pesos de recomendación)

El agente ordena candidatas priorizando dimensiones según el perfil detectado. Orden = importancia.

### Iniciante
1. Forgiveness (25%) · 2. Conforto (25%) · 3. Manuseio (20%) · 4. Controle (15%) · 5. Estabilidade (10%) · 6. Potência (5%) · Spin: ignorar
Regla dura: nunca recomendar a iniciante una raqueta con forgiveness ≤5 o conforto ≤5 sin advertirlo.

### Dor no braço (cualquier nivel) — SOBREPONE a los demás perfiles
1. Conforto (40%) · 2. Forgiveness (15%) · 3. Manuseio (15%) · 4. Estabilidade (15%) · 5. Controle (10%) · 6. Potência (5%)
Regla dura existente: ranking por comfort ≥8; nunca presentar comfort ≤6 como protectora.

### Atacante / busca potência (intermedio+)
1. Potência (30%) · 2. Estabilidade (20%) · 3. Manuseio (15%) · 4. Controle (15%) · 5. Conforto (10%) · 6. Forgiveness (5%) · Spin (5%)

### Defensor / busca controle
1. Controle (30%) · 2. Estabilidade (20%) · 3. Conforto (15%) · 4. Manuseio (15%) · 5. Forgiveness (10%) · 6. Potência (5%) · Spin (5%)

### Venho do tênis / esportes de raquete
1. Controle (25%) · 2. Manuseio (25%) · 3. Forgiveness (20%) · 4. Estabilidade (15%) · 5. Potência (10%) · 6. Conforto (5%, salvo dor)
Lógica: técnica de swing ya formada pero timing de pala nueva — controle y tolerancia ayudan la transición.

### Intermediário equilibrado (sin prioridad declarada)
Todas ~15% parejas, con leve favor a Controle y Estabilidade. Preguntar antes de asumir.

### Modificadores transversales
- Orçamento: filtro duro, nunca trade-off (no se "compensa" presupuesto con notas).
- Spin pedido explícitamente: ser honesto (línea lisa de fábrica) + mencionar tratamento post-venta. No castigar el ranking por spin.
- Frecuencia alta de juego (4+/semana): subir Conforto un escalón en cualquier perfil.

## Uso operativo
1. Al evaluar raquetas nuevas (Ama Sports, etc.): puntuar dimensión por dimensión siguiendo Nivel 1, citando los specs que justifican cada nota (alimenta el explicador del modal).
2. El system prompt del agente incorpora Nivel 2 como texto de prioridades (cualitativo — el LLM razona mejor con "priorize nesta ordem" que con porcentajes).
3. Futuro opcional: un scorer determinístico en código (buscar_raquetas devuelve candidatas ya rankeadas por perfil con estos pesos) — más consistencia, menos dependencia del juicio del LLM por llamada.
