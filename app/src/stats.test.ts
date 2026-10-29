import { describe, expect, it } from 'vitest'
import type { Movimiento } from './db'
import { gastoSemana, resumenMes } from './stats'

function mov(tipo: 'gasto' | 'ingreso', monto: number, fecha: string): Movimiento {
  return { id: `${tipo}${monto}${fecha}`, tipo, monto, moneda: 'COP', categoria_id: 'c', fecha, descripcion: '', origen: 'manual', creado_en: '', editado_en: '' }
}

describe('resumenMes', () => {
  it('separa gastos e ingresos del mes pedido', () => {
    const r = resumenMes([mov('gasto', 18000, '2026-10-05'), mov('ingreso', 1300000, '2026-10-01'), mov('gasto', 99999, '2026-09-30')], '2026-10')
    expect(r).toEqual({ gastado: 18000, ingresado: 1300000, balance: 1282000 })
  })
})

describe('gastoSemana', () => {
  // miércoles 28 de octubre de 2026; la semana va del lunes 26 al domingo 1 de nov.
  const hoy = '2026-10-28'
  it('reparte el gasto por día y no cuenta ingresos', () => {
    const g = gastoSemana([mov('gasto', 1000, '2026-10-26'), mov('gasto', 2000, '2026-10-28'), mov('ingreso', 5000, '2026-10-27'), mov('gasto', 7000, '2026-10-19')], hoy)
    expect(g.dias).toEqual([1000, 0, 2000, 0, 0, 0, 0])
    expect(g.total).toBe(3000)
  })
  it('compara solo el mismo tramo de la semana pasada (lunes a miércoles)', () => {
    const g = gastoSemana([mov('gasto', 1000, '2026-10-26'), mov('gasto', 2000, '2026-10-19'), mov('gasto', 2000, '2026-10-21'), mov('gasto', 9000, '2026-10-24')], hoy)
    expect(g.totalAnterior).toBe(4000)
    expect(g.variacion).toBe(-75)
  })
  it('sin gastos la semana pasada no inventa un porcentaje', () => {
    expect(gastoSemana([mov('gasto', 1000, '2026-10-26')], hoy).variacion).toBeNull()
  })
})
