/* Pantalla de inicio, contraseña visible u oculta, olvidé mi contraseña, catálogo para clientes,
   descarga del APK de Android y aviso cuando hay una versión nueva de la página o de la app. */

const AUREA_VERSION = '2026.11.07-1';
const APK_URL = 'descargas/aurea-atelier.apk';
const enApp = () => /AureaAtelierApp\/([\d.]+)/.exec(navigator.userAgent)?.[1] || null;
ICONS.unlock = '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/>';
ICONS.android = '<path d="M7 9h10v8a1 1 0 01-1 1H8a1 1 0 01-1-1z"/><path d="M7 9a5 5 0 0110 0M9 18v3M15 18v3M4.5 10v5M19.5 10v5M9.5 5.5L8 3.5M14.5 5.5L16 3.5"/><circle cx="10" cy="7" r=".5"/><circle cx="14" cy="7" r=".5"/>';
ICONS.chev = '<path d="M9 6l6 6-6 6"/>';
ICONS.user = '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>';

/* ---------------- Contraseña visible u oculta (candado) ---------------- */
function conCandado(input) {
  if (input.dataset.ojo) return;
  input.dataset.ojo = '1';
  const w = document.createElement('span'); w.className = 'clave-wrap';
  input.replaceWith(w); w.appendChild(input);
  const b = document.createElement('button'); b.type = 'button'; b.className = 'clave-ojo';
  const pinta = () => { const vis = input.type === 'text'; b.innerHTML = icon(vis ? 'unlock' : 'lock'); b.setAttribute('aria-label', vis ? 'Ocultar contraseña' : 'Mostrar contraseña'); b.title = vis ? 'Ocultar contraseña' : 'Mostrar contraseña'; };
  b.onclick = () => { input.type = input.type === 'password' ? 'text' : 'password'; pinta(); input.focus(); };
  pinta(); w.appendChild(b);
}
new MutationObserver(() => $$('input[type=password]:not([data-ojo])').forEach(conCandado)).observe(document.documentElement, { childList: true, subtree: true });

/* ---------------- Marco común de las pantallas de acceso ---------------- */
function apkTarjeta() {
  const v = enApp();
  if (v) return `<div class="acc-opt quiet"><span class="acc-ic android">${icon('android')}</span><span><b>App Android</b><small>Está usando la app · versión ${esc(v)}</small></span></div>`;
  return `<a class="acc-opt" href="${APK_URL}" download="Aurea-Atelier.apk"><span class="acc-ic android">${icon('android')}</span><span><b>APK Android</b><small>Descargar Aurea-Atelier.apk (última versión)</small></span>${icon('download')}</a>`;
}
function pantallaAcceso({ titulo, texto, cuerpo, boton, olvido = true, pie = '' }) {
  const c = DB.data?.config || {};
  $('#app').innerHTML = `<div class="acceso">
    <header class="acc-top">${logoLockup(30)}<div class="acc-top-r"><button class="btn primary sm" data-acc="login">${icon('user')} Iniciar sesión</button><button class="acc-link" data-acc="catalogo">Ver catálogo</button></div></header>
    <main class="acc-main"><section class="acc-card">
      <div class="acc-head"><div class="acc-logo">${logoSVG(96)}</div><div class="acc-name">${esc((c.empresa || 'Aurea Atelier').toUpperCase())}</div><div class="acc-sub">${esc(c.eslogan || 'Confección')} · ${esc(c.ciudad || 'Neiva, Huila')}</div></div>
      <form class="acc-body" id="acc-form" autocomplete="on" novalidate>
        <div><h2>${esc(titulo)}</h2><p class="muted">${texto}</p></div>
        ${cuerpo}
        <button class="btn primary acc-go" type="submit">${esc(boton)}</button>
        ${olvido ? '<button type="button" class="acc-forgot" id="acc-olvide">Olvidé mi contraseña</button>' : ''}
        <div id="acc-msg" class="acc-msg" role="alert"></div>
        ${pie}
        <div class="acc-or"><span>O también</span></div>
        <button type="button" class="acc-opt" data-acc="catalogo"><span class="acc-ic">${icon('catalogo')}</span><span><b>Ver el catálogo</b><small>Prendas y precios para clientes</small></span>${icon('chev')}</button>
        ${apkTarjeta()}
      </form>
    </section><p class="acc-ver">Versión ${AUREA_VERSION}</p></main></div>`;
  $$('[data-acc="catalogo"]').forEach(b => b.onclick = () => catalogoPublico());
  $$('[data-acc="login"]').forEach(b => b.onclick = () => boot());
  return { msg: (t, bien = false) => { const m = $('#acc-msg'); m.textContent = t; m.className = 'acc-msg ' + (bien ? 'ok' : 'bad'); } };
}

