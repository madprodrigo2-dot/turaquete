# Turaquete: clasificación de tecnologías propias
**Sistema para que las tecnologías de marca entren al producto sin romper el principio anti-marketing.**

## El principio

Una tecnología solo mueve nota si corresponde a un **componente físico verificable** (un inserto, una lámina, una goma, un refuerzo que se puede ver o tocar). Un nombre comercial sin componente identificable es **declarativa**: el agente puede mencionarla y explicarla, pero no puntúa. La nota la sigue dando la fórmula.

## Los 5 tipos

| Tipo | Qué hace | Dimensión que afecta | Cómo entra a la fórmula |
|---|---|---|---|
| ANTIVIBRACIÓN | Absorbe impacto/vibración antes de llegar al brazo | Conforto | Subnota antivibração (20% de conforto) |
| ESTRUCTURAL | Refuerza el frame, reduce torsión | Estabilidade | Subnota estructura rígida (25% de estabilidade) |
| SUPERFICIE | Tratamiento de la cara | Spin (70%) + durabilidad | Ya cubierto por la escala de textura (lisa/fino/médio/pro) |
| ERGONOMIA | Componente físico de agarre/sujeción en frame o empuñadura — verificable, no cosmético | Ninguna (no tenemos dimensión para ergonomía de agarre) | No puntúa. El agente puede citarlo como ventaja real en contextos de defensa/backhand |
| DECLARATIVA | Nombre comercial sin componente físico identificable, cosmética, o servicio | Ninguna | No puntúa. El agente puede explicarla con honestidad |

## Catálogo de tecnologías clasificadas

| Tecnología | Marca | Tipo | Componente físico | ¿Mueve nota? |
|---|---|---|---|---|
| NOENE | Heroe's | ANTIVIBRACIÓN | Lámina absorbente documentada | Sí (conforto) |
| Predator System | Heroe's | ANTIVIBRACIÓN | Sistema absorbente documentado | Sí (conforto) |
| Tubo de carbono / estructura declarada | Heroe's | ESTRUCTURAL | Refuerzo del frame | Sí (estabilidade) |
| ABS Gel | AMA | ANTIVIBRACIÓN | Gel interno de absorción | Sí (conforto) |
| Delta Rubber AMA Impact | AMA | ANTIVIBRACIÓN | Goma triangular en el coração (visible) | Sí (conforto) |
| Rubber AMA Impact | AMA | ANTIVIBRACIÓN | Goma en el coração (versión Medusa) | Sí (conforto) |
| Rubber Anti-Impact | AMA | ANTIVIBRACIÓN | Goma anti-impacto en el coração (Poison Bee 2026) — variante de la línea Rubber AMA Impact | Sí (conforto) |
| X Rubber AMA Impact | AMA | ANTIVIBRACIÓN | Variante X de la goma AMA Impact (Proteo 2026) | Sí (conforto) |
| Dampershield / AMA Frame Dampershield / Dampershield System / Sistema Dampershield | AMA | ESTRUCTURAL | Refuerzo en todo el frame (nombres de variante según modelo) | Sí (estabilidade) |
| Tratamento em quartzo (médio / slim) | AMA | SUPERFICIE | Capa abrasiva aplicada | Sí (spin, vía escala de textura) |
| Smarter/Easier Ball Absorption | AMA | DECLARATIVA | Sin componente identificable (frase de catálogo) | No |
| Thermal Color / UV Color Technology | AMA | DECLARATIVA | Cosmética (cambio de color) | No |
| Sistema Exclusivo de Autenticidade / Sistema de Autenticidade | AMA | DECLARATIVA | Número de serie anti-falsificación (útil, pero no juega) | No |
| AMA Side Grip | AMA | ERGONOMIA | Faixa de borracha na lateral da moldura — componente físico confirmado por foto (Kronos 6G, Proteo 2026, Poison Bee 2026) | Não (sem dimensão para agarre; agente pode citar em defesa/backhand) |
| Cushion grip híbrido com PET | AMA | DECLARATIVA | Ergonomía de empuñadura — sin confirmación de componente físico distinto | No |
| 3K + Titânio / Metal Fusion / Silk Silver | AMA | (no es tecnología) | Es el material de la cara: ya entra como FIBRA | Vía anclas de fibra |

## Ancla de apilamiento antivibración (validado)

Subnota antivibração por sistemas físicos verificables:

- 0 sistemas = 5
- 1 sistema = 8
- 2 o más sistemas = 9 (el apilamiento suma, pero con rendimiento decreciente)

Solo cuentan entradas de tipo `antivibracao`. Nombres declarativos no acumulan, aunque el fabricante los liste junto a los físicos.

## Convención de datos

En specs_extra de cada raqueta:
```
"tecnologias": [
  {"nome": "ABS Gel", "tipo": "antivibracao"},
  {"nome": "Smarter Ball Absorption", "tipo": "declarativa"}
]
```
El script de la fórmula lee solo los tipos `antivibracao` y `estrutural` para las subnotas. El tipo `ergonomia` se muestra en UI con estilo propio (no puntúa, pero el agente puede citarlo). La UI y el agente muestran todas, con honestidad de tipo.

## Lo que el agente debe saber decir

- "A Medusa traz o ABS Gel e o Rubber AMA Impact, sistemas físicos de absorção que já estão considerados na nota de conforto dela."
- "O Thermal Color é um efeito visual da pintura, bonito, mas não muda nada no jogo."
- "O AMA Side Grip (Kronos 6G, Proteo 2026, Poison Bee 2026) é uma faixa de borracha na lateral da moldura que melhora a pega e a firmeza nas defesas de revés/backhand. É uma vantagem real de agarre — não muda potência nem manuseio." (citar só em contextos de defesa, backhand ou pega, nunca como ganho de nota)
- Nunca: tratar un nombre declarativo o ergonómico como ganho de performance en las notas.

## Regla de incorporación futura

Cada marca nueva llega con sus nombres. El protocolo: (1) identificar el componente físico detrás de cada nombre, (2) clasificar en uno de los 5 tipos, (3) solo entonces tocar specs_extra, (4) Rodrigo valida la clasificación antes de cargar. El nombre comercial jamás se traduce directo a nota.
