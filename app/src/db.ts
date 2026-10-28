import Dexie, { type Table } from 'dexie'
import { fechaValida, sumarDias } from './dates'

export type TipoMov = 'gasto' | 'ingreso'
export type MedioPago = 'efectivo' | 'tarjeta' | 'nequi' | 'daviplata' | 'pse' | 'transferencia' | 'otro'
export type Origen = 'manual' | 'frase' | 'voz' | 'foto' | 'recurrente'

export interface Categoria {
  id: string
  nombre: string
  icono: string
  tipo: TipoMov
  orden: number
  archivada: boolean
  creado_en: string
  editado_en: string
}

export interface Movimiento {
  id: string
  tipo: TipoMov
  monto: number // pesos enteros
  moneda: 'COP'
  categoria_id: string
  fecha: string // AAAA-MM-DD, hora de Colombia
  descripcion: string
  medio_pago?: MedioPago
  origen: Origen
  creado_en: string
  editado_en: string
}

export type NuevoMovimiento = Pick<Movimiento, 'tipo' | 'monto' | 'categoria_id' | 'fecha'> &
  Partial<Pick<Movimiento, 'descripcion' | 'medio_pago' | 'origen'>>

export const MEDIOS_PAGO: { id: MedioPago; nombre: string }[] = [
  { id: 'efectivo', nombre: 'Efectivo' },
  { id: 'tarjeta', nombre: 'Tarjeta' },
  { id: 'nequi', nombre: 'Nequi' },
  { id: 'daviplata', nombre: 'Daviplata' },
  { id: 'pse', nombre: 'PSE' },
  { id: 'transferencia', nombre: 'Transferencia' },
  { id: 'otro', nombre: 'Otro' },
]

const CATEGORIAS_BASE: Pick<Categoria, 'nombre' | 'icono' | 'tipo'>[] = [
  { nombre: 'Comida', icono: 'utensils', tipo: 'gasto' },
  { nombre: 'Mercado', icono: 'cart', tipo: 'gasto' },
  { nombre: 'Transporte', icono: 'bus', tipo: 'gasto' },
  { nombre: 'Hogar', icono: 'home', tipo: 'gasto' },
  { nombre: 'Servicios', icono: 'zap', tipo: 'gasto' },
  { nombre: 'Salud', icono: 'heart', tipo: 'gasto' },
  { nombre: 'Ropa', icono: 'shirt', tipo: 'gasto' },
  { nombre: 'Educación', icono: 'school', tipo: 'gasto' },
  { nombre: 'Entretenimiento', icono: 'ticket', tipo: 'gasto' },
  { nombre: 'Otros gastos', icono: 'tag', tipo: 'gasto' },
  { nombre: 'Salario', icono: 'banknote', tipo: 'ingreso' },
  { nombre: 'Otros ingresos', icono: 'wallet', tipo: 'ingreso' },
]

export class NovaDB extends Dexie {
  categorias!: Table<Categoria, string>
  movimientos!: Table<Movimiento, string>

  constructor(nombre: string) {
    super(nombre)
    this.version(1).stores({
      categorias: 'id, tipo, orden',
      movimientos: 'id, fecha, categoria_id, [categoria_id+fecha]',
    })
  }
}

/** Con ?demo en la dirección se usa otra base de datos, para no mezclar datos de ejemplo con los reales. */
export const esDemo = typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo')

export const db = new NovaDB(esDemo ? 'nova-gastos-demo' : 'nova-gastos')

function ahora(): string {
  return new Date().toISOString()
}

export async function asegurarCategorias(d: NovaDB = db): Promise<void> {
  if ((await d.categorias.count()) > 0) return
  const t = ahora()
  await d.categorias.bulkAdd(
    CATEGORIAS_BASE.map((c, orden) => ({ ...c, id: crypto.randomUUID(), orden, archivada: false, creado_en: t, editado_en: t })),
  )
}

