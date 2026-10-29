import { responder } from './_comun.js'

/** GET /api/estado: dice si el código de acceso es correcto y si la IA está lista. No gasta nada. */
export function GET(request: Request): Promise<Response> {
  return responder('estado', request)
}
