// Servidor de prueba para las pruebas de punta a punta de la IA. NO es de producción.
//  - sirve app/dist con las MISMAS cabeceras de seguridad de vercel.json (para detectar choques con la política CSP)
//  - ejecuta las funciones reales de /api (server/ia.ts)
//  - se hace pasar por Anthropic con respuestas controladas, así no se gasta dinero ni se necesita una llave
// Uso: cd app && npm run build && node e2e/servidor-de-prueba.mjs   (puerto 4174)
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crearLimitador, manejar } from '../server/ia.ts'

const raiz = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const dist = join(raiz, 'dist')
const PUERTO = Number(process.env.PUERTO ?? 4174)
const vercel = JSON.parse(await readFile(join(raiz, 'vercel.json'), 'utf8'))
const cabeceras = Object.fromEntries(vercel.headers[0].headers.map((h) => [h.key.toLowerCase(), h.value]))
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff' }

const estado = { modo: 'normal', llamadasIA: [] }

const hoyDe = (texto) => /Hoy es (\d{4}-\d{2}-\d{2})/.exec(texto)?.[1] ?? '2026-10-28'
function falsoAnthropic(_url, init) {
  const cuerpo = JSON.parse(init.body)
  estado.llamadasIA.push({ tieneLlave: Boolean(init.headers['x-api-key']), modelo: cuerpo.model, esImagen: JSON.stringify(cuerpo.messages).includes('"type":"image"') })
  if (estado.modo === 'ocupada') return new Response('{}', { status: 529 })
  const hoy = hoyDe(cuerpo.system)
  const cats = cuerpo.tools[0].input_schema.properties.categoria.enum
  const elegir = (n) => (cats.includes(n) ? n : cats[0])
  const mensaje = JSON.stringify(cuerpo.messages)
  let input
  if (mensaje.includes('"type":"image"')) input = { tipo: 'gasto', monto: estado.modo === 'sin_monto' ? 0 : 56800, categoria: elegir('Mercado'), descripcion: 'Supermercado Éxito (IA)', medio_pago: 'tarjeta', fecha: hoy, confianza: 'alta' }
  else {
    const m = /(\d+)\s*mil/i.exec(mensaje)
    input = { tipo: /quincena|salario/i.test(mensaje) ? 'ingreso' : 'gasto', monto: estado.modo === 'sin_monto' || !m ? 0 : Number(m[1]) * 1000, categoria: elegir(/quincena|salario/i.test(mensaje) ? 'Salario' : 'Comida'), descripcion: 'Almuerzo (IA)', medio_pago: /nequi/i.test(mensaje) ? 'nequi' : 'ninguno', fecha: hoy, confianza: 'alta' }
  }
  return new Response(JSON.stringify({ content: [{ type: 'tool_use', name: 'registrar_movimiento', input }] }))
}

const deps = {
  fetchFn: async (u, i) => { if (estado.modo === 'lenta') await new Promise((r) => setTimeout(r, 1500)); return falsoAnthropic(u, i) },
  ahora: Date.now,
  entorno: { ANTHROPIC_API_KEY: 'sk-ant-FALSA-de-prueba', CODIGO_ACCESO: 'codigo-de-prueba-123' },
  limitadorFallos: crearLimitador(50, 3_600_000),
  limitadorUso: crearLimitador(500, 3_600_000),
}

async function leerCuerpo(req) {
  const trozos = []
  for await (const t of req) trozos.push(t)
  return Buffer.concat(trozos)
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  try {
    if (url.pathname === '/__control') { // para que la prueba cambie el comportamiento de la IA falsa
      if (req.method === 'POST') Object.assign(estado, JSON.parse((await leerCuerpo(req)).toString() || '{}'))
      if (url.searchParams.get('reiniciar')) estado.llamadasIA = []
      res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(estado)); return
    }
    const op = { '/api/interpretar': 'texto', '/api/recibo': 'recibo', '/api/estado': 'estado' }[url.pathname]
    if (op) {
      const cuerpo = req.method === 'GET' ? undefined : await leerCuerpo(req)
      const r = await manejar(op, new Request(url, { method: req.method, headers: req.headers, body: cuerpo }), deps)
      res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); return
    }
    let ruta = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^(\.\.[/\\])+/, '')
    const datos = await readFile(join(dist, ruta))
    res.writeHead(200, { 'content-type': TIPOS[extname(ruta)] ?? 'application/octet-stream', ...cabeceras, ...(ruta === '/sw.js' ? { 'cache-control': 'no-cache' } : {}) })
    res.end(datos)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('No existe')
  }
}).listen(PUERTO, () => console.log(`Servidor de prueba en http://localhost:${PUERTO}`))
