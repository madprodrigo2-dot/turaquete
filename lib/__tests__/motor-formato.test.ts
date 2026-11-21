import { describe, it, expect } from 'vitest'
import { bonusPerdaoFormato, calcularMotor, calcularMotorTrace, MOTOR_DIMS } from '../motor'

// +1 de perdão por formato: só some quando o formato está preenchido e NÃO é redondo/oval.
// Sem dado (null/vazio) mantém o +1 histórico, para não mexer em raquetes que nunca tiveram formato.

const BASE = {
  superficie: 'áspera',
  furos: 28,
  espessura_mm: 21,
  tecnologias: [],
  face_material: 'Carbono 3K',
  core: 'EVA Soft',
  weight_g: 330,
  balance: null,
}

describe('bonusPerdaoFormato', () => {
  it('sem dado mantém o +1 de sempre', () => {
    expect(bonusPerdaoFormato(null)).toBe(1)
    expect(bonusPerdaoFormato(undefined)).toBe(1)
    expect(bonusPerdaoFormato('')).toBe(1)
    expect(bonusPerdaoFormato('   ')).toBe(1)
  })

  it('redonda/redondo/oval (qualquer caixa) mantêm o +1, como o catálogo atual', () => {
    for (const f of ['redonda', 'Redonda', 'REDONDA', 'redondo', 'Oval Clássica']) {
      expect(bonusPerdaoFormato(f)).toBe(1)
    }
  })

  it('qualquer outro formato declarado (diamante, gota, ...) perde o +1', () => {
    for (const f of ['diamante', 'Diamante', 'DIAMANTE', 'gota', 'lágrima']) {
      expect(bonusPerdaoFormato(f)).toBe(0)
    }
  })
})

describe('calcularMotor: efeito do formato só no perdão', () => {
  const semFormato = calcularMotor({ ...BASE })

  it('formato nulo, vazio e redonda dão o mesmo resultado de antes (nenhuma raquete existente muda)', () => {
    for (const format of [null, undefined, '', 'redonda', 'redondo', 'Oval Clássica']) {
      expect(calcularMotor({ ...BASE, format })).toEqual(semFormato)
    }
  })

  it('diamante tira exatamente 1 ponto de perdão e não mexe em mais nenhuma dimensão', () => {
    const diamante = calcularMotor({ ...BASE, format: 'diamante' })
    expect(diamante.forgiveness).toBe(semFormato.forgiveness - 1)
    for (const d of MOTOR_DIMS.filter(x => x !== 'forgiveness')) {
      expect(diamante[d]).toBe(semFormato[d])
    }
    expect(diamante.saida_de_bola).toBe(semFormato.saida_de_bola)
    expect(diamante.sweet_spot).toBe(semFormato.sweet_spot)
  })

  it('o teto de perdão de faces 18K continua valendo (não vira 6 se o bruto passa de 8)', () => {
    // Fibra + EVA muito macio + 22 mm: bruto alto; com face 18K o teto é 7 com ou sem o +1
    const alto = { ...BASE, face_material: 'Carbono 18K', core: 'EVA Extra Soft', espessura_mm: 22 }
    const a = calcularMotor({ ...alto, format: 'redonda' }).forgiveness
    const b = calcularMotor({ ...alto, format: 'diamante' }).forgiveness
    expect(a).toBeLessThanOrEqual(7)
    expect(b).toBeLessThanOrEqual(a)
  })

  it('o mínimo de perdão continua em 1 (sem valor abaixo)', () => {
    const baixo = { ...BASE, face_material: 'Carbono 24K', core: 'EVA Hard', espessura_mm: 20 }
    expect(calcularMotor({ ...baixo, format: 'diamante' }).forgiveness).toBeGreaterThanOrEqual(1)
  })
})

describe('calcularMotorTrace: o desdobramento mostra o bônus de formato', () => {
  const linhaFormato = (format: string | null | undefined) =>
    calcularMotorTrace({ ...BASE, format }).forgiveness.find(l => l.label.startsWith('formato'))

  it('sem dado e redonda mostram +1', () => {
    expect(linhaFormato(null)?.value).toBe('+1')
    expect(linhaFormato('redonda')?.value).toBe('+1')
  })

  it('diamante mostra 0 e o resultado final bate com calcularMotor', () => {
    expect(linhaFormato('diamante')?.value).toBe('0')
    const trace = calcularMotorTrace({ ...BASE, format: 'diamante' })
    const final = trace.forgiveness.find(l => l.isFinal)?.value
    expect(final).toBe(calcularMotor({ ...BASE, format: 'diamante' }).forgiveness)
  })
})
