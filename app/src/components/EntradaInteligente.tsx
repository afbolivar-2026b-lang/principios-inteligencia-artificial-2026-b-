import { Camera, Mic, Sparkles, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Categoria } from '../db'
import { entenderLocal, type Propuesta } from '../entenderLocal'
import { ErrorIA, interpretarFrase, interpretarRecibo, prepararFoto, razonCorta } from '../ia'
import { crearReconocimiento, mensajeErrorVoz, vozDisponible, type Reconocimiento } from '../voz'

export type OrigenEntrada = 'frase' | 'voz' | 'foto'

interface Props {
  categorias: Categoria[]
  hoy: string
  codigoIA: string
  onPropuesta: (p: Propuesta, origen: OrigenEntrada) => void
}

type Estado = { tipo: 'nada' } | { tipo: 'trabajando'; texto: string } | { tipo: 'ok'; texto: string } | { tipo: 'error'; texto: string }

export function EntradaInteligente({ categorias, hoy, codigoIA, onPropuesta }: Props) {
  const [frase, setFrase] = useState('')
  const [estado, setEstado] = useState<Estado>({ tipo: 'nada' })
  const [escuchando, setEscuchando] = useState(false)
  const reconocimiento = useRef<Reconocimiento | null>(null)
  const archivo = useRef<HTMLInputElement>(null)
  const activas = categorias.filter((c) => !c.archivada)
  const nombres = [...new Set(activas.map((c) => c.nombre))]

  useEffect(() => () => reconocimiento.current?.abort(), [])

  async function entender(texto: string, origen: 'frase' | 'voz') {
    const limpio = texto.trim()
    if (!limpio) { setEstado({ tipo: 'error', texto: 'Escribe o di algo, por ejemplo «almuerzo 18 mil en Nequi»' }); return }
    setEstado({ tipo: 'trabajando', texto: 'Entendiendo…' })
    let aviso = ''
    if (codigoIA) {
      try {
        const p = await interpretarFrase(limpio, nombres, hoy, codigoIA)
        onPropuesta(p, origen)
        setEstado({ tipo: 'ok', texto: 'Entendido con IA. Revisa y corrige antes de guardar.' })
        return
      } catch (e) {
        if (e instanceof ErrorIA && e.codigo === 'sin_monto') { setEstado({ tipo: 'error', texto: e.message }); return }
        aviso = `No pude usar la IA (${razonCorta(e)}). `
      }
    }
    const local = entenderLocal(limpio, activas, hoy)
    if (!local) {
      setEstado({ tipo: 'error', texto: `${aviso}No encontré el monto. Escribe algo como «almuerzo 18 mil».` })
      return
    }
    onPropuesta(local, origen)
    setEstado({ tipo: 'ok', texto: `${aviso}Entendí lo básico sin IA. Revisa y corrige antes de guardar.` })
  }

  function hablar() {
    if (escuchando) { reconocimiento.current?.stop(); return }
    const r = crearReconocimiento()
    if (!r) return
    reconocimiento.current = r
    let texto = ''
    r.onresult = (e) => { texto = Array.from(e.results).map((x) => x[0].transcript).join(' ') }
    r.onerror = (e) => {
      const m = mensajeErrorVoz(e.error)
      if (m) setEstado({ tipo: 'error', texto: m })
      texto = ''
    }
    r.onend = () => {
      setEscuchando(false)
      if (texto) { setFrase(texto); void entender(texto, 'voz') }
    }
    setEstado({ tipo: 'trabajando', texto: 'Escuchando… di, por ejemplo, «almuerzo 18 mil en Nequi»' })
    setEscuchando(true)
    try { r.start() } catch { setEscuchando(false); setEstado({ tipo: 'error', texto: 'No pude activar el micrófono' }) }
  }

  async function leerFoto(f: File | undefined) {
    if (!f) return
    setEstado({ tipo: 'trabajando', texto: 'Leyendo el recibo…' })
    try {
      const foto = await prepararFoto(f)
      const p = await interpretarRecibo(foto, nombres, hoy, codigoIA)
      onPropuesta(p, 'foto')
      setEstado({ tipo: 'ok', texto: 'Recibo leído con IA. Revisa y corrige antes de guardar.' })
    } catch (e) {
      setEstado({ tipo: 'error', texto: e instanceof ErrorIA ? e.message : 'No pude leer el recibo. Anótalo a mano.' })
    }
  }

  function tocarFoto() {
    if (!codigoIA) { setEstado({ tipo: 'error', texto: 'Leer recibos necesita la IA. Actívala en Ajustes → Inteligencia artificial.' }); return }
    archivo.current?.click()
  }

  const ocupado = estado.tipo === 'trabajando'
  return (
    <section aria-labelledby="t-entrada" className="rounded-lg border border-border bg-surface p-3">
      <h3 id="t-entrada" className="flex items-center gap-1 text-sm font-semibold"><Sparkles aria-hidden="true" className="size-4 text-accent" /> Dilo o escríbelo</h3>
      {/* no es un <form>: ya estamos dentro del formulario del movimiento; Enter aquí entiende la frase, no guarda */}
      <div className="mt-2 flex gap-2">
        <label htmlFor="frase" className="sr-only">Frase del gasto</label>
        <input id="frase" value={frase} onChange={(e) => setFrase(e.target.value)} maxLength={300} autoComplete="off" placeholder="Ej.: almuerzo 18 mil en Nequi"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void entender(frase, 'frase') } }}
          className="h-11 min-w-0 flex-1 rounded-md border border-border-input bg-bg px-3 placeholder:text-text-muted" />
        <button type="button" onClick={() => void entender(frase, 'frase')} disabled={ocupado} className="h-11 rounded-md bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-45">Entender</button>
      </div>
      <div className="mt-2 flex gap-2">
        {vozDisponible() ? (
          <button type="button" onClick={hablar} aria-pressed={escuchando}
            className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-md border text-sm font-semibold ${escuchando ? 'border-danger text-danger' : 'border-border-input'}`}>
            {escuchando ? <Square aria-hidden="true" className="size-4" /> : <Mic aria-hidden="true" className="size-5" />}
            {escuchando ? 'Parar' : 'Hablar'}
          </button>
        ) : null}
        <button type="button" onClick={tocarFoto} disabled={ocupado} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border-input text-sm font-semibold disabled:opacity-45">
          <Camera aria-hidden="true" className="size-5" /> Foto del recibo
        </button>
        <input ref={archivo} type="file" accept="image/*" capture="environment" hidden
          onChange={(e) => { void leerFoto(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      <p role="status" aria-live="polite" className={`mt-2 min-h-[1.25rem] text-sm ${estado.tipo === 'error' ? 'font-medium text-danger' : estado.tipo === 'ok' ? 'font-medium text-success' : 'text-text-muted'}`}>
        {estado.tipo === 'nada' ? '' : estado.texto}
      </p>
    </section>
  )
}
