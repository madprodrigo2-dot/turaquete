/**
 * Testes do guard contra alucinação de nome de raquete (lib/agent/agent.ts).
 *
 * Caso real que motivou o guard (conversa 1beb2bf8-f6d3-4508-b846-0883be9970b8,
 * 2026-09-26): o motor recomendou id=64 "Z Soft", mas o texto final do modelo
 * citou "**Heroe's Lava 2024**" — raquete inexistente no catálogo.
 */
import { describe, test, expect } from 'vitest'
import { validateNomeRaquete } from '../agent'
import type { RecommendedRacket, RacketWithInsights } from '../../recommend'

function recFor(name: string): RecommendedRacket {
  return {
    racket: { name } as unknown as RacketWithInsights,
    razao: 'Boa escolha para o seu perfil.',
  }
}

describe('validateNomeRaquete', () => {
  test('caso real: nome inventado de 1 raquete é substituído pelo nome real', () => {
    const text = "Dentro de até R$500, essa é a única que encaixa bem no seu perfil: a **Heroe's Lava 2024**. Ela é leve, confortável e perdoa bastante."
    const result = validateNomeRaquete(text, [recFor('Z Soft')])
    expect(result).toContain('**Z Soft**')
    expect(result).not.toContain("Heroe's Lava 2024")
  })

  test('caso real: 3 nomes inventados são substituídos posicionalmente pelos 3 reais', () => {
    const text = '**CÉU** — a que melhor encaixa. **Heroe\'s Proteo 2026** — boa opção também. **Rebel 25** — a terceira.'
    const result = validateNomeRaquete(text, [recFor('Z Soft'), recFor('Kinetic X'), recFor('Attack')])
    expect(result).toContain('**Z Soft**')
    expect(result).toContain('**Kinetic X**')
    expect(result).toContain('**Attack**')
    expect(result).not.toContain('CÉU')
    expect(result).not.toContain("Heroe's Proteo 2026")
    expect(result).not.toContain('Rebel 25')
  })

  test('nome real já correto → texto não é alterado', () => {
    const text = 'A **Z Soft** é leve, confortável e tem sweet spot generoso.'
    const result = validateNomeRaquete(text, [recFor('Z Soft')])
    expect(result).toBe(text)
  })

  test('nome de uma palavra só (ex.: "Beastars") também é detectado e corrigido', () => {
    const text = 'Encontrei só uma opção. A **Beastars** tem conforto e sweet spot generoso.'
    const result = validateNomeRaquete(text, [recFor('Z Soft')])
    expect(result).toContain('**Z Soft**')
    expect(result).not.toContain('Beastars')
  })

  test('template genérico sem nome nenhum → não mexe (comportamento são e esperado)', () => {
    const text = 'Aqui estão as melhores opções da Head para o seu perfil.'
    const result = validateNomeRaquete(text, [recFor('Head Flash 2.0')])
    expect(result).toBe(text)
  })

  test('descrição genérica sem nomear a raquete → não mexe (evitar nomear não é alucinação)', () => {
    const text = 'A raquete sugerida oferece o que você precisa: sweet spot generoso e conforto bom no punho.'
    const result = validateNomeRaquete(text, [recFor('Z Soft')])
    expect(result).toBe(text)
  })

  test('pergunta genérica em negrito (chip de continuação) → não mexe', () => {
    const text = 'Essas três combinam com o seu perfil.\n\n**Qual dessas combina mais com você?**'
    const result = validateNomeRaquete(text, [recFor('Forest'), recFor('Monster'), recFor('Shark Jaws Tour 2025')])
    expect(result).toBe(text)
  })

  test('labels descritivos numerados em negrito (sem nome) → não mexe', () => {
    const text = '1. **Melhor encaixe** — resposta direta.\n2. **Sweet spot generoso** — consistente.\n3. **Melhor custo-benefício** — sem comprometer.'
    const result = validateNomeRaquete(text, [recFor('Brave Rafa Miller 12k 2025'), recFor('K-Doze Red 2026'), recFor('Vision Magnum 2025')])
    expect(result).toBe(text)
  })

  test('sem recomendações → não mexe (nada para validar)', () => {
    const text = 'Vamos ajustar seu perfil, me conta mais sobre seu jogo.'
    const result = validateNomeRaquete(text, [])
    expect(result).toBe(text)
  })

  test('nome real presente sem negrito (menção solta no texto) → não mexe', () => {
    const text = 'A Z Soft é uma ótima escolha pro seu perfil, leve e confortável.'
    const result = validateNomeRaquete(text, [recFor('Z Soft')])
    expect(result).toBe(text)
  })
})
