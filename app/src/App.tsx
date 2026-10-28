import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Receipt } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { diasDesde, textoAvisoPresupuesto } from './avisos'
import { hoyISO, mesDe, nombreMes } from './dates'
import { asegurarCategorias, borrarMovimiento, cargarDemo, db, esDemo, leerAjustes, restaurarMovimiento, type Movimiento } from './db'
import { filasPresupuesto } from './presupuestos'
import { gastoSemana, resumenMes } from './stats'
import { Ajustes } from './components/Ajustes'
import { Analisis } from './components/Analisis'
import { Aviso, type DatosAviso } from './components/Aviso'
import { AvisosInicio } from './components/AvisosInicio'
import { BarraPestanas, type Pestana } from './components/BarraPestanas'
import { Cabecera } from './components/Cabecera'
import { Categorias } from './components/Categorias'
import { FilaMovimiento } from './components/FilaMovimiento'
import { GraficoSemana } from './components/GraficoSemana'
import { HojaMovimiento } from './components/HojaMovimiento'
import { MiniTarjetas } from './components/MiniTarjetas'
import { Movimientos } from './components/Movimientos'
import { Pendiente } from './components/Pendiente'
import { Presupuestos } from './components/Presupuestos'
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

type Vista = 'movimientos' | 'categorias' | null

