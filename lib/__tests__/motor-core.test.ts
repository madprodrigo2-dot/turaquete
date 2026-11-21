import { describe, it, expect } from 'vitest'
import { classifyCore } from '../motor'

describe('classifyCore: regras Oxy (Power / Extra Power)', () => {
  it('EVA Extra Power (8 a 10 Shore, baixa densidade) -> SUPERSOFT', () => {
    expect(classifyCore('EVA Extra Power')).toBe('SUPERSOFT')
    expect(classifyCore('eva extra power')).toBe('SUPERSOFT')
    expect(classifyCore('EVA EXTRA POWER')).toBe('SUPERSOFT')
  })

  it('EVA Power (12 a 14 Shore, média densidade) -> SOFT', () => {
    expect(classifyCore('EVA Power')).toBe('SOFT')
    expect(classifyCore('eva power')).toBe('SOFT')
  })

  it('Extra Power e Power caem em classes diferentes', () => {
    expect(classifyCore('EVA Extra Power')).not.toBe(classifyCore('EVA Power'))
  })

  it('não é um includes("power") genérico: sem a expressão exata a classe não muda', () => {
    expect(classifyCore('Powerful Foam')).toBe('MEDIUM')
    expect(classifyCore('EVA Pro')).toBe('MEDIUM')
    expect(classifyCore(null)).toBe('MEDIUM')
    expect(classifyCore('')).toBe('MEDIUM')
  })
})

// Regressão: todos os valores de núcleo que já existiam no catálogo (sem 'power') mantêm a classe que
// tinham antes da regra Oxy. Gerado a partir do catálogo em 2026-11-21 (74 valores distintos sem 'power').
const CATALOGO_ANTES: [string, string][] = [
  ["Black Pro EVA", "HARD"],
  ["Black Soft EVA", "SOFT"],
  ["Competition Soft EVA", "SOFT"],
  ["EVA 10", "SUPERSOFT"],
  ["EVA 13", "SUPERSOFT"],
  ["EVA 17", "MEDIUM"],
  ["EVA Active", "SOFT"],
  ["EVA Black", "MEDIUM"],
  ["EVA Black Extra Soft", "SUPERSOFT"],
  ["EVA Black HR-15 Supersoft", "SUPERSOFT"],
  ["EVA Black Soft", "SOFT"],
  ["EVA Black Supersoft", "SUPERSOFT"],
  ["EVA Blue Soft High Performance", "SOFT"],
  ["EVA Dynamic", "MEDIUM"],
  ["EVA Extra Soft", "SUPERSOFT"],
  ["EVA Extra Soft HR3", "SUPERSOFT"],
  ["EVA Extrasoft", "SUPERSOFT"],
  ["EVA Force", "MEDIUM"],
  ["EVA Hard", "HARD"],
  ["EVA Hard Black", "HARD"],
  ["EVA High Density", "HARD"],
  ["EVA High Memory", "MEDIUM"],
  ["EVA High Precision", "MEDIUM"],
  ["EVA High Precision + Anti Shock", "MEDIUM"],
  ["EVA Japonesa Soft", "SOFT"],
  ["EVA macio de competição", "MEDIUM"],
  ["EVA Max", "MEDIUM"],
  ["EVA MAX", "MEDIUM"],
  ["EVA Medium", "MEDIUM"],
  ["Eva Medium Black", "MEDIUM"],
  ["EVA Medium Black", "MEDIUM"],
  ["EVA Mid Soft", "SOFT"],
  ["EVA Premium", "MEDIUM"],
  ["EVA Pro", "MEDIUM"],
  ["EVA PRO", "MEDIUM"],
  ["EVA Pró", "MEDIUM"],
  ["EVA Pro + Super Foam de Alta Densidade", "HARD"],
  ["EVA PRO Alta Densidade", "HARD"],
  ["EVA Pro Black", "MEDIUM"],
  ["EVA Pro Super Foam", "MEDIUM"],
  ["EVA Sense", "MEDIUM"],
  ["EVA Soft", "SOFT"],
  ["EVA Soft + Super Foam", "SOFT"],
  ["EVA Soft + Super Foam de alta densidade", "HARD"],
  ["EVA Soft 13-15", "SOFT"],
  ["EVA Soft baixa densidade", "SOFT"],
  ["EVA Soft Black", "SOFT"],
  ["EVA Soft Black Flow Tech", "SOFT"],
  ["EVA Soft Black High Performance", "SOFT"],
  ["EVA Soft Branco", "SUPERSOFT"],
  ["EVA Soft Flow", "SOFT"],
  ["EVA Soft Grey", "SOFT"],
  ["EVA Soft Performance", "SOFT"],
  ["EVA Soft Plus", "SUPERSOFT"],
  ["EVA Soft Pro", "SOFT"],
  ["EVA Soft Pro Triple Layer", "SOFT"],
  ["EVA Soft Red", "SOFT"],
  ["EVA Soft Touch", "SOFT"],
  ["EVA Soft White", "SUPERSOFT"],
  ["EVA Special Extrasoft", "SUPERSOFT"],
  ["EVA Tech", "MEDIUM"],
  ["EVA White", "SUPERSOFT"],
  ["EVA15", "SOFT"],
  ["Extra Soft Black EVA", "SUPERSOFT"],
  ["Extra Soft EVA", "SUPERSOFT"],
  ["HR3 Black EVA Hard", "HARD"],
  ["HR3 Color EVA", "MEDIUM"],
  ["HR3 Hard Black EVA", "HARD"],
  ["HR3 Soft Black EVA", "SOFT"],
  ["HR3 Soft Core", "SOFT"],
  ["Medium Soft EVA", "SOFT"],
  ["Mid Soft EVA", "SOFT"],
  ["Super Soft EVA", "SOFT"],
  ["SXY MicroFoam", "MEDIUM"],
]

describe('classifyCore: regressão do catálogo existente', () => {
  it.each(CATALOGO_ANTES)('%s -> %s', (core, esperado) => {
    expect(classifyCore(core)).toBe(esperado)
  })
})
