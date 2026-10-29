import { useEffect } from 'react'

export interface DatosAviso {
  texto: string
  accion?: { etiqueta: string; alHacer: () => void }
}

export function Aviso({ aviso, onCerrar }: { aviso: DatosAviso | null; onCerrar: () => void }) {
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(onCerrar, aviso.accion ? 6000 : 4000)
    return () => clearTimeout(t)
  }, [aviso, onCerrar])

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tab-bar)+5.5rem)] z-40 px-4">
      {aviso ? (
        <div className="sube pointer-events-auto mx-auto flex max-w-content items-center justify-between gap-3 rounded-md bg-text px-4 py-3 text-sm text-bg shadow-pop sm:mr-auto">
          <span>{aviso.texto}</span>
          {aviso.accion ? (
            <button type="button" className="min-h-[44px] px-2 font-bold underline"
              onClick={() => { aviso.accion?.alHacer(); onCerrar() }}>
              {aviso.accion.etiqueta}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
