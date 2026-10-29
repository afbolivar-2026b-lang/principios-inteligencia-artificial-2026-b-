// Lector de frases sin IA ni internet: "almuerzo 18 mil en nequi" -> gasto de $18.000, Comida, Nequi, hoy.
// Es más simple que la IA: entiende lo básico y siempre deja la confianza en "media" o "baja".
import { sumarDias } from './dates'
import type { MedioPago, TipoMov } from './db'
import { leerMonto } from './money'

export interface Propuesta {
  tipo: TipoMov
  monto: number
  categoria: string | null
  descripcion: string
  medio_pago?: MedioPago
  fecha: string
  confianza: 'alta' | 'media' | 'baja'
  fuente: 'ia' | 'local'
}

const sinTildes = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const MEDIOS: [RegExp, MedioPago][] = [
  [/\bnequi\b/, 'nequi'], [/\bdaviplata\b/, 'daviplata'], [/\b(efectivo|cash|billete)\b/, 'efectivo'],
  [/\b(tarjeta|credito|debito)\b/, 'tarjeta'], [/\bpse\b/, 'pse'], [/\b(transferencia|transferi|transfer)\b/, 'transferencia'],
]

const INGRESO = /\b(me pagaron|salario|sueldo|nomina|quincena|ingreso|me consignaron|me abonaron|me depositaron|me llego|me transfirieron|cobre|recibi)\b/

const PALABRAS: Record<string, string[]> = {
  comida: ['almuerzo', 'desayuno', 'cena', 'comida', 'restaurante', 'domicilio', 'cafe', 'pizza', 'hamburguesa', 'empanada', 'arepa', 'helado', 'onces', 'corrientazo', 'pollo', 'jugo', 'gaseosa', 'panaderia'],
  mercado: ['mercado', 'supermercado', 'exito', 'jumbo', 'd1', 'ara', 'olimpica', 'carulla', 'plaza', 'tienda', 'verduras', 'frutas', 'carne', 'huevos', 'leche'],
  transporte: ['bus', 'taxi', 'uber', 'didi', 'metro', 'transmilenio', 'sitp', 'gasolina', 'peaje', 'parqueadero', 'moto', 'pasaje', 'cabify', 'indrive'],
  hogar: ['arriendo', 'alquiler', 'administracion', 'plomero', 'reparacion', 'arreglo', 'muebles', 'aseo', 'electrodomestico'],
  servicios: ['luz', 'agua', 'gas', 'internet', 'celular', 'datos', 'plan', 'energia', 'netflix', 'spotify', 'claro', 'movistar', 'tigo', 'wom'],
  salud: ['drogueria', 'medicina', 'medicamento', 'doctor', 'medico', 'cita', 'eps', 'dentista', 'examen', 'farmacia', 'pastillas'],
  ropa: ['ropa', 'camisa', 'pantalon', 'zapatos', 'tenis', 'vestido', 'chaqueta', 'jeans'],
  educacion: ['matricula', 'curso', 'universidad', 'colegio', 'libros', 'pension', 'clase', 'utiles'],
  entretenimiento: ['cine', 'concierto', 'fiesta', 'juego', 'videojuego', 'bar', 'cerveza', 'trago', 'paseo', 'entradas', 'parque', 'discoteca'],
  salario: ['salario', 'sueldo', 'nomina', 'quincena', 'pago del trabajo'],
}

const SOLTAR_SIEMPRE = new Set(['hoy', 'ayer', 'anteayer', 'nequi', 'daviplata', 'efectivo', 'cash', 'tarjeta', 'credito', 'debito', 'pse', 'transferencia', 'pesos', 'cop'])
const SOLTAR_AL_INICIO = new Set(['gaste', 'pague', 'compre', 'pago', 'me', 'costo', 'costaron', 'salieron', 'fueron', 'fue', 'recibi', 'cobre', 'pagaron'])
const CONECTORES = new Set(['de', 'en', 'con', 'por', 'a', 'el', 'la', 'los', 'las', 'un', 'una', 'para', 'y', 'del', 'al', 'que', 'se'])
const MESES = '(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)'

