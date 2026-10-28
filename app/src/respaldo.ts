import { fechaValida } from './dates'
import {
  ErrorDeDatos, MEDIOS_PAGO, normalizar, type Categoria, type Movimiento, type NovaDB, type Origen, type Presupuesto, type TipoMov,
} from './db'

// Archivo de respaldo: un JSON con todos los datos. Si se pone clave, el JSON se cifra
// (AES-GCM 256, con la clave derivada con PBKDF2-SHA256) antes de salir del celular.

export interface Respaldo {
  app: 'nova-gastos'
  version: 1
  exportado_en: string
  categorias: Categoria[]
  movimientos: Movimiento[]
  presupuestos: Presupuesto[]
}

export class ErrorRespaldo extends Error {
  constructor(mensaje: string, readonly codigo: 'CLAVE_NECESARIA' | 'CLAVE_INCORRECTA' | 'ARCHIVO_INVALIDO') {
    super(mensaje)
  }
}

const ITERACIONES = 600_000
const MAX_MOVIMIENTOS = 200_000

export async function crearRespaldo(d: NovaDB): Promise<Respaldo> {
  const [categorias, movimientos, presupuestos] = await Promise.all([d.categorias.toArray(), d.movimientos.toArray(), d.presupuestos.toArray()])
  return { app: 'nova-gastos', version: 1, exportado_en: new Date().toISOString(), categorias, movimientos, presupuestos }
}

// ---------- cifrado ----------

function aBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function deBase64(texto: string): Uint8Array<ArrayBuffer> {
  const bin = atob(texto)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function derivarClave(clave: string, sal: Uint8Array<ArrayBuffer>, iteraciones: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: iteraciones, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export async function respaldoATexto(r: Respaldo, clave?: string): Promise<string> {
  const json = JSON.stringify(r)
  if (!clave) return json
  const sal = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const llave = await derivarClave(clave, sal, ITERACIONES)
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, llave, new TextEncoder().encode(json)))
  return JSON.stringify({ nova_cifrado: 1, kdf: 'PBKDF2-SHA256', iteraciones: ITERACIONES, sal: aBase64(sal), iv: aBase64(iv), datos: aBase64(cifrado) })
}

export function estaCifrado(texto: string): boolean {
  try {
    return (JSON.parse(texto) as { nova_cifrado?: unknown }).nova_cifrado === 1
  } catch {
    return false
  }
}

export async function textoARespaldo(texto: string, clave?: string): Promise<Respaldo> {
  let crudo: unknown
  try {
    crudo = JSON.parse(texto)
  } catch {
    throw new ErrorRespaldo('El archivo no es un respaldo de Nova', 'ARCHIVO_INVALIDO')
  }
  const sobre = crudo as { nova_cifrado?: unknown; iteraciones?: unknown; sal?: unknown; iv?: unknown; datos?: unknown }
  if (sobre?.nova_cifrado === 1) {
    if (!clave) throw new ErrorRespaldo('Este respaldo tiene clave. Escríbela para abrirlo.', 'CLAVE_NECESARIA')
    if (typeof sobre.sal !== 'string' || typeof sobre.iv !== 'string' || typeof sobre.datos !== 'string' || typeof sobre.iteraciones !== 'number' || sobre.iteraciones < 100_000 || sobre.iteraciones > 5_000_000) {
      throw new ErrorRespaldo('El archivo cifrado está dañado', 'ARCHIVO_INVALIDO')
    }
    try {
      const llave = await derivarClave(clave, deBase64(sobre.sal), sobre.iteraciones)
      const plano = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(sobre.iv) }, llave, deBase64(sobre.datos))
      crudo = JSON.parse(new TextDecoder().decode(plano))
    } catch {
      throw new ErrorRespaldo('La clave no es correcta, o el archivo está dañado', 'CLAVE_INCORRECTA')
    }
  }
  return validarRespaldo(crudo)
}

// ---------- validación: un archivo de fuera nunca se acepta sin revisarlo ----------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TIPOS: TipoMov[] = ['gasto', 'ingreso']
const ORIGENES: Origen[] = ['manual', 'frase', 'voz', 'foto', 'recurrente']

function malo(donde: string): never {
  throw new ErrorRespaldo(`El respaldo tiene datos que no son válidos (${donde})`, 'ARCHIVO_INVALIDO')
}
const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const texto = (x: unknown, max: number): x is string => typeof x === 'string' && x.length <= max
const entero = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x)

