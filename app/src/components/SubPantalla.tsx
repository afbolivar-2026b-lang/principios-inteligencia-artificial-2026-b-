import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

export function SubPantalla({ titulo, onVolver, children }: { titulo: string; onVolver: () => void; children: ReactNode }) {
  return (
    <>
      <header className="flex items-center gap-1 px-2 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <button type="button" onClick={onVolver} aria-label="Volver" className="flex size-11 items-center justify-center rounded-pill">
          <ChevronLeft aria-hidden="true" className="size-7" />
        </button>
        <h1 className="text-xl font-semibold">{titulo}</h1>
      </header>
      <main className="px-4">{children}</main>
    </>
  )
}
