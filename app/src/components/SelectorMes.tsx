import { ChevronLeft, ChevronRight } from 'lucide-react'
import { nombreMes } from '../dates'
import { sumarMeses } from '../reportes'

export function SelectorMes({ mes, mesMax, onCambiar }: { mes: string; mesMax: string; onCambiar: (m: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <button type="button" aria-label="Mes anterior" onClick={() => onCambiar(sumarMeses(mes, -1))} className="flex size-11 items-center justify-center rounded-pill">
        <ChevronLeft aria-hidden="true" className="size-6" />
      </button>
      <p className="text-base font-semibold" aria-live="polite">{nombreMes(`${mes}-01`)} {mes.slice(0, 4)}</p>
      <button type="button" aria-label="Mes siguiente" disabled={mes >= mesMax} onClick={() => onCambiar(sumarMeses(mes, 1))}
        className="flex size-11 items-center justify-center rounded-pill disabled:opacity-35">
        <ChevronRight aria-hidden="true" className="size-6" />
      </button>
    </div>
  )
}
