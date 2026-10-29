import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { diasDesde, textoAvisoPresupuesto } from './avisos'
import { asegurarCategorias, fijarPresupuesto, guardarMovimiento, NovaDB } from './db'

describe('aviso de presupuesto al guardar', () => {
  it('avisa cuando se acerca o se pasa, y calla cuando va bien', async () => {
    const d = new NovaDB(`a-${crypto.randomUUID()}`)
    await asegurarCategorias(d)
    const comida = (await d.categorias.toArray()).find((c) => c.nombre === 'Comida')!
    const otra = (await d.categorias.toArray()).find((c) => c.nombre === 'Hogar')!
    const g = (monto: number, categoria_id = comida.id, fecha = '2026-10-10') => guardarMovimiento(d, { tipo: 'gasto', monto, categoria_id, fecha })
    expect(await textoAvisoPresupuesto(d, await g(5000))).toBeNull() // sin presupuesto
    await fijarPresupuesto(d, { categoria_id: comida.id, mes: '2026-10', limite: 100000, umbral_alerta: 80 })
    expect(await textoAvisoPresupuesto(d, await g(10000))).toBeNull() // 15 %
    expect(await textoAvisoPresupuesto(d, await g(70000))).toBe('Comida va en el 85 % de su presupuesto')
    expect(await textoAvisoPresupuesto(d, await g(27000))).toBe('Te pasaste en Comida por $12.000')
    expect(await textoAvisoPresupuesto(d, await g(1000, comida.id, '2026-09-30'))).toBeNull() // otro mes: ese mes no tiene límite
    expect(await textoAvisoPresupuesto(d, await g(999999, otra.id))).toBeNull() // otra categoría sin límite
  })
  it('cuenta los días desde el último respaldo', () => {
    const ahora = new Date('2026-10-28T12:00:00Z')
    expect(diasDesde(undefined, ahora)).toBeNull()
    expect(diasDesde('2026-10-28T08:00:00Z', ahora)).toBe(0)
    expect(diasDesde('2026-10-20T12:00:00Z', ahora)).toBe(8)
    expect(diasDesde('basura', ahora)).toBeNull()
  })
})
