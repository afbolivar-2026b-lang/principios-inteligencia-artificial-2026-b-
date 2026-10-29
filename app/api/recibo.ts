import { responder } from './_comun.js'

/** POST /api/recibo: lee la foto de un recibo y propone el gasto (con la IA de Claude). */
export function POST(request: Request): Promise<Response> {
  return responder('recibo', request)
}
