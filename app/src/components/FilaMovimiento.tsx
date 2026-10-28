import { etiquetaDia, horaLocal } from '../dates'
import { MEDIOS_PAGO, type Categoria, type Movimiento } from '../db'
import { formatoCOP } from '../money'
import { IconoCategoria } from './iconos'

interface Props {
  mov: Movimiento
  categoria?: Categoria
  hoy: string
  onAbrir: (mov: Movimiento) => void
  /** En la lista agrupada por día, la fecha ya está en el encabezado */
  sinFecha?: boolean
}

export function FilaMovimiento({ mov, categoria, hoy, onAbrir, sinFecha }: Props) {
  const ingreso = mov.tipo === 'ingreso'
  const medio = MEDIOS_PAGO.find((m) => m.id === mov.medio_pago)?.nombre
  const nombreCat = categoria?.nombre ?? 'Sin categoría'
  const cuando = sinFecha ? horaLocal(mov.creado_en) : `${etiquetaDia(mov.fecha, hoy)} · ${horaLocal(mov.creado_en)}`
  return (
    <li>
      <button type="button" onClick={() => onAbrir(mov)}
        className="flex min-h-[56px] w-full items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left shadow-card">
        <span className="sr-only">Editar {ingreso ? 'ingreso' : 'gasto'}. </span>
        <IconoCategoria nombre={categoria?.icono ?? 'tag'} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{mov.descripcion || nombreCat}</p>
          <p className={`truncate text-xs ${ingreso ? 'font-medium text-success' : 'text-text-muted'}`}>
            • {nombreCat}{medio ? ` · ${medio}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className={`font-bold ${ingreso ? 'text-success' : ''}`}>{ingreso ? '+' : '-'}{formatoCOP(mov.monto)}</p>
          <p className="text-xs text-text-muted">{cuando}</p>
        </div>
      </button>
    </li>
  )
}
