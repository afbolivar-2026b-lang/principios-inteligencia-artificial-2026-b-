// Fechas como texto AAAA-MM-DD en hora de Colombia (UTC-5, sin horario de verano).
// Un gasto de las 11 p. m. no debe saltar al día siguiente.

const ZONA = 'America/Bogota'

export function hoyISO(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora)
}

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** 0 = lunes … 6 = domingo */
export function diaSemana(iso: string): number {
  return (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7
}

export function inicioSemana(iso: string): string {
  return sumarDias(iso, -diaSemana(iso))
}

export function mesDe(iso: string): string {
  return iso.slice(0, 7)
}

export function fechaValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(Date.parse(`${iso}T00:00:00Z`))) return false // por ejemplo 2026-13-45
  return sumarDias(iso, 0) === iso // por ejemplo 2026-02-30 se corre a marzo y no coincide
}

export function nombreMes(iso: string): string {
  const t = new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', month: 'long' }).format(new Date(`${iso}T12:00:00Z`))
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function horaLocal(marca: string): string {
  return new Intl.DateTimeFormat('es-CO', { timeZone: ZONA, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(marca))
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** "Hoy", "Ayer" o "24 oct" (fijo, para que no cambie según el celular) */
export function etiquetaDia(iso: string, hoy: string): string {
  if (iso === hoy) return 'Hoy'
  if (iso === sumarDias(hoy, -1)) return 'Ayer'
  return `${Number(iso.slice(8, 10))} ${MESES_CORTOS[Number(iso.slice(5, 7)) - 1]}`
}
