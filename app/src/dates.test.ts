import { describe, expect, it } from 'vitest'
import { diaSemana, etiquetaDia, fechaValida, hoyISO, inicioSemana, mesDe, sumarDias } from './dates'

describe('fechas en hora de Colombia', () => {
  it('un gasto de las 11 p. m. sigue siendo del mismo día', () => {
    // 2026-10-28 23:30 en Bogotá = 2026-10-29 04:30 UTC
    expect(hoyISO(new Date('2026-10-29T04:30:00Z'))).toBe('2026-10-28')
    expect(hoyISO(new Date('2026-10-29T05:00:00Z'))).toBe('2026-10-29')
  })
  it('suma días cruzando mes y año', () => {
    expect(sumarDias('2026-10-31', 1)).toBe('2026-11-01')
    expect(sumarDias('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('la semana empieza el lunes', () => {
    expect(diaSemana('2026-10-26')).toBe(0) // lunes
    expect(diaSemana('2026-11-01')).toBe(6) // domingo
    expect(inicioSemana('2026-10-28')).toBe('2026-10-26')
    expect(inicioSemana('2026-11-01')).toBe('2026-10-26')
  })
  it('valida fechas', () => {
    expect(fechaValida('2026-02-29')).toBe(false)
    expect(fechaValida('2028-02-29')).toBe(true)
    expect(fechaValida('28/10/2026')).toBe(false)
    expect(fechaValida('2026-13-45')).toBe(false) // antes lanzaba un error
    expect(fechaValida('2026-00-10')).toBe(false)
    expect(fechaValida('')).toBe(false)
    expect(mesDe('2026-10-28')).toBe('2026-10')
  })
  it('etiquetas', () => {
    expect(etiquetaDia('2026-10-28', '2026-10-28')).toBe('Hoy')
    expect(etiquetaDia('2026-10-27', '2026-10-28')).toBe('Ayer')
    expect(etiquetaDia('2026-10-24', '2026-10-28')).toBe('24 oct')
  })
})
