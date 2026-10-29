import { diaSemana, inicioSemana, mesDe, sumarDias } from './dates'
import type { Movimiento } from './db'

export interface ResumenMes {
  gastado: number
  ingresado: number
  balance: number
}

export function resumenMes(movs: Movimiento[], mes: string): ResumenMes {
  let gastado = 0
  let ingresado = 0
  for (const m of movs) {
    if (mesDe(m.fecha) !== mes) continue
    if (m.tipo === 'gasto') gastado += m.monto
    else ingresado += m.monto
  }
  return { gastado, ingresado, balance: ingresado - gastado }
}

export interface GastoSemana {
  /** gasto de lunes (0) a domingo (6) de la semana de `hoy` */
  dias: number[]
  total: number
  /** mismo tramo de la semana pasada (lunes hasta el día de hoy) */
  totalAnterior: number
  /** % de cambio frente a la semana pasada; null si la semana pasada no tuvo gastos */
  variacion: number | null
}

export function gastoSemana(movs: Movimiento[], hoy: string): GastoSemana {
  const lunes = inicioSemana(hoy)
  const lunesAnterior = sumarDias(lunes, -7)
  const hasta = diaSemana(hoy)
  const dias = Array<number>(7).fill(0)
  let totalAnterior = 0
  for (const m of movs) {
    if (m.tipo !== 'gasto') continue
    const i = diasEntre(lunes, m.fecha)
    if (i >= 0 && i <= 6) dias[i] += m.monto
    const j = diasEntre(lunesAnterior, m.fecha)
    if (j >= 0 && j <= hasta) totalAnterior += m.monto
  }
  const total = dias.reduce((a, b) => a + b, 0)
  const variacion = totalAnterior > 0 ? Math.round(((total - totalAnterior) / totalAnterior) * 100) : null
  return { dias, total, totalAnterior, variacion }
}

function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000)
}
