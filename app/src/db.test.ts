import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  actualizarMovimiento, archivarCategoria, asegurarCategorias, borrarMovimiento, ErrorDeDatos, fijarPresupuesto, guardarAjustes, guardarCategoria,
  guardarMovimiento, leerAjustes, NovaDB, quitarPresupuesto, restaurarMovimiento,
} from './db'

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

describe('editar y restaurar', () => {
  it('cambia lo pedido, valida igual que al crear y actualiza la hora de edición', async () => {
    const m = await guardarMovimiento(d, { tipo: 'gasto', monto: 18000, categoria_id: comida, fecha: '2026-10-28', descripcion: 'Almuerzo', medio_pago: 'nequi' })
    const nuevo = await actualizarMovimiento(d, m.id, { monto: 20000, descripcion: ' Almuerzo con Ana ', medio_pago: null })
    expect(nuevo).toMatchObject({ monto: 20000, descripcion: 'Almuerzo con Ana', id: m.id, creado_en: m.creado_en })
    expect(nuevo.medio_pago).toBeUndefined()
    expect((await d.movimientos.get(m.id))?.medio_pago).toBeUndefined()
    await expect(actualizarMovimiento(d, m.id, { monto: 0 })).rejects.toThrow(ErrorDeDatos)
    await expect(actualizarMovimiento(d, m.id, { categoria_id: salario })).rejects.toThrow('categoría')
    await expect(actualizarMovimiento(d, 'no-existe', { monto: 5 })).rejects.toThrow('ya no existe')
    expect((await d.movimientos.get(m.id))?.monto).toBe(20000) // los intentos fallidos no cambiaron nada
  })
  it('restaurar deja el movimiento tal cual estaba', async () => {
    const m = await guardarMovimiento(d, { tipo: 'gasto', monto: 18000, categoria_id: comida, fecha: '2026-10-28' })
    await borrarMovimiento(d, m.id)
    await restaurarMovimiento(d, m)
    expect(await d.movimientos.get(m.id)).toEqual(m)
  })
})

describe('categorías', () => {
  it('crea, renombra y no deja repetir nombres (sin importar tildes ni mayúsculas)', async () => {
    const c = await guardarCategoria(d, { nombre: ' Mascotas ', icono: 'paw', tipo: 'gasto' })
    expect(c).toMatchObject({ nombre: 'Mascotas', icono: 'paw', archivada: false })
    await expect(guardarCategoria(d, { nombre: 'MASCOTAS', icono: 'tag', tipo: 'gasto' })).rejects.toThrow('con ese nombre')
    await expect(guardarCategoria(d, { nombre: 'educacion', icono: 'tag', tipo: 'gasto' })).rejects.toThrow('con ese nombre')
    expect((await guardarCategoria(d, { nombre: 'Mascotas', icono: 'paw', tipo: 'ingreso' })).tipo).toBe('ingreso') // otro tipo sí se puede
    const r = await guardarCategoria(d, { id: c.id, nombre: 'Perro', icono: 'paw', tipo: 'gasto' })
    expect(r.nombre).toBe('Perro')
    await expect(guardarCategoria(d, { nombre: '', icono: 'tag', tipo: 'gasto' })).rejects.toThrow('entre 1 y 30')
    await expect(guardarCategoria(d, { nombre: 'x'.repeat(31), icono: 'tag', tipo: 'gasto' })).rejects.toThrow('entre 1 y 30')
    await expect(guardarCategoria(d, { nombre: 'Algo', icono: 'icono-raro', tipo: 'gasto' })).rejects.toThrow('ícono')
  })
  it('archivar conserva el historial y no deja sin categorías a un tipo', async () => {
    const m = await guardarMovimiento(d, { tipo: 'gasto', monto: 1000, categoria_id: comida, fecha: '2026-10-28' })
    await archivarCategoria(d, comida, true)
    expect((await d.movimientos.get(m.id))?.categoria_id).toBe(comida)
    await guardarCategoria(d, { nombre: 'Comida', icono: 'utensils', tipo: 'gasto' }) // el nombre quedó libre
    await expect(archivarCategoria(d, comida, false)).rejects.toThrow('otra categoría activa')
    const ingresos = (await d.categorias.toArray()).filter((c) => c.tipo === 'ingreso')
    await archivarCategoria(d, ingresos[0].id, true)
    await expect(archivarCategoria(d, ingresos[1].id, true)).rejects.toThrow('al menos una')
  })
})

describe('presupuestos', () => {
  it('fija, cambia y quita', async () => {
    const p1 = await fijarPresupuesto(d, { categoria_id: comida, mes: '2026-10', limite: 400000, umbral_alerta: 80 })
    const p2 = await fijarPresupuesto(d, { categoria_id: comida, mes: '2026-10', limite: 500000, umbral_alerta: 90 })
    expect(p2.id).toBe(p1.id)
    expect(await d.presupuestos.count()).toBe(1)
    await fijarPresupuesto(d, { categoria_id: comida, mes: '2026-11', limite: 450000, umbral_alerta: 90 })
    expect(await d.presupuestos.count()).toBe(2)
    await quitarPresupuesto(d, comida)
    expect(await d.presupuestos.count()).toBe(0)
  })
  it('valida', async () => {
    const base = { categoria_id: comida, mes: '2026-10', limite: 1000, umbral_alerta: 80 }
    await expect(fijarPresupuesto(d, { ...base, limite: 0 })).rejects.toThrow('mayor a 0')
    await expect(fijarPresupuesto(d, { ...base, limite: 10.5 })).rejects.toThrow('mayor a 0')
    await expect(fijarPresupuesto(d, { ...base, umbral_alerta: 0 })).rejects.toThrow('entre 1 y 100')
    await expect(fijarPresupuesto(d, { ...base, mes: '2026-13' })).rejects.toThrow('mes')
    await expect(fijarPresupuesto(d, { ...base, categoria_id: salario })).rejects.toThrow('gasto')
  })
})

describe('ajustes', () => {
  it('empieza en automático y recuerda lo que se cambia', async () => {
    expect((await leerAjustes(d)).tema).toBe('sistema')
    await guardarAjustes(d, { tema: 'oscuro' })
    await guardarAjustes(d, { ultimo_respaldo: '2026-10-28T10:00:00.000Z' })
    expect(await leerAjustes(d)).toMatchObject({ tema: 'oscuro', ultimo_respaldo: '2026-10-28T10:00:00.000Z' })
    expect(await d.ajustes.count()).toBe(1)
  })
})
