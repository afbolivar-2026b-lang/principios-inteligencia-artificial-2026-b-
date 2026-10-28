import { CreditCard, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { formatoCOP } from '../money'
import type { GastoSemana } from '../stats'

interface Props {
  semana: GastoSemana
  onMetas: () => void
}

export function MiniTarjetas({ semana, onMetas }: Props) {
  const { total, totalAnterior, variacion } = semana
  const avance = totalAnterior > 0 ? Math.min(100, Math.round((total / totalAnterior) * 100)) : total > 0 ? 100 : 0
  const baja = variacion !== null && variacion <= 0
  return (
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={onMetas}
        className="rounded-lg border border-border bg-surface p-4 text-left shadow-card">
        <Target aria-hidden="true" className="size-8 text-accent" />
        <p className="mt-2 text-sm text-text-muted">Metas</p>
        <p className="text-base font-bold">Sin metas todavía</p>
        <p className="mt-1 text-xs font-medium text-accent">Crear la primera</p>
      </button>
      <section aria-label="Gasto de la semana" className="rounded-lg border border-border bg-surface p-4 shadow-card">
        <CreditCard aria-hidden="true" className="size-8 text-accent" />
        <p className="mt-2 text-sm text-text-muted">Gasto semanal</p>
        <p className="text-base font-bold">{formatoCOP(total)}</p>
        <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-pill bg-border">
          <div className="h-full rounded-pill bg-accent" style={{ width: `${avance}%` }} />
        </div>
        <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${variacion === null ? 'text-text-muted' : baja ? 'text-success' : 'text-warning'}`}>
          {variacion === null ? null : baja ? <TrendingDown aria-hidden="true" className="size-4" /> : <TrendingUp aria-hidden="true" className="size-4" />}
          {variacion === null ? 'Aún sin semana pasada para comparar' : `${baja ? 'Bajó' : 'Subió'} ${Math.abs(variacion)} % vs semana pasada`}
        </p>
      </section>
    </div>
  )
}
