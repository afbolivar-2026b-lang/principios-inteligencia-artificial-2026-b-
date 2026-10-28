import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { formatoCOP } from '../money'
import type { ResumenMes } from '../stats'

export function TarjetaBalance({ mes, resumen }: { mes: string; resumen: ResumenMes }) {
  return (
    <section aria-label={`Balance de ${mes}`} className="hero rounded-lg p-5">
      <p className="text-sm font-medium">Balance de {mes.toLowerCase()}</p>
      <p className="mt-1 text-display font-extrabold" aria-label={`${resumen.balance} pesos`}>
        {formatoCOP(resumen.balance)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
        <span className="hero-pill inline-flex items-center gap-1 rounded-pill px-3 py-1">
          <ArrowUpRight aria-hidden="true" className="size-4" />
          Ingresos {formatoCOP(resumen.ingresado)}
        </span>
        <span className="hero-pill inline-flex items-center gap-1 rounded-pill px-3 py-1">
          <ArrowDownRight aria-hidden="true" className="size-4" />
          Gastos {formatoCOP(resumen.gastado)}
        </span>
      </div>
    </section>
  )
}
