import { crearLimitador, entornoDesde, manejar, type Dependencias, type Operacion } from '../server/ia.js'

// Se crean una vez por instancia del servidor: el límite es "de mejor esfuerzo" (cada instancia cuenta aparte).
const limitadorFallos = crearLimitador(10, 3_600_000)
const limitadorUso = crearLimitador(60, 3_600_000)

export function responder(op: Operacion, request: Request): Promise<Response> {
  const deps: Dependencias = { fetchFn: fetch, ahora: Date.now, entorno: entornoDesde(process.env), limitadorFallos, limitadorUso }
  return manejar(op, request, deps)
}
