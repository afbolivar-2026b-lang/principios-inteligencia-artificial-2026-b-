// Reloj fijo para todas las pruebas: las pruebas no dependen del día en que se corren.
// Es el 28 de octubre de 2026 a las 12:00 del día en Bogotá. Solo se congela Date; los temporizadores siguen reales.
import { vi } from 'vitest'

vi.useFakeTimers({ toFake: ['Date'] })
vi.setSystemTime(new Date('2026-10-28T17:00:00Z'))
