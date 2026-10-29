import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET as estado } from './estado'
import { POST as interpretar } from './interpretar'
import { POST as recibo } from './recibo'

const peticion = (ruta: string, metodo: string, cuerpo?: unknown, codigo = 'codigo-largo-de-prueba') =>
  new Request(`https://nova.example/api/${ruta}`, {
    method: metodo,
    headers: { 'x-codigo-acceso': codigo, 'content-type': 'application/json', host: 'nova.example' },
    ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
  })

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('las tres funciones de /api están bien conectadas', () => {
  it('sin variables de entorno responden 503, no se caen', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', ''); vi.stubEnv('CODIGO_ACCESO', '')
    for (const r of [await estado(peticion('estado', 'GET')), await interpretar(peticion('interpretar', 'POST', {})), await recibo(peticion('recibo', 'POST', {}))]) {
      expect(r.status).toBe(503)
      expect(r.headers.get('content-type')).toContain('application/json')
    }
  })
  it('con las variables puestas funcionan de punta a punta (con una Anthropic simulada)', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-simulada'); vi.stubEnv('CODIGO_ACCESO', 'codigo-largo-de-prueba')
    const visto: { url: string; llave: string }[] = []
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      visto.push({ url, llave: (init.headers as Record<string, string>)['x-api-key'] })
      return new Response(JSON.stringify({ content: [{ type: 'tool_use', input: { tipo: 'gasto', monto: 9000, categoria: 'Comida', descripcion: 'Empanadas', medio_pago: 'efectivo', fecha: '2026-10-28', confianza: 'alta' } }] }))
    })
    expect((await estado(peticion('estado', 'GET'))).status).toBe(200)
    const r = await interpretar(peticion('interpretar', 'POST', { texto: 'empanadas 9 mil', categorias: ['Comida'], hoy: '2026-10-28' }))
    expect(r.status).toBe(200)
    expect(((await r.json()) as { movimiento: { monto: number } }).movimiento.monto).toBe(9000)
    expect(visto).toEqual([{ url: 'https://api.anthropic.com/v1/messages', llave: 'sk-ant-simulada' }])
    expect((await interpretar(peticion('interpretar', 'POST', { texto: 'x 1', categorias: ['Comida'], hoy: '2026-10-28' }, 'otro-codigo'))).status).toBe(401)
    expect(visto).toHaveLength(1) // el código malo no llegó a gastar nada
  })
})
