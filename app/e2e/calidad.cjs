// Exploración: teclado, casos límite y datos corruptos. No se detiene en el primer fallo.
const { chromium } = require('playwright')
const fs = require('node:fs')
const URL = process.env.URL || 'http://localhost:4173/'
const hallazgos = []
let b
const nuevo = async (extra = {}, opciones = {}) => {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-CO', timezoneId: 'America/Bogota', acceptDownloads: true, ...extra })
  const p = await ctx.newPage()
  p.errores = []
  p.on('pageerror', (e) => p.errores.push(String(e)))
  return { ctx, p }
}
async function caso(id, titulo, fn) {
  try {
    const nota = await fn()
    console.log(`✔ ${id} ${titulo}${nota ? ' — ' + nota : ''}`)
  } catch (e) {
    const m = String(e.message || e).split('\n')[0].slice(0, 230)
    hallazgos.push({ id, titulo, m })
    console.log(`✘ ${id} ${titulo}\n     ${m}`)
  }
}
const abrir = async (p) => { await p.getByRole('button', { name: 'Agregar movimiento' }).click(); await p.getByRole('dialog').waitFor(); await p.waitForTimeout(250) }
const anotar = async (p, { monto, cat = 'Comida', desc = '' }) => {
  await abrir(p)
  await p.locator('#monto').fill(String(monto))
  await p.getByRole('radio', { name: cat, exact: true }).click()
  if (desc) await p.locator('#descripcion').fill(desc)
  await p.getByRole('button', { name: 'Guardar', exact: true }).click()
  await p.getByRole('dialog').waitFor({ state: 'detached' })
}
const desborde = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

