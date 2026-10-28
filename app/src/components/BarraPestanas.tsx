import { ChartColumn, House, Settings, Target, WalletCards, type LucideIcon } from 'lucide-react'

export type Pestana = 'inicio' | 'analisis' | 'presupuestos' | 'metas' | 'ajustes'

const PESTANAS: { id: Pestana; nombre: string; Icono: LucideIcon }[] = [
  { id: 'inicio', nombre: 'Inicio', Icono: House },
  { id: 'analisis', nombre: 'Análisis', Icono: ChartColumn },
  { id: 'presupuestos', nombre: 'Presupuestos', Icono: WalletCards },
  { id: 'metas', nombre: 'Metas', Icono: Target },
  { id: 'ajustes', nombre: 'Ajustes', Icono: Settings },
]

export function BarraPestanas({ activa, onCambiar }: { activa: Pestana; onCambiar: (p: Pestana) => void }) {
  return (
    <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-20 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <ul className="mx-auto flex max-w-content justify-between rounded-lg border border-border bg-bg px-1 shadow-card" style={{ height: 'var(--tab-bar)', margin: '0 1rem' }}>
        {PESTANAS.map(({ id, nombre, Icono }) => {
          const on = id === activa
          return (
            <li key={id} className="flex-1">
              <button type="button" onClick={() => onCambiar(id)} aria-current={on ? 'page' : undefined}
                className={`flex h-full w-full flex-col items-center justify-center gap-1 text-xs font-semibold ${on ? 'text-accent' : 'text-text-muted'}`}>
                <Icono aria-hidden="true" className="size-6" strokeWidth={on ? 2.6 : 2} />
                {nombre}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
