import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { etiquetaDia, mesDe } from '../dates'
import { coincide } from '../busqueda'
import type { Categoria, Movimiento } from '../db'
import { formatoCOP } from '../money'
import { FilaMovimiento } from './FilaMovimiento'
import { SelectorMes } from './SelectorMes'
import { SubPantalla } from './SubPantalla'
import { Segmentos } from './Chip'

type FiltroTipo = 'todos' | 'gasto' | 'ingreso'

interface Props {
  movs: Movimiento[]
  cats: Categoria[]
  hoy: string
  onAbrir: (m: Movimiento) => void
  onVolver: () => void
}

export function Movimientos({ movs, cats, hoy, onAbrir, onVolver }: Props) {
  const [mes, setMes] = useState(mesDe(hoy))
  const [tipo, setTipo] = useState<FiltroTipo>('todos')
  const [categoria, setCategoria] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const porId = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats])

  const lista = useMemo(() => {
    return movs
      .filter((m) => mesDe(m.fecha) === mes && (tipo === 'todos' || m.tipo === tipo) && (!categoria || m.categoria_id === categoria))
      .filter((m) => coincide(`${m.descripcion} ${porId.get(m.categoria_id)?.nombre ?? ''}`, busqueda))
      .sort((a, b) => (a.fecha === b.fecha ? b.creado_en.localeCompare(a.creado_en) : b.fecha.localeCompare(a.fecha)))
  }, [movs, mes, tipo, categoria, busqueda, porId])

  const dias = useMemo(() => {
    const grupos = new Map<string, Movimiento[]>()
    for (const m of lista) grupos.set(m.fecha, [...(grupos.get(m.fecha) ?? []), m])
    return [...grupos.entries()]
  }, [lista])

  const gastos = lista.filter((m) => m.tipo === 'gasto').reduce((a, m) => a + m.monto, 0)
  const ingresos = lista.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0)
  const catsDelFiltro = cats.filter((c) => tipo === 'todos' || c.tipo === tipo)
  const hayFiltros = tipo !== 'todos' || categoria !== '' || busqueda !== ''

  return (
    <SubPantalla titulo="Movimientos" onVolver={onVolver}>
      <div className="flex flex-col gap-3">
        <SelectorMes mes={mes} mesMax={mesDe(hoy)} onCambiar={setMes} />
        <Segmentos etiqueta="Tipo" valor={tipo} onCambiar={(t) => { setTipo(t); setCategoria('') }}
          opciones={[{ id: 'todos', nombre: 'Todos' }, { id: 'gasto', nombre: 'Gastos' }, { id: 'ingreso', nombre: 'Ingresos' }]} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="f-cat" className="sr-only">Categoría</label>
            <select id="f-cat" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="h-11 w-full rounded-md border border-border-input bg-bg px-3 text-sm">
              <option value="">Todas las categorías</option>
              {catsDelFiltro.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.archivada ? ' (archivada)' : ''}</option>)}
            </select>
          </div>
          <div className="relative">
            <label htmlFor="f-q" className="sr-only">Buscar</label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-5 text-text-muted" />
            <input id="f-q" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar"
              className="h-11 w-full rounded-md border border-border-input bg-bg pl-10 pr-3 text-sm placeholder:text-text-muted" />
          </div>
        </div>

        <p className="text-sm text-text-muted" aria-live="polite">
          {lista.length} {lista.length === 1 ? 'movimiento' : 'movimientos'} · Gastos {formatoCOP(gastos)} · Ingresos {formatoCOP(ingresos)}
        </p>

        {dias.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-center">
            <p className="font-semibold">{hayFiltros ? 'No hay movimientos con estos filtros' : 'No hay movimientos en este mes'}</p>
            {hayFiltros ? (
              <button type="button" onClick={() => { setTipo('todos'); setCategoria(''); setBusqueda('') }} className="mt-3 h-11 rounded-md border border-border-input px-4 font-semibold">
                Quitar filtros
              </button>
            ) : null}
          </div>
        ) : (
          dias.map(([fecha, delDia]) => {
            const neto = delDia.reduce((a, m) => a + (m.tipo === 'ingreso' ? m.monto : -m.monto), 0)
            return (
              <section key={fecha} aria-label={etiquetaDia(fecha, hoy)}>
                <div className="flex items-center justify-between pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <h2>{etiquetaDia(fecha, hoy)}</h2>
                  <span>{neto < 0 ? '-' : '+'}{formatoCOP(Math.abs(neto))}</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {delDia.map((m) => <FilaMovimiento key={m.id} mov={m} categoria={porId.get(m.categoria_id)} hoy={hoy} onAbrir={onAbrir} sinFecha />)}
                </ul>
              </section>
            )
          })
        )}
      </div>
    </SubPantalla>
  )
}
