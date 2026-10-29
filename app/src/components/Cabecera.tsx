import { Bell, Settings, Sparkles } from 'lucide-react'

interface Props {
  onProximamente: (texto: string) => void
  onAjustes: () => void
}

export function Cabecera({ onProximamente, onAjustes }: Props) {
  return (
    <header className="flex items-center justify-between px-4 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
      <div className="flex items-center gap-1 text-brand">
        <span className="text-[28px] font-extrabold uppercase leading-none tracking-tight">Nova</span>
        <Sparkles aria-hidden="true" className="size-6" />
      </div>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Recordatorios" onClick={() => onProximamente('Los recordatorios llegan en un próximo paso')}
          className="flex size-11 items-center justify-center rounded-pill text-text-muted">
          <Bell aria-hidden="true" className="size-6" />
        </button>
        <button type="button" aria-label="Ajustes" onClick={onAjustes}
          className="flex size-11 items-center justify-center rounded-pill text-text-muted">
          <Settings aria-hidden="true" className="size-6" />
        </button>
      </div>
    </header>
  )
}