export default function App() {
  const hoy = useHoy()
  const [pestana, setPestana] = useState<Pestana>('inicio')
  const [vista, setVista] = useState<Vista>(null)
  const [hoja, setHoja] = useState<{ editando: Movimiento | null } | null>(null)
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
  const presupuestos = useLiveQuery(() => db.presupuestos.toArray(), [])
  const ajustes = useLiveQuery(() => leerAjustes(db), [])

  const tema = ajustes?.tema
  useEffect(() => {
    if (!tema) return
    if (tema === 'sistema') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = tema
  }, [tema])

  const cats = useMemo(() => categorias ?? [], [categorias])
  const movs = useMemo(() => movimientos ?? [], [movimientos])
  const pres = useMemo(() => presupuestos ?? [], [presupuestos])
  const ordenados = useMemo(
    () => [...movs].sort((a, b) => (a.fecha === b.fecha ? b.creado_en.localeCompare(a.creado_en) : b.fecha.localeCompare(a.fecha))),
    [movs],
  )
  const resumen = useMemo(() => resumenMes(movs, mesDe(hoy)), [movs, hoy])
  const semana = useMemo(() => gastoSemana(movs, hoy), [movs, hoy])
  const filas = useMemo(() => filasPresupuesto(cats, pres, movs, mesDe(hoy)), [cats, pres, movs, hoy])
  const porId = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats])

  const cerrarAviso = useCallback(() => setAviso(null), [])
  const avisar = useCallback((texto: string) => setAviso({ texto }), [])
  const irA = (p: Pestana) => { setPestana(p); setVista(null) }

  async function alGuardar(mov: Movimiento, esNuevo: boolean) {
    const previo = hoja?.editando ?? null
    setHoja(null)
    const extra = await textoAvisoPresupuesto(db, mov)
    const base = esNuevo ? 'Guardado' : 'Cambios guardados'
    setAviso({
      texto: extra ? `${base} · ${extra}` : base,
      accion: { etiqueta: 'Deshacer', alHacer: () => void (esNuevo ? borrarMovimiento(db, mov.id) : previo ? restaurarMovimiento(db, previo) : undefined) },
    })
  }

  async function alBorrar(mov: Movimiento) {
    await borrarMovimiento(db, mov.id)
    setHoja(null)
    setAviso({ texto: 'Movimiento borrado', accion: { etiqueta: 'Deshacer', alHacer: () => void restaurarMovimiento(db, mov) } })
  }

  const cargando = !listo || categorias === undefined || movimientos === undefined
  const abrirNuevo = () => setHoja({ editando: null })
  const abrirEditar = (m: Movimiento) => setHoja({ editando: m })

  let contenido
  if (vista === 'movimientos') {
    contenido = <Movimientos movs={movs} cats={cats} hoy={hoy} onAbrir={abrirEditar} onVolver={() => setVista(null)} />
  } else if (vista === 'categorias') {
    contenido = <Categorias cats={cats} onVolver={() => setVista(null)} onAviso={avisar} />
  } else if (pestana === 'inicio') {
    contenido = (
      <>
        <Cabecera onProximamente={avisar} onAjustes={() => irA('ajustes')} />
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
              <AvisosInicio filas={filas} diasSinRespaldo={diasDesde(ajustes?.ultimo_respaldo)} cantidadMovimientos={movs.length}
                onPresupuestos={() => irA('presupuestos')} onRespaldo={() => irA('ajustes')} />
              <MiniTarjetas semana={semana} onMetas={() => irA('metas')} />
              <GraficoSemana dias={semana.dias} hoy={hoy} />
              <section aria-labelledby="titulo-actividad" className="mt-1">
                <div className="mb-2 flex items-center justify-between">
                  <h2 id="titulo-actividad" className="text-xl font-semibold">Actividad reciente</h2>
                  {ordenados.length > 0 ? (
                    <button type="button" onClick={() => setVista('movimientos')} className="min-h-[44px] px-2 text-sm font-semibold text-accent">Ver todo</button>
                  ) : null}
                </div>
                {ordenados.length === 0 ? (
                  <div className="rounded-lg border border-border bg-surface p-6 text-center shadow-card">
                    <Receipt aria-hidden="true" className="mx-auto size-10 text-text-muted" />
                    <p className="mt-3 font-semibold">Todavía no has anotado nada</p>
                    <p className="mt-1 text-sm text-text-muted">Anota tu primer gasto o ingreso y aquí verás cómo va tu mes.</p>
                    <button type="button" onClick={abrirNuevo} className="mt-4 h-11 rounded-md bg-accent px-5 font-semibold text-on-accent">Anotar mi primer gasto</button>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {ordenados.slice(0, 6).map((m) => <FilaMovimiento key={m.id} mov={m} categoria={porId.get(m.categoria_id)} hoy={hoy} onAbrir={abrirEditar} />)}
                  </ul>
                )}
              </section>
            </>
          )}
        </main>
      </>
    )
  } else if (pestana === 'analisis') {
    contenido = <Analisis movs={movs} cats={cats} hoy={hoy} />
  } else if (pestana === 'presupuestos') {
    contenido = <Presupuestos cats={cats} pres={pres} movs={movs} hoy={hoy} onAviso={avisar} />
  } else if (pestana === 'metas') {
    contenido = <main><Pendiente titulo="Metas de ahorro" texto="Aquí crearás tus metas y verás cuánto llevas. Llega en un próximo paso." /></main>
  } else {
    contenido = <Ajustes ajustes={ajustes ?? { id: 1, tema: 'sistema', editado_en: '' }} onCategorias={() => setVista('categorias')} onAviso={avisar} />
  }

  const mostrarBoton = !cargando && (vista === 'movimientos' || (vista === null && pestana === 'inicio'))

  return (
    <div className="mx-auto min-h-dvh max-w-content bg-bg pb-[calc(var(--tab-bar)+6.5rem)]">
      {contenido}

      {mostrarBoton ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tab-bar)+1.25rem)] z-10 px-4">
          <div className="mx-auto flex max-w-content justify-end px-4">
            <button type="button" onClick={abrirNuevo} aria-label="Agregar movimiento"
              className="pointer-events-auto flex size-14 items-center justify-center rounded-pill bg-accent text-on-accent shadow-pop">
              <Plus aria-hidden="true" className="size-8" />
            </button>
          </div>
        </div>
      ) : null}

      <BarraPestanas activa={pestana} onCambiar={irA} />
      <Aviso aviso={aviso} onCerrar={cerrarAviso} />
      {hoja ? (
        <HojaMovimiento key={hoja.editando?.id ?? 'nuevo'} categorias={cats} hoy={hoy} codigoIA={ajustes?.codigo_ia ?? ''} editando={hoja.editando}
          onCerrar={() => setHoja(null)} onGuardado={alGuardar} onBorrar={alBorrar} />
      ) : null}
    </div>
  )
}
