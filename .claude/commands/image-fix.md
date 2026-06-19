# /image-fix — Processar imagem de raquete

Processa uma ou mais imagens de raquete para o padrão do Turaquete: fundo transparente, canvas 800×1020, WebP 90.

## Como usar

```
/image-fix <arquivo-ou-glob> [opções]
```

**Exemplos:**
- `/image-fix kona-traktor-orange-2025.webp` — processa com parâmetros padrão
- `/image-fix kona-traktor-orange-2025.webp --inner 500x700` — tamanho interno customizado
- `/image-fix zeiq-*.webp --inner 400x520` — batch por glob
- `/image-fix fobel-fox.webp --mode bg-removal` — força remoção de fundo BFS
- `/image-fix mormaii-vitoria.webp --mode enlarge` — força escala para cima

## Fluxo obrigatório

1. **Inspecionar** com sharp metadata + trim para entender o estado atual:
   ```js
   const m = await sharp(src).metadata()
   const t = await sharp(src).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true })
   // logar: dimensões, hasAlpha, conteúdo trimado
   ```

2. **Determinar modo** automaticamente se não especificado:
   - `hasAlpha:false` + conteúdo trimado >= 85% da altura → **zoom** (shrink, inner 480x680)
   - `hasAlpha:true` + conteúdo trimado <= 60% da área → **enlarge** (trim agressivo + inner 660x850)
   - Cor de fundo escura/colorida nos cantos → **bg-removal** (BFS + inner 620x800)
   - Padrão se nenhuma condição bater → trim + inner 580x760

3. **Processar** em `tmp/image-fix/<filename>` usando o pipeline:
   ```js
   // Trim → resize para inner box → extend para canvas 800x1020
   const { data, info } = await sharp(src)
     .trim({ threshold: trimThreshold })
     .resize(innerW, innerH, { fit: 'inside' })
     .ensureAlpha()
     .png()
     .toBuffer({ resolveWithObject: true })
   
   const padLeft = Math.floor((800 - info.width) / 2)
   const padRight = 800 - info.width - padLeft
   const padTop = Math.floor((1020 - info.height) / 2)
   const padBottom = 1020 - info.height - padTop
   
   await sharp(data)
     .extend({ left: padLeft, right: padRight, top: padTop, bottom: padBottom,
               background: { r: 255, g: 255, b: 255, alpha: 0 } })
     .webp({ quality: 90, alphaQuality: 90 })
     .toFile(dst)
   ```

   Para **bg-removal** (BFS de 4 cantos, tolerance 35):
   - Usar o pattern do `adidas-transparent-bg.mjs`: flood-fill dos 4 cantos → zerar alpha dos visitados → trim → resize → extend

4. **Verificar visualmente** com Read tool na imagem de saída (`tmp/image-fix/<filename>`).
   - Checar se o fundo removeu bem (sem artefatos no racket)
   - Checar se o tamanho está proporcional (racket ocupa 55-75% da altura)
   - Se parecer errado, ajustar parâmetros e reprocessar

5. **Confirmar antes de sobrescrever**: mostrar resultado ao usuário e perguntar se copia para `public/raquetes/`.

## Parâmetros

| Flag | Padrão | Descrição |
|------|--------|-----------|
| `--inner WxH` | automático | Dimensões máximas internas antes do padding |
| `--mode` | auto | `zoom`, `enlarge`, `bg-removal`, `trim-only` |
| `--trim` | 10 | Threshold do trim (10-80; maior = corta mais) |
| `--tolerance` | 35 | Tolerância do BFS para bg-removal |
| `--out` | tmp/image-fix/ | Pasta de saída |
| `--apply` | false | Copia direto para public/raquetes/ sem confirmar |

## Notas

- Imagens com fundo branco sólido (hasAlpha:false) ficam com alpha após `ensureAlpha()` — o canvas de extend fica transparente
- Para batch de uma marca, normalizar todas para o mesmo `--inner` garante consistência visual
- Se o BFS remover pixels do racket (fundo escuro similar ao racket), usar `--tolerance 20` para ser mais conservador
- Scripts one-shot ficam em `tmp/` (gitignored), não em `scripts/`
