import { describe, expect, it } from 'vitest'
import { coincide } from './busqueda'

describe('búsqueda por palabras', () => {
  const texto = 'Café ☕ ñandú 🎉 Comida'
  it('encuentra cada palabra sola, sin importar tildes ni mayúsculas', () => {
    for (const q of ['cafe', 'CAFÉ', 'nandu', 'ÑANDÚ', 'comida', '☕']) expect(coincide(texto, q)).toBe(true)
  })
  it('varias palabras: tienen que estar todas, en cualquier orden y aunque haya otras en medio', () => {
    expect(coincide(texto, 'cafe nandu')).toBe(true)
    expect(coincide(texto, 'nandu   cafe')).toBe(true)
    expect(coincide(texto, 'cafe pizza')).toBe(false)
  })
  it('una búsqueda vacía encuentra todo', () => {
    expect(coincide(texto, '')).toBe(true)
    expect(coincide(texto, '   ')).toBe(true)
  })
  it('no se rompe con símbolos de expresiones regulares', () => {
    expect(coincide('Gasto (urgente) $5.000 [x]', '(urgente)')).toBe(true)
    expect(coincide('abc', '.*')).toBe(false)
    expect(coincide('abc', '[')).toBe(false)
  })
})