;(async () => {
  b = await chromium.launch()

  // ---------- teclado ----------
  await caso('K1', 'solo teclado: anotar un gasto de principio a fin', async () => {
    const { ctx, p } = await nuevo()
    await p.goto(URL); await p.getByText('Todavía no has anotado nada').waitFor()
    const orden = []
    for (let i = 0; i < 25; i++) {
      await p.keyboard.press('Tab')
      const info = await p.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { n: (e.getAttribute('aria-label') || e.textContent || e.id || e.tagName).trim().slice(0, 30), visible: (parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none') || cs.boxShadow !== 'none' } })
      orden.push(info)
      if (info.n === 'Agregar movimiento') break
    }
    const sinFoco = orden.filter((o) => !o.visible).map((o) => o.n)
    if (!orden.some((o) => o.n === 'Agregar movimiento')) throw new Error('el botón + no se alcanza con Tab en 25 pasos: ' + orden.map((o) => o.n).join(' > '))
    await p.keyboard.press('Enter'); await p.getByRole('dialog').waitFor()
    await p.waitForFunction(() => document.activeElement?.id === 'monto')
    await p.keyboard.type('25000')
    let pasos = 0
    while (pasos++ < 60) { // recorrer hasta llegar a la categoría Comida
      await p.keyboard.press('Tab')
      const n = await p.evaluate(() => document.activeElement.textContent.trim())
      if (n === 'Comida') break
    }
    await p.keyboard.press('Space')
    if ((await p.getByRole('radio', { name: 'Comida', exact: true }).getAttribute('aria-checked')) !== 'true') throw new Error('Space no marca la categoría')
    pasos = 0
    while (pasos++ < 60) { await p.keyboard.press('Tab'); if ((await p.evaluate(() => document.activeElement.textContent.trim())) === 'Guardar') break }
    await p.keyboard.press('Enter')
    await p.getByRole('dialog').waitFor({ state: 'detached' })
    await p.getByRole('button', { name: /Editar (gasto|ingreso)\. Comida/ }).waitFor()
    const volvio = await p.evaluate(() => document.activeElement?.getAttribute('aria-label'))
    await ctx.close()
    if (sinFoco.length) throw new Error('sin indicador de foco visible en: ' + sinFoco.join(', '))
    if (volvio !== 'Agregar movimiento') throw new Error(`al cerrar, el foco no vuelve al botón + (está en: ${volvio})`)
    return `${pasos} tabs hasta Guardar`
  })

  await caso('K2', 'el foco queda atrapado dentro de la hoja (80 Tab y 80 Shift+Tab)', async () => {
    const { ctx, p } = await nuevo()
    await p.goto(URL + '?demo'); await p.getByText('Actividad reciente').waitFor(); await abrir(p)
    for (const tecla of ['Tab', 'Shift+Tab']) for (let i = 0; i < 80; i++) {
      await p.keyboard.press(tecla)
      if (!(await p.evaluate(() => !!document.activeElement.closest('[role=dialog]')))) throw new Error(`${tecla} sacó el foco de la hoja en el paso ${i + 1}`)
    }
    await ctx.close()
  })

  await caso('K3', 'con la hoja abierta, el contenido de atrás no es accesible (inert / aria-hidden)', async () => {
    const { ctx, p } = await nuevo()
    await p.goto(URL + '?demo'); await p.getByText('Actividad reciente').waitFor(); await abrir(p)
    const atras = await p.evaluate(() => { const r = document.getElementById('root'); return { inert: r.inert, ariaHidden: r.getAttribute('aria-hidden') } })
    await ctx.close()
    if (!atras.inert && atras.ariaHidden !== 'true') throw new Error('el lector de pantalla puede recorrer la app que está detrás de la ventana')
  })

  await caso('K4', 'árbol de accesibilidad: sin botones sin nombre, un solo h1 por pantalla, idioma es', async () => {
    const { ctx, p } = await nuevo()
    await p.goto(URL + '?demo'); await p.getByText('Actividad reciente').waitFor()
    const pantallas = [['Inicio', null], ['Análisis', 'Análisis'], ['Presupuestos', 'Presupuestos'], ['Metas', 'Metas de ahorro'], ['Ajustes', 'Ajustes']]
    const problemas = []
    for (const [boton, h1] of pantallas) {
      await p.getByRole('button', { name: boton, exact: true }).last().click(); await p.waitForTimeout(250)
      const r = await p.evaluate(() => ({
        sinNombre: [...document.querySelectorAll('button, [role=radio], a, input, select')].filter((e) => !e.hidden && e.getBoundingClientRect().width > 0 && !(e.getAttribute('aria-label') || e.textContent.trim() || (e.labels && e.labels.length) || e.getAttribute('aria-labelledby'))).map((e) => e.outerHTML.slice(0, 80)),
        h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
        lang: document.documentElement.lang,
      }))
      if (r.sinNombre.length) problemas.push(`${boton}: sin nombre ${r.sinNombre.join(' ')}`)
      if (r.h1.length !== 1) problemas.push(`${boton}: ${r.h1.length} h1 (${r.h1.join('/')})`)
      if (r.lang !== 'es') problemas.push(`lang=${r.lang}`)
    }
    await ctx.close()
    if (problemas.length) throw new Error(problemas.join(' | '))
  })

  // ---------- casos límite ----------
  await caso('E1', 'monto de 12 cifras: guarda y no rompe el diseño', async () => {
    const { ctx, p } = await nuevo()
    await p.goto(URL); await p.getByText('Todavía no has anotado nada').waitFor()
    await p.getByRole('button', { name: 'Anotar mi primer gasto' }).click(); await p.getByRole('dialog').waitFor()
    await p.locator('#monto').fill('99999999999999999999')
    const mostrado = await p.locator('#monto').inputValue()
    await p.getByRole('radio', { name: 'Comida', exact: true }).click()
    await p.getByRole('button', { name: 'Guardar', exact: true }).click(); await p.getByRole('dialog').waitFor({ state: 'detached' })
    await p.waitForTimeout(300)
    const d = await desborde(p)
    const recorte = await p.evaluate(() => { const e = document.querySelector('.hero p.text-display'); return e ? e.scrollWidth - e.clientWidth : 0 })
    await p.screenshot({ path: 'qa-e1.png' })
    await ctx.close()
    if (d > 0 || recorte > 0) throw new Error(`monto ${mostrado}: desborde de ${d}px en la página y ${recorte}px recortados en la tarjeta del balance`)
    return mostrado
  })

  await caso('E2', 'descripción de 120 letras anchas sin espacios: no desborda en ninguna lista', async () => {
    const { ctx, p } = await nuevo()
    await p.goto(URL); await p.getByText('Todavía no has anotado nada').waitFor()
    await anotar(p, { monto: 5000, desc: 'W'.repeat(120) })
    const fallas = []
    if ((await desborde(p)) > 0) fallas.push('Inicio')
    await p.getByRole('button', { name: 'Ver todo' }).click(); await p.waitForTimeout(300)
    if ((await desborde(p)) > 0) fallas.push('Movimientos')
    await p.getByRole('button', { name: /^Editar (gasto|ingreso)\./ }).click(); await p.getByRole('dialog').waitFor(); await p.waitForTimeout(300)
    if ((await desborde(p)) > 0) fallas.push('Hoja de edición')
    await ctx.close()
    if (fallas.length) throw new Error('desborde en: ' + fallas.join(', '))
  })

  await caso('E3', 'categoría con nombre de 30 letras anchas: no desborda', async () => {
    const { ctx, p } = await nuevo()
    await p.goto(URL + '?demo'); await p.getByText('Actividad reciente').waitFor()
    await p.getByRole('button', { name: 'Ajustes', exact: true }).last().click()
    await p.getByRole('button', { name: 'Categorías' }).click(); await p.getByRole('button', { name: 'Nueva categoría' }).click()
    await p.getByLabel('Nombre').fill('W'.repeat(30)); await p.getByRole('button', { name: 'Guardar', exact: true }).click()
    await p.getByRole('dialog').waitFor({ state: 'detached' })
    const fallas = []
    if ((await desborde(p)) > 0) fallas.push('Categorías')
    await p.getByRole('button', { name: 'Volver' }).click(); await p.getByRole('button', { name: 'Presupuestos', exact: true }).click(); await p.waitForTimeout(300)
    if ((await desborde(p)) > 0) fallas.push('Presupuestos')
    await p.getByRole('button', { name: 'Inicio', exact: true }).click(); await abrir(p)
    if ((await desborde(p)) > 0) fallas.push('Hoja de anotar')
    await ctx.close()
    if (fallas.length) throw new Error('desborde en: ' + fallas.join(', '))
  })

  await caso('E4', 'emoji, acentos y otros alfabetos se guardan, se muestran y se buscan', async () => {
    const { ctx, p } = await nuevo()
    await p.goto(URL); await p.getByText('Todavía no has anotado nada').waitFor()
    const texto = 'Café ☕ ñandú 🎉 日本 «hola»'
    await anotar(p, { monto: 7000, desc: texto })
    await p.getByText(texto).first().waitFor()
    await p.getByRole('button', { name: 'Ver todo' }).click(); await p.getByLabel('Buscar').fill('cafe NANDU')
    await p.getByText(/^1 movimiento/).waitFor()
    await ctx.close()
  })

  await caso('E5', 'texto con HTML o scripts se muestra como texto y no se ejecuta', async () => {
    const { ctx, p } = await nuevo()
    await p.goto(URL); await p.getByText('Todavía no has anotado nada').waitFor()
    const malo = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>'
    await anotar(p, { monto: 1000, desc: malo })
    await p.waitForTimeout(500)
    const r = await p.evaluate(() => ({ xss: window.__xss ?? null, imgs: document.querySelectorAll('li img').length }))
    await p.getByText(malo.slice(0, 20)).first().waitFor()
    await ctx.close()
    if (r.xss !== null || r.imgs) throw new Error('se ejecutó o se insertó HTML: ' + JSON.stringify(r))
  })

  await caso('E6', 'fechas raras: muy antigua y futura', async () => {
    const { ctx, p } = await nuevo()
    await p.goto(URL); await p.getByText('Todavía no has anotado nada').waitFor()
    const resultados = []
    for (const f of ['1900-01-01', '2099-12-31']) {
      await abrir(p); await p.locator('#monto').fill('1000'); await p.getByRole('radio', { name: 'Comida', exact: true }).click()
      await p.getByRole('radio', { name: 'Otra fecha' }).click(); await p.getByLabel('Fecha del movimiento').fill(f)
      await p.getByRole('button', { name: 'Guardar', exact: true }).click(); await p.waitForTimeout(400)
      const cerro = (await p.getByRole('dialog').count()) === 0
      resultados.push(`${f}: ${cerro ? 'se guardó' : 'se rechazó'}`)
      if (!cerro) await p.keyboard.press('Escape')
    }
    await ctx.close()
    if (resultados.some((r) => r.includes('se guardó'))) throw new Error(resultados.join('; ') + ' (una fecha de 1900 o de 2099 no tiene sentido en un gasto y queda fuera de cualquier lista)')
  })

  await caso('E7', 'doble toque rápido en Guardar crea un solo movimiento', async () => {
    const { ctx, p } = await nuevo()
    await p.goto(URL); await p.getByText('Todavía no has anotado nada').waitFor()
    await abrir(p); await p.locator('#monto').fill('1234'); await p.getByRole('radio', { name: 'Comida', exact: true }).click()
    await p.getByRole('button', { name: 'Guardar', exact: true }).dblclick({ delay: 10 }).catch(() => {})
    await p.getByRole('dialog').waitFor({ state: 'detached' }); await p.waitForTimeout(400)
    const n = await p.getByRole('button', { name: /^Editar (gasto|ingreso)\./ }).count()
    await ctx.close()
    if (n !== 1) throw new Error(`se crearon ${n} movimientos`)
  })

  await caso('E8', 'dos pestañas a la vez: lo que se anota en una aparece en la otra', async () => {
    const { ctx, p } = await nuevo()
    await p.goto(URL); await p.getByText('Todavía no has anotado nada').waitFor()
    const q = await ctx.newPage(); await q.goto(URL); await q.getByText('Todavía no has anotado nada').waitFor()
    await anotar(p, { monto: 4321, desc: 'Desde la pestaña A' })
    await q.getByText('Desde la pestaña A').waitFor({ timeout: 5000 })
    await ctx.close()
  })

  await caso('E9', 'el botón Atrás del celular cierra la hoja en vez de salir de la app', async () => {
    const { ctx, p } = await nuevo()
    await p.goto('about:blank'); await p.goto(URL); await p.getByText('Todavía no has anotado nada').waitFor()
    await abrir(p)
    await p.goBack().catch(() => {}); await p.waitForTimeout(500)
    const sigueEnApp = p.url().startsWith(URL)
    const hojaAbierta = (await p.getByRole('dialog').count()) > 0
    await ctx.close()
    if (!sigueEnApp) throw new Error('Atrás sacó al usuario de la app (y se pierde lo que estaba escribiendo)')
    if (hojaAbierta) throw new Error('Atrás no cerró la hoja')
  })

  await caso('E10', 'datos corruptos en el almacenamiento: la app no se queda en blanco', async () => {
    const { ctx, p } = await nuevo()
    await p.goto(URL); await p.getByText('Todavía no has anotado nada').waitFor()
    await anotar(p, { monto: 1000, desc: 'Normal' })
    await p.evaluate(() => new Promise((ok, mal) => {
      const r = indexedDB.open('nova-gastos')
      r.onsuccess = () => {
        const db = r.result
        const t = db.transaction('movimientos', 'readwrite'); const s = t.objectStore('movimientos')
        const base = { moneda: 'COP', creado_en: new Date().toISOString(), editado_en: new Date().toISOString(), origen: 'manual', descripcion: 'x' }
        s.add({ ...base, id: 'c1', tipo: 'gasto', monto: 'abc', categoria_id: 'no-existe', fecha: '2026-10-28' })
        s.add({ ...base, id: 'c2', tipo: 'gasto', monto: 500, categoria_id: 'x', fecha: null })
        s.add({ ...base, id: 'c3', tipo: 'raro', monto: 500, categoria_id: 'x', fecha: '2026-10-28', creado_en: 'ayer' })
        s.add({ ...base, id: 'c4', tipo: 'gasto', monto: -99, categoria_id: 'x', fecha: '2026-13-45', descripcion: null })
        t.oncomplete = () => ok(); t.onerror = () => mal(t.error)
      }
    }))
    await p.reload(); await p.waitForTimeout(1500)
    const blanco = (await p.locator('#root').innerText()).trim().length < 20
    await p.screenshot({ path: 'qa-e10.png' })
    const errs = p.errores.slice(0, 2).join(' | ')
    await ctx.close()
    if (blanco) throw new Error('pantalla en blanco: ' + errs)
    if (errs) throw new Error('errores de la página: ' + errs)
  })

  await caso('E11', 'zona horaria: a las 11:30 p. m. en Bogotá (ya es otro día en Tokio) el gasto es de hoy', async () => {
    const { ctx, p } = await nuevo({ timezoneId: 'Asia/Tokyo' })
    await p.clock.install({ time: new Date('2026-10-29T04:30:00Z') }) // 23:30 del 28 en Bogotá; 13:30 del 29 en Tokio
    await p.goto(URL); await p.getByText('Todavía no has anotado nada').waitFor()
    await anotar(p, { monto: 1000, desc: 'Tarde en la noche' })
    await p.getByRole('button', { name: 'Ver todo' }).click()
    await p.getByRole('heading', { name: 'Hoy' }).waitFor()
    const hora = await p.getByRole('button', { name: /Editar (gasto|ingreso)\. Tarde/ }).innerText()
    await ctx.close()
    if (!/11:30/.test(hora)) throw new Error('la hora mostrada no es la de Bogotá: ' + hora.replace(/\n/g, ' '))
  })

  await caso('E12', 'letra al 200 %: ninguna pantalla desborda a lo ancho', async () => {
    const { ctx, p } = await nuevo()
    await p.goto(URL + '?demo'); await p.getByText('Actividad reciente').waitFor()
    await p.addStyleTag({ content: 'html{font-size:32px !important}' }); await p.waitForTimeout(300)
    const fallas = []
    for (const t of ['Inicio', 'Análisis', 'Presupuestos', 'Metas', 'Ajustes']) {
      await p.getByRole('button', { name: t, exact: true }).last().click(); await p.waitForTimeout(250)
      const d = await desborde(p); if (d > 0) fallas.push(`${t} (+${d}px)`)
    }
    await p.getByRole('button', { name: 'Inicio', exact: true }).click(); await abrir(p)
    const d = await desborde(p); if (d > 0) fallas.push(`Hoja (+${d}px)`)
    await p.screenshot({ path: 'qa-e12.png' })
    await ctx.close()
    if (fallas.length) throw new Error('desborde: ' + fallas.join(', '))
  })

  await b.close()
  console.log(`\nhallazgos: ${hallazgos.length}`)
  fs.writeFileSync('qa2.json', JSON.stringify(hallazgos, null, 1))
})()
