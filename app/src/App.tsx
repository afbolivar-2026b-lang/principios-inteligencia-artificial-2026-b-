import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Receipt } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { hoyISO, mesDe, nombreMes } from './dates'
import { asegurarCategorias, borrarMovimiento, cargarDemo, db, esDemo, type Movimiento } from './db'
import { gastoSemana, resumenMes } from './stats'
import { Aviso, type DatosAviso } from './components/Aviso'
import { BarraPestanas, type Pestana } from './components/BarraPestanas'
import { Cabecera } from './components/Cabecera'
import { FilaMovimiento } from './components/FilaMovimiento'
import { GraficoSemana } from './components/GraficoSemana'
import { HojaAgregar } from './components/HojaAgregar'
import { MiniTarjetas } from './components/MiniTarjetas'
import { Pendiente } from './components/Pendiente'
import { TarjetaBalance } from './components/TarjetaBalance'

/** La fecha de hoy en Colombia, que se actualiza si la app queda abierta pasada la medianoche. */
function useHoy(): string {
  const [hoy, setHoy] = useState(() => hoyISO())
  useEffect(() => {
    const revisar = () => setHoy(hoyISO())
    const t = setInterval(revisar, 60_000)
    document.addEventListener('visibilitychange', revisar)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', revisar) }
  }, [])
  return hoy
}

const PENDIENTES: Record<Exclude<Pestana, 'inicio'>, { titulo: string; texto: string }> = {
  analisis: { titulo: 'Análisis', texto: 'Aquí van los gráficos por categoría y por mes. Llega en un próximo paso.' },
  presupuestos: { titulo: 'Presupuestos', texto: 'Aquí pondrás un límite mensual por categoría. Llega en un próximo paso.' },
  metas: { titulo: 'Metas de ahorro', texto: 'Aquí crearás tus metas. Llega en un próximo paso.' },
  ajustes: { titulo: 'Ajustes', texto: 'Aquí irán el respaldo, el bloqueo y el modo oscuro. Llega en un próximo paso.' },
}

export default function App() {
  const hoy = useHoy()
  const [pestana, setPestana] = useState<Pestana>('inicio')
  const [hojaAbierta, setHojaAbierta] = useState(false)
  const [aviso, setAviso] = useState<DatosAviso | null>(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    void (async () => {
      await asegurarCategorias()
      if (esDemo) await cargarDemo(db, hoyISO())
      setListo(true)
    })()
  }, [])

  const categorias = useLiveQuery(() => db.categorias.orderBy('orden').toArray(), [])
  const movimientos = useLiveQuery(() => db.movimientos.toArray(), [])

  const ordenados = useMemo(
    () => [...(movimientos ?? [])].sort((a, b) => (a.fecha === b.fecha ? b.creado_en.localeCompare(a.creado_en) : b.fecha.localeCompare(a.fecha))),
    [movimientos],
  )
  const resumen = useMemo(() => resumenMes(ordenados, mesDe(hoy)), [ordenados, hoy])
  const semana = useMemo(() => gastoSemana(ordenados, hoy), [ordenados, hoy])
  const porId = useMemo(() => new Map((categorias ?? []).map((c) => [c.id, c])), [categorias])

  const cerrarAviso = useCallback(() => setAviso(null), [])

  function alGuardar(mov: Movimiento) {
    setHojaAbierta(false)
    setAviso({ texto: 'Guardado', accion: { etiqueta: 'Deshacer', alHacer: () => void borrarMovimiento(db, mov.id) } })
  }

  const cargando = !listo || categorias === undefined || movimientos === undefined

  return (
    <div className="mx-auto min-h-dvh max-w-content bg-bg pb-[calc(var(--tab-bar)+6.5rem)]">
      {pestana === 'inicio' ? (
        <>
          <Cabecera onProximamente={(texto) => setAviso({ texto })} />
          <main className="flex flex-col gap-3 px-4">
            <h1 className="sr-only">Inicio</h1>
            {cargando ? (
              <div aria-busy="true" aria-label="Cargando" className="flex flex-col gap-3">
                <div className="skeleton h-40 rounded-lg" />
                <div className="grid grid-cols-2 gap-3"><div className="skeleton h-36 rounded-lg" /><div className="skeleton h-36 rounded-lg" /></div>
                <div className="skeleton h-36 rounded-lg" />
              </div>
            ) : (
              <>
                <TarjetaBalance mes={nombreMes(hoy)} resumen={resumen} />
                <MiniTarjetas semana={semana} onMetas={() => setPestana('metas')} />
                <GraficoSemana dias={semana.dias} hoy={hoy} />
                <section aria-labelledby="titulo-actividad" className="mt-1">
                  <h2 id="titulo-actividad" className="mb-2 text-xl font-semibold">Actividad reciente</h2>
                  {ordenados.length === 0 ? (
                    <div className="rounded-lg border border-border bg-surface p-6 text-center shadow-card">
                      <Receipt aria-hidden="true" className="mx-auto size-10 text-text-muted" />
                      <p className="mt-3 font-semibold">Todavía no has anotado nada</p>
                      <p className="mt-1 text-sm text-text-muted">Anota tu primer gasto o ingreso y aquí verás cómo va tu mes.</p>
                      <button type="button" onClick={() => setHojaAbierta(true)} className="mt-4 h-11 rounded-md bg-accent px-5 font-semibold text-on-accent">
                        Anotar mi primer gasto
                      </button>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {ordenados.slice(0, 6).map((m) => (
                        <FilaMovimiento key={m.id} mov={m} categoria={porId.get(m.categoria_id)} hoy={hoy} />
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </main>
        </>
      ) : (
        <main>
          <Pendiente {...PENDIENTES[pestana]} />
        </main>
      )}

      {pestana === 'inicio' && !cargando ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tab-bar)+1.25rem)] z-10 px-4">
          <div className="mx-auto flex max-w-content justify-end px-4">
            <button type="button" onClick={() => setHojaAbierta(true)} aria-label="Agregar movimiento"
              className="pointer-events-auto flex size-14 items-center justify-center rounded-pill bg-accent text-on-accent shadow-pop">
              <Plus aria-hidden="true" className="size-8" />
            </button>
          </div>
        </div>
      ) : null}

      <BarraPestanas activa={pestana} onCambiar={setPestana} />
      <Aviso aviso={aviso} onCerrar={cerrarAviso} />
      <HojaAgregar abierta={hojaAbierta} categorias={categorias ?? []} hoy={hoy} onCerrar={() => setHojaAbierta(false)} onGuardado={alGuardar} />
    </div>
  )
}
