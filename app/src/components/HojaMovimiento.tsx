import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { sumarDias } from '../dates'
import { db, actualizarMovimiento, ErrorDeDatos, FECHA_MINIMA, guardarMovimiento, MEDIOS_PAGO, type Categoria, type MedioPago, type Movimiento, type TipoMov } from '../db'
import { formatoDigitos, soloDigitos } from '../money'
import type { Propuesta } from '../entenderLocal'
import { Chip, Segmentos } from './Chip'
import { EntradaInteligente, type OrigenEntrada } from './EntradaInteligente'
import { Hoja } from './Hoja'

interface Props {
  categorias: Categoria[]
  hoy: string
  /** código de la IA; vacío si no está activada */
  codigoIA: string
  /** Si viene un movimiento, la hoja sirve para editarlo o borrarlo */
  editando: Movimiento | null
  onCerrar: () => void
  onGuardado: (mov: Movimiento, esNuevo: boolean) => void
  onBorrar: (mov: Movimiento) => void
}

type Cuando = 'hoy' | 'ayer' | 'otra'

export function HojaMovimiento({ categorias, hoy, codigoIA, editando, onCerrar, onGuardado, onBorrar }: Props) {
  const errMonto = useId()
  const errCat = useId()
  const [tipo, setTipo] = useState<TipoMov>(editando?.tipo ?? 'gasto')
  const [digitos, setDigitos] = useState(editando ? String(editando.monto) : '')
  const [categoriaId, setCategoriaId] = useState(editando?.categoria_id ?? '')
  const [descripcion, setDescripcion] = useState(editando?.descripcion ?? '')
  const [cuando, setCuando] = useState<Cuando>(!editando || editando.fecha === hoy ? 'hoy' : editando.fecha === sumarDias(hoy, -1) ? 'ayer' : 'otra')
  const [fechaOtra, setFechaOtra] = useState(editando?.fecha ?? hoy)
  const [medio, setMedio] = useState<MedioPago | ''>(editando?.medio_pago ?? '')
  const [errores, setErrores] = useState<{ monto?: string; categoria?: string; general?: string }>({})
  const [guardando, setGuardando] = useState(false)
  const [confirmaBorrar, setConfirmaBorrar] = useState(false)
  const enviando = useRef(false) // seguro contra dos envíos en el mismo instante (el estado se actualiza un poco tarde)
  const errorGeneral = useRef<HTMLParagraphElement>(null)
  const [origen, setOrigen] = useState<'manual' | OrigenEntrada>('manual')

  // si hay un error general, que se vea aunque el formulario sea largo
  useEffect(() => { if (errores.general) errorGeneral.current?.scrollIntoView({ block: 'center' }) }, [errores.general])

  const fecha = cuando === 'hoy' ? hoy : cuando === 'ayer' ? sumarDias(hoy, -1) : fechaOtra
  // en edición se muestran también las categorías archivadas, solo si es la que ya tiene el movimiento
  const delTipo = categorias.filter((c) => c.tipo === tipo && (!c.archivada || c.id === editando?.categoria_id))

  function cambiarTipo(t: TipoMov) {
    setTipo(t); setCategoriaId(''); setErrores({})
  }

  /** Llena el formulario con lo que entendió la IA o el lector local. El usuario siempre revisa antes de guardar. */
  function aplicar(p: Propuesta, desde: OrigenEntrada) {
    setTipo(p.tipo)
    setDigitos(String(p.monto))
    setCategoriaId(categorias.find((c) => !c.archivada && c.tipo === p.tipo && c.nombre === p.categoria)?.id ?? '')
    setDescripcion(p.descripcion)
    setMedio(p.medio_pago ?? '')
    setCuando(p.fecha === hoy ? 'hoy' : p.fecha === sumarDias(hoy, -1) ? 'ayer' : 'otra')
    setFechaOtra(p.fecha)
    setOrigen(desde)
    setErrores({})
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (enviando.current) return
    const monto = soloDigitos(digitos)
    const nuevos: typeof errores = {}
    if (monto <= 0) nuevos.monto = 'Escribe un monto mayor a 0'
    if (!categoriaId) nuevos.categoria = 'Elige una categoría'
    setErrores(nuevos)
    if (nuevos.monto || nuevos.categoria) { if (nuevos.monto) document.getElementById('monto')?.focus(); return }
    enviando.current = true
    setGuardando(true)
    try {
      const mov = editando
        ? await actualizarMovimiento(db, editando.id, { monto, categoria_id: categoriaId, fecha, descripcion, medio_pago: medio || null })
        : await guardarMovimiento(db, { tipo, monto, categoria_id: categoriaId, fecha, descripcion, origen, ...(medio ? { medio_pago: medio } : {}) })
      onGuardado(mov, !editando)
    } catch (err) {
      setErrores({ general: err instanceof ErrorDeDatos ? err.message : 'No se pudo guardar. Intenta de nuevo.' })
      enviando.current = false
      setGuardando(false)
    }
  }

  const titulo = `${editando ? 'Editar' : 'Nuevo'} ${tipo}`
  const pie = confirmaBorrar && editando ? (
    <>
      <p key="pregunta" className="flex-1 self-center text-sm font-semibold">¿Borrar este {editando.tipo}?</p>
      <button key="no" type="button" onClick={() => setConfirmaBorrar(false)} className="h-[52px] rounded-md border border-border bg-surface px-4 font-semibold">No</button>
      <button key="si" type="button" onClick={() => onBorrar(editando)} className="h-[52px] rounded-md bg-danger px-4 font-semibold text-on-accent">Sí, borrar</button>
    </>
  ) : (
    <>
      {editando ? (
        <button key="borrar" type="button" onClick={() => setConfirmaBorrar(true)} className="h-[52px] rounded-md border border-danger px-4 font-semibold text-danger">Borrar</button>
      ) : (
        <button key="cancelar" type="button" onClick={onCerrar} className="h-[52px] flex-1 rounded-md border border-border bg-surface font-semibold">Cancelar</button>
      )}
      <button key="guardar" type="submit" form="form-movimiento" disabled={guardando} aria-busy={guardando}
        className="h-[52px] flex-[2] rounded-md bg-accent font-semibold text-on-accent disabled:opacity-45">
        {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar'}
      </button>
    </>
  )

  return (
    <Hoja titulo={titulo} onCerrar={onCerrar} pie={pie}>
      <form id="form-movimiento" onSubmit={enviar} noValidate className="flex flex-col gap-5">
        {editando ? null : <EntradaInteligente categorias={categorias} hoy={hoy} codigoIA={codigoIA} onPropuesta={aplicar} />}
        {editando ? null : (
          <Segmentos etiqueta="Tipo de movimiento" valor={tipo} onCambiar={cambiarTipo} opciones={[{ id: 'gasto', nombre: 'Gasto' }, { id: 'ingreso', nombre: 'Ingreso' }]} />
        )}

        <div>
          <label htmlFor="monto" className="text-sm font-medium text-text-muted">Monto en pesos</label>
          <input id="monto" data-foco inputMode="numeric" autoComplete="off" placeholder="$0"
            value={digitos ? `$${formatoDigitos(digitos)}` : ''} onChange={(e) => setDigitos(e.target.value.replace(/\D/g, '').slice(0, 12))}
            aria-invalid={errores.monto ? true : undefined} aria-describedby={errores.monto ? errMonto : undefined}
            className={`mt-1 h-[52px] w-full rounded-md border bg-bg px-4 text-xl font-bold placeholder:text-text-muted ${errores.monto ? 'border-danger' : 'border-border-input'}`} />
          {errores.monto ? <p id={errMonto} className="mt-1 text-sm text-danger">{errores.monto}</p> : null}
        </div>

        <div>
          <p id="lab-cat" className="text-sm font-medium text-text-muted">Categoría</p>
          <div role="radiogroup" aria-labelledby="lab-cat" aria-describedby={errores.categoria ? errCat : undefined} className="mt-2 flex flex-wrap gap-2">
            {delTipo.map((c) => (
              <Chip key={c.id} activo={categoriaId === c.id} onClick={() => { setCategoriaId(c.id); setErrores((x) => ({ ...x, categoria: undefined })) }}>{c.nombre}{c.archivada ? ' (archivada)' : ''}</Chip>
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
            <input type="date" aria-label="Fecha del movimiento" min={FECHA_MINIMA} max={hoy} value={fechaOtra} onChange={(e) => setFechaOtra(e.target.value || hoy)}
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

        {errores.general ? <p ref={errorGeneral} role="alert" className="text-sm font-medium text-danger">{errores.general}</p> : null}
      </form>
    </Hoja>
  )
}
