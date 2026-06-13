# Turaquete: clasificación de tecnologías propias
**Sistema para que las tecnologías de marca entren al producto sin romper el principio anti-marketing. Pendiente de validación de Rodrigo.**

## El principio

Una tecnología solo mueve nota si corresponde a un **componente físico verificable** (un inserto, una lámina, una goma, un refuerzo que se puede ver o tocar). Un nombre comercial sin componente identificable es **declarativa**: el agente puede mencionarla y explicarla, pero no puntúa. La nota la sigue dando la fórmula.

## Los 4 tipos

| Tipo | Qué hace | Dimensión que afecta | Cómo entra a la fórmula |
|---|---|---|---|
| ANTIVIBRACIÓN | Absorbe impacto/vibración antes de llegar al brazo | Conforto | Subnota antivibração (20% de conforto) |
| ESTRUCTURAL | Refuerza el frame, reduce torsión | Estabilidade | Subnota estructura rígida (25% de estabilidade) |
| SUPERFICIE | Tratamiento de la cara | Spin (70%) + durabilidad | Ya cubierto por la escala de textura (lisa/fino/médio/pro) |
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
| Dampershield / AMA Frame Dampershield | AMA | ESTRUCTURAL | Refuerzo en todo el frame | Sí (estabilidade) |
| Tratamento em quartzo (médio / slim) | AMA | SUPERFICIE | Capa abrasiva aplicada | Sí (spin, vía escala de textura) |
| Smarter/Easier Ball Absorption | AMA | DECLARATIVA | Sin componente identificable (frase de catálogo) | No |
| Thermal Color / UV Color Technology | AMA | DECLARATIVA | Cosmética (cambio de color) | No |
| Sistema Exclusivo de Autenticidade | AMA | DECLARATIVA | Número de serie anti-falsificación (útil, pero no juega) | No |
| Cushion grip híbrido com PET | AMA | DECLARATIVA | Ergonomía de empuñadura menor | No |
| 3K + Titânio / Metal Fusion / Silk Silver | AMA | (no es tecnología) | Es el material de la cara: ya entra como FIBRA | Vía anclas de fibra |

## Ajuste de ancla propuesto (A VALIDAR por Rodrigo)

Hoy la subnota de antivibração es binaria: sin sistema = 5, con sistema = 8. Con AMA apilando sistemas (la Medusa trae ABS Gel + Rubber AMA Impact), propongo:

- 0 sistemas antivibración verificables = 5
- 1 sistema = 8 (sin cambio)
- 2 o más sistemas = 9 (el apilamiento suma, pero con rendimiento decreciente)

Impacto inmediato si se aprueba: casi nulo en las notas actuales (la Medusa queda igual en conforto 7 tras redondeo), pero deja el sistema listo para marcas futuras y evita que un fabricante "gane" inflando la lista de nombres: solo cuentan los verificables, y el segundo en adelante suma poco.

## Convención de datos

En specs_extra de cada raqueta:
```
"tecnologias": [
  {"nome": "ABS Gel", "tipo": "antivibracao"},
  {"nome": "Smarter Ball Absorption", "tipo": "declarativa"}
]
```
El script de la fórmula lee solo los tipos antivibracao y estrutural para las subnotas. La UI y el agente muestran todas, con honestidad de tipo.

## Lo que el agente debe saber decir

- "A Medusa traz o ABS Gel e o Rubber AMA Impact, sistemas físicos de absorção que já estão considerados na nota de conforto dela."
- "O Thermal Color é um efeito visual da pintura, bonito, mas não muda nada no jogo."
- Nunca: tratar un nombre declarativo como ventaja de desempeño.

## Regla de incorporación futura

Cada marca nueva llega con sus nombres. El protocolo: (1) identificar el componente físico detrás de cada nombre, (2) clasificar en uno de los 4 tipos, (3) solo entonces tocar specs_extra, (4) Rodrigo valida la clasificación antes de cargar. El nombre comercial jamás se traduce directo a nota.