export class ErrorDeDatos extends Error {}

export async function guardarMovimiento(d: NovaDB, entrada: NuevoMovimiento): Promise<Movimiento> {
  if (!Number.isSafeInteger(entrada.monto) || entrada.monto <= 0) throw new ErrorDeDatos('Escribe un monto mayor a 0')
  if (!fechaValida(entrada.fecha)) throw new ErrorDeDatos('La fecha no es válida')
  const cat = await d.categorias.get(entrada.categoria_id)
  if (!cat) throw new ErrorDeDatos('Elige una categoría')
  if (cat.tipo !== entrada.tipo) throw new ErrorDeDatos('La categoría no corresponde al tipo de movimiento')
  const t = ahora()
  const mov: Movimiento = {
    id: crypto.randomUUID(),
    tipo: entrada.tipo,
    monto: entrada.monto,
    moneda: 'COP',
    categoria_id: entrada.categoria_id,
    fecha: entrada.fecha,
    descripcion: (entrada.descripcion ?? '').trim().slice(0, 120),
    ...(entrada.medio_pago ? { medio_pago: entrada.medio_pago } : {}),
    origen: entrada.origen ?? 'manual',
    creado_en: t,
    editado_en: t,
  }
  await d.movimientos.add(mov)
  return mov
}

export async function borrarMovimiento(d: NovaDB, id: string): Promise<void> {
  await d.movimientos.delete(id)
}

/** Datos de ejemplo para ver la app llena (solo con ?demo). No toca los datos reales. */
export async function cargarDemo(d: NovaDB, hoy: string): Promise<void> {
  if ((await d.movimientos.count()) > 0) return
  const cats = await d.categorias.toArray()
  const id = (n: string) => cats.find((c) => c.nombre === n)!.id
  const dia = (n: number) => sumarDias(hoy, -n)
  const ejemplos: [TipoMov, number, string, string, string, MedioPago?, number?][] = [
    ['ingreso', 1300000, 'Salario', 'Pago quincena', dia(3), 'transferencia', 10],
    ['gasto', 18000, 'Comida', 'Almuerzo', dia(0), 'nequi', 13],
    ['gasto', 3200, 'Transporte', 'Bus', dia(0), 'efectivo', 8],
    ['gasto', 25000, 'Servicios', 'Plan de datos', dia(1), 'daviplata', 18],
    ['gasto', 64500, 'Mercado', 'Mercado de la semana', dia(2), 'tarjeta', 17],
    ['gasto', 12000, 'Comida', 'Domicilio', dia(3), 'nequi', 20],
    ['gasto', 35000, 'Entretenimiento', 'Cine', dia(4), 'tarjeta', 19],
    ['gasto', 90000, 'Hogar', 'Arreglo de la llave', dia(5), 'efectivo', 11],
    ['gasto', 42000, 'Salud', 'Droguería', dia(6), 'tarjeta', 9],
    ['gasto', 15000, 'Comida', 'Desayuno', dia(8), 'efectivo', 8],
    ['gasto', 78000, 'Mercado', 'Mercado', dia(9), 'tarjeta', 15],
    ['gasto', 22000, 'Transporte', 'Taxi', dia(10), 'nequi', 21],
  ]
  const base = new Date()
  await d.movimientos.bulkAdd(
    ejemplos.map(([tipo, monto, cat, descripcion, fecha, medio, hora = 12], i) => {
      const marca = new Date(base)
      marca.setUTCHours(hora + 5, (i * 7) % 60, 0, 0) // hora de Colombia = UTC-5
      return {
        id: crypto.randomUUID(), tipo, monto, moneda: 'COP' as const, categoria_id: id(cat), fecha, descripcion,
        ...(medio ? { medio_pago: medio } : {}), origen: 'manual' as const, creado_en: marca.toISOString(), editado_en: marca.toISOString(),
      }
    }),
  )
}
