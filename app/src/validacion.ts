// Revisa lo que se lee del almacenamiento del celular. Si algo quedó dañado (por un error, una extensión o un respaldo viejo),
// se deja fuera de las pantallas en vez de tumbar la app. Los datos dañados no se borran.
import { fechaValida } from './dates'
import type { Categoria, Movimiento } from './db'
import { MEDIOS_PAGO } from './db'

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const esTexto = (x: unknown, vacioOk = false): x is string => typeof x === 'string' && (vacioOk || x.length > 0)
const esMarca = (x: unknown): boolean => typeof x === 'string' && !Number.isNaN(Date.parse(x))

export function movimientoValido(x: unknown): x is Movimiento {
  if (!esObjeto(x)) return false
  return (
    esTexto(x.id) && (x.tipo === 'gasto' || x.tipo === 'ingreso') && typeof x.monto === 'number' && Number.isSafeInteger(x.monto) && x.monto > 0 &&
    esTexto(x.categoria_id) && typeof x.fecha === 'string' && fechaValida(x.fecha) && esTexto(x.descripcion, true) &&
    (x.medio_pago === undefined || MEDIOS_PAGO.some((m) => m.id === x.medio_pago)) && esMarca(x.creado_en) && esMarca(x.editado_en)
  )
}

export function categoriaValida(x: unknown): x is Categoria {
  if (!esObjeto(x)) return false
  return esTexto(x.id) && esTexto(x.nombre) && esTexto(x.icono) && (x.tipo === 'gasto' || x.tipo === 'ingreso') && typeof x.orden === 'number' && typeof x.archivada === 'boolean'
}
