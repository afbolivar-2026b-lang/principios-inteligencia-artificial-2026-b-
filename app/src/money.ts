// Dinero en pesos colombianos, siempre como entero (COP no usa centavos en la práctica).

const MILES = /\B(?=(\d{3})+(?!\d))/g

/** 18000 -> "$18.000". Los negativos llevan el signo antes del $. */
export function formatoCOP(monto: number): string {
  const n = Math.round(Math.abs(monto))
  return `${monto < 0 ? '-' : ''}$${String(n).replace(MILES, '.')}`
}

/** "18000" o "18.000" -> "18.000" (para mostrar mientras se escribe). */
export function formatoDigitos(digitos: string): string {
  const limpio = digitos.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12)
  return limpio.replace(MILES, '.')
}

export function soloDigitos(texto: string): number {
  const d = texto.replace(/\D/g, '').slice(0, 12)
  return d ? Number(d) : 0
}

function leerNumero(s: string): number | null {
  // 18.000 · 1,300,000 · 1.300.000: los puntos o comas son separadores de miles
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''))
  if (/^\d+$/.test(s)) return Number(s)
  // 1,5 · 18.5: decimales (solo tiene sentido con "mil" o "millones")
  const m = s.match(/^(\d+)[.,](\d+)$/)
  return m ? Number(`${m[1]}.${m[2]}`) : null
}

/**
 * Entiende cómo se escribe la plata en Colombia:
 * "18 mil", "18k", "18.000", "$ 1.300.000", "1,5 millones", "2 millones".
 * Devuelve pesos enteros, o null si no lo entiende o no es mayor que 0.
 */
export function leerMonto(texto: string): number | null {
  const t = texto.toLowerCase().replace(/\$|cop|pesos?/g, ' ').replace(/\s+/g, ' ').trim()
  const m = t.match(/^(\d[\d.,]*)\s*(k|mil|m|mill[oó]n|millones)?$/)
  if (!m) return null
  const num = leerNumero(m[1])
  if (num === null) return null
  const factor = !m[2] ? 1 : m[2] === 'k' || m[2] === 'mil' ? 1_000 : 1_000_000
  const valor = Math.round(num * factor)
  return valor > 0 && Number.isSafeInteger(valor) ? valor : null
}
