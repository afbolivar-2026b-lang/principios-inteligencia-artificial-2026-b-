import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { asegurarCategorias, borrarMovimiento, ErrorDeDatos, guardarMovimiento, NovaDB } from './db'

let d: NovaDB
let comida: string
let salario: string

beforeEach(async () => {
  d = new NovaDB(`prueba-${crypto.randomUUID()}`)
  await asegurarCategorias(d)
  const cats = await d.categorias.toArray()
  comida = cats.find((c) => c.nombre === 'Comida')!.id
  salario = cats.find((c) => c.nombre === 'Salario')!.id
})

describe('categorías', () => {
  it('se crean una sola vez', async () => {
    const antes = await d.categorias.count()
    await asegurarCategorias(d)
    expect(await d.categorias.count()).toBe(antes)
    expect(antes).toBeGreaterThanOrEqual(10)
  })
})

describe('guardarMovimiento', () => {
  it('guarda un gasto y lo puede leer de nuevo', async () => {
    const m = await guardarMovimiento(d, { tipo: 'gasto', monto: 18000, categoria_id: comida, fecha: '2026-10-28', descripcion: '  Almuerzo  ', medio_pago: 'nequi' })
    const guardado = await d.movimientos.get(m.id)
    expect(guardado).toMatchObject({ monto: 18000, moneda: 'COP', descripcion: 'Almuerzo', medio_pago: 'nequi', origen: 'manual', fecha: '2026-10-28' })
  })
  it('rechaza montos que no son enteros mayores que 0', async () => {
    for (const monto of [0, -5, 12.5, NaN]) {
      await expect(guardarMovimiento(d, { tipo: 'gasto', monto, categoria_id: comida, fecha: '2026-10-28' })).rejects.toThrow(ErrorDeDatos)
    }
    expect(await d.movimientos.count()).toBe(0)
  })
  it('rechaza fechas imposibles y categorías de otro tipo', async () => {
    await expect(guardarMovimiento(d, { tipo: 'gasto', monto: 1000, categoria_id: comida, fecha: '2026-02-30' })).rejects.toThrow('fecha')
    await expect(guardarMovimiento(d, { tipo: 'gasto', monto: 1000, categoria_id: salario, fecha: '2026-10-28' })).rejects.toThrow('categoría')
    await expect(guardarMovimiento(d, { tipo: 'gasto', monto: 1000, categoria_id: 'no-existe', fecha: '2026-10-28' })).rejects.toThrow('categoría')
  })
  it('se puede deshacer', async () => {
    const m = await guardarMovimiento(d, { tipo: 'ingreso', monto: 1300000, categoria_id: salario, fecha: '2026-10-28' })
    await borrarMovimiento(d, m.id)
    expect(await d.movimientos.count()).toBe(0)
  })
})