/* ---------------- Cuenta del taller (nube) ---------------- */
AUREA_NUBE.pantalla = function (modo, aviso = '') {
  const N = this;
  const campos = {
    ingresar: `<label class="field">Correo<input id="nb-email" type="email" autocomplete="username" placeholder="nombre@correo.com" required></label>
      <label class="field">Contraseña<input id="nb-pass" type="password" autocomplete="current-password" placeholder="Su contraseña" required></label>`,
    crear: `<label class="field">Correo<input id="nb-email" type="email" autocomplete="username" placeholder="nombre@correo.com" required></label>
      <label class="field">Contraseña nueva<input id="nb-pass" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" minlength="8" required></label>
      <label class="field">Código del taller<input id="nb-code" autocomplete="off" placeholder="XXXX-XXXX-XXXX" required></label>`,
    olvide: `<label class="field">Correo de la cuenta<input id="nb-email" type="email" autocomplete="username" placeholder="nombre@correo.com" required></label>
      <label class="field">Código del taller<input id="nb-code" autocomplete="off" placeholder="XXXX-XXXX-XXXX" required></label>
      <label class="field">Contraseña nueva<input id="nb-pass" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" minlength="8" required></label>`,
    activar: `<p class="muted" style="margin:0">Sesión iniciada como <b>${esc(N.email)}</b>.</p><label class="field">Código del taller<input id="nb-code" autocomplete="off" placeholder="XXXX-XXXX-XXXX" required></label>`
  }[modo];
  const txt = {
    ingresar: ['Iniciar sesión', 'Acceso para el equipo del taller. Entre con el correo de la cuenta del taller.', 'Entrar'],
    crear: ['Crear la cuenta', 'Escriba un correo, una contraseña y el código del taller. La cuenta queda lista de una vez, sin esperar correos.', 'Crear cuenta y entrar'],
    olvide: ['Olvidé mi contraseña', 'Con el código del taller se pone una contraseña nueva a la cuenta.', 'Cambiar contraseña'],
    activar: ['Activar la cuenta', 'Escriba el código del taller para unir esta cuenta a los datos.', 'Activar']
  }[modo];
  const pie = modo === 'ingresar' ? '<button type="button" class="acc-forgot" data-nb="crear">¿Primera vez? Crear la cuenta del taller</button>'
    : `<button type="button" class="acc-forgot" data-nb="ingresar">Volver a iniciar sesión</button>${modo === 'activar' ? '<button type="button" class="acc-forgot" id="nb-out">Usar otra cuenta</button>' : ''}`;
  const ui = pantallaAcceso({ titulo: txt[0], texto: txt[1], cuerpo: campos, boton: txt[2], olvido: modo === 'ingresar', pie });
  if (aviso) ui.msg(aviso);
  $$('[data-nb]').forEach(b => b.onclick = () => N.pantalla(b.dataset.nb));
  const ol = $('#acc-olvide'); if (ol) ol.onclick = () => N.pantalla('olvide');
  const out = $('#nb-out'); if (out) out.onclick = async () => { await N.sb.auth.signOut(); N.pantalla('ingresar'); };
  const val = (id) => ($('#' + id)?.value || '').trim();
  $('#acc-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('.acc-go'); btn.disabled = true;
    try {
      if (['crear', 'olvide'].includes(modo) && val('nb-pass').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
      if (modo === 'crear' || modo === 'olvide') {
        const { error } = await N.sb.rpc(modo === 'crear' ? 'aurea_crear_cuenta' : 'aurea_restablecer_clave', { correo: val('nb-email'), clave: $('#nb-pass').value, codigo: val('nb-code') });
        if (error) throw new Error(error.message.replace(/^.*?:\s*/, ''));
      }
      if (modo !== 'activar') {
        const { error } = await N.sb.auth.signInWithPassword({ email: val('nb-email'), password: $('#nb-pass').value });
        if (error) throw new Error(/confirm/i.test(error.message) ? 'Esta cuenta se creó con el método anterior y falta confirmarla: use «Crear la cuenta» de nuevo con otro correo o pida ayuda.' : 'Correo o contraseña incorrectos.');
      } else {
        const { error } = await N.sb.rpc('aurea_activar', { codigo: val('nb-code') });
        if (error) throw new Error(/incorrecto/i.test(error.message) ? 'El código del taller no es correcto.' : error.message);
      }
      if (modo === 'crear') toast('Cuenta del taller creada');
      if (modo === 'olvide') toast('Contraseña cambiada');
      return boot();
    } catch (err) { ui.msg(err.message || 'No se pudo completar. Revise la conexión a internet.'); }
    btn.disabled = false;
  };
};

/* ---------------- Usuario interno del equipo ---------------- */
renderLogin = function () {
  const nube = window.AUREA_NUBE?.activa;
  const ui = pantallaAcceso({
    titulo: 'Bienvenida', texto: nube ? `Cuenta del taller conectada (${esc(AUREA_NUBE.email)}). Ahora entre con su usuario del equipo.` : 'Acceso privado para el equipo de trabajo.',
    cuerpo: `<label class="field">Usuario<input id="lg-user" autocomplete="username" placeholder="Su usuario" required></label>
      <label class="field">Contraseña<input id="lg-pass" type="password" autocomplete="current-password" placeholder="Su contraseña" required></label>
      ${nube ? '' : '<div class="hint">Demostración · Administradora: <b>admin</b> / <b>Aurea2026*</b> · Secretaria: <b>secretaria</b> / <b>Secre2026*</b><br>Cambie estas claves en <i>Usuarios y roles</i> antes de usar el sistema con datos reales.</div>'}`,
    boton: 'Entrar', pie: nube ? '<button type="button" class="acc-forgot" id="lg-nube-out">Salir de la cuenta del taller en este equipo</button>' : ''
  });
  $('#acc-form').id = 'login-form';
  $('#login-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('.acc-go'); btn.disabled = true;
    try {
      await Auth.login($('#lg-user').value, $('#lg-pass').value);
      const h = (location.hash || '').slice(1); State.route = Views[h] ? h : 'panel';
      render(); toast(`Hola, ${State.user.nombre}`);
    } catch (err) { ui.msg(err.message); }
    btn.disabled = false;
  };
  $('#acc-olvide').onclick = olvideInterna;
  const o = $('#lg-nube-out'); if (o) o.onclick = () => AUREA_NUBE.salir();
};
/* Olvidé mi contraseña del usuario interno: con el código del taller se pone una nueva. */
function olvideInterna() {
  if (!window.AUREA_NUBE?.activa) {
    return modal({ title: 'Olvidé mi contraseña', body: '<p>La administradora puede poner una contraseña nueva en <b>Usuarios y roles</b>. Si es la administradora quien la olvidó, conecte este equipo a la cuenta del taller y use el código del taller.</p>', foot: '<button class="btn primary" data-close>Entendido</button>' });
  }
  modal({
    title: 'Olvidé mi contraseña',
    body: `<p class="muted">Con el código del taller se pone una contraseña nueva al usuario del equipo.</p>
      <div class="form-grid"><label class="field">Usuario<select id="oi-u">${DB.data.users.filter(u => u.activo).map(u => `<option value="${u.id}">${esc(u.nombre)} · ${esc(u.usuario)}</option>`).join('')}</select></label>
      <label class="field">Código del taller<input id="oi-c" autocomplete="off" placeholder="XXXX-XXXX-XXXX"></label>
      <label class="field full">Contraseña nueva<input id="oi-p" type="password" autocomplete="new-password" placeholder="8 o más, con mayúscula, minúscula y número"></label></div><div id="oi-m" class="acc-msg"></div>`,
    foot: '<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="oi-ok">Cambiar contraseña</button>',
    onMount: (el, close) => $('#oi-ok', el).onclick = async () => {
      const m = $('#oi-m', el), clave = $('#oi-p', el).value; m.className = 'acc-msg bad';
      if (!Auth.strong(clave)) return m.textContent = 'Use 8 o más caracteres con mayúscula, minúscula y número.';
      const { data, error } = await AUREA_NUBE.sb.rpc('aurea_verificar_codigo', { codigo: $('#oi-c', el).value });
      if (error || !data) return m.textContent = 'El código del taller no es correcto.';
      const u = DB.data.users.find(x => x.id === $('#oi-u', el).value);
      await Auth.setPassword(u, clave);
      DB.data.auditoria.unshift({ fecha: new Date().toISOString(), usuario: u.usuario, accion: 'Restableció su contraseña con el código del taller' }); DB.save();
      close(); toast('Contraseña cambiada. Ya puede entrar.');
    }
  });
}

/* ---------------- Catálogo para clientes (sin iniciar sesión) ---------------- */
const catPublicoDatos = () => ({
  empresa: { nombre: DB.data.config.empresa, tel: DB.data.config.tel, ciudad: DB.data.config.ciudad, instagram: DB.data.config.instagram || '' },
  productos: DB.data.productos.map(p => ({ id: p.id, nombre: p.nombre, categoria: p.categoria, color: p.color, precioDetal: p.precioDetal, precioMayor: p.precioMayor, minMayor: p.minMayor, imagen: p.imagen || '' }))
});
async function catalogoPublico() {
  let cat = null;
  try {
    await AUREA_NUBE.sdk();
    if (!AUREA_NUBE.sb) AUREA_NUBE.sb = window.supabase.createClient(NUBE_CFG.url, NUBE_CFG.key, { auth: { persistSession: true, storageKey: 'aurea_nube_sesion' } });
    const { data } = await AUREA_NUBE.sb.from('aurea_catalogo').select('empresa, productos').eq('id', 'principal').maybeSingle();
    if (data && data.productos?.length) cat = data;
  } catch { /* sin conexión: se usa el catálogo de este equipo */ }
  if (!cat && DB.data) cat = catPublicoDatos();
  const e = cat.empresa || {}, cats = [...new Set(cat.productos.map(p => p.categoria))];
  const wa = (p) => `https://wa.me/57${String(e.tel || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, me interesa ${p.nombre} (${p.color}). ¿Me da más información?`)}`;
  $('#app').innerHTML = `<div class="acceso">
    <header class="acc-top">${logoLockup(30)}<div class="acc-top-r"><button class="btn primary sm" data-acc="login">${icon('user')} Iniciar sesión</button></div></header>
    <main class="pub"><div class="pub-head"><div class="acc-logo">${logoSVG(70)}</div><div><div class="eyebrow">Catálogo ${new Date().getFullYear()}</div><h1>${esc(e.nombre || 'Aurea Atelier')}</h1><p class="muted">${esc(e.ciudad || '')} · Venta al detal y por mayor · Dotación, camisas, pantalones, overoles, gorras y tapabocas</p></div></div>
      ${cats.map(c => `<div class="eyebrow pub-cat">${esc(c)}</div><div class="pub-grid">${cat.productos.filter(p => p.categoria === c).map(p => `<article class="pub-card">
        <div class="pub-img">${p.imagen ? `<img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy">` : ''}</div>
        <div class="pub-info"><b>${esc(p.nombre)}</b><small class="muted">${esc(p.color)}</small><span class="pub-price">${moneyTxt(p.precioDetal)}</span><small class="muted">Por mayor ${moneyTxt(p.precioMayor)} desde ${p.minMayor} unidades</small>
        ${e.tel ? `<a class="btn sm" href="${wa(p)}" target="_blank" rel="noopener">${icon('send')} Pedir por WhatsApp</a>` : ''}</div></article>`).join('')}</div>`).join('')}
      <p class="muted" style="text-align:center;font-size:13px;margin:26px 0">Precios con IVA incluido. Tallas S, M, L, XL y sobre medida.${e.instagram ? ' · ' + esc(e.instagram) : ''}</p></main></div>`;
  $$('[data-acc="login"]').forEach(b => b.onclick = () => boot());
  window.scrollTo(0, 0);
}
/* El catálogo se publica para los clientes cada vez que se guardan cambios en la nube. */
const accSubirBase = AUREA_NUBE.subir.bind(AUREA_NUBE);
AUREA_NUBE.subir = async function () {
  await accSubirBase();
  if (!this.activa || this.estado !== 'guardado') return;
  const datos = catPublicoDatos(), firma = JSON.stringify(datos);
  if (firma === this.catFirma) return;
  const { error } = await this.sb.from('aurea_catalogo').upsert({ id: 'principal', empresa: datos.empresa, productos: datos.productos, actualizado: new Date().toISOString() });
  if (!error) this.catFirma = firma;
};
/* Enlace directo al catálogo: …/#catalogo-clientes */
const accConectarBase = AUREA_NUBE.conectar.bind(AUREA_NUBE);
AUREA_NUBE.conectar = async function () {
  if (location.hash === '#catalogo-clientes') { await catalogoPublico(); return false; }
  return accConectarBase();
};

/* ---------------- Aviso de versión nueva (página y app Android) ---------------- */
const cmpVer = (a, b) => { const x = String(a).split(/[.-]/).map(Number), y = String(b).split(/[.-]/).map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
async function revisarVersion() {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const v = await r.json(), app = enApp();
    if (v.web && cmpVer(v.web, AUREA_VERSION) > 0) aviso('web', `Hay una versión nueva de ${esc(DB.data?.config?.empresa || 'Aurea Atelier')}`, v.notas || 'Se agregaron mejoras.', 'Actualizar ahora', () => location.reload());
    else if (app && v.apk?.version && cmpVer(v.apk.version, app) > 0) aviso('apk', `Nueva versión de la app Android (${esc(v.apk.version)})`, v.apk.notas || 'Descárguela e instálela encima de la actual.', 'Descargar', () => { const u = new URL(v.apk.url || APK_URL, location.href).href; window.AureaApp?.abrir ? AureaApp.abrir(u) : (location.href = u); });
  } catch { /* sin conexión: se revisa más tarde */ }
}
function aviso(tipo, titulo, texto, boton, accion) {
  if ($('#aviso-version')?.dataset.tipo === tipo) return;
  $('#aviso-version')?.remove();
  const d = document.createElement('div'); d.id = 'aviso-version'; d.dataset.tipo = tipo; d.className = 'aviso-version'; d.setAttribute('role', 'status');
  d.innerHTML = `<span class="av-ic">${icon(tipo === 'apk' ? 'android' : 'download')}</span><div><b>${titulo}</b><small>${esc(texto)}</small></div><button class="btn primary sm" id="av-ok">${esc(boton)}</button><button class="icon-btn" id="av-x" aria-label="Más tarde">${icon('x')}</button>`;
  document.body.appendChild(d);
  $('#av-ok', d).onclick = accion;
  $('#av-x', d).onclick = () => d.remove();
}
setTimeout(revisarVersion, 4000);
setInterval(revisarVersion, 5 * 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) revisarVersion(); });

/* ---------------- Dentro de la app Android ---------------- */
if (enApp()) {
  // Las descargas (Excel, PDF, fotos, respaldos) se guardan con la app en la carpeta Descargas.
  document.addEventListener('click', async (e) => {
    const a = e.target.closest?.('a[download]'); if (!a || !window.AureaApp?.guardar) return;
    const href = a.getAttribute('href') || '';
    if (!/^(blob:|data:)/.test(href)) return;
    e.preventDefault();
    try {
      const blob = await (await fetch(href)).blob();
      const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
      AureaApp.guardar(b64, a.getAttribute('download') || 'archivo', blob.type || 'application/octet-stream');
    } catch { toast('No se pudo guardar el archivo.', true); }
  }, true);
  // Imprimir abre el menú de impresión de Android (también deja guardar en PDF).
  if (window.AureaApp?.imprimir) window.print = () => AureaApp.imprimir();
  document.documentElement.classList.add('en-app');
}

Object.assign(FUNCIONES, {
  'Acceso y app Android': ['Candado para ver u ocultar la contraseña', 'Olvidé mi contraseña de la cuenta del taller con el código del taller', 'Olvidé mi contraseña del usuario del equipo', 'Crear la cuenta del taller sin esperar correos', 'Catálogo para clientes sin iniciar sesión, con pedido por WhatsApp', 'App Android (APK) para descargar e instalar', 'Descargas de Excel, PDF y fotos dentro de la app Android', 'Aviso cuando hay una versión nueva de la página', 'Aviso cuando hay una versión nueva de la app Android']
});
