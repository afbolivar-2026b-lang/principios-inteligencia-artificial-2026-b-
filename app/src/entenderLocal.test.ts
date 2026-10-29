import { describe, expect, it } from 'vitest'
import { entenderLocal } from './entenderLocal'

const CATS = [
  ...['Comida', 'Mercado', 'Transporte', 'Hogar', 'Servicios', 'Salud', 'Ropa', 'Educación', 'Entretenimiento', 'Otros gastos'].map((nombre) => ({ nombre, tipo: 'gasto' as const })),
  ...['Salario', 'Otros ingresos'].map((nombre) => ({ nombre, tipo: 'ingreso' as const })),
  { nombre: 'Mascotas', tipo: 'gasto' as const },
]
const HOY = '2026-10-28'
const e = (t: string) => entenderLocal(t, CATS, HOY)

describe('entenderLocal: lo básico sin IA', () => {
  it('almuerzo 18 mil en nequi', () => {
    expect(e('almuerzo 18 mil en nequi')).toEqual({ tipo: 'gasto', monto: 18000, categoria: 'Comida', descripcion: 'Almuerzo', medio_pago: 'nequi', fecha: HOY, confianza: 'media', fuente: 'local' })
  })
  it.each([
    ['bus 3200', 3200, 'Transporte', 'Bus'],
    ['Uber $12.500 ayer', 12500, 'Transporte', 'Uber'],
    ['pagué el arriendo 900.000', 900000, 'Hogar', 'Arriendo'],
    ['mercado en el Éxito 142.500 con tarjeta', 142500, 'Mercado', 'Mercado en el Éxito'],
    ['gasté 25k en el plan de datos', 25000, 'Servicios', 'Plan de datos'],
    ['cine 35 lucas', 35000, 'Entretenimiento', 'Cine'],
    ['droguería 42000 efectivo', 42000, 'Salud', 'Droguería'],
  ])('%s -> $%i %s', (texto, monto, cat, desc) => {
    const r = e(texto)!
    expect(r.monto).toBe(monto)
    expect(r.categoria).toBe(cat)
    expect(r.descripcion).toBe(desc)
    expect(r.tipo).toBe('gasto')
  })
  it('ingresos: salario, quincena, me pagaron', () => {
    expect(e('me pagaron la quincena 1.300.000')).toMatchObject({ tipo: 'ingreso', monto: 1300000, categoria: 'Salario' })
    expect(e('salario 2 millones')).toMatchObject({ tipo: 'ingreso', monto: 2000000, categoria: 'Salario' })
    expect(e('me consignaron 50 mil')).toMatchObject({ tipo: 'ingreso', monto: 50000, categoria: null })
  })
  it('fechas: hoy, ayer y anteayer', () => {
    expect(e('taxi 8000 ayer')!.fecha).toBe('2026-10-27')
    expect(e('taxi 8000 anteayer')!.fecha).toBe('2026-10-26')
    expect(e('taxi 8000 hoy')!.fecha).toBe(HOY)
    expect(e('taxi 8000')!.fecha).toBe(HOY)
  })
  it('no confunde una fecha con plata', () => {
    expect(e('el 28 de octubre compré pan 5000')!.monto).toBe(5000)
    expect(e('compré pan 5000 el 28 de octubre')!.monto).toBe(5000)
  })
  it('categorías propias: si el nombre aparece en la frase', () => {
    expect(e('mascotas 45 mil')).toMatchObject({ categoria: 'Mascotas', monto: 45000 })
  })
  it('sin categoría clara: confianza baja y la deja para que el usuario elija', () => {
    expect(e('algo raro 7000')).toMatchObject({ categoria: null, confianza: 'baja', monto: 7000 })
  })
  it('la descripción nunca queda con restos sueltos', () => {
    expect(e('18 mil')).toMatchObject({ monto: 18000, descripcion: '' })
    expect(e('hoy gasté 18 mil en efectivo')!.descripcion).toBe('')
  })
  it('con "lucas" o "palos" la descripción no se desfasa', () => {
    expect(e('Almuerzo con Ana 18 lucas en Nequi')).toMatchObject({ monto: 18000, descripcion: 'Almuerzo con Ana', medio_pago: 'nequi', categoria: 'Comida' })
    expect(e('me pagaron 2 palos')).toMatchObject({ monto: 2000000, tipo: 'ingreso', descripcion: '' })
    expect(e('Droguería Ñandú 35 lucas')!.descripcion).toBe('Droguería Ñandú')
  })
  it('si no hay monto, no inventa nada', () => {
    for (const t of ['', '   ', 'almuerzo con Ana', 'hoy fue un buen día', 'el 28 de octubre', '0', '0 mil']) expect(e(t)).toBeNull()
  })
  it('no se confunde con mayúsculas ni tildes', () => {
    expect(e('ALMUERZO 18 MIL EN NEQUI')).toMatchObject({ categoria: 'Comida', monto: 18000, medio_pago: 'nequi' })
    expect(e('Educación: matrícula 1.500.000')).toMatchObject({ categoria: 'Educación', monto: 1500000 })
  })
})