export function validarRespaldo(crudo: unknown): Respaldo {
  if (!esObjeto(crudo) || crudo.app !== 'nova-gastos' || crudo.version !== 1) throw new ErrorRespaldo('El archivo no es un respaldo de Nova', 'ARCHIVO_INVALIDO')
  if (!Array.isArray(crudo.categorias) || !Array.isArray(crudo.movimientos) || !Array.isArray(crudo.presupuestos)) malo('listas')
  if (crudo.movimientos.length > MAX_MOVIMIENTOS) malo('demasiados movimientos')

  const ids = new Set<string>()
  const categorias: Categoria[] = crudo.categorias.map((c: unknown) => {
    if (!esObjeto(c) || typeof c.id !== 'string' || !UUID.test(c.id) || ids.has(c.id)) malo('categoría')
    if (!texto(c.nombre, 30) || c.nombre.trim() === '' || !texto(c.icono, 20) || !TIPOS.includes(c.tipo as TipoMov) || !entero(c.orden) || typeof c.archivada !== 'boolean') malo('categoría')
    if (!texto(c.creado_en, 40) || !texto(c.editado_en, 40)) malo('categoría')
    ids.add(c.id)
    return { id: c.id, nombre: c.nombre.trim(), icono: c.icono, tipo: c.tipo as TipoMov, orden: c.orden, archivada: c.archivada, creado_en: c.creado_en, editado_en: c.editado_en }
  })
  const tipoDe = new Map(categorias.map((c) => [c.id, c.tipo]))

  const vistos = new Set<string>()
  const movimientos: Movimiento[] = crudo.movimientos.map((m: unknown) => {
    if (!esObjeto(m) || typeof m.id !== 'string' || !UUID.test(m.id) || vistos.has(m.id)) malo('movimiento')
    if (!TIPOS.includes(m.tipo as TipoMov) || !entero(m.monto) || m.monto <= 0 || m.moneda !== 'COP') malo('movimiento')
    if (typeof m.categoria_id !== 'string' || tipoDe.get(m.categoria_id) !== m.tipo) malo('movimiento sin categoría')
    if (typeof m.fecha !== 'string' || !fechaValida(m.fecha) || !texto(m.descripcion, 120)) malo('movimiento')
    if (m.medio_pago !== undefined && !MEDIOS_PAGO.some((x) => x.id === m.medio_pago)) malo('medio de pago')
    if (!ORIGENES.includes(m.origen as Origen) || !texto(m.creado_en, 40) || !texto(m.editado_en, 40)) malo('movimiento')
    vistos.add(m.id)
    return {
      id: m.id, tipo: m.tipo as TipoMov, monto: m.monto, moneda: 'COP', categoria_id: m.categoria_id, fecha: m.fecha, descripcion: m.descripcion,
      ...(m.medio_pago ? { medio_pago: m.medio_pago as Movimiento['medio_pago'] } : {}), origen: m.origen as Origen, creado_en: m.creado_en, editado_en: m.editado_en,
    }
  })

  const claves = new Set<string>()
  const presupuestos: Presupuesto[] = crudo.presupuestos.map((p: unknown) => {
    if (!esObjeto(p) || typeof p.id !== 'string' || !UUID.test(p.id) || typeof p.categoria_id !== 'string' || tipoDe.get(p.categoria_id) !== 'gasto') malo('presupuesto')
    if (typeof p.mes !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(p.mes) || !entero(p.limite) || p.limite <= 0) malo('presupuesto')
    if (!entero(p.umbral_alerta) || p.umbral_alerta < 1 || p.umbral_alerta > 100 || !texto(p.creado_en, 40) || !texto(p.editado_en, 40)) malo('presupuesto')
    const clave = `${p.categoria_id}|${p.mes}`
    if (claves.has(clave)) malo('presupuesto repetido')
    claves.add(clave)
    return { id: p.id, categoria_id: p.categoria_id, mes: p.mes, limite: p.limite, umbral_alerta: p.umbral_alerta, creado_en: p.creado_en, editado_en: p.editado_en }
  })

  return { app: 'nova-gastos', version: 1, exportado_en: texto(crudo.exportado_en, 40) ? crudo.exportado_en : '', categorias, movimientos, presupuestos }
}

// ---------- importar ----------

export interface ResultadoImportar {
  categorias: number
  movimientos: number
  presupuestos: number
}

export async function importarRespaldo(d: NovaDB, r: Respaldo, modo: 'reemplazar' | 'combinar'): Promise<ResultadoImportar> {
  return d.transaction('rw', d.categorias, d.movimientos, d.presupuestos, async () => {
    if (modo === 'reemplazar') {
      await Promise.all([d.categorias.clear(), d.movimientos.clear(), d.presupuestos.clear()])
      await Promise.all([d.categorias.bulkAdd(r.categorias), d.movimientos.bulkAdd(r.movimientos), d.presupuestos.bulkAdd(r.presupuestos)])
      return { categorias: r.categorias.length, movimientos: r.movimientos.length, presupuestos: r.presupuestos.length }
    }

    // combinar: lo más reciente gana. Dos celulares crean sus propias categorías "Comida"; se juntan por nombre.
    const locales = await d.categorias.toArray()
    const idLocal = new Map<string, string>()
    let nuevasCat = 0
    for (const c of r.categorias) {
      const igualId = locales.find((l) => l.id === c.id)
      const igualNombre = locales.find((l) => l.tipo === c.tipo && normalizar(l.nombre) === normalizar(c.nombre))
      const destino = igualId ?? igualNombre
      if (destino) {
        idLocal.set(c.id, destino.id)
        if (igualId && c.editado_en > igualId.editado_en) await d.categorias.put(c)
      } else {
        await d.categorias.add(c)
        locales.push(c)
        idLocal.set(c.id, c.id)
        nuevasCat++
      }
    }
    let nuevosMov = 0
    for (const m of r.movimientos) {
      const actual = await d.movimientos.get(m.id)
      if (actual && actual.editado_en >= m.editado_en) continue
      if (!actual) nuevosMov++
      await d.movimientos.put({ ...m, categoria_id: idLocal.get(m.categoria_id) ?? m.categoria_id })
    }
    let nuevosPres = 0
    for (const p of r.presupuestos) {
      const categoria_id = idLocal.get(p.categoria_id) ?? p.categoria_id
      const actual = await d.presupuestos.where('[categoria_id+mes]').equals([categoria_id, p.mes]).first()
      if (actual && actual.editado_en >= p.editado_en) continue
      if (!actual) nuevosPres++
      await d.presupuestos.put({ ...p, id: actual?.id ?? p.id, categoria_id })
    }
    return { categorias: nuevasCat, movimientos: nuevosMov, presupuestos: nuevosPres }
  })
}

export { ErrorDeDatos }
