const sinTildes = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Cada palabra de la búsqueda tiene que aparecer en el texto, en cualquier orden. Sin tildes ni mayúsculas. */
export function coincide(texto: string, consulta: string): boolean {
  const palabras = sinTildes(consulta).split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return true
  const t = sinTildes(texto)
  return palabras.every((p) => t.includes(p))
}
