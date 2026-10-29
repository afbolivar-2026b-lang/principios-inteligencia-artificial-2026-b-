import type { Categoria, Movimiento, Presupuesto } from './db'
import { mesDe } from './dates'

export type Nivel = 'normal' | 'alerta' | 'excedido'

export interface EstadoPresupuesto {
  nivel: Nivel
  porcentaje: number // sin tope: 130 significa que se pasó por el 30 %
  restante: number // negativo si se pasó
}

/** El límite que rige en un mes: el más reciente que empezó en ese mes o antes. */
export function limiteVigente(pres: Presupuesto[], categoriaId: string, mes: string): Presupuesto | undefined {
  let mejor: Presupuesto | undefined
  for (const p of pres) {
    if (p.categoria_id !== categoriaId || p.mes > mes) continue
    if (!mejor || p.mes > mejor.mes) mejor = p
  }
  return mejor
}

export function estadoPresupuesto(gastado: number, limite: number, umbral: number): EstadoPresupuesto {
  const porcentaje = Math.round((gastado / limite) * 100)
  const nivel: Nivel = gastado > limite ? 'excedido' : porcentaje >= umbral ? 'alerta' : 'normal'
  return { nivel, porcentaje, restante: limite - gastado }
}

export interface FilaPresupuesto {
  categoria: Categoria
  presupuesto?: Presupuesto
  gastado: number
  estado?: EstadoPresupuesto
}

/** Una fila por categoría de gasto activa. Primero las que tienen límite, de más a menos gastado en proporción. */
export function filasPresupuesto(cats: Categoria[], pres: Presupuesto[], movs: Movimiento[], mes: string): FilaPresupuesto[] {
  const gastoPorCat = new Map<string, number>()
  for (const m of movs) {
    if (m.tipo === 'gasto' && mesDe(m.fecha) === mes) gastoPorCat.set(m.categoria_id, (gastoPorCat.get(m.categoria_id) ?? 0) + m.monto)
  }
  const filas = cats
    .filter((c) => c.tipo === 'gasto' && !c.archivada)
    .map((categoria): FilaPresupuesto => {
      const presupuesto = limiteVigente(pres, categoria.id, mes)
      const gastado = gastoPorCat.get(categoria.id) ?? 0
      return { categoria, presupuesto, gastado, estado: presupuesto ? estadoPresupuesto(gastado, presupuesto.limite, presupuesto.umbral_alerta) : undefined }
    })
  return filas.sort((a, b) => {
    if (!!a.estado !== !!b.estado) return a.estado ? -1 : 1
    if (a.estado && b.estado) return b.estado.porcentaje - a.estado.porcentaje
    return a.categoria.orden - b.categoria.orden
  })
}

export function totalesPresupuesto(filas: FilaPresupuesto[]): { limite: number; gastado: number; restante: number; conLimite: number } {
  const con = filas.filter((f) => f.presupuesto)
  const limite = con.reduce((a, f) => a + f.presupuesto!.limite, 0)
  const gastado = con.reduce((a, f) => a + f.gastado, 0)
  return { limite, gastado, restante: limite - gastado, conLimite: con.length }
}
