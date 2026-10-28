import { Check, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { sumarDias } from '../dates'
import { db, ErrorDeDatos, guardarMovimiento, MEDIOS_PAGO, type Categoria, type MedioPago, type Movimiento, type TipoMov } from '../db'
import { formatoDigitos, soloDigitos } from '../money'

interface Props {
  abierta: boolean
  categorias: Categoria[]
  hoy: string
  onCerrar: () => void
  onGuardado: (mov: Movimiento) => void
}

type CuandoModo = 'hoy' | 'ayer' | 'otra'

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={activo} onClick={onClick}
      className={`inline-flex min-h-[44px] items-center gap-1 rounded-pill border px-4 text-sm font-medium ${activo ? 'border-accent bg-accent-soft text-text' : 'border-border-input bg-bg text-text'}`}>
      {activo ? <Check aria-hidden="true" className="size-4 text-accent" /> : null}
      {children}
    </button>
  )
}

export function HojaAgregar({ abierta, categorias, hoy, onCerrar, onGuardado }: Props) {
  const titulo = useId()
  const errMonto = useId()
  const errCat = useId()
  const [tipo, setTipo] = useState<TipoMov>('gasto')
  const [digitos, setDigitos] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cuando, setCuando] = useState<CuandoModo>('hoy')
  const [fechaOtra, setFechaOtra] = useState(hoy)
  const [medio, setMedio] = useState<MedioPago | ''>('')
  const [errores, setErrores] = useState<{ monto?: string; categoria?: string; general?: string }>({})
  const [guardando, setGuardando] = useState(false)
  const caja = useRef<HTMLDivElement>(null)
  const campoMonto = useRef<HTMLInputElement>(null)
  const quienAbrio = useRef<HTMLElement | null>(null)

  const cerrarRef = useRef(onCerrar)
  cerrarRef.current = onCerrar

  useEffect(() => {
    if (!abierta) return
    quienAbrio.current = document.activeElement as HTMLElement | null
    setTipo('gasto'); setDigitos(''); setCategoriaId(''); setDescripcion(''); setCuando('hoy'); setFechaOtra(hoy)
    setMedio(''); setErrores({}); setGuardando(false)
    campoMonto.current?.focus({ preventScroll: true })
    return () => { quienAbrio.current?.focus?.() }
  }, [abierta, hoy])

  // Escape cierra la hoja aunque el cursor esté en otro lugar de la pantalla
  useEffect(() => {
    if (!abierta) return
    const alPresionar = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') cerrarRef.current() }
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [abierta])

  const delTipo = useMemo(() => categorias.filter((c) => c.tipo === tipo && !c.archivada), [categorias, tipo])
  if (!abierta) return null

  const fecha = cuando === 'hoy' ? hoy : cuando === 'ayer' ? sumarDias(hoy, -1) : fechaOtra

  function cambiarTipo(t: TipoMov) {
    setTipo(t); setCategoriaId(''); setErrores({})
  }

  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab' || !caja.current) return
    const enfocables = caja.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')
    if (enfocables.length === 0) return
    const primero = enfocables[0]
    const ultimo = enfocables[enfocables.length - 1]
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus() }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus() }
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (guardando) return
    const monto = soloDigitos(digitos)
    const nuevos: typeof errores = {}
    if (monto <= 0) nuevos.monto = 'Escribe un monto mayor a 0'
    if (!categoriaId) nuevos.categoria = 'Elige una categoría'
    setErrores(nuevos)
    if (nuevos.monto || nuevos.categoria) { (nuevos.monto ? campoMonto.current : null)?.focus(); return }
    setGuardando(true)
    try {
      const mov = await guardarMovimiento(db, { tipo, monto, categoria_id: categoriaId, fecha, descripcion, ...(medio ? { medio_pago: medio } : {}) })
      onGuardado(mov)
    } catch (err) {
      setErrores({ general: err instanceof ErrorDeDatos ? err.message : 'No se pudo guardar. Intenta de nuevo.' })
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" onKeyDown={alTeclear}>
      <div className="scrim absolute inset-0" onClick={onCerrar} aria-hidden="true" />
      <div ref={caja} role="dialog" aria-modal="true" aria-labelledby={titulo}
        className="sube relative max-h-[92dvh] w-full max-w-content overflow-y-auto rounded-t-lg bg-bg px-4 pt-4 shadow-pop">
        <div className="flex items-center justify-between">
          <h2 id={titulo} className="text-lg font-semibold">{tipo === 'gasto' ? 'Nuevo gasto' : 'Nuevo ingreso'}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="flex size-11 items-center justify-center rounded-pill text-text-muted">
            <X aria-hidden="true" className="size-6" />
          </button>
        </div>

        <form onSubmit={enviar} noValidate className="mt-2 flex flex-col gap-5">
          <div role="radiogroup" aria-label="Tipo de movimiento" className="grid grid-cols-2 gap-1 rounded-pill bg-surface p-1">
            {(['gasto', 'ingreso'] as const).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={tipo === t} onClick={() => cambiarTipo(t)}
                className={`min-h-[44px] rounded-pill text-sm font-semibold ${tipo === t ? 'bg-accent text-on-accent' : 'text-text-muted'}`}>
                {t === 'gasto' ? 'Gasto' : 'Ingreso'}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="monto" className="text-sm font-medium text-text-muted">Monto en pesos</label>
            <input id="monto" ref={campoMonto} inputMode="numeric" autoComplete="off" placeholder="$0"
              value={digitos ? `$${formatoDigitos(digitos)}` : ''} onChange={(e) => setDigitos(e.target.value.replace(/\D/g, '').slice(0, 12))}
              aria-invalid={errores.monto ? true : undefined} aria-describedby={errores.monto ? errMonto : undefined}
              className={`mt-1 h-[52px] w-full rounded-md border bg-bg px-4 text-xl font-bold placeholder:text-text-muted ${errores.monto ? 'border-danger' : 'border-border-input'}`} />
            {errores.monto ? <p id={errMonto} className="mt-1 text-sm text-danger">{errores.monto}</p> : null}
          </div>

          <div>
            <p id="lab-cat" className="text-sm font-medium text-text-muted">Categoría</p>
            <div role="radiogroup" aria-labelledby="lab-cat" aria-describedby={errores.categoria ? errCat : undefined} className="mt-2 flex flex-wrap gap-2">
              {delTipo.map((c) => (
                <Chip key={c.id} activo={categoriaId === c.id} onClick={() => { setCategoriaId(c.id); setErrores((x) => ({ ...x, categoria: undefined })) }}>{c.nombre}</Chip>
              ))}
            </div>
            {errores.categoria ? <p id={errCat} className="mt-1 text-sm text-danger">{errores.categoria}</p> : null}
          </div>

          <div>
            <label htmlFor="descripcion" className="text-sm font-medium text-text-muted">Descripción (opcional)</label>
            <input id="descripcion" maxLength={120} autoComplete="off" placeholder="Ej.: almuerzo con Ana" value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border-input bg-bg px-4 placeholder:text-text-muted" />
          </div>

          <div>
            <p id="lab-fecha" className="text-sm font-medium text-text-muted">Fecha</p>
            <div role="radiogroup" aria-labelledby="lab-fecha" className="mt-2 flex flex-wrap gap-2">
              <Chip activo={cuando === 'hoy'} onClick={() => setCuando('hoy')}>Hoy</Chip>
              <Chip activo={cuando === 'ayer'} onClick={() => setCuando('ayer')}>Ayer</Chip>
              <Chip activo={cuando === 'otra'} onClick={() => setCuando('otra')}>Otra fecha</Chip>
            </div>
            {cuando === 'otra' ? (
              <input type="date" aria-label="Fecha del movimiento" max={hoy} value={fechaOtra} onChange={(e) => setFechaOtra(e.target.value || hoy)}
                className="mt-2 h-11 w-full rounded-md border border-border-input bg-bg px-4" />
            ) : null}
          </div>

          <div>
            <p id="lab-medio" className="text-sm font-medium text-text-muted">Medio de pago (opcional)</p>
            <div role="radiogroup" aria-labelledby="lab-medio" className="mt-2 flex flex-wrap gap-2">
              {MEDIOS_PAGO.map((m) => (
                <Chip key={m.id} activo={medio === m.id} onClick={() => setMedio(medio === m.id ? '' : m.id)}>{m.nombre}</Chip>
              ))}
            </div>
          </div>

          {errores.general ? <p role="alert" className="text-sm text-danger">{errores.general}</p> : null}

          <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-bg px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
            <button type="button" onClick={onCerrar} className="h-[52px] flex-1 rounded-md border border-border bg-surface font-semibold">Cancelar</button>
            <button type="submit" disabled={guardando} aria-busy={guardando}
              className="h-[52px] flex-[2] rounded-md bg-accent font-semibold text-on-accent disabled:opacity-45">
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
