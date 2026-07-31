export const PRECO_BUCKETS = [
  { label: 'Até R$500',          min: 0,    max: 500   },
  { label: 'R$500 a R$1.200',    min: 501,  max: 1200  },
  { label: 'R$1.200 a R$2.000',  min: 1201, max: 2000  },
  { label: 'R$2.000 a R$3.000',  min: 2001, max: 3000  },
  { label: 'Mais de R$3.000',    min: 3001, max: null   },
] as const

export const PRECO_TANTO_FAZ = 'Tanto faz / me mostra opções'

// Generates the prompt mapping block from the bucket data.
// Import this in prompt.ts so the instruction text and the chip labels never diverge.
export function buildBudgetPromptLines(): string {
  const lines = PRECO_BUCKETS.map(b => {
    const instrucao = b.min === 0
      ? `presupuesto_max=${b.max}`
      : b.max === null
      ? `presupuesto_min=${b.min} (sem teto)`
      : `presupuesto_min=${b.min}, presupuesto_max=${b.max}`
    return `— "${b.label}" → ${instrucao}`
  })
  lines.push(`— "${PRECO_TANTO_FAZ}" → presupuesto_min=0 (sem filtro de preço)`)
  return lines.join('\n')
}
