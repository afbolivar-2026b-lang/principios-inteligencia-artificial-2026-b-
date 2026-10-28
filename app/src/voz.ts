// Dictado por voz con el reconocimiento del navegador (Chrome en Android). Necesita internet y permiso del micrófono.

interface ResultadoVoz { results: ArrayLike<ArrayLike<{ transcript: string }>> }
export interface Reconocimiento {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((e: ResultadoVoz) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

type Constructor = new () => Reconocimiento

function constructor(): Constructor | null {
  const w = window as unknown as { SpeechRecognition?: Constructor; webkitSpeechRecognition?: Constructor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const vozDisponible = (): boolean => typeof window !== 'undefined' && constructor() !== null

export function crearReconocimiento(): Reconocimiento | null {
  const C = constructor()
  if (!C) return null
  const r = new C()
  r.lang = 'es-CO'
  r.interimResults = false
  r.continuous = false
  r.maxAlternatives = 1
  return r
}

export function mensajeErrorVoz(codigo: string): string | null {
  switch (codigo) {
    case 'not-allowed': case 'service-not-allowed': return 'Activa el micrófono para Nova en los ajustes de Chrome'
    case 'no-speech': return 'No te escuché. Prueba otra vez'
    case 'audio-capture': return 'No encontré el micrófono'
    case 'network': return 'La voz necesita internet'
    case 'aborted': return null
    default: return 'No pude entender la voz. Prueba otra vez o escríbelo'
  }
}
