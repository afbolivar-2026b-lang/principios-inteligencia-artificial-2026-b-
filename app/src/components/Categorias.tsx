import { Plus } from 'lucide-react'
import { useState } from 'react'
import { archivarCategoria, db, ErrorDeDatos, guardarCategoria, ICONOS_CATEGORIA, type Categoria, type TipoMov } from '../db'
import { Segmentos } from './Chip'
import { Hoja } from './Hoja'
import { Icono, IconoCategoria, NOMBRE_ICONO } from './iconos'
import { SubPantalla } from './SubPantalla'

export function Categorias({ cats, onVolver, onAviso }: { cats: Categoria[]; onVolver: () => void; onAviso: (t: string) => void }) {
  const [tipo, setTipo] = useState<TipoMov>('gasto')
  const [hoja, setHoja] = useState<{ editando: Categoria | null } | null>(null)
  const lista = cats.filter((c) => c.tipo === tipo).sort((a, b) => Number(a.archivada) - Number(b.archivada) || a.orden - b.orden)

  return (
    <SubPantalla titulo="Categorías" onVolver={onVolver}>
      <div className="flex flex-col gap-3">
        <Segmentos etiqueta="Tipo de categoría" valor={tipo} onCambiar={setTipo} opciones={[{ id: 'gasto', nombre: 'Gastos' }, { id: 'ingreso', nombre: 'Ingresos' }]} />
        <ul className="flex flex-col gap-2">
          {lista.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setHoja({ editando: c })} className={`flex min-h-[56px] w-full items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left shadow-card ${c.archivada ? 'opacity-70' : ''}`}>
                <IconoCategoria nombre={c.icono} />
                <span className="flex-1 font-semibold">{c.nombre}</span>
                {c.archivada ? <span className="rounded-pill border border-border-input px-2 py-0.5 text-xs text-text-muted">Archivada</span> : null}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setHoja({ editando: null })} className="flex h-[52px] items-center justify-center gap-2 rounded-md bg-accent font-semibold text-on-accent">
          <Plus aria-hidden="true" className="size-5" /> Nueva categoría
        </button>
      </div>
      {hoja ? <HojaCategoria editando={hoja.editando} tipo={tipo} onCerrar={() => setHoja(null)} onHecho={(t) => { setHoja(null); onAviso(t) }} /> : null}
    </SubPantalla>
  )
}

function HojaCategoria({ editando, tipo, onCerrar, onHecho }: { editando: Categoria | null; tipo: TipoMov; onCerrar: () => void; onHecho: (t: string) => void }) {
  const [nombre, setNombre] = useState(editando?.nombre ?? '')
  const [icono, setIcono] = useState(editando?.icono ?? 'tag')
  const [error, setError] = useState('')

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    try {
      const c = await guardarCategoria(db, { id: editando?.id, nombre, icono, tipo: editando?.tipo ?? tipo })
      onHecho(editando ? `Guardaste "${c.nombre}"` : `Creaste "${c.nombre}"`)
    } catch (err) {
      setError(err instanceof ErrorDeDatos ? err.message : 'No se pudo guardar')
    }
  }

  async function alternarArchivo() {
    if (!editando) return
    try {
      await archivarCategoria(db, editando.id, !editando.archivada)
      onHecho(editando.archivada ? `"${editando.nombre}" volvió a estar activa` : `Archivaste "${editando.nombre}". Tus movimientos anteriores se conservan.`)
    } catch (err) {
      setError(err instanceof ErrorDeDatos ? err.message : 'No se pudo cambiar')
    }
  }

  const pie = (
    <>
      {editando ? (
        <button type="button" onClick={alternarArchivo} className="h-[52px] rounded-md border border-border-input px-4 font-semibold">
          {editando.archivada ? 'Restaurar' : 'Archivar'}
        </button>
      ) : null}
      <button type="submit" form="form-categoria" className="h-[52px] flex-1 rounded-md bg-accent font-semibold text-on-accent">Guardar</button>
    </>
  )

  return (
    <Hoja titulo={editando ? 'Editar categoría' : `Nueva categoría de ${tipo === 'gasto' ? 'gastos' : 'ingresos'}`} onCerrar={onCerrar} pie={pie}>
      <form id="form-categoria" onSubmit={guardar} noValidate className="flex flex-col gap-5">
        <div>
          <label htmlFor="nombre-cat" className="text-sm font-medium text-text-muted">Nombre</label>
          <input id="nombre-cat" data-foco maxLength={30} autoComplete="off" value={nombre} onChange={(e) => { setNombre(e.target.value); setError('') }}
            aria-invalid={error ? true : undefined} aria-describedby={error ? 'err-cat' : undefined}
            className={`mt-1 h-11 w-full rounded-md border bg-bg px-4 ${error ? 'border-danger' : 'border-border-input'}`} />
          {error ? <p id="err-cat" className="mt-1 text-sm text-danger">{error}</p> : null}
        </div>
        <div>
          <p id="lab-icono" className="text-sm font-medium text-text-muted">Ícono</p>
          <div role="radiogroup" aria-labelledby="lab-icono" className="mt-2 grid grid-cols-5 gap-2">
            {ICONOS_CATEGORIA.map((i) => (
              <button key={i} type="button" role="radio" aria-checked={icono === i} aria-label={NOMBRE_ICONO[i]} onClick={() => setIcono(i)}
                className={`flex size-12 items-center justify-center rounded-md border ${icono === i ? 'border-accent bg-accent-soft text-accent' : 'border-border-input bg-bg'}`}>
                <Icono nombre={i} className="size-6" />
              </button>
            ))}
          </div>
        </div>
      </form>
    </Hoja>
  )
}
