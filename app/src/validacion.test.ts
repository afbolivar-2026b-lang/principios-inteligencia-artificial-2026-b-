import { describe, expect, it } from 'vitest'
import { categoriaValida, movimientoValido } from './validacion'

const buena = { id: 'a', tipo: 'gasto', monto: 1000, moneda: 'COP', categoria_id: 'c', fecha: '2026-10-28', descripcion: 'x', origen: 'manual', creado_en: '2026-10-28T10:00:00.000Z', editado_en: '2026-10-28T10:00:00.000Z' }

describe('movimientoValido: lo que está dañado no debe tumbar la app', () => {
  it('acepta un movimiento normal, con o sin medio de pago', () => {
    expect(movimientoValido(buena)).toBe(true)
    expect(movimientoValido({ ...buena, medio_pago: 'nequi' })).toBe(true)
  })
  it.each([
    ['monto en texto', { monto: 'abc' }], ['monto negativo', { monto: -99 }], ['monto con decimales', { monto: 12.5 }], ['monto NaN', { monto: NaN }],
    ['fecha nula', { fecha: null }], ['fecha imposible', { fecha: '2026-13-45' }], ['fecha en otro formato', { fecha: '28/10/2026' }],
    ['tipo raro', { tipo: 'raro' }], ['sin categoría', { categoria_id: null }], ['descripción nula', { descripcion: null }],
    ['creado_en que no es fecha', { creado_en: 'ayer' }], ['id vacío', { id: '' }], ['medio de pago inventado', { medio_pago: 'bitcoin' }],
  ])('rechaza %s', (_n, cambio) => {
    expect(movimientoValido({ ...buena, ...cambio })).toBe(false)
  })
  it('rechaza lo que ni siquiera es un objeto', () => {
    for (const x of [null, undefined, 5, 'x', [], true]) expect(movimientoValido(x)).toBe(false)
  })
})

describe('categoriaValida', () => {
  const c = { id: 'c', nombre: 'Comida', icono: 'utensils', tipo: 'gasto', orden: 0, archivada: false, creado_en: '2026-10-28T10:00:00.000Z', editado_en: '2026-10-28T10:00:00.000Z' }
  it('acepta una categoría normal y rechaza las dañadas', () => {
    expect(categoriaValida(c)).toBe(true)
    for (const mal of [{ nombre: null }, { tipo: 'x' }, { orden: 'a' }, { id: 5 }, { archivada: 'no' }]) expect(categoriaValida({ ...c, ...mal })).toBe(false)
  })
})
