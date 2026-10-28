import { describe, expect, it } from 'vitest'
import { formatoCOP, formatoDigitos, leerMonto, soloDigitos } from './money'

describe('formatoCOP', () => {
  it('pone puntos de miles y no usa centavos', () => {
    expect(formatoCOP(0)).toBe('$0')
    expect(formatoCOP(900)).toBe('$900')
    expect(formatoCOP(1234)).toBe('$1.234')
    expect(formatoCOP(18000)).toBe('$18.000')
    expect(formatoCOP(1300000)).toBe('$1.300.000')
    expect(formatoCOP(-5400)).toBe('-$5.400')
  })
})

describe('leerMonto', () => {
  it.each([
    ['18 mil', 18000],
    ['18k', 18000],
    ['18K', 18000],
    ['18.000', 18000],
    ['$ 18.000', 18000],
    ['18000', 18000],
    ['1.300.000', 1300000],
    ['1,300,000', 1300000],
    ['2 millones', 2000000],
    ['1,5 millones', 1500000],
    ['1.5 millones', 1500000],
    ['18,5 mil', 18500],
    ['18000 pesos', 18000],
    ['2m', 2000000],
  ])('%s -> %i', (texto, esperado) => {
    expect(leerMonto(texto)).toBe(esperado)
  })

  it.each(['', '   ', '0', '0 mil', 'abc', '18 mil pesos de almuerzo', '1.2.3', '-5000'])('rechaza "%s"', (texto) => {
    expect(leerMonto(texto)).toBeNull()
  })
})

describe('escritura en el campo de monto', () => {
  it('formatea mientras se escribe', () => {
    expect(formatoDigitos('18')).toBe('18')
    expect(formatoDigitos('18000')).toBe('18.000')
    expect(formatoDigitos('18.0000')).toBe('180.000')
    expect(formatoDigitos('007')).toBe('7')
    expect(formatoDigitos('abc')).toBe('')
  })
  it('limita a 12 dígitos', () => {
    expect(soloDigitos('1234567890123456')).toBe(123456789012)
    expect(soloDigitos('$ 18.000')).toBe(18000)
    expect(soloDigitos('')).toBe(0)
  })
})
