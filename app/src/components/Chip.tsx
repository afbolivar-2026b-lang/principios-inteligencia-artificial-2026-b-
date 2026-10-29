import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

export function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={activo} onClick={onClick}
      className={`inline-flex min-h-[44px] items-center gap-1 rounded-pill border px-4 text-sm font-medium ${activo ? 'border-accent bg-accent-soft text-text' : 'border-border-input bg-bg text-text'}`}>
      {activo ? <Check aria-hidden="true" className="size-4 text-accent" /> : null}
      {children}
    </button>
  )
}

export function Segmentos<T extends string>({ valor, opciones, onCambiar, etiqueta }: { valor: T; opciones: { id: T; nombre: string }[]; onCambiar: (v: T) => void; etiqueta: string }) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="grid gap-1 rounded-pill bg-surface p-1" style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}>
      {opciones.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={valor === o.id} onClick={() => onCambiar(o.id)}
          className={`min-h-[44px] rounded-pill text-sm font-semibold ${valor === o.id ? 'bg-accent text-on-accent' : 'text-text-muted'}`}>
          {o.nombre}
        </button>
      ))}
    </div>
  )
}
