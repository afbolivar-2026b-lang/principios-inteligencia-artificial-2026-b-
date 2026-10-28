import { X } from 'lucide-react'
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { registrarAtras } from '../atras'

interface Props {
  titulo: string
  onCerrar: () => void
  children: ReactNode
  /** Botones que quedan siempre visibles abajo */
  pie?: ReactNode
}

/**
 * Ventana que sube desde abajo. Se muestra solo mientras el padre la renderiza,
 * así cada vez que se abre empieza con el formulario limpio.
 * Cierra con Escape, con el fondo o con la X; el cursor queda atrapado adentro.
 */
export function Hoja({ titulo, onCerrar, children, pie }: Props) {
  const idTitulo = useId()
  const caja = useRef<HTMLDivElement>(null)
  const cerrarRef = useRef(onCerrar)
  cerrarRef.current = onCerrar

  useEffect(() => {
    const quienAbrio = document.activeElement as HTMLElement | null
    // la app de atrás queda "inerte": ni el teclado, ni el toque, ni el lector de pantalla pueden llegar a ella
    const raiz = document.getElementById('root')
    raiz?.setAttribute('inert', '')
    const soltarAtras = registrarAtras(() => cerrarRef.current())
    const primero = caja.current?.querySelector<HTMLElement>('[data-foco]') ?? caja.current?.querySelector<HTMLElement>('input, button')
    primero?.focus({ preventScroll: true })
    const alPresionar = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') cerrarRef.current() }
    document.addEventListener('keydown', alPresionar)
    return () => {
      document.removeEventListener('keydown', alPresionar)
      raiz?.removeAttribute('inert')
      soltarAtras()
      // un segundo toque rápido (doble toque) no debe caer sobre lo que queda debajo cuando la ventana se cierra
      const escudo = document.createElement('div')
      escudo.setAttribute('aria-hidden', 'true')
      escudo.style.cssText = 'position:fixed;inset:0;z-index:60;background:transparent'
      document.body.append(escudo)
      setTimeout(() => escudo.remove(), 350)
      quienAbrio?.focus?.()
    }
  }, [])

  function atrapar(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab' || !caja.current) return
    const enfocables = caja.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])')
    if (enfocables.length === 0) return
    const primero = enfocables[0]
    const ultimo = enfocables[enfocables.length - 1]
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus() }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus() }
  }

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center" onKeyDown={atrapar}>
      <div className="scrim absolute inset-0" onClick={onCerrar} aria-hidden="true" />
      <div ref={caja} role="dialog" aria-modal="true" aria-labelledby={idTitulo}
        className="sube relative flex max-h-[92dvh] w-full max-w-content flex-col rounded-t-lg bg-bg shadow-pop">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 id={idTitulo} className="text-lg font-semibold">{titulo}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-pill text-text-muted">
            <X aria-hidden="true" className="size-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">{children}</div>
        {pie ? <div className="flex gap-3 border-t border-border bg-bg px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">{pie}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
