import { describe, expect, it } from 'vitest'
import type { Categoria, Movimiento, Presupuesto } from './db'
import { estadoPresupuesto, filasPresupuesto, limiteVigente, totalesPresupuesto } from './presupuestos'
import { gastoPorCategoria, serieMensual, sumarMeses } from './reportes'

const cat = (id: string, nombre: string, orden: number, tipo: 'gasto' | 'ingreso' = 'gasto'): Categoria => ({ id, nombre, icono: 'tag', tipo, orden, archivada: false, creado_en: '', editado_en: '' })
const pres = (categoria_id: string, mes: string, limite: number, umbral = 80): Presupuesto => ({ id: `${categoria_id}${mes}`, categoria_id, mes, limite, umbral_alerta: umbral, creado_en: '', editado_en: '' })
const mov = (categoria_id: string, monto: number, fecha: string, tipo: 'gasto' | 'ingreso' = 'gasto'): Movimiento => ({ id: `${categoria_id}${monto}${fecha}`, tipo, monto, moneda: 'COP', categoria_id, fecha, descripcion: '', origen: 'manual', creado_en: '', editado_en: '' })

describe('estadoPresupuesto', () => {
  it('normal, alerta y excedido', () => {
    expect(estadoPresupuesto(100, 1000, 80)).toMatchObject({ nivel: 'normal', porcentaje: 10, restante: 900 })
    expect(estadoPresupuesto(800, 1000, 80)).toMatchObject({ nivel: 'alerta', porcentaje: 80 })
    expect(estadoPresupuesto(1000, 1000, 80)).toMatchObject({ nivel: 'alerta', porcentaje: 100, restante: 0 })
    expect(estadoPresupuesto(1300, 1000, 80)).toMatchObject({ nivel: 'excedido', porcentaje: 130, restante: -300 })
  })
})

describe('límite vigente', () => {
  it('rige el más reciente que empezó en ese mes o antes', () => {
    const p = [pres('a', '2026-08', 100), pres('a', '2026-10', 200), pres('b', '2026-09', 50)]
    expect(limiteVigente(p, 'a', '2026-07')).toBeUndefined()
    expect(limiteVigente(p, 'a', '2026-09')?.limite).toBe(100)
    expect(limiteVigente(p, 'a', '2026-12')?.limite).toBe(200)
    expect(limiteVigente(p, 'b', '2026-10')?.limite).toBe(50)
  })
})

describe('filasPresupuesto', () => {
  const cats = [cat('a', 'Comida', 0), cat('b', 'Transporte', 1), cat('c', 'Hogar', 2), cat('s', 'Salario', 3, 'ingreso')]
  const movs = [mov('a', 90, '2026-10-02'), mov('b', 10, '2026-10-03'), mov('a', 999, '2026-09-30'), mov('c', 5, '2026-10-04'), mov('s', 5000, '2026-10-01', 'ingreso')]
  const filas = filasPresupuesto(cats, [pres('a', '2026-10', 100), pres('b', '2026-10', 100)], movs, '2026-10')
  it('ordena primero las que tienen límite y más avanzadas; ignora ingresos', () => {
    expect(filas.map((f) => f.categoria.nombre)).toEqual(['Comida', 'Transporte', 'Hogar'])
    expect(filas[0].estado?.nivel).toBe('alerta')
    expect(filas[2].estado).toBeUndefined()
    expect(filas[2].gastado).toBe(5)
  })
  it('totales solo de las que tienen límite', () => {
    expect(totalesPresupuesto(filas)).toEqual({ limite: 200, gastado: 100, restante: 100, conLimite: 2 })
  })
})

describe('reportes', () => {
  it('suma meses cruzando el año', () => {
    expect(sumarMeses('2026-11', 2)).toBe('2027-01')
    expect(sumarMeses('2026-01', -1)).toBe('2025-12')
    expect(sumarMeses('2026-10', 0)).toBe('2026-10')
  })
  it('gasto por categoría: agrupa lo pequeño en Otras y los porcentajes suman 100', () => {
    const cats = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id, i) => cat(id, id.toUpperCase(), i))
    const movs = [mov('a', 500, '2026-10-01'), mov('b', 200, '2026-10-01'), mov('c', 100, '2026-10-01'), mov('d', 80, '2026-10-01'), mov('e', 60, '2026-10-01'), mov('f', 40, '2026-10-01'), mov('g', 20, '2026-10-01'), mov('a', 9999, '2026-09-01')]
    const r = gastoPorCategoria(movs, cats, '2026-10')
    expect(r.map((x) => x.nombre)).toEqual(['A', 'B', 'C', 'D', 'E', 'Otras'])
    expect(r[5].monto).toBe(60)
    expect(r.reduce((a, x) => a + x.porcentaje, 0)).toBe(100)
    expect(gastoPorCategoria([], cats, '2026-10')).toEqual([])
  })
  it('los porcentajes siguen sumando 100 con tercios', () => {
    const cats = [cat('a', 'A', 0), cat('b', 'B', 1), cat('c', 'C', 2)]
    const r = gastoPorCategoria([mov('a', 1, '2026-10-01'), mov('b', 1, '2026-10-01'), mov('c', 1, '2026-10-01')], cats, '2026-10')
    expect(r.reduce((a, x) => a + x.porcentaje, 0)).toBe(100)
  })
  it('serie mensual: 6 meses, del más viejo al actual', () => {
    const s = serieMensual([mov('a', 10, '2026-10-05'), mov('a', 30, '2026-05-05'), mov('a', 99, '2026-04-30'), mov('s', 7, '2026-10-01', 'ingreso')], '2026-10')
    expect(s.map((x) => x.mes)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'])
    expect(s[0].gastos).toBe(30)
    expect(s[5]).toMatchObject({ gastos: 10, ingresos: 7 })
  })
})
