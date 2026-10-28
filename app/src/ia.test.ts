import { describe, expect, it } from 'vitest'
import { ErrorIA, interpretarFrase, interpretarRecibo, probarConexion, razonCorta } from './ia'

const respuesta = (estado: number, cuerpo: unknown) => (async () => new Response(JSON.stringify(cuerpo), { status: estado })) as unknown as typeof fetch
const MOV = { tipo: 'gasto', monto: 18000, categoria: 'Comida', descripcion: 'Almuerzo', medio_pago: 'nequi', fecha: '2026-10-28', confianza: 'alta' }

describe('hablar con el servidor', () => {
  it('manda la frase con el código en la cabecera, no en el cuerpo', async () => {
    let visto: { url: string; init: RequestInit } | undefined
    const f = (async (url: string, init: RequestInit) => { visto = { url, init }; return new Response(JSON.stringify({ movimiento: MOV })) }) as unknown as typeof fetch
    const p = await interpretarFrase('almuerzo 18 mil', ['Comida'], '2026-10-28', 'mi-codigo', f)
    expect(visto!.url).toBe('/api/interpretar')
    expect((visto!.init.headers as Record<string, string>)['x-codigo-acceso']).toBe('mi-codigo')
    expect(String(visto!.init.body)).not.toContain('mi-codigo')
    expect(JSON.parse(String(visto!.init.body))).toEqual({ texto: 'almuerzo 18 mil', categorias: ['Comida'], hoy: '2026-10-28' })
    expect(p).toEqual({ ...MOV, fuente: 'ia' })
  })
  it('manda la foto a /api/recibo', async () => {
    let url = ''
    const f = (async (u: string) => { url = u; return new Response(JSON.stringify({ movimiento: MOV })) }) as unknown as typeof fetch
    await interpretarRecibo({ tipo: 'image/jpeg', datos: 'AAAA' }, ['Comida'], '2026-10-28', 'c', f)
    expect(url).toBe('/api/recibo')
  })
  it('sin código no llama a nadie', async () => {
    let llamado = false
    const f = (async () => { llamado = true; return new Response('{}') }) as unknown as typeof fetch
    await expect(interpretarFrase('a 1000', ['Comida'], '2026-10-28', '', f)).rejects.toMatchObject({ codigo: 'sin_codigo' })
    expect(llamado).toBe(false)
  })
  it.each([
    [503, { error: 'ia_no_configurada' }, 'ia_no_configurada'],
    [401, { error: 'codigo_incorrecto' }, 'codigo_incorrecto'],
    [429, { error: 'demasiados_intentos' }, 'demasiados'],
    [429, { error: 'limite_de_uso' }, 'demasiados'],
    [502, { error: 'ia_ocupada' }, 'ia_ocupada'],
    [502, { error: 'llave_invalida' }, 'ia_ocupada'],
    [422, { error: 'sin_monto', mensaje: 'No encontré el monto' }, 'sin_monto'],
    [413, { error: 'foto_muy_grande' }, 'foto_muy_grande'],
    [500, { error: 'algo_raro' }, 'otro'],
  ])('error %i %j -> %s', async (estado, cuerpo, codigo) => {
    await expect(interpretarFrase('x 1', ['Comida'], '2026-10-28', 'c', respuesta(estado, cuerpo))).rejects.toMatchObject({ codigo })
  })
  it('sin internet', async () => {
    const f = (async () => { throw new TypeError('Failed to fetch') }) as unknown as typeof fetch
    await expect(interpretarFrase('x 1', ['Comida'], '2026-10-28', 'c', f)).rejects.toMatchObject({ codigo: 'sin_conexion' })
  })
  it('una página HTML en vez de JSON (servidor sin funciones) se trata como IA no configurada', async () => {
    const f = (async () => new Response('<!doctype html><html></html>', { headers: { 'content-type': 'text/html' } })) as unknown as typeof fetch
    await expect(probarConexion('c', f)).rejects.toMatchObject({ codigo: 'ia_no_configurada' })
  })
  it('una respuesta rara del servidor no pasa', async () => {
    await expect(interpretarFrase('x 1', ['Comida'], '2026-10-28', 'c', respuesta(200, { movimiento: { monto: 'mucho' } }))).rejects.toBeInstanceOf(ErrorIA)
    await expect(interpretarFrase('x 1', ['Comida'], '2026-10-28', 'c', respuesta(200, {}))).rejects.toBeInstanceOf(ErrorIA)
  })
  it('probar conexión usa GET /api/estado', async () => {
    let metodo = ''
    const f = (async (_u: string, init: RequestInit) => { metodo = String(init.method); return new Response(JSON.stringify({ listo: true })) }) as unknown as typeof fetch
    await probarConexion('c', f)
    expect(metodo).toBe('GET')
  })
  it('razones cortas para el aviso de respaldo', () => {
    expect(razonCorta(new ErrorIA('x', 'sin_conexion'))).toBe('no hay conexión a internet')
    expect(razonCorta(new ErrorIA('x', 'codigo_incorrecto'))).toBe('el código de acceso no coincide')
    expect(razonCorta(new ErrorIA('x', 'ia_ocupada'))).toBe('la IA está ocupada')
    expect(razonCorta(new Error('cualquier cosa'))).toBe('falló la conexión con la IA')
  })
})
