// Prueba de punta a punta de la IA (Playwright): frase sin IA, con IA, voz, foto del recibo, fallas, sin internet y que el código no salga en los respaldos.
// Usa el servidor de prueba (no gasta dinero: la IA es simulada):
//   cd app && npm run build && node e2e/servidor-de-prueba.mjs   (en otra terminal; puerto 4174)
//   node e2e/ia.cjs     (necesita: npm i -g playwright)
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const URL = 'http://localhost:4174/'
const CODIGO = 'codigo-de-prueba-123'
const paso = (t) => console.log('✔', t)

;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-CO', timezoneId: 'America/Bogota', acceptDownloads: true })
  await ctx.addInitScript(() => {
    // micrófono simulado: dice lo que diga window.__dice, o falla con window.__vozError
    class VozFalsa {
      start() {
        setTimeout(() => {
          if (window.__vozError) this.onerror?.({ error: window.__vozError })
          else this.onresult?.({ results: [[{ transcript: window.__dice || 'almuerzo 18 mil' }]] })
          this.onend?.()
        }, 150)
      }
      stop() {} abort() {}
    }
    for (const nombre of ['SpeechRecognition', 'webkitSpeechRecognition']) Object.defineProperty(window, nombre, { value: VozFalsa, configurable: true, writable: true })
  })
  const p = await ctx.newPage()
  globalThis.__p = p
  const errores = []
  // el navegador anota como "error" cada respuesta 401, 422 o 502 y la desconexión: las provoco a propósito, no cuentan
  const esperado = /Failed to load resource: (the server responded with a status of (401|422|502)|net::ERR_INTERNET_DISCONNECTED)/
  p.on('console', (m) => { if (m.type() === 'error' && !esperado.test(m.text())) errores.push(m.text()) })
  p.on('pageerror', (e) => errores.push(String(e)))
  const control = (datos) => p.request.post(URL + '__control', { data: datos })
  const estadoIA = async () => (await (await p.request.get(URL + '__control')).json())
  const abrirHoja = async () => { await p.getByRole('button', { name: 'Agregar movimiento' }).click(); await p.getByRole('dialog').waitFor() }
  const cerrarHoja = async () => { await p.keyboard.press('Escape'); await p.getByRole('dialog').waitFor({ state: 'detached' }) }
  const estado = () => p.locator('[role=status]').filter({ hasText: /Entend|Recibo|No |Activa|Escuchando|IA/ }).first()

  await control({ modo: 'normal' }); await p.request.get(URL + '__control?reiniciar=1')
  await p.goto(URL)
  await p.getByText('Todavía no has anotado nada').waitFor()
  paso('la app abre con la política de seguridad estricta (CSP) de Vercel, sin errores')

  // ---------- sin IA: lector local ----------
  await abrirHoja()
  await p.getByRole('heading', { name: 'Dilo o escríbelo' }).waitFor()
  await p.getByLabel('Frase del gasto').fill('almuerzo 18 mil en nequi')
  await p.getByLabel('Frase del gasto').press('Enter') // Enter entiende la frase; NO guarda el formulario
  await p.getByText('Entendí lo básico sin IA').waitFor()
  assert.equal(await p.getByRole('dialog').count(), 1)
  assert.equal(await p.locator('#monto').inputValue(), '$18.000')
  assert.equal(await p.getByRole('radio', { name: 'Comida' }).getAttribute('aria-checked'), 'true')
  assert.equal(await p.getByRole('radio', { name: 'Nequi' }).getAttribute('aria-checked'), 'true')
  assert.equal(await p.locator('#descripcion').inputValue(), 'Almuerzo')
  paso('SIN IA: "almuerzo 18 mil en nequi" llena monto, categoría, medio de pago y descripción; Enter no guarda')
  await p.getByRole('button', { name: 'Guardar', exact: true }).click()
  await p.getByRole('dialog').waitFor({ state: 'detached' })
  await p.getByRole('button', { name: /Editar (gasto|ingreso)\. Almuerzo/ }).waitFor()
  assert.equal((await estadoIA()).llamadasIA.length, 0)
  paso('se guarda, y no se llamó a ninguna IA (costo: $0)')

  await abrirHoja()
  await p.getByLabel('Frase del gasto').fill('hola qué tal')
  await p.getByRole('button', { name: 'Entender' }).click()
  await p.getByText(/No encontré el monto/).waitFor()
  await p.getByRole('button', { name: 'Foto del recibo' }).click()
  await p.getByText(/Leer recibos necesita la IA/).waitFor()
  paso('sin monto no inventa nada; la foto avisa que necesita la IA')
  await p.getByLabel('Frase del gasto').fill('me pagaron la quincena 1.300.000')
  await p.getByRole('button', { name: 'Entender' }).click()
  await p.getByText('Entendí lo básico sin IA').waitFor()
  assert.equal(await p.getByRole('radio', { name: 'Ingreso', exact: true }).getAttribute('aria-checked'), 'true')
  assert.equal(await p.locator('#monto').inputValue(), '$1.300.000')
  assert.equal(await p.getByRole('radio', { name: 'Salario' }).getAttribute('aria-checked'), 'true')
  paso('"me pagaron la quincena 1.300.000" se reconoce como ingreso de salario')
  await cerrarHoja()

  // ---------- activar la IA en Ajustes ----------
  await p.getByRole('button', { name: 'Ajustes', exact: true }).last().click()
  await p.getByRole('heading', { name: 'Inteligencia artificial' }).waitFor()
  await p.getByLabel('Código de acceso').fill('codigo-equivocado')
  await p.getByRole('button', { name: 'Probar conexión' }).click()
  await p.getByText('El código de acceso no coincide').waitFor()
  await p.getByLabel('Código de acceso').fill(CODIGO)
  await p.getByRole('button', { name: 'Probar conexión' }).click()
  await p.getByText('La IA está lista').waitFor()
  await p.getByRole('button', { name: 'Guardar código' }).click()
  await p.getByRole('status').getByText('Código de la IA guardado en este celular').waitFor()
  await p.screenshot({ path: 'ia-ajustes.png', fullPage: true })
  paso('Ajustes: código malo se rechaza, código bueno dice "La IA está lista", y se guarda')

  // ---------- con IA ----------
  await p.getByRole('button', { name: 'Inicio', exact: true }).click()
  await abrirHoja()
  await p.getByLabel('Frase del gasto').fill('almuerzo 18 mil en nequi')
  await p.getByRole('button', { name: 'Entender' }).click()
  await p.getByText('Entendido con IA').waitFor()
  assert.equal(await p.locator('#descripcion').inputValue(), 'Almuerzo (IA)')
  assert.equal(await p.locator('#monto').inputValue(), '$18.000')
  let e = await estadoIA()
  assert.equal(e.llamadasIA.length, 1)
  assert.deepEqual({ llave: e.llamadasIA[0].tieneLlave, modelo: e.llamadasIA[0].modelo, imagen: e.llamadasIA[0].esImagen }, { llave: true, modelo: 'claude-haiku-5-5', imagen: false })
  await p.screenshot({ path: 'ia-frase.png' })
  paso('CON IA: la frase pasa por el servidor, que usa la llave y el modelo; el formulario queda para revisar')
  await p.getByRole('button', { name: 'Guardar', exact: true }).click()
  await p.getByRole('dialog').waitFor({ state: 'detached' })
  await p.getByRole('button', { name: /Editar (gasto|ingreso)\. Almuerzo \(IA\)/ }).waitFor()

  // ---------- voz ----------
  await abrirHoja()
  await p.evaluate(() => { window.__dice = 'me pagaron la quincena 1300 mil' })
  await p.getByRole('button', { name: 'Hablar' }).click()
  await p.getByText('Entendido con IA').waitFor()
  assert.equal(await p.getByLabel('Frase del gasto').inputValue(), 'me pagaron la quincena 1300 mil')
  assert.equal(await p.locator('#monto').inputValue(), '$1.300.000')
  assert.equal(await p.getByRole('radio', { name: 'Ingreso', exact: true }).getAttribute('aria-checked'), 'true')
  paso('VOZ: lo dictado aparece en la frase y se entiende (ingreso de $1.300.000)')
  await p.evaluate(() => { window.__vozError = 'not-allowed' })
  await p.getByRole('button', { name: 'Hablar' }).click()
  await p.getByText('Activa el micrófono para Nova en los ajustes de Chrome').waitFor()
  await p.evaluate(() => { window.__vozError = 'no-speech' })
  await p.getByRole('button', { name: 'Hablar' }).click()
  await p.getByText('No te escuché. Prueba otra vez').waitFor()
  paso('VOZ: sin permiso o sin escuchar nada, explica qué hacer')
  await p.evaluate(() => { window.__vozError = null })
  assert.equal(await p.locator('#monto').inputValue(), '$1.300.000') // los errores de voz no borran lo que ya estaba
  await p.getByRole('button', { name: 'Guardar', exact: true }).click()
  await p.getByRole('dialog').waitFor({ state: 'detached' })

  // ---------- foto ----------
  await abrirHoja()
  await p.locator('input[type=file]').setInputFiles(require('node:path').join(__dirname, '..', 'public', 'pwa-512.png'))
  await p.getByText('Recibo leído con IA').waitFor()
  assert.equal(await p.locator('#monto').inputValue(), '$56.800')
  assert.equal(await p.getByRole('radio', { name: 'Mercado' }).getAttribute('aria-checked'), 'true')
  assert.equal(await p.getByRole('radio', { name: 'Tarjeta' }).getAttribute('aria-checked'), 'true')
  assert.equal(await p.locator('#descripcion').inputValue(), 'Supermercado Éxito (IA)')
  e = await estadoIA()
  assert.equal(e.llamadasIA.at(-1).esImagen, true)
  paso('FOTO: la imagen se reduce, viaja como foto al servidor y llena el gasto ($56.800, Mercado, Tarjeta)')
  await p.getByRole('button', { name: 'Guardar', exact: true }).click()
  await p.getByRole('dialog').waitFor({ state: 'detached' })

  // ---------- cuando la IA falla ----------
  await abrirHoja()
  await control({ modo: 'ocupada' })
  await p.getByLabel('Frase del gasto').fill('bus 3200')
  await p.getByRole('button', { name: 'Entender' }).click()
  await p.getByText(/No pude usar la IA \(la IA está ocupada\)/).waitFor()
  assert.equal(await p.locator('#monto').inputValue(), '$3.200')
  paso('IA ocupada: avisa y sigue con el lector local ($3.200, Transporte)')
  await control({ modo: 'sin_monto' })
  await p.getByLabel('Frase del gasto').fill('algo sin cifras')
  await p.getByRole('button', { name: 'Entender' }).click()
  await p.getByText(/No encontré el monto/).waitFor()
  await control({ modo: 'normal' })
  await cerrarHoja()

  // código viejo guardado
  await p.getByRole('button', { name: 'Ajustes', exact: true }).last().click()
  await p.getByLabel('Código de acceso').fill('codigo-que-cambio')
  await p.getByRole('button', { name: 'Guardar código' }).click()
  await p.getByRole('button', { name: 'Inicio', exact: true }).click()
  await abrirHoja()
  await p.getByLabel('Frase del gasto').fill('taxi 8 mil')
  await p.getByRole('button', { name: 'Entender' }).click()
  await p.getByText(/No pude usar la IA \(el código de acceso no coincide\)/).waitFor()
  assert.equal(await p.locator('#monto').inputValue(), '$8.000')
  paso('código que ya no sirve: avisa y sigue con el lector local')
  await cerrarHoja()
  await p.getByRole('button', { name: 'Ajustes', exact: true }).last().click()
  await p.getByLabel('Código de acceso').fill(CODIGO)
  await p.getByRole('button', { name: 'Guardar código' }).click()

  // ---------- sin internet ----------
  await p.getByRole('button', { name: 'Inicio', exact: true }).click()
  await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.getByText('Actividad reciente').waitFor()
  await ctx.setOffline(true)
  await abrirHoja()
  await p.getByLabel('Frase del gasto').fill('mercado 64 mil con tarjeta')
  await p.getByRole('button', { name: 'Entender' }).click()
  await p.getByText(/No pude usar la IA \(no hay conexión a internet\)/).waitFor()
  assert.equal(await p.locator('#monto').inputValue(), '$64.000')
  assert.equal(await p.getByRole('radio', { name: 'Mercado' }).getAttribute('aria-checked'), 'true')
  paso('SIN INTERNET: la frase se entiende igual con el lector local')
  await p.getByRole('button', { name: 'Guardar', exact: true }).click()
  await p.getByRole('dialog').waitFor({ state: 'detached' })
  await ctx.setOffline(false)

  // ---------- el código no sale en los respaldos ----------
  await p.getByRole('button', { name: 'Ajustes', exact: true }).last().click()
  const [d] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Descargar respaldo' }).click()])
  const texto = fs.readFileSync(await d.path(), 'utf8')
  assert.ok(!texto.includes(CODIGO) && !texto.includes('codigo_ia'))
  const respaldo = JSON.parse(texto)
  assert.ok(respaldo.movimientos.some((m) => m.origen === 'voz') && respaldo.movimientos.some((m) => m.origen === 'foto') && respaldo.movimientos.some((m) => m.origen === 'frase'))
  paso('el respaldo NO incluye el código de la IA, y recuerda de dónde vino cada gasto (frase, voz, foto)')

  console.log(errores.length ? `⚠ errores de consola (${errores.length}): ${errores.slice(0, 5).join(' | ')}` : '✔ sin errores en la consola (incluida la política CSP)')
  if (errores.length) process.exitCode = 1
  await b.close()
})().catch(async (e) => { console.error('✘ FALLÓ:', e.message.split('\n').slice(0, 8).join('\n')); try { await globalThis.__p.screenshot({ path: 'fallo.png' }); console.error('texto visible en el estado:', await globalThis.__p.locator('[role=status]').allInnerTexts()) } catch {} process.exit(1) })