/** Busca el monto en la frase. Devuelve el valor y el tramo del texto que ocupa. */
function buscarMonto(n: string): { valor: number; desde: number; hasta: number } | null {
  const candidatos: { valor: number; desde: number; hasta: number; fuerte: boolean }[] = []
  const re = /\$?\s?\d[\d.,]*(?:\s?(?:k|mil|millones|millon|m)\b)?/g
  for (const m of n.matchAll(re)) {
    const texto = m[0]
    const desde = m.index ?? 0
    const valor = leerMonto(texto)
    if (valor === null) continue
    const despues = n.slice(desde + texto.length)
    const antes = n.slice(0, desde)
    // "el 28 de octubre": es una fecha, no plata
    if (valor <= 31 && (new RegExp(`^\\s+de\\s+${MESES}`).test(despues) || /\b(el|dia|del)\s*$/.test(antes))) continue
    candidatos.push({ valor, desde, hasta: desde + texto.length, fuerte: /\b(k|mil|millones|millon|m)\b|\d[.,]\d{3}/.test(texto) })
  }
  if (candidatos.length === 0) return null
  const elegido = candidatos.find((c) => c.fuerte) ?? candidatos.reduce((a, b) => (b.valor > a.valor ? b : a))
  return { valor: elegido.valor, desde: elegido.desde, hasta: elegido.hasta }
}

export function entenderLocal(texto: string, categorias: { nombre: string; tipo: TipoMov }[], hoy: string): Propuesta | null {
  // "18 lucas" = 18 mil y "2 palos" = 2 millones. Se cambia en el texto original y luego se le quitan las tildes:
  // así el texto normalizado y el original tienen siempre el mismo largo y los tramos coinciden.
  const base = texto.normalize('NFC').trim().replace(/\blucas?\b/gi, 'mil ').replace(/\bpalos?\b/gi, 'millones')
  const n = sinTildes(base)
  const monto = buscarMonto(n)
  if (!monto) return null

  const tipo: TipoMov = INGRESO.test(n) ? 'ingreso' : 'gasto'
  const medio = MEDIOS.find(([re]) => re.test(n))?.[1]
  const fecha = /\banteayer\b/.test(n) ? sumarDias(hoy, -2) : /\bayer\b/.test(n) ? sumarDias(hoy, -1) : hoy

  // categoría: primero por palabras conocidas, luego por el nombre mismo de la categoría
  const palabras = new Set(n.split(/[^a-z0-9ñ]+/).filter(Boolean))
  const delTipo = categorias.filter((c) => c.tipo === tipo)
  let categoria: string | null = null
  for (const c of delTipo) {
    const clave = sinTildes(c.nombre).split(' ')[0]
    const lista = PALABRAS[clave] ?? []
    if (lista.some((p) => (p.includes(' ') ? n.includes(p) : palabras.has(p))) || palabras.has(clave)) { categoria = c.nombre; break }
  }

  // descripción: lo que sobra después de quitar monto, medio, fecha y conectores
  const sin = (s: string) => s.slice(0, monto.desde) + ' ' + s.slice(monto.hasta)
  const palabrasOriginal = sin(base).split(/\s+/).filter(Boolean)
  const normalSinMonto = sin(n).split(/\s+/).filter(Boolean)
  let resto = palabrasOriginal.filter((_, i) => !SOLTAR_SIEMPRE.has(normalSinMonto[i]))
  let nRest = normalSinMonto.filter((p) => !SOLTAR_SIEMPRE.has(p))
  while (nRest.length && (SOLTAR_AL_INICIO.has(nRest[0]) || CONECTORES.has(nRest[0]))) { nRest = nRest.slice(1); resto = resto.slice(1) }
  while (nRest.length && CONECTORES.has(nRest[nRest.length - 1])) { nRest = nRest.slice(0, -1); resto = resto.slice(0, -1) }
  const frase = resto.join(' ').replace(/[.,;:!?¡¿]+$/g, '').trim()
  const descripcion = frase ? frase.charAt(0).toUpperCase() + frase.slice(1).slice(0, 119) : ''

  return { tipo, monto: monto.valor, categoria, descripcion, ...(medio ? { medio_pago: medio } : {}), fecha, confianza: categoria ? 'media' : 'baja', fuente: 'local' }
}
