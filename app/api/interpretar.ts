import { responder } from './_comun.js'

/** POST /api/interpretar: convierte una frase en un gasto o ingreso (con la IA de Claude). */
export function POST(request: Request): Promise<Response> {
  return responder('texto', request)
}
