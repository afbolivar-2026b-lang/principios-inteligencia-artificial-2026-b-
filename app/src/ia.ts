// Habla con las funciones /api del servidor (la IA de Claude). Si algo falla, el llamador sigue con el lector local.
import type { MedioPago } from './db'
import type { Propuesta } from './entenderLocal'

export type CodigoErrorIA = 'sin_codigo' | 'ia_no_configurada' | 'codigo_incorrecto' | 'demasiados' | 'sin_conexion' | 'ia_ocupada' | 'sin_monto' | 'foto_muy_grande' | 'otro'

export class ErrorIA extends Error {
  constructor(mensaje: string, readonly codigo: CodigoErrorIA) {
    super(mensaje)
  }
}

const MENSAJE_POR_CODIGO: Partial<Record<CodigoErrorIA, string>> = {
  sin_codigo: 'Falta el código de acceso de la IA (Ajustes → Inteligencia artificial)',
  ia_no_configurada: 'Este servidor todavía no tiene la IA activada',
  codigo_incorrecto: 'El código de acceso de la IA no coincide',
  demasiados: 'Se alcanzó el límite de uso de la IA. Prueba más tarde',
  sin_conexion: 'No hay conexión a internet',
  ia_ocupada: 'La IA no está disponible en este momento',
}

/** Razón corta para el aviso "No pude usar la IA (…)" cuando se sigue con el lector local. */
export function razonCorta(e: unknown): string {
  switch (e instanceof ErrorIA ? e.codigo : 'otro') {
    case 'sin_conexion': return 'no hay conexión a internet'
    case 'codigo_incorrecto': return 'el código de acceso no coincide'
    case 'ia_no_configurada': return 'el servidor no tiene la IA activada'
    case 'demasiados': return 'se alcanzó el límite de uso'
    case 'ia_ocupada': return 'la IA está ocupada'
    case 'sin_codigo': return 'falta el código de acceso'
    default: return 'falló la conexión con la IA'
  }
}

function traducir(codigoServidor: string | undefined): CodigoErrorIA {
  switch (codigoServidor) {
    case 'ia_no_configurada': return 'ia_no_configurada'
    case 'codigo_incorrecto': return 'codigo_incorrecto'
    case 'demasiados_intentos': case 'limite_de_uso': return 'demasiados'
    case 'ia_ocupada': case 'ia_no_responde': case 'llave_invalida': case 'ia_error': return 'ia_ocupada'
    case 'sin_monto': return 'sin_monto'
    case 'foto_muy_grande': return 'foto_muy_grande'
    default: return 'otro'
  }
}

async function llamar(ruta: string, codigo: string, cuerpo: unknown | null, fetchFn: typeof fetch): Promise<Record<string, unknown>> {
  if (!codigo) throw new ErrorIA(MENSAJE_POR_CODIGO.sin_codigo!, 'sin_codigo')
  let r: Response
  try {
    r = await fetchFn(ruta, {
      method: cuerpo === null ? 'GET' : 'POST',
      headers: { 'x-codigo-acceso': codigo, ...(cuerpo === null ? {} : { 'content-type': 'application/json' }) },
      ...(cuerpo === null ? {} : { body: JSON.stringify(cuerpo) }),
      signal: AbortSignal.timeout(35_000),
    })
  } catch {
    throw new ErrorIA(MENSAJE_POR_CODIGO.sin_conexion!, 'sin_conexion')
  }
  let datos: Record<string, unknown>
  try {
    datos = (await r.json()) as Record<string, unknown>
  } catch {
    // el servidor devolvió una página en vez de JSON: no existe la función (por ejemplo, en un servidor sin IA)
    throw new ErrorIA(MENSAJE_POR_CODIGO.ia_no_configurada!, 'ia_no_configurada')
  }
  if (!r.ok) {
    const codigoError = traducir(typeof datos.error === 'string' ? datos.error : undefined)
    throw new ErrorIA(typeof datos.mensaje === 'string' ? datos.mensaje : (MENSAJE_POR_CODIGO[codigoError] ?? 'La IA no pudo con esto'), codigoError)
  }
  return datos
}

function aPropuesta(datos: Record<string, unknown>): Propuesta {
  const m = datos.movimiento as Record<string, unknown> | undefined
  if (!m || typeof m.monto !== 'number' || (m.tipo !== 'gasto' && m.tipo !== 'ingreso') || typeof m.fecha !== 'string') throw new ErrorIA('La IA devolvió algo que no se entiende', 'otro')
  return {
    tipo: m.tipo,
    monto: m.monto,
    categoria: typeof m.categoria === 'string' ? m.categoria : null,
    descripcion: typeof m.descripcion === 'string' ? m.descripcion : '',
    ...(typeof m.medio_pago === 'string' ? { medio_pago: m.medio_pago as MedioPago } : {}),
    fecha: m.fecha,
    confianza: m.confianza === 'alta' || m.confianza === 'baja' ? m.confianza : 'media',
    fuente: 'ia',
  }
}

export async function probarConexion(codigo: string, fetchFn: typeof fetch = fetch): Promise<void> {
  await llamar('/api/estado', codigo, null, fetchFn)
}

export async function interpretarFrase(texto: string, categorias: string[], hoy: string, codigo: string, fetchFn: typeof fetch = fetch): Promise<Propuesta> {
  return aPropuesta(await llamar('/api/interpretar', codigo, { texto, categorias, hoy }, fetchFn))
}

export interface FotoPreparada {
  tipo: 'image/jpeg'
  datos: string
}

export async function interpretarRecibo(foto: FotoPreparada, categorias: string[], hoy: string, codigo: string, fetchFn: typeof fetch = fetch): Promise<Propuesta> {
  return aPropuesta(await llamar('/api/recibo', codigo, { imagen: foto, categorias, hoy }, fetchFn))
}

/** Reduce la foto a máximo 1280 px y la pasa a JPEG, para que pese poco y no se manden datos de más. */
export async function prepararFoto(archivo: File): Promise<FotoPreparada> {
  if (archivo.size > 30_000_000) throw new ErrorIA('La foto es demasiado grande', 'foto_muy_grande')
  let imagen: ImageBitmap
  try {
    imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  } catch {
    throw new ErrorIA('No pude abrir esa foto. Prueba con otra', 'otro')
  }
  const escala = Math.min(1, 1280 / Math.max(imagen.width, imagen.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.max(1, Math.round(imagen.width * escala))
  lienzo.height = Math.max(1, Math.round(imagen.height * escala))
  lienzo.getContext('2d')!.drawImage(imagen, 0, 0, lienzo.width, lienzo.height)
  imagen.close()
  const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/jpeg', 0.8))
  if (!blob) throw new ErrorIA('No pude preparar la foto', 'otro')
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binario = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return { tipo: 'image/jpeg', datos: btoa(binario) }
}
