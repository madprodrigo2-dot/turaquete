/// <reference types="vitest/globals" />
import { calcularPerfil, calcularScores } from '../quiz-perfil'
import type { Resposta } from '../quiz-perfil'

// a=0, b=1, c=2
function ans(...opts: Array<'a' | 'b' | 'c'>): Resposta[] {
  return opts.map(o => (['a', 'b', 'c'].indexOf(o) as Resposta))
}

describe('calcularPerfil: fixtures verificados a mao', () => {
  test('[c,c,b,b,c,b,b] => muralha', () => {
    expect(calcularPerfil(ans('c','c','b','b','c','b','b'))).toBe('muralha')
  })

  test('[b,c,b,c,c,b,c] => contra-atacante', () => {
    expect(calcularPerfil(ans('b','c','b','c','c','b','c'))).toBe('contra-atacante')
  })

  test('[a,a,a,a,c,a,b] => canhao', () => {
    expect(calcularPerfil(ans('a','a','a','a','c','a','b'))).toBe('canhao')
  })

  test('[a,b,c,c,a,a,a] => dono-da-rede', () => {
    expect(calcularPerfil(ans('a','b','c','c','a','a','a'))).toBe('dono-da-rede')
  })

  test('[a,a,a,a,a,b,a] => finalizador', () => {
    expect(calcularPerfil(ans('a','a','a','a','a','b','a'))).toBe('finalizador')
  })

  test('[b,c,c,c,b,c,c] => camaleao', () => {
    expect(calcularPerfil(ans('b','c','c','c','b','c','c'))).toBe('camaleao')
  })
})

describe('calcularPerfil: desempate', () => {
  // [b,c,b,b,a,a,a] produz empate triplo em 5 pontos (contra-atacante=5, muralha=5,
  // dono-da-rede=5), todos com 2 respostas primarias. Tiebreaker 2 (ordem fixa):
  // contra-atacante > muralha > camaleao > dono-da-rede => contra-atacante vence.
  test('[b,c,b,b,a,a,a] => contra-atacante via tiebreaker de ordem', () => {
    const respostas = ans('b','c','b','b','a','a','a')
    const scores = calcularScores(respostas)
    expect(scores['contra-atacante']).toBe(5)
    expect(scores['muralha']).toBe(5)
    expect(scores['dono-da-rede']).toBe(5)
    expect(calcularPerfil(respostas)).toBe('contra-atacante')
  })
})

describe('calcularScores: parcial (radar ao vivo)', () => {
  test('apos 1 resposta a na Q1 acumula finalizador+2 e canhao+1', () => {
    const scores = calcularScores([0])
    expect(scores['finalizador']).toBe(2)
    expect(scores['canhao']).toBe(1)
    expect(scores['muralha']).toBe(0)
  })

  test('aceita array vazio sem erros', () => {
    const scores = calcularScores([])
    expect(Object.values(scores).every(v => v === 0)).toBe(true)
  })
})
