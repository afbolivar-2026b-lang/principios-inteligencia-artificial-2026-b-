import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { asegurarCategorias, fijarPresupuesto, guardarMovimiento, NovaDB } from './db'
import { crearRespaldo, ErrorRespaldo, estaCifrado, importarRespaldo, respaldoATexto, textoARespaldo, validarRespaldo } from './respaldo'

async function nueva(): Promise<NovaDB> {
  const d = new NovaDB(`r-${crypto.randomUUID()}`)
  await asegurarCategorias(d)
  return d
}
const cat = async (d: NovaDB, nombre: string) => (await d.categorias.toArray()).find((c) => c.nombre === nombre)!

let d: NovaDB
beforeEach(async () => {
  d = await nueva()
  const comida = await cat(d, 'Comida')
  const salario = await cat(d, 'Salario')
  await guardarMovimiento(d, { tipo: 'gasto', monto: 18000, categoria_id: comida.id, fecha: '2026-10-28', descripcion: 'Almuerzo', medio_pago: 'nequi' })
  await guardarMovimiento(d, { tipo: 'ingreso', monto: 1300000, categoria_id: salario.id, fecha: '2026-10-25' })
  await fijarPresupuesto(d, { categoria_id: comida.id, mes: '2026-10', limite: 400000, umbral_alerta: 80 })
})

describe('respaldo sin clave', () => {
  it('exportar e importar en otro celular deja todo igual', async () => {
    const texto = await respaldoATexto(await crearRespaldo(d))
    expect(estaCifrado(texto)).toBe(false)
    const otro = new NovaDB(`o-${crypto.randomUUID()}`)
    const res = await importarRespaldo(otro, await textoARespaldo(texto), 'reemplazar')
    expect(res).toEqual({ categorias: 12, movimientos: 2, presupuestos: 1 })
    expect(await otro.movimientos.toArray()).toEqual(await d.movimientos.toArray())
  })
})

describe('respaldo con clave', () => {
  it('no deja ver los datos y se abre solo con la clave correcta', async () => {
    const texto = await respaldoATexto(await crearRespaldo(d), 'mi clave secreta')
    expect(estaCifrado(texto)).toBe(true)
    expect(texto).not.toContain('Almuerzo')
    expect(texto).not.toContain('18000')
    await expect(textoARespaldo(texto)).rejects.toMatchObject({ codigo: 'CLAVE_NECESARIA' })
    await expect(textoARespaldo(texto, 'otra clave')).rejects.toMatchObject({ codigo: 'CLAVE_INCORRECTA' })
    const ok = await textoARespaldo(texto, 'mi clave secreta')
    expect(ok.movimientos).toHaveLength(2)
  }, 30_000)
})

describe('archivos dañados o hechos a mano', () => {
  it('rechaza lo que no es un respaldo', async () => {
    await expect(textoARespaldo('hola')).rejects.toBeInstanceOf(ErrorRespaldo)
    await expect(textoARespaldo('{"app":"otra"}')).rejects.toBeInstanceOf(ErrorRespaldo)
  })
  it('rechaza montos, fechas y categorías imposibles', async () => {
    const base = await crearRespaldo(d)
    const con = (cambio: (r: ReturnType<typeof structuredClone<typeof base>>) => void) => {
      const r = structuredClone(base)
      cambio(r)
      return () => validarRespaldo(r)
    }
    expect(() => validarRespaldo(structuredClone(base))).not.toThrow()
    expect(con((r) => { r.movimientos[0].monto = -5 })).toThrow(ErrorRespaldo)
    expect(con((r) => { r.movimientos[0].monto = 12.5 })).toThrow(ErrorRespaldo)
    expect(con((r) => { r.movimientos[0].fecha = '2026-02-30' })).toThrow(ErrorRespaldo)
    expect(con((r) => { r.movimientos[0].categoria_id = crypto.randomUUID() })).toThrow(ErrorRespaldo)
    expect(con((r) => { r.movimientos[0].id = 'no-es-uuid' })).toThrow(ErrorRespaldo)
    expect(con((r) => { r.movimientos.find((m) => m.tipo === 'gasto')!.tipo = 'ingreso' })).toThrow(ErrorRespaldo) // su categoría es de gasto
    expect(con((r) => { r.presupuestos[0].limite = 0 })).toThrow(ErrorRespaldo)
  })
  it('descarta campos que no conoce', async () => {
    const r = structuredClone(await crearRespaldo(d)) as unknown as { movimientos: Record<string, unknown>[] }
    r.movimientos[0].veneno = '<script>'
    const limpio = validarRespaldo(r)
    expect(limpio.movimientos[0]).not.toHaveProperty('veneno')
  })
})

describe('combinar dos celulares', () => {
  it('une las categorías con el mismo nombre y no duplica movimientos', async () => {
    const texto = await respaldoATexto(await crearRespaldo(d))
    // el otro celular tiene sus propias categorías (otros ids) y un gasto distinto
    const otro = await nueva()
    await guardarMovimiento(otro, { tipo: 'gasto', monto: 5000, categoria_id: (await cat(otro, 'Comida')).id, fecha: '2026-10-27', descripcion: 'Empanada' })
    const r = await importarRespaldo(otro, await textoARespaldo(texto), 'combinar')
    expect(r).toEqual({ categorias: 0, movimientos: 2, presupuestos: 1 })
    expect(await otro.categorias.count()).toBe(12)
    expect(await otro.movimientos.count()).toBe(3)
    // repetir no cambia nada
    expect(await importarRespaldo(otro, await textoARespaldo(texto), 'combinar')).toEqual({ categorias: 0, movimientos: 0, presupuestos: 0 })
    expect(await otro.movimientos.count()).toBe(3)
    const comidaOtro = await cat(otro, 'Comida')
    expect((await otro.movimientos.toArray()).every((m) => m.tipo === 'ingreso' || m.categoria_id === comidaOtro.id)).toBe(true)
  })
})
