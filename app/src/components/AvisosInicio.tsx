import { ArchiveRestore, DatabaseBackup, OctagonAlert, TriangleAlert } from 'lucide-react'
import { formatoCOP } from '../money'
import type { FilaPresupuesto } from '../presupuestos'

interface Props {
  filas: FilaPresupuesto[]
  /** días desde el último respaldo; null si nunca se hizo */
  diasSinRespaldo: number | null
  cantidadMovimientos: number
  /** cuántos datos guardados están dañados y se dejaron fuera */
  danados: number
  onDescargarCrudos: () => void
  onPresupuestos: () => void
  onRespaldo: () => void
}

export function AvisosInicio({ filas, diasSinRespaldo, cantidadMovimientos, danados, onDescargarCrudos, onPresupuestos, onRespaldo }: Props) {
  const todas = filas.filter((f) => f.estado && f.estado.nivel !== 'normal')
  const enRiesgo = todas.slice(0, 2)
  const ocultas = todas.length - enRiesgo.length
  const pedirRespaldo = cantidadMovimientos >= 3 && (diasSinRespaldo === null || diasSinRespaldo > 7)
  if (enRiesgo.length === 0 && !pedirRespaldo && danados === 0) return null
  return (
    <div className="flex flex-col gap-2">
      {danados > 0 ? (
        <button type="button" onClick={onDescargarCrudos} className="flex items-center gap-3 rounded-lg border border-danger bg-surface p-3 text-left">
          <DatabaseBackup aria-hidden="true" className="size-6 flex-none text-danger" />
          <span className="text-sm">
            <span className="font-semibold">{danados} {danados === 1 ? 'dato dañado' : 'datos dañados'}. </span>
            No se muestran, pero tampoco se borraron. Toca para guardar una copia sin revisar.
          </span>
        </button>
      ) : null}
      {enRiesgo.map((f) => {
        const e = f.estado!
        const excedido = e.nivel === 'excedido'
        return (
          <button key={f.categoria.id} type="button" onClick={onPresupuestos}
            className={`flex items-center gap-3 rounded-lg border bg-surface p-3 text-left ${excedido ? 'border-danger' : 'border-warning'}`}>
            {excedido ? <OctagonAlert aria-hidden="true" className="size-6 flex-none text-danger" /> : <TriangleAlert aria-hidden="true" className="size-6 flex-none text-warning" />}
            <span className="text-sm">
              <span className="font-semibold">{f.categoria.nombre}: </span>
              {excedido ? `te pasaste por ${formatoCOP(-e.restante)}` : `vas en el ${e.porcentaje} % de tu presupuesto`}
            </span>
          </button>
        )
      })}
      {ocultas > 0 ? (
        <button type="button" onClick={onPresupuestos} className="min-h-[44px] rounded-lg px-3 text-left text-sm font-semibold text-accent">
          y {ocultas} {ocultas === 1 ? 'categoría más' : 'categorías más'} en alerta · Ver presupuestos
        </button>
      ) : null}
      {pedirRespaldo ? (
        <button type="button" onClick={onRespaldo} className="flex items-center gap-3 rounded-lg border border-border-input bg-surface p-3 text-left">
          <ArchiveRestore aria-hidden="true" className="size-6 flex-none text-accent" />
          <span className="text-sm">
            <span className="font-semibold">Haz un respaldo. </span>
            {diasSinRespaldo === null ? 'Todavía no has guardado ninguno.' : `El último fue hace ${diasSinRespaldo} días.`}
          </span>
        </button>
      ) : null}
    </div>
  )
}
