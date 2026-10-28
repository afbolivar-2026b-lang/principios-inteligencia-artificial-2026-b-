import { ChevronRight, Download, ShieldCheck, Share2, Tags, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { diasDesde } from '../avisos'
import { db, guardarAjustes, type Ajustes as DatosAjustes, type Tema } from '../db'
import { crearRespaldo, ErrorRespaldo, estaCifrado, importarRespaldo, respaldoATexto, textoARespaldo, type Respaldo } from '../respaldo'
import { Chip, Segmentos } from './Chip'
import { Hoja } from './Hoja'

interface Props {
  ajustes: DatosAjustes
  onCategorias: () => void
  onAviso: (t: string) => void
}

function guardarTema(tema: Tema) {
  try { localStorage.setItem('nova-tema', tema) } catch { /* sin almacenamiento: no pasa nada */ }
}

function descargar(nombre: string, texto: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function Ajustes({ ajustes, onCategorias, onAviso }: Props) {
  const [clave, setClave] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [archivo, setArchivo] = useState<{ nombre: string; texto: string } | null>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const dias = diasDesde(ajustes.ultimo_respaldo)
  const nombreArchivo = () => `nova-respaldo-${new Date().toISOString().slice(0, 10)}${clave ? '-con-clave' : ''}.json`
  const puedeCompartir = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && typeof File !== 'undefined' && navigator.canShare({ files: [new File(['{}'], 'a.json', { type: 'application/json' })] })

  async function armar(): Promise<string> {
    return respaldoATexto(await crearRespaldo(db), clave || undefined)
  }

  async function bajar() {
    setTrabajando(true)
    try {
      descargar(nombreArchivo(), await armar())
      await guardarAjustes(db, { ultimo_respaldo: new Date().toISOString() })
      onAviso(clave ? 'Respaldo descargado con clave. No olvides la clave.' : 'Respaldo descargado')
    } finally {
      setTrabajando(false)
    }
  }

  async function compartir() {
    setTrabajando(true)
    try {
      const archivoJson = new File([await armar()], nombreArchivo(), { type: 'application/json' })
      await navigator.share({ files: [archivoJson], title: 'Respaldo de Nova' })
      await guardarAjustes(db, { ultimo_respaldo: new Date().toISOString() })
      onAviso('Respaldo compartido')
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) onAviso('No se pudo compartir. Prueba con "Descargar".')
    } finally {
      setTrabajando(false)
    }
  }

  async function alElegirArchivo(f: File | undefined) {
    if (!f) return
    if (f.size > 50_000_000) { onAviso('El archivo es demasiado grande para ser un respaldo de Nova'); return }
    setArchivo({ nombre: f.name, texto: await f.text() })
  }

  return (
    <>
      <header className="px-4 pb-2 pt-[max(env(safe-area-inset-top),1rem)]">
        <h1 className="text-2xl font-bold">Ajustes</h1>
      </header>
      <main className="flex flex-col gap-4 px-4">
        <section aria-labelledby="t-apar" className="rounded-lg border border-border bg-surface p-4 shadow-card">
          <h2 id="t-apar" className="mb-3 text-lg font-semibold">Apariencia</h2>
          <Segmentos etiqueta="Tema" valor={ajustes.tema} onCambiar={(tema) => { guardarTema(tema); void guardarAjustes(db, { tema }) }}
            opciones={[{ id: 'sistema', nombre: 'Automático' }, { id: 'claro', nombre: 'Claro' }, { id: 'oscuro', nombre: 'Oscuro' }]} />
          <p className="mt-2 text-sm text-text-muted">Automático sigue el modo de tu celular.</p>
        </section>

        <button type="button" onClick={onCategorias} className="flex min-h-[56px] items-center gap-3 rounded-lg border border-border bg-surface p-4 text-left shadow-card">
          <Tags aria-hidden="true" className="size-6 text-accent" />
          <span className="flex-1 font-semibold">Categorías</span>
          <ChevronRight aria-hidden="true" className="size-5 text-text-muted" />
        </button>

        <section aria-labelledby="t-resp" className="rounded-lg border border-border bg-surface p-4 shadow-card">
          <h2 id="t-resp" className="text-lg font-semibold">Respaldo</h2>
          <p className="mt-1 text-sm text-text-muted">
            Tus datos viven solo en este celular. Si borras los datos de Chrome o cambias de celular, se pierden. Guarda un respaldo de vez en cuando.
          </p>
          <p className={`mt-2 text-sm font-semibold ${dias === null || dias > 7 ? 'text-warning' : 'text-success'}`}>
            {dias === null ? 'Todavía no has hecho un respaldo' : dias === 0 ? 'Último respaldo: hoy' : `Último respaldo: hace ${dias} ${dias === 1 ? 'día' : 'días'}`}
          </p>
          <label htmlFor="clave" className="mt-4 block text-sm font-medium text-text-muted">Clave para proteger el archivo (opcional)</label>
          <input id="clave" type="password" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-border-input bg-bg px-4" />
          <p className="mt-1 text-xs text-text-muted">Con clave, el archivo queda cifrado. Si la olvidas, nadie podrá recuperarlo, ni siquiera yo.</p>
          <div className="mt-4 flex flex-col gap-2">
            <button type="button" onClick={bajar} disabled={trabajando} className="flex h-[52px] items-center justify-center gap-2 rounded-md bg-accent font-semibold text-on-accent disabled:opacity-45">
              <Download aria-hidden="true" className="size-5" /> {trabajando ? 'Preparando…' : 'Descargar respaldo'}
            </button>
            {puedeCompartir ? (
              <button type="button" onClick={compartir} disabled={trabajando} className="flex h-[52px] items-center justify-center gap-2 rounded-md border border-border-input font-semibold disabled:opacity-45">
                <Share2 aria-hidden="true" className="size-5" /> Compartir (Drive, WhatsApp…)
              </button>
            ) : null}
            <button type="button" onClick={() => entrada.current?.click()} className="flex h-[52px] items-center justify-center gap-2 rounded-md border border-border-input font-semibold">
              <Upload aria-hidden="true" className="size-5" /> Recuperar un respaldo
            </button>
            <input ref={entrada} type="file" accept=".json,application/json" className="sr-only" aria-label="Archivo de respaldo" tabIndex={-1}
              onChange={(e) => { void alElegirArchivo(e.target.files?.[0]); e.target.value = '' }} />
          </div>
        </section>

        <section className="flex gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
          <ShieldCheck aria-hidden="true" className="size-6 flex-none text-accent" />
          <div>
            <p className="font-semibold">Nova · versión 0.2</p>
            <p className="text-sm text-text-muted">Sin anuncios, sin cuenta y sin rastreadores. Los datos no salen del celular, salvo cuando tú guardas o compartes un respaldo.</p>
          </div>
        </section>
      </main>
      {archivo ? <HojaImportar archivo={archivo} onCerrar={() => setArchivo(null)} onHecho={(t) => { setArchivo(null); onAviso(t) }} /> : null}
    </>
  )
}

function HojaImportar({ archivo, onCerrar, onHecho }: { archivo: { nombre: string; texto: string }; onCerrar: () => void; onHecho: (t: string) => void }) {
  const cifrado = estaCifrado(archivo.texto)
  const [clave, setClave] = useState('')
  const [respaldo, setRespaldo] = useState<Respaldo | null>(null)
  const [error, setError] = useState('')
  const [modo, setModo] = useState<'combinar' | 'reemplazar'>('combinar')
  const [trabajando, setTrabajando] = useState(false)
  const [intentoAutomatico, setIntentoAutomatico] = useState(false)

  async function abrir() {
    setTrabajando(true)
    setError('')
    try {
      setRespaldo(await textoARespaldo(archivo.texto, clave || undefined))
    } catch (e) {
      setError(e instanceof ErrorRespaldo ? e.message : 'No se pudo abrir el archivo')
    } finally {
      setTrabajando(false)
    }
  }
  // un archivo sin clave se abre solo, una vez
  if (!cifrado && !intentoAutomatico) {
    setIntentoAutomatico(true)
    void abrir()
  }

  async function recuperar() {
    if (!respaldo) return
    setTrabajando(true)
    try {
      const r = await importarRespaldo(db, respaldo, modo)
      onHecho(modo === 'reemplazar' ? `Recuperaste ${r.movimientos} movimientos` : `Se sumaron ${r.movimientos} movimientos nuevos`)
    } catch {
      setError('No se pudo recuperar el respaldo. Tus datos actuales no cambiaron.')
      setTrabajando(false)
    }
  }

  const fecha = respaldo?.exportado_en ? new Date(respaldo.exportado_en).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const pie = respaldo ? (
    <button key="recuperar" type="button" onClick={recuperar} disabled={trabajando} className={`h-[52px] flex-1 rounded-md font-semibold text-on-accent disabled:opacity-45 ${modo === 'reemplazar' ? 'bg-danger' : 'bg-accent'}`}>
      {trabajando ? 'Recuperando…' : modo === 'reemplazar' ? 'Sí, reemplazar todo' : 'Recuperar'}
    </button>
  ) : cifrado ? (
    <button key="abrir" type="submit" form="form-clave" disabled={trabajando} className="h-[52px] flex-1 rounded-md bg-accent font-semibold text-on-accent disabled:opacity-45">{trabajando ? 'Abriendo…' : 'Abrir'}</button>
  ) : undefined

  return (
    <Hoja titulo="Recuperar un respaldo" onCerrar={onCerrar} pie={pie}>
      <p className="text-sm text-text-muted">Archivo: {archivo.nombre}</p>
      {respaldo ? (
        <div className="mt-3 flex flex-col gap-4">
          <p className="font-semibold">Respaldo del {fecha || 'día desconocido'}: {respaldo.movimientos.length} movimientos, {respaldo.categorias.length} categorías y {respaldo.presupuestos.length} presupuestos.</p>
          <div role="radiogroup" aria-label="Cómo recuperar" className="flex flex-col gap-2">
            <Chip activo={modo === 'combinar'} onClick={() => setModo('combinar')}>Sumar a lo que ya tengo (recomendado)</Chip>
            <Chip activo={modo === 'reemplazar'} onClick={() => setModo('reemplazar')}>Reemplazar todo lo que tengo</Chip>
          </div>
          {modo === 'reemplazar' ? <p role="alert" className="text-sm font-medium text-danger">Esto borra tus datos actuales y deja solo los del respaldo.</p> : <p className="text-sm text-text-muted">Los movimientos repetidos no se duplican.</p>}
        </div>
      ) : cifrado ? (
        <form id="form-clave" className="mt-3" onSubmit={(e) => { e.preventDefault(); void abrir() }}>
          <label htmlFor="clave-abrir" className="text-sm font-medium text-text-muted">Este respaldo tiene clave</label>
          <input id="clave-abrir" data-foco type="password" autoComplete="off" value={clave} onChange={(e) => setClave(e.target.value)}
            className="mt-1 h-11 w-full rounded-md border border-border-input bg-bg px-4" />
        </form>
      ) : trabajando ? <p className="mt-3">Leyendo el archivo…</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-danger">{error}</p> : null}
    </Hoja>
  )
}
