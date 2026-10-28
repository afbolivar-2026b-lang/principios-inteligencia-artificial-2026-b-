import { mesDe } from './dates'
import type { Categoria, Movimiento } from './db'

export function sumarMeses(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number)
  const total = a * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

export interface Rebanada {
  id: string
  nombre: string
  monto: number
  porcentaje: number
}

/** Gasto del mes por categoría: las más grandes y el resto junto en "Otras". Los porcentajes suman 100. */
export function gastoPorCategoria(movs: Movimiento[], cats: Categoria[], mes: string, maximo = 5): Rebanada[] {
  const nombres = new Map(cats.map((c) => [c.id, c.nombre]))
  const suma = new Map<string, number>()
  for (const m of movs) {
    if (m.tipo === 'gasto' && mesDe(m.fecha) === mes) suma.set(m.categoria_id, (suma.get(m.categoria_id) ?? 0) + m.monto)
  }
  const orden = [...suma.entries()].sort((a, b) => b[1] - a[1])
  const total = orden.reduce((a, [, v]) => a + v, 0)
  if (total === 0) return []
  const grandes = orden.slice(0, maximo).map(([id, monto]) => ({ id, nombre: nombres.get(id) ?? 'Sin categoría', monto }))
  const resto = orden.slice(maximo).reduce((a, [, v]) => a + v, 0)
  const filas = resto > 0 ? [...grandes, { id: 'otras', nombre: 'Otras', monto: resto }] : grandes
  // método del mayor resto, para que sumen exactamente 100
  const exactos = filas.map((f) => (f.monto / total) * 100)
  const enteros = exactos.map(Math.floor)
  let faltan = 100 - enteros.reduce((a, b) => a + b, 0)
  const porResto = exactos.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0])
  for (const [, i] of porResto) { if (faltan <= 0) break; enteros[i] += 1; faltan -= 1 }
  return filas.map((f, i) => ({ ...f, porcentaje: enteros[i] }))
}

export interface PuntoMes {
  mes: string
  gastos: number
  ingresos: number
}

/** Los últimos `n` meses, del más viejo al actual. */
export function serieMensual(movs: Movimiento[], mesActual: string, n = 6): PuntoMes[] {
  const meses = Array.from({ length: n }, (_, i) => sumarMeses(mesActual, i - (n - 1)))
  const por = new Map(meses.map((m) => [m, { mes: m, gastos: 0, ingresos: 0 }]))
  for (const m of movs) {
    const p = por.get(mesDe(m.fecha))
    if (!p) continue
    if (m.tipo === 'gasto') p.gastos += m.monto
    else p.ingresos += m.monto
  }
  return meses.map((m) => por.get(m)!)
}
