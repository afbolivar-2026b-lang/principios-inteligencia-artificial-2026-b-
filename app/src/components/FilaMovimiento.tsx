import { etiquetaDia, horaLocal } from '../dates'
import { MEDIOS_PAGO, type Categoria, type Movimiento } from '../db'
import { formatoCOP } from '../money'
import { IconoCategoria } from './iconos'

interface Props {
  mov: Movimiento
  categoria?: Categoria
  hoy: string
}

export function FilaMovimiento({ mov, categoria, hoy }: Props) {
  const ingreso = mov.tipo === 'ingreso'
  const medio = MEDIOS_PAGO.find((m) => m.id === mov.medio_pago)?.nombre
  const nombreCat = categoria?.nombre ?? 'Sin categoría'
  const cuando = `${etiquetaDia(mov.fecha, hoy)} · ${horaLocal(mov.creado_en)}`
  return (
    <li className="flex min-h-[56px] items-center gap-3 rounded-lg border border-border bg-surface p-3 shadow-card">
      <IconoCategoria nombre={categoria?.icono ?? 'tag'} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{mov.descripcion || nombreCat}</p>
        <p className={`truncate text-xs ${ingreso ? 'font-medium text-success' : 'text-text-muted'}`}>
          • {nombreCat}{medio ? ` · ${medio}` : ''}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-bold ${ingreso ? 'text-success' : ''}`}>
          <span className="sr-only">{ingreso ? 'Ingreso de ' : 'Gasto de '}</span>
          {ingreso ? '+' : '-'}{formatoCOP(mov.monto)}
        </p>
        <p className="text-xs text-text-muted">{cuando}</p>
      </div>
    </li>
  )
}
