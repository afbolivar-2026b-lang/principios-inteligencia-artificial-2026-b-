import { OctagonAlert, TriangleAlert } from 'lucide-react'
import { formatoCOP } from '../money'
import type { EstadoPresupuesto } from '../presupuestos'

const COLOR = { normal: 'bg-accent', alerta: 'bg-warning', excedido: 'bg-danger' } as const
const TEXTO = { normal: 'text-text-muted', alerta: 'text-warning', excedido: 'text-danger' } as const

export function BarraProgreso({ estado, etiqueta }: { estado: EstadoPresupuesto; etiqueta: string }) {
  const ancho = Math.min(100, Math.max(0, estado.porcentaje))
  return (
    <div>
      <div role="progressbar" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={ancho} className="h-2 overflow-hidden rounded-pill bg-border">
        <div className={`h-full rounded-pill ${COLOR[estado.nivel]}`} style={{ width: `${ancho}%` }} />
      </div>
      <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${TEXTO[estado.nivel]}`}>
        {estado.nivel === 'excedido' ? <OctagonAlert aria-hidden="true" className="size-4" /> : estado.nivel === 'alerta' ? <TriangleAlert aria-hidden="true" className="size-4" /> : null}
        {estado.nivel === 'excedido'
          ? `Te pasaste por ${formatoCOP(-estado.restante)}`
          : estado.nivel === 'alerta'
            ? `Vas en el ${estado.porcentaje} % · te quedan ${formatoCOP(estado.restante)}`
            : `${estado.porcentaje} % · te quedan ${formatoCOP(estado.restante)}`}
      </p>
    </div>
  )
}
