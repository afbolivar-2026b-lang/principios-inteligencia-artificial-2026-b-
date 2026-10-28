const { chromium } = require('playwright')
const fs = require('node:fs')
const AXE = '/home/user/principios-inteligencia-artificial-2026-b-/app/node_modules/axe-core/axe.min.js'
const URL = 'http://localhost:4173/'

async function revisar(p, nombre, resumen) {
  await p.addScriptTag({ path: AXE }).catch(() => {})
  const r = await p.evaluate(async () => {
    const res = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } })
    return res.violations.map((v) => ({ id: v.id, impacto: v.impact, ayuda: v.help, nodos: v.nodes.length, ejemplo: v.nodes[0].target.join(' ') + ' :: ' + (v.nodes[0].failureSummary || '').split('\n').slice(0, 2).join(' ').slice(0, 160) }))
  })
  // objetivos táctiles de menos de 44 px
  const chicos = await p.evaluate(() => {
    const sel = 'button, a[href], input:not([hidden]):not([type=hidden]), select, textarea, [role=radio], [role=button]'
    const dentro = document.querySelector('[role=dialog]')
    return [...document.querySelectorAll(sel)].filter((e) => {
      if (dentro && !dentro.contains(e)) return false
      const b = e.getBoundingClientRect()
      const cs = getComputedStyle(e)
      return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && !e.classList.contains('sr-only') && (b.width < 43.5 || b.height < 43.5)
    }).map((e) => `${e.tagName.toLowerCase()}[${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 25)}] ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`)
  })
  const desborde = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  resumen.push({ nombre, violaciones: r, chicos, desborde })
}

;(async () => {
  const b = await chromium.launch()
  const resumen = []
  for (const esquema of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-CO', timezoneId: 'America/Bogota', colorScheme: esquema, acceptDownloads: true })
    const p = await ctx.newPage()
    const tag = (n) => `${n} [${esquema === 'light' ? 'claro' : 'oscuro'}]`
    // vacío
    const vacio = await ctx.newPage()
    await vacio.goto(URL); await vacio.getByText('Todavía no has anotado nada').waitFor()
    await revisar(vacio, tag('Inicio vacío'), resumen)
    await vacio.getByRole('button', { name: 'Agregar movimiento' }).click(); await vacio.getByRole('dialog').waitFor(); await vacio.waitForTimeout(400)
    await revisar(vacio, tag('Hoja: nuevo gasto (vacía)'), resumen)
    await vacio.getByRole('button', { name: 'Guardar', exact: true }).click(); await vacio.getByText('Escribe un monto mayor a 0').waitFor()
    await revisar(vacio, tag('Hoja: con errores de validación'), resumen)
    await vacio.close()
    // con datos
    await p.goto(URL + '?demo'); await p.getByText('Actividad reciente').waitFor(); await p.waitForTimeout(400)
    await revisar(p, tag('Inicio con datos'), resumen)
    await p.getByRole('button', { name: /Editar (gasto|ingreso)\. Almuerzo/ }).click(); await p.getByRole('dialog').waitFor(); await p.waitForTimeout(400)
    await revisar(p, tag('Hoja: editar'), resumen)
    await p.keyboard.press('Escape')
    await p.getByRole('button', { name: 'Ver todo' }).click(); await p.getByRole('heading', { name: 'Movimientos' }).waitFor(); await p.waitForTimeout(300)
    await revisar(p, tag('Movimientos'), resumen)
    await p.getByRole('button', { name: 'Volver' }).click()
    await p.getByRole('button', { name: 'Análisis', exact: true }).click(); await p.getByRole('img', { name: /^Gastos de/ }).waitFor(); await p.waitForTimeout(300)
    await revisar(p, tag('Análisis'), resumen)
    await p.getByRole('button', { name: 'Presupuestos', exact: true }).click(); await p.getByRole('heading', { name: 'Presupuestos' }).waitFor(); await p.waitForTimeout(300)
    await revisar(p, tag('Presupuestos'), resumen)
    await p.getByRole('button', { name: /Cambiar límite\. Salud/ }).click(); await p.getByRole('dialog').waitFor(); await p.waitForTimeout(400)
    await revisar(p, tag('Hoja: límite de presupuesto'), resumen)
    await p.keyboard.press('Escape')
    await p.getByRole('button', { name: 'Metas', exact: true }).click(); await p.getByRole('heading', { name: 'Metas de ahorro' }).waitFor()
    await revisar(p, tag('Metas (pendiente)'), resumen)
    await p.getByRole('button', { name: 'Ajustes', exact: true }).last().click(); await p.getByRole('heading', { name: 'Ajustes' }).waitFor(); await p.waitForTimeout(300)
    await revisar(p, tag('Ajustes'), resumen)
    await p.locator('input[type=file]').setInputFiles('respaldo-sin-clave.json'); await p.getByRole('dialog').waitFor(); await p.getByText(/^Respaldo del/).waitFor(); await p.waitForTimeout(400)
    await revisar(p, tag('Hoja: recuperar respaldo'), resumen)
    await p.keyboard.press('Escape')
    await p.getByRole('button', { name: 'Categorías' }).click(); await p.getByRole('heading', { name: 'Categorías' }).waitFor(); await p.waitForTimeout(300)
    await revisar(p, tag('Categorías'), resumen)
    await p.getByRole('button', { name: 'Nueva categoría' }).click(); await p.getByRole('dialog').waitFor(); await p.waitForTimeout(400)
    await revisar(p, tag('Hoja: nueva categoría'), resumen)
    await ctx.close()
  }
  await b.close()
  fs.writeFileSync('qa1.json', JSON.stringify(resumen, null, 1))
  let total = 0
  for (const r of resumen) {
    const lineas = []
    for (const v of r.violaciones) lineas.push(`   axe ${v.impacto?.toUpperCase()} ${v.id} (${v.nodos}): ${v.ayuda} — ${v.ejemplo}`)
    if (r.chicos.length) lineas.push(`   táctil <44px (${r.chicos.length}): ${[...new Set(r.chicos)].slice(0, 6).join(' | ')}`)
    if (r.desborde) lineas.push('   DESBORDE horizontal')
    total += r.violaciones.length + (r.chicos.length ? 1 : 0) + (r.desborde ? 1 : 0)
    console.log(lineas.length ? `✘ ${r.nombre}\n${lineas.join('\n')}` : `✔ ${r.nombre}`)
  }
  console.log(`\nhallazgos: ${total}`)
})()
