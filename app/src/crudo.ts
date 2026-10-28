import { db } from './db'
import { descargar } from './descarga'

/** Copia de todo lo guardado, sin revisar nada. Es el plan de emergencia si algo quedó dañado y la app no puede abrirlo. */
export async function descargarDatosCrudos(): Promise<void> {
  const datos = {
    nota: 'Copia sin revisar de todo lo guardado en Nova. No se puede recuperar directo desde Ajustes; sirve para guardar tus datos o para repararlos.',
    exportado_en: new Date().toISOString(),
    categorias: await db.categorias.toArray(),
    movimientos: await db.movimientos.toArray(),
    presupuestos: await db.presupuestos.toArray(),
  }
  descargar(`nova-datos-sin-revisar-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(datos, null, 1))
}
