import Dexie, { type Table } from 'dexie'
import { fechaValida, hoyISO, mesDe, sumarDias } from './dates'

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

export interface Presupuesto {
  id: string
  categoria_id: string
  mes: string // AAAA-MM: desde este mes rige el límite, hasta que se cambie
  limite: number // pesos enteros
  umbral_alerta: number // 1 a 100
  creado_en: string
  editado_en: string
}

export type Tema = 'sistema' | 'claro' | 'oscuro'

export interface Ajustes {
  id: 1
  tema: Tema
  ultimo_respaldo?: string
  /** código para usar la IA del servidor; vive solo en este celular y no sale en los respaldos */
  codigo_ia?: string
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
  presupuestos!: Table<Presupuesto, string>
  ajustes!: Table<Ajustes, number>

  constructor(nombre: string) {
    super(nombre)
    this.version(1).stores({
      categorias: 'id, tipo, orden',
      movimientos: 'id, fecha, categoria_id, [categoria_id+fecha]',
    })
    this.version(2).stores({
      presupuestos: 'id, categoria_id, &[categoria_id+mes]',
      ajustes: 'id',
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

export const FECHA_MINIMA = '2000-01-01'

async function validarMovimiento(d: NovaDB, m: Pick<Movimiento, 'tipo' | 'monto' | 'categoria_id' | 'fecha'>): Promise<void> {
  if (!Number.isSafeInteger(m.monto) || m.monto <= 0) throw new ErrorDeDatos('Escribe un monto mayor a 0')
  if (!fechaValida(m.fecha) || m.fecha < FECHA_MINIMA) throw new ErrorDeDatos('La fecha no es válida')
  if (m.fecha > hoyISO()) throw new ErrorDeDatos('La fecha no puede ser futura')
  const cat = await d.categorias.get(m.categoria_id)
  if (!cat) throw new ErrorDeDatos('Elige una categoría')
  if (cat.tipo !== m.tipo) throw new ErrorDeDatos('La categoría no corresponde al tipo de movimiento')
}

export async function guardarMovimiento(d: NovaDB, entrada: NuevoMovimiento): Promise<Movimiento> {
  await validarMovimiento(d, entrada)
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

export type CambiosMovimiento = Partial<Pick<Movimiento, 'tipo' | 'monto' | 'categoria_id' | 'fecha' | 'descripcion'>> & { medio_pago?: MedioPago | null }

export async function actualizarMovimiento(d: NovaDB, id: string, cambios: CambiosMovimiento): Promise<Movimiento> {
  const actual = await d.movimientos.get(id)
  if (!actual) throw new ErrorDeDatos('Ese movimiento ya no existe')
  const { medio_pago, ...resto } = cambios
  const mov: Movimiento = { ...actual, ...resto, editado_en: ahora() }
  mov.descripcion = mov.descripcion.trim().slice(0, 120)
  if (medio_pago === null) delete mov.medio_pago
  else if (medio_pago) mov.medio_pago = medio_pago
  await validarMovimiento(d, mov)
  await d.movimientos.put(mov)
  return mov
}

/** Vuelve a poner un movimiento tal cual estaba (para "Deshacer" después de borrar). */
export async function restaurarMovimiento(d: NovaDB, mov: Movimiento): Promise<void> {
  await d.movimientos.put(mov)
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
  // meses anteriores, para que se vea el "mes a mes"
  const mes = mesDe(hoy)
  const [a, m] = mes.split('-').map(Number)
  const mesAtras = (n: number) => { const t = a * 12 + (m - 1) - n; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}` }
  const historial: [number, number][] = [[1, 880_000], [2, 950_000], [3, 790_000], [4, 1_020_000]]
  for (const [n, gasto] of historial) {
    ejemplos.push(['ingreso', 1_300_000, 'Salario', 'Pago quincena', `${mesAtras(n)}-05`, 'transferencia', 10])
    ejemplos.push(['gasto', Math.round(gasto * 0.45), 'Mercado', 'Mercado del mes', `${mesAtras(n)}-12`, 'tarjeta', 16])
    ejemplos.push(['gasto', Math.round(gasto * 0.35), 'Hogar', 'Arriendo y servicios', `${mesAtras(n)}-03`, 'transferencia', 9])
    ejemplos.push(['gasto', Math.round(gasto * 0.2), 'Entretenimiento', 'Salidas', `${mesAtras(n)}-20`, 'efectivo', 19])
  }
  const base = new Date()
  const t0 = ahora()
  await d.presupuestos.bulkAdd(
    [['Mercado', 150_000], ['Transporte', 20_000], ['Comida', 60_000], ['Hogar', 200_000]].map(([nombre, limite]) => ({
      id: crypto.randomUUID(), categoria_id: id(nombre as string), mes, limite: limite as number, umbral_alerta: 80, creado_en: t0, editado_en: t0,
    })),
  )
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

// ---------- Categorías ----------

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

export const ICONOS_CATEGORIA = [
  'utensils', 'cart', 'bus', 'home', 'zap', 'heart', 'shirt', 'school', 'ticket', 'tag', 'banknote', 'wallet',
  'coffee', 'gift', 'paw', 'phone', 'gym', 'plane', 'car', 'book',
] as const

export async function guardarCategoria(d: NovaDB, datos: { id?: string; nombre: string; icono: string; tipo: TipoMov }): Promise<Categoria> {
  const nombre = datos.nombre.trim()
  if (nombre.length < 1 || nombre.length > 30) throw new ErrorDeDatos('El nombre debe tener entre 1 y 30 letras')
  if (!(ICONOS_CATEGORIA as readonly string[]).includes(datos.icono)) throw new ErrorDeDatos('Elige un ícono')
  const todas = await d.categorias.toArray()
  const repetida = todas.find((c) => c.id !== datos.id && !c.archivada && c.tipo === datos.tipo && normalizar(c.nombre) === normalizar(nombre))
  if (repetida) throw new ErrorDeDatos('Ya tienes una categoría con ese nombre')
  const t = ahora()
  if (datos.id) {
    const actual = todas.find((c) => c.id === datos.id)
    if (!actual) throw new ErrorDeDatos('Esa categoría ya no existe')
    const nueva = { ...actual, nombre, icono: datos.icono, editado_en: t }
    await d.categorias.put(nueva)
    return nueva
  }
  const nueva: Categoria = {
    id: crypto.randomUUID(), nombre, icono: datos.icono, tipo: datos.tipo,
    orden: todas.reduce((m, c) => Math.max(m, c.orden), -1) + 1, archivada: false, creado_en: t, editado_en: t,
  }
  await d.categorias.add(nueva)
  return nueva
}

/** Archivar oculta la categoría de los formularios pero conserva el historial. */
export async function archivarCategoria(d: NovaDB, id: string, archivada: boolean): Promise<void> {
  const cat = await d.categorias.get(id)
  if (!cat) throw new ErrorDeDatos('Esa categoría ya no existe')
  if (archivada) {
    const activas = (await d.categorias.toArray()).filter((c) => c.tipo === cat.tipo && !c.archivada)
    if (activas.length <= 1) throw new ErrorDeDatos('Debe quedar al menos una categoría de este tipo')
  } else {
    const todas = await d.categorias.toArray()
    if (todas.some((c) => c.id !== id && !c.archivada && c.tipo === cat.tipo && normalizar(c.nombre) === normalizar(cat.nombre))) {
      throw new ErrorDeDatos('Ya hay otra categoría activa con ese nombre')
    }
  }
  await d.categorias.put({ ...cat, archivada, editado_en: ahora() })
}

// ---------- Presupuestos ----------

export async function fijarPresupuesto(d: NovaDB, datos: { categoria_id: string; mes: string; limite: number; umbral_alerta: number }): Promise<Presupuesto> {
  if (!Number.isSafeInteger(datos.limite) || datos.limite <= 0) throw new ErrorDeDatos('Escribe un límite mayor a 0')
  if (!Number.isInteger(datos.umbral_alerta) || datos.umbral_alerta < 1 || datos.umbral_alerta > 100) throw new ErrorDeDatos('El aviso debe estar entre 1 y 100 %')
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(datos.mes)) throw new ErrorDeDatos('El mes no es válido')
  const cat = await d.categorias.get(datos.categoria_id)
  if (!cat || cat.tipo !== 'gasto') throw new ErrorDeDatos('Solo se pone presupuesto a categorías de gasto')
  const t = ahora()
  const existente = await d.presupuestos.where('[categoria_id+mes]').equals([datos.categoria_id, datos.mes]).first()
  const p: Presupuesto = { id: existente?.id ?? crypto.randomUUID(), ...datos, creado_en: existente?.creado_en ?? t, editado_en: t }
  await d.presupuestos.put(p)
  return p
}

export async function quitarPresupuesto(d: NovaDB, categoria_id: string): Promise<void> {
  await d.presupuestos.where('categoria_id').equals(categoria_id).delete()
}

// ---------- Ajustes ----------

export async function leerAjustes(d: NovaDB): Promise<Ajustes> {
  return (await d.ajustes.get(1)) ?? { id: 1, tema: 'sistema', editado_en: ahora() }
}

export async function guardarAjustes(d: NovaDB, cambios: Partial<Omit<Ajustes, 'id'>>): Promise<void> {
  await d.ajustes.put({ ...(await leerAjustes(d)), ...cambios, id: 1, editado_en: ahora() })
}
