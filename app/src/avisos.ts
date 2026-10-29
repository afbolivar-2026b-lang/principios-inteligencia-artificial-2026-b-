import { mesDe } from './dates'
import type { Movimiento, NovaDB } from './db'
import { formatoCOP } from './money'
import { estadoPresupuesto, limiteVigente } from './presupuestos'

/** Después de guardar un gasto: si su categoría quedó cerca o por encima del presupuesto, devuelve el aviso. */
export async function textoAvisoPresupuesto(d: NovaDB, mov: Movimiento): Promise<string | null> {
  if (mov.tipo !== 'gasto') return null
  const mes = mesDe(mov.fecha)
  const pres = await d.presupuestos.where('categoria_id').equals(mov.categoria_id).toArray()
  const p = limiteVigente(pres, mov.categoria_id, mes)
  const cat = await d.categorias.get(mov.categoria_id)
  if (!p || !cat) return null
  const gastos = await d.movimientos.where('categoria_id').equals(mov.categoria_id).toArray()
  const gastado = gastos.filter((m) => m.tipo === 'gasto' && mesDe(m.fecha) === mes).reduce((a, m) => a + m.monto, 0)
  const e = estadoPresupuesto(gastado, p.limite, p.umbral_alerta)
  if (e.nivel === 'excedido') return `Te pasaste en ${cat.nombre} por ${formatoCOP(-e.restante)}`
  if (e.nivel === 'alerta') return `${cat.nombre} va en el ${e.porcentaje} % de su presupuesto`
  return null
}

export function diasDesde(marca: string | undefined, ahora: Date = new Date()): number | null {
  if (!marca) return null
  const t = Date.parse(marca)
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((ahora.getTime() - t) / 86_400_000))
}
