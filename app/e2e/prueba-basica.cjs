// Prueba de punta a punta de la prueba básica (Playwright). Se corre con la app armada y en marcha:
//   cd app && npm run build && npx vite preview --port 4173   (en otra terminal)
//   node e2e/prueba-basica.cjs        (necesita: npm i -g playwright)
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const URL = 'http://localhost:4173/'
const paso = (t) => console.log('✔', t)

;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-CO', timezoneId: 'America/Bogota' })
  const p = await ctx.newPage()
  const errores = []
  p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()) })
  p.on('pageerror', (e) => errores.push(String(e)))

  // 1. primera vez: vacío
  await p.goto(URL)
  await p.getByText('Todavía no has anotado nada').waitFor()
  assert.equal(await p.getByText('$0', { exact: true }).first().isVisible(), true)
  await p.screenshot({ path: '1-vacio.png' })
  paso('primera vez: estado vacío con balance $0')

  // 2. validación
  await p.getByRole('button', { name: 'Agregar movimiento' }).click()
  await p.getByRole('dialog').waitFor()
  await p.waitForFunction(() => document.activeElement && document.activeElement.id === 'monto')
  await p.getByRole('button', { name: 'Guardar' }).click()
  await p.getByText('Escribe un monto mayor a 0').waitFor()
  await p.getByText('Elige una categoría').waitFor()
  paso('guardar vacío muestra los dos avisos y no guarda')

  // 3. llenar y guardar un gasto
  await p.locator('#monto').fill('18000')
  assert.equal(await p.locator('#monto').inputValue(), '$18.000')
  await p.getByRole('radio', { name: 'Comida' }).click()
  await p.locator('#descripcion').fill('Almuerzo')
  await p.getByRole('radio', { name: 'Nequi' }).click()
  await p.screenshot({ path: '2-hoja.png' })
  await p.getByRole('button', { name: 'Guardar' }).click()
  await p.getByRole('dialog').waitFor({ state: 'detached' })
  await p.getByRole('status').getByText('Guardado').waitFor()
  await p.getByText('Almuerzo').waitFor()
  assert.match(await p.locator('li', { hasText: 'Almuerzo' }).innerText(), /-\$18\.000/)
  paso('gasto de $18.000 guardado, aparece en la lista con el signo -')
  await p.screenshot({ path: '3-guardado.png' })

  // 4. deshacer
  await p.getByRole('button', { name: 'Deshacer' }).click()
  await p.getByText('Todavía no has anotado nada').waitFor()
  paso('"Deshacer" borra el movimiento')

  // 5. ingreso + gasto, balance
  for (const [tipo, monto, cat, desc] of [['Ingreso', '1300000', 'Salario', 'Pago quincena'], ['Gasto', '18000', 'Comida', 'Almuerzo'], ['Gasto', '3200', 'Transporte', 'Bus']]) {
    await p.getByRole('button', { name: 'Agregar movimiento' }).click()
    await p.getByRole('radio', { name: tipo, exact: true }).click()
    await p.locator('#monto').fill(monto)
    await p.getByRole('radio', { name: cat }).click()
    await p.locator('#descripcion').fill(desc)
    await p.getByRole('button', { name: 'Guardar' }).click()
    await p.getByRole('dialog').waitFor({ state: 'detached' })
  }
  await p.getByText('$1.278.800').first().waitFor()
  paso('balance = $1.300.000 - $18.000 - $3.200 = $1.278.800')

  // 6. Escape cierra y devuelve el foco
  const fab = p.getByRole('button', { name: 'Agregar movimiento' })
  await fab.click(); await p.getByRole('dialog').waitFor()
  await p.keyboard.press('Escape')
  await p.getByRole('dialog').waitFor({ state: 'detached' })
  assert.equal(await fab.evaluate((el) => el === document.activeElement), true)
  paso('Escape cierra la hoja y el foco vuelve al botón +')

  // 7. SIN INTERNET
  await p.evaluate(() => navigator.serviceWorker.ready)
  await p.reload(); await p.getByText('Actividad reciente').waitFor()
  assert.equal(await p.evaluate(() => !!navigator.serviceWorker.controller), true)
  await ctx.setOffline(true)
  await p.reload()
  await p.getByText('Actividad reciente').waitFor()
  await p.getByText('Pago quincena').waitFor()
  paso('SIN INTERNET: la app abre y conserva los 3 movimientos')
  await fab.click()
  await p.getByRole('radio', { name: 'Hogar' }).click()
  await p.locator('#monto').fill('90000')
  await p.locator('#descripcion').fill('Arreglo sin internet')
  await p.getByRole('button', { name: 'Guardar' }).click()
  await p.getByRole('dialog').waitFor({ state: 'detached' })
  await p.reload()
  await p.getByText('Arreglo sin internet').waitFor()
  paso('SIN INTERNET: guardar un gasto nuevo funciona y sobrevive al recargar')
  await p.screenshot({ path: '4-sin-internet.png' })
  await ctx.setOffline(false)

  // 8. otras pestañas
  await p.getByRole('button', { name: 'Metas', exact: true }).click()
  await p.getByRole('heading', { name: 'Metas de ahorro' }).waitFor()
  paso('las pestañas sin construir muestran un aviso claro')

  console.log(errores.length ? `⚠ errores de consola: ${errores.join(' | ')}` : '✔ sin errores en la consola')
  await b.close()
})().catch((e) => { console.error('✘ FALLÓ:', e.message); process.exit(1) })
