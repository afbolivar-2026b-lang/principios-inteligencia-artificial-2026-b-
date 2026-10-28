import { Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { mesDe, nombreMes } from '../dates'
import { db, ErrorDeDatos, fijarPresupuesto, quitarPresupuesto, type Categoria, type Movimiento, type Presupuesto } from '../db'
import { formatoCOP, formatoDigitos, soloDigitos } from '../money'
import { estadoPresupuesto, filasPresupuesto, totalesPresupuesto, type FilaPresupuesto } from '../presupuestos'
import { BarraProgreso } from './BarraProgreso'
import { Chip } from './Chip'
import { Hoja } from './Hoja'
import { IconoCategoria } from './iconos'

interface Props {
  cats: Categoria[]
  pres: Presupuesto[]
  movs: Movimiento[]
  hoy: string
  onAviso: (texto: string) => void
}

export function Presupuestos({ cats, pres, movs, hoy, onAviso }: Props) {
  const mes = mesDe(hoy)
  const filas = useMemo(() => filasPresupuesto(cats, pres, movs, mes), [cats, pres, movs, mes])
  const totales = totalesPresupuesto(filas)
  const [editando, setEditando] = useState<FilaPresupuesto | null>(null)
  const totalEstado = totales.limite > 0 ? estadoPresupuesto(totales.gastado, totales.limite, 80) : null

  return (
    <>
      <header className="px-4 pb-2 pt-[max(env(safe-area-inset-top),1rem)]">
        <h1 className="text-2xl font-bold">Presupuestos</h1>
        <p className="text-sm text-text-muted">{nombreMes(`${mes}-01`)} {mes.slice(0, 4)} · cada límite se repite todos los meses hasta que lo cambies</p>
      </header>
      <main className="flex flex-col gap-3 px-4">
        {totalEstado ? (
          <section aria-label="Resumen de presupuestos" className="rounded-lg border border-border bg-surface p-4 shadow-card">
            <p className="text-sm text-text-muted">{totales.restante >= 0 ? 'Te quedan' : 'Te pasaste por'}</p>
            <p className="text-3xl font-extrabold">{formatoCOP(Math.abs(totales.restante))}</p>
            <p className="mb-2 text-sm text-text-muted">de {formatoCOP(totales.limite)} presupuestados en {totales.conLimite} {totales.conLimite === 1 ? 'categoría' : 'categorías'}</p>
            <BarraProgreso estado={totalEstado} etiqueta="Avance de todos los presupuestos" />
          </section>
        ) : (
          <section className="rounded-lg border border-border bg-surface p-6 text-center shadow-card">
            <Target aria-hidden="true" className="mx-auto size-10 text-text-muted" />
            <p className="mt-3 font-semibold">Todavía no has puesto ningún límite</p>
            <p className="mt-1 text-sm text-text-muted">Toca una categoría de la lista y escribe cuánto quieres gastar al mes. La app te avisa antes de que te pases.</p>
          </section>
        )}

        <ul className="flex flex-col gap-2">
          {filas.map((f) => (
            <li key={f.categoria.id}>
              <button type="button" onClick={() => setEditando(f)}
                className="flex w-full flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-left shadow-card">
                <span className="sr-only">Cambiar límite. </span>
                <span className="flex items-center gap-3">
                  <IconoCategoria nombre={f.categoria.icono} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{f.categoria.nombre}</span>
                    <span className="block text-xs text-text-muted">
                      {f.presupuesto ? `${formatoCOP(f.gastado)} de ${formatoCOP(f.presupuesto.limite)}` : `Sin límite · gastado ${formatoCOP(f.gastado)}`}
                    </span>
                  </span>
                  {f.presupuesto ? null : <span className="text-sm font-semibold text-accent">Poner límite</span>}
                </span>
                {f.estado ? <BarraProgreso estado={f.estado} etiqueta={`Presupuesto de ${f.categoria.nombre}`} /> : null}
              </button>
            </li>
          ))}
        </ul>
      </main>
      {editando ? (
        <HojaPresupuesto fila={editando} mes={mes} onCerrar={() => setEditando(null)} onHecho={(t) => { setEditando(null); onAviso(t) }} />
      ) : null}
    </>
  )
}

const UMBRALES = [70, 80, 90, 100]

function HojaPresupuesto({ fila, mes, onCerrar, onHecho }: { fila: FilaPresupuesto; mes: string; onCerrar: () => void; onHecho: (t: string) => void }) {
  const [digitos, setDigitos] = useState(fila.presupuesto ? String(fila.presupuesto.limite) : '')
  const [umbral, setUmbral] = useState(fila.presupuesto?.umbral_alerta ?? 80)
  const [error, setError] = useState('')
  const [confirmaQuitar, setConfirmaQuitar] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    try {
      await fijarPresupuesto(db, { categoria_id: fila.categoria.id, mes, limite: soloDigitos(digitos), umbral_alerta: umbral })
      onHecho(`Límite de ${fila.categoria.nombre}: ${formatoCOP(soloDigitos(digitos))} al mes`)
    } catch (err) {
      setError(err instanceof ErrorDeDatos ? err.message : 'No se pudo guardar')
    }
  }

  async function quitar() {
    await quitarPresupuesto(db, fila.categoria.id)
    onHecho(`Quitaste el límite de ${fila.categoria.nombre}`)
  }

  const pie = confirmaQuitar ? (
    <>
      <p key="pregunta" className="flex-1 self-center text-sm font-semibold">¿Quitar este límite?</p>
      <button key="no" type="button" onClick={() => setConfirmaQuitar(false)} className="h-[52px] rounded-md border border-border bg-surface px-4 font-semibold">No</button>
      <button key="si" type="button" onClick={quitar} className="h-[52px] rounded-md bg-danger px-4 font-semibold text-on-accent">Sí, quitar</button>
    </>
  ) : (
    <>
      {fila.presupuesto ? <button key="quitar" type="button" onClick={() => setConfirmaQuitar(true)} className="h-[52px] rounded-md border border-danger px-4 font-semibold text-danger">Quitar</button> : null}
      <button key="guardar" type="submit" form="form-presupuesto" className="h-[52px] flex-1 rounded-md bg-accent font-semibold text-on-accent">Guardar límite</button>
    </>
  )

  return (
    <Hoja titulo={`Límite de ${fila.categoria.nombre}`} onCerrar={onCerrar} pie={pie}>
      <form id="form-presupuesto" onSubmit={guardar} noValidate className="flex flex-col gap-5">
        <div>
          <label htmlFor="limite" className="text-sm font-medium text-text-muted">Cuánto quieres gastar al mes</label>
          <input id="limite" data-foco inputMode="numeric" autoComplete="off" placeholder="$0" value={digitos ? `$${formatoDigitos(digitos)}` : ''}
            onChange={(e) => { setDigitos(e.target.value.replace(/\D/g, '').slice(0, 12)); setError('') }}
            aria-invalid={error ? true : undefined} aria-describedby={error ? 'err-limite' : undefined}
            className={`mt-1 h-[52px] w-full rounded-md border bg-bg px-4 text-xl font-bold placeholder:text-text-muted ${error ? 'border-danger' : 'border-border-input'}`} />
          {error ? <p id="err-limite" className="mt-1 text-sm text-danger">{error}</p> : null}
        </div>
        <div>
          <p id="lab-umbral" className="text-sm font-medium text-text-muted">Avisarme cuando lleve el…</p>
          <div role="radiogroup" aria-labelledby="lab-umbral" className="mt-2 flex flex-wrap gap-2">
            {UMBRALES.map((u) => <Chip key={u} activo={umbral === u} onClick={() => setUmbral(u)}>{u} %</Chip>)}
          </div>
        </div>
        <p className="text-sm text-text-muted">Este valor se usa desde {nombreMes(`${mes}-01`).toLowerCase()} en adelante. Los gastos que ya anotaste este mes cuentan.</p>
      </form>
    </Hoja>
  )
}
