/* Núcleo: base de datos local, seguridad, utilidades de interfaz y navegación. */
const DB_KEY = 'aurea_db_v1';
const SESSION_KEY = 'aurea_session';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = (p = 'x') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const todayISO = () => new Date().toISOString().slice(0, 10);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const money = (v) => `<span class="money ${State.privado ? 'private' : ''}">${COP.format(Math.round(v || 0))}</span>`;
const moneyTxt = (v) => COP.format(Math.round(v || 0));
const fmtDate = (iso) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* sin almacenamiento */ } },
  sget(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  sset(k, v) { try { sessionStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
  sdel(k) { try { sessionStorage.removeItem(k); } catch { /* sin almacenamiento */ } }
};

/* ---------------- Seguridad ---------------- */
const Crypto = {
  enc: new TextEncoder(),
  dec: new TextDecoder(),
  hex(buf) { return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); },
  unhex(h) { return new Uint8Array(h.match(/.{2}/g).map(x => parseInt(x, 16))); },
  salt() { return this.hex(crypto.getRandomValues(new Uint8Array(16))); },
  async hash(password, saltHex) {
    const key = await crypto.subtle.importKey('raw', this.enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: this.unhex(saltHex), iterations: 120000, hash: 'SHA-256' }, key, 256);
    return this.hex(bits);
  },
  async aesKey(password, salt) {
    const base = await crypto.subtle.importKey('raw', this.enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  },
  async encrypt(text, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.aesKey(password, salt);
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, this.enc.encode(text));
    return 'AUREA1.' + this.hex(salt) + '.' + this.hex(iv) + '.' + this.hex(data);
  },
  async decrypt(payload, password) {
    const [tag, s, i, d] = payload.trim().split('.');
    if (tag !== 'AUREA1') throw new Error('Formato de respaldo no reconocido');
    const key = await this.aesKey(password, this.unhex(s));
    const out = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: this.unhex(i) }, key, this.unhex(d));
    return this.dec.decode(out);
  }
};

const ROLES = {
  admin: { nombre: 'Administradora', modulos: '*' },
  secretaria: { nombre: 'Secretaria', modulos: ['panel', 'pos', 'cotizaciones', 'facturas', 'cartera', 'clientes', 'secretaria', 'mensajes', 'productos', 'inventario', 'produccion', 'funciones'] },
  vendedor: { nombre: 'Vendedor de salón', modulos: ['panel', 'pos', 'cotizaciones', 'clientes', 'productos', 'mensajes', 'funciones'] },
  produccion: { nombre: 'Jefe de taller', modulos: ['panel', 'produccion', 'inventario', 'compras', 'productos', 'empleados', 'funciones'] }
};

/* ---------------- Base de datos ---------------- */
const DB = {
  data: null,
  async init() {
    const raw = store.get(DB_KEY);
    if (raw) { try { this.data = JSON.parse(raw); } catch { this.data = null; } }
    if (!this.data) await this.reset(true);
  },
  async reset(withSeed) {
    const seed = withSeed ? structuredClone(window.AUREA_SEED) : { clientes: [], proveedores: [], productos: [], telas: [], insumos: [], empleados: [], facturas: [], cotizaciones: [], produccion: [], compras: [], gastos: [], agenda: [], tareas: [], mensajes: [], plantillas: structuredClone(window.AUREA_SEED.plantillas), destajo: [] };
    const users = this.data?.users?.length ? this.data.users : await this.defaultUsers();
    this.data = {
      ...seed,
      users,
      movimientos: [],
      auditoria: this.data?.auditoria || [],
      caja: { abierta: true, base: 300000, cierres: [] },
      config: this.data?.config || {
        empresa: 'Aurea Atelier', eslogan: 'Confección', nit: '1.075.000.000-0', tel: '310 000 0000',
        email: 'contacto@aurea-atelier.co', direccion: 'Cra. 5 # 10-20, Centro', ciudad: 'Neiva, Huila',
        ivaPct: 19, consecFactura: 1018, consecCot: 303, consecOP: 119, consecOC: 49,
        bloqueoMin: 10, demo: true, resolucion: 'Resolución DIAN 18764000000000 · Rango FE-1000 a FE-5000'
      }
    };
    if (!withSeed) this.data.config.demo = false;
    this.save();
  },
  async defaultUsers() {
    const mk = async (nombre, usuario, rol, clave) => { const salt = Crypto.salt(); return { id: uid('u'), nombre, usuario, rol, salt, hash: await Crypto.hash(clave, salt), activo: true, debeCambiar: true }; };
    return [
      await mk('Administradora', 'admin', 'admin', 'Aurea2026*'),
      await mk('Daniela Vargas', 'secretaria', 'secretaria', 'Secre2026*')
    ];
  },
  save() { store.set(DB_KEY, JSON.stringify(this.data)); },
  col(name) { return this.data[name] || (this.data[name] = []); },
  find(name, id) { return this.col(name).find(x => x.id === id); },
  upsert(name, obj) {
    const list = this.col(name);
    const i = list.findIndex(x => x.id === obj.id);
    if (i >= 0) list[i] = { ...list[i], ...obj }; else list.unshift(obj);
    this.save();
    return obj;
  },
  remove(name, id) { this.data[name] = this.col(name).filter(x => x.id !== id); this.save(); },
  next(key, prefix) { const n = this.data.config[key]++; this.save(); return prefix + '-' + n; }
};

function audit(accion) {
  DB.data.auditoria.unshift({ fecha: new Date().toISOString(), usuario: State.user?.usuario || 'sistema', accion });
  DB.data.auditoria = DB.data.auditoria.slice(0, 500);
  DB.save();
}

/* ---------------- Estado y sesión ---------------- */
const State = { user: null, route: 'panel', privado: false, lastActivity: Date.now(), locked: false, intentos: 0, bloqueoHasta: 0 };

const Auth = {
  async login(usuario, clave) {
    if (Date.now() < State.bloqueoHasta) throw new Error(`Demasiados intentos. Espere ${Math.ceil((State.bloqueoHasta - Date.now()) / 1000)} s.`);
    const u = DB.data.users.find(x => x.usuario.toLowerCase() === usuario.trim().toLowerCase() && x.activo);
    const ok = u && (await Crypto.hash(clave, u.salt)) === u.hash;
    if (!ok) {
      State.intentos++;
      if (State.intentos >= 5) { State.bloqueoHasta = Date.now() + 60000; State.intentos = 0; }
      DB.data.auditoria.unshift({ fecha: new Date().toISOString(), usuario: usuario || '?', accion: 'Intento de ingreso fallido' }); DB.save();
      throw new Error('Usuario o contraseña incorrectos.');
    }
    State.intentos = 0; State.user = u; State.lastActivity = Date.now();
    store.sset(SESSION_KEY, JSON.stringify({ id: u.id, t: Date.now() }));
    audit('Ingreso al sistema');
    return u;
  },
  restore() {
    const s = store.sget(SESSION_KEY);
    if (!s) return false;
    try {
      const { id, t } = JSON.parse(s);
      if (Date.now() - t > DB.data.config.bloqueoMin * 60000 * 3) return false;
      State.user = DB.data.users.find(u => u.id === id && u.activo) || null;
      return !!State.user;
    } catch { return false; }
  },
  logout() { audit('Salida del sistema'); State.user = null; store.sdel(SESSION_KEY); renderLogin(); },
  can(mod) { const r = ROLES[State.user?.rol]; return r && (r.modulos === '*' || r.modulos.includes(mod)); },
  async setPassword(user, clave) { user.salt = Crypto.salt(); user.hash = await Crypto.hash(clave, user.salt); user.debeCambiar = false; DB.save(); },
  strong(clave) { return clave.length >= 8 && /[A-Z]/.test(clave) && /[a-z]/.test(clave) && /\d/.test(clave); }
};

['click', 'keydown', 'mousemove', 'touchstart'].forEach(ev => document.addEventListener(ev, () => {
  State.lastActivity = Date.now();
  if (State.user) store.sset(SESSION_KEY, JSON.stringify({ id: State.user.id, t: Date.now() }));
}, { passive: true }));
setInterval(() => {
  if (State.user && !State.locked && Date.now() - State.lastActivity > DB.data.config.bloqueoMin * 60000) lockScreen();
}, 15000);

/* ---------------- Íconos (trazo fino) ---------------- */
const ICONS = {
  panel: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z"/>',
  pos: '<path d="M6 2l-2 5v13a2 2 0 002 2h12a2 2 0 002-2V7l-2-5z"/><path d="M4 7h16M16 11a4 4 0 01-8 0"/>',
  cotizaciones: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  facturas: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 .7V2l-1 .7-3-2-3 2-3-2-3 2z"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  cartera: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 13h2M2 10h20M6 6V4h12v2"/>',
  clientes: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0114 0M17 11a3 3 0 100-6M22 21a6 6 0 00-4-5.7"/>',
  productos: '<path d="M8 3l4 3 4-3 5 3-2 5h-2v10H7V11H5L3 6z"/>',
  inventario: '<path d="M21 8l-9-5-9 5 9 5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
  produccion: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12"/>',
  compras: '<circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6"/>',
  proveedores: '<rect x="1" y="7" width="15" height="11"/><path d="M16 11h4l3 3v4h-7"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="18.5" cy="18.5" r="2"/>',
  secretaria: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h3M8 18h6"/>',
  mensajes: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><path d="M8 9h8M8 13h5"/>',
  empleados: '<circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0113 0M12 11v4"/>',
  gastos: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>',
  reportes: '<path d="M3 3v18h18"/><path d="M7 15l4-5 4 3 5-7"/>',
  usuarios: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
  auditoria: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  funciones: '<path d="M12 2l2.9 6.9L22 9.3l-5.5 4.8L18.2 22 12 18.3 5.8 22l1.7-7.9L2 9.3l7.1-.4z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M17.9 17.9A10.1 10.1 0 0112 20c-7 0-11-8-11-8a18.5 18.5 0 015.1-5.9M9.9 4.2A9.1 9.1 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.2 3.2M1 1l22 22"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
  logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  shirt: '<path d="M8 3l4 3 4-3 5 3-2 5h-2v10H7V11H5L3 6z"/>',
  cap: '<path d="M3 15a9 9 0 0118 0z"/><path d="M12 6v-2M2 15h20l-2 3H6z"/>',
  pants: '<path d="M6 2h12l1 20h-5l-2-12-2 12H5z"/>',
  mask: '<path d="M4 8c3-2 13-2 16 0v6c-3 4-13 4-16 0z"/><path d="M4 9H2v3c0 1 1 2 2 2M20 9h2v3c0 1-1 2-2 2M8 11h8M8 14h8"/>'
};
const icon = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

/* Logo: monograma "A" trazado como dos hojas de tijera abiertas, con una puntada que cruza y un botón de cuatro huecos. */
function logoSVG(size = 44) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <defs><linearGradient id="lg-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1dca6"/><stop offset=".55" stop-color="#c9a45c"/><stop offset="1" stop-color="#8f6a2b"/></linearGradient></defs>
    <circle cx="32" cy="32" r="30" fill="none" stroke="url(#lg-gold)" stroke-width="1.2"/>
    <circle cx="32" cy="32" r="26.5" fill="none" stroke="url(#lg-gold)" stroke-width=".6" stroke-dasharray="1.6 2.4"/>
    <path d="M32 12 L18 50" stroke="url(#lg-gold)" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M32 12 L46 50" stroke="url(#lg-gold)" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M22.5 37 H41.5" stroke="url(#lg-gold)" stroke-width="1.4" stroke-dasharray="2.4 2" stroke-linecap="round"/>
    <circle cx="32" cy="12" r="2.6" fill="url(#lg-gold)"/>
    <g fill="url(#lg-gold)"><circle cx="30.6" cy="27.4" r=".9"/><circle cx="33.4" cy="27.4" r=".9"/><circle cx="30.6" cy="30.2" r=".9"/><circle cx="33.4" cy="30.2" r=".9"/></g>
  </svg>`;
}
function logoLockup(size = 44) {
  const c = DB.data?.config || { empresa: 'Aurea Atelier', eslogan: 'Confección & Dotación' };
  const [first, ...rest] = c.empresa.split(' ');
  return `<div class="logo-lockup">${logoSVG(size)}<div><div class="logo-name">${esc(first.toUpperCase())}</div><div class="logo-sub">${esc(rest.join(' '))}${rest.length ? ' · ' : ''}${esc(c.eslogan)}</div></div></div>`;
}

/* ---------------- Interfaz ---------------- */
function toast(msg, err = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  $('#toast-root').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function modal({ title, body, foot = '', wide = false, onMount }) {
  const root = $('#modal-root');
  const el = document.createElement('div');
  el.className = 'overlay';
  el.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon('x')}</button></div>
    <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  root.appendChild(el);
  const close = () => el.remove();
  el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-close]')) close(); });
  el.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  onMount && onMount(el, close);
  setTimeout(() => $('input,select,textarea', el)?.focus(), 30);
  return { el, close };
}

/* Confirmación construida en la página (sin confirm()). */
function ask(texto, onYes, label = 'Confirmar') {
  modal({
    title: 'Confirmar', body: `<p>${esc(texto)}</p>`,
    foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="ask-yes">${esc(label)}</button>`,
    onMount: (el, close) => $('#ask-yes', el).onclick = () => { close(); onYes(); }
  });
}

/* Formulario a partir de un esquema de campos. */
function formFields(fields, obj = {}) {
  return `<div class="form-grid">${fields.map(f => {
    const v = obj[f.k] ?? f.def ?? '';
    const id = 'f-' + f.k;
    let input;
    if (f.type === 'select') input = `<select id="${id}" name="${f.k}">${f.options.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
    else if (f.type === 'textarea') input = `<textarea id="${id}" name="${f.k}" rows="3">${esc(v)}</textarea>`;
    else input = `<input id="${id}" name="${f.k}" type="${f.type || 'text'}" value="${esc(v)}" ${f.req ? 'required' : ''} ${f.type === 'number' ? 'step="any"' : ''}>`;
    return `<label class="field ${f.full ? 'full' : ''}">${esc(f.label)}${input}</label>`;
  }).join('')}</div>`;
}
function readForm(el, fields) {
  const out = {};
  for (const f of fields) {
    const node = $(`[name="${f.k}"]`, el);
    let v = node.value.trim();
    if (f.req && !v) { node.focus(); throw new Error(`Falta el campo "${f.label}".`); }
    if (f.type === 'number') v = Number(v || 0);
    out[f.k] = v;
  }
  return out;
}

function editRecord({ col, title, fields, obj, prefix, after }) {
  const isNew = !obj;
  modal({
    title: (isNew ? 'Nuevo · ' : 'Editar · ') + title,
    body: formFields(fields, obj || {}),
    foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="save-rec">${icon('check')} Guardar</button>`,
    onMount: (el, close) => $('#save-rec', el).onclick = () => {
      try {
        const data = readForm(el, fields);
        const rec = { ...(obj || { id: uid(prefix) }), ...data };
        DB.upsert(col, rec);
        audit(`${isNew ? 'Creó' : 'Editó'} ${title.toLowerCase()}: ${rec.nombre || rec.titulo || rec.desc || rec.num || rec.id}`);
        close(); toast('Guardado'); after ? after(rec) : render();
      } catch (e) { toast(e.message, true); }
    }
  });
}

/* Tabla con búsqueda, orden y exportación. */
function dataTable({ id, rows, cols, actions, empty = 'Sin registros todavía.' }) {
  const st = (dataTable.state[id] ||= { q: '', sort: null, dir: 1 });
  let list = rows.filter(r => !st.q || cols.some(c => String(c.text ? c.text(r) : r[c.k] ?? '').toLowerCase().includes(st.q.toLowerCase())));
  if (st.sort) {
    const c = cols.find(c => c.k === st.sort);
    const val = r => c.sortv ? c.sortv(r) : (c.text ? c.text(r) : r[c.k]);
    list = [...list].sort((a, b) => { const x = val(a), y = val(b); return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * st.dir; });
  }
  const head = cols.map(c => `<th class="${c.num ? 'num' : ''}" data-sort="${c.k}">${esc(c.label)}${st.sort === c.k ? (st.dir > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('') + (actions ? '<th></th>' : '');
  const body = list.length ? list.map(r => `<tr>${cols.map(c => `<td class="${c.num ? 'num' : ''}">${c.html ? c.html(r) : esc(c.text ? c.text(r) : r[c.k])}</td>`).join('')}${actions ? `<td><div class="row-actions">${actions(r)}</div></td>` : ''}</tr>`).join('')
    : `<tr><td colspan="${cols.length + 1}" class="empty">${esc(empty)}</td></tr>`;
  return `<div class="toolbar"><input type="search" id="q-${id}" placeholder="Buscar…" value="${esc(st.q)}" aria-label="Buscar en la tabla"><span class="muted">${list.length} registro(s)</span><button class="btn sm ghost" data-csv="${id}">${icon('download')} Exportar Excel (CSV)</button></div>
  <div class="table-wrap" data-table="${id}"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
dataTable.state = {};
dataTable.wire = (root, id, cols, rows) => {
  const q = $(`#q-${id}`, root);
  if (q) q.oninput = () => { dataTable.state[id].q = q.value; render(); setTimeout(() => { const n = $(`#q-${id}`); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }); };
  $$(`[data-table="${id}"] th[data-sort]`, root).forEach(th => th.onclick = () => {
    const st = dataTable.state[id]; const k = th.dataset.sort;
    st.dir = st.sort === k ? -st.dir : 1; st.sort = k; render();
  });
  const b = $(`[data-csv="${id}"]`, root);
  if (b) b.onclick = () => exportCSV(id, cols, rows);
};
function exportCSV(name, cols, rows) {
  const lines = [cols.map(c => c.label).join(';'), ...rows.map(r => cols.map(c => `"${String(c.csv ? c.csv(r) : (c.text ? c.text(r) : r[c.k] ?? '')).replace(/"/g, '""')}"`).join(';'))];
  downloadText(`${name}-${todayISO()}.csv`, '﻿' + lines.join('\n'), 'text/csv');
}
function downloadText(filename, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  toast('Archivo generado: ' + filename);
}
const inFrame = (() => { try { return window.self !== window.top; } catch { return true; } })();

function pill(text, kind) { return `<span class="pill ${kind}">${esc(text)}</span>`; }
const waLink = (tel, text) => `https://wa.me/57${String(tel || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

/* ---------------- Navegación ---------------- */
const NAV = [
  ['Principal', [['panel', 'Panel'], ['pos', 'Salón de ventas']]],
  ['Comercial', [['cotizaciones', 'Cotizaciones'], ['facturas', 'Facturas'], ['cartera', 'Cartera'], ['clientes', 'Clientes']]],
  ['Taller', [['productos', 'Catálogo'], ['inventario', 'Inventario y telas'], ['produccion', 'Producción'], ['compras', 'Compras'], ['proveedores', 'Proveedores']]],
  ['Oficina', [['secretaria', 'Secretaría'], ['mensajes', 'Mensajes'], ['empleados', 'Personal y destajo'], ['gastos', 'Gastos y caja']]],
  ['Análisis', [['reportes', 'Reportes']]],
  ['Sistema', [['usuarios', 'Usuarios y roles'], ['auditoria', 'Auditoría'], ['config', 'Configuración'], ['funciones', 'Funciones']]]
];
const Views = {};

function go(route) {
  if (!Auth.can(route)) { toast('Su rol no tiene acceso a este módulo.', true); return; }
  State.route = route;
  try { history.replaceState(null, '', '#' + route); } catch { /* entorno sin historial */ }
  $('.side')?.classList.remove('open');
  render();
  $('.content') && ($('.content').scrollTop = 0);
}

function badgeFor(route) {
  if (route === 'mensajes') { const n = DB.data.mensajes.filter(m => !m.respondido).length; return n ? `<span class="badge">${n}</span>` : ''; }
  if (route === 'cartera') { const n = Fin.cartera().filter(f => f.diasVencida > 0).length; return n ? `<span class="badge">${n}</span>` : ''; }
  return '';
}

function renderShell() {
  const u = State.user;
  $('#app').innerHTML = `<div class="shell">
    <aside class="side" aria-label="Menú principal">${logoLockup(40)}
      <nav class="nav">${NAV.map(([g, items]) => {
        const vis = items.filter(([r]) => Auth.can(r));
        return vis.length ? `<div class="nav-group eyebrow">${g}</div>` + vis.map(([r, l]) => `<button data-go="${r}" class="${State.route === r ? 'active' : ''}">${icon(r)}<span>${l}</span>${badgeFor(r)}</button>`).join('') : '';
      }).join('')}</nav>
      <div class="side-foot"><div class="avatar">${esc(u.nombre[0])}</div><div class="who">${esc(u.nombre)}<small>${esc(ROLES[u.rol].nombre)}</small></div>
      <button class="icon-btn" id="btn-logout" title="Cerrar sesión" aria-label="Cerrar sesión">${icon('logout')}</button></div>
    </aside>
    <main class="main">
      <header class="topbar">
        <button class="icon-btn menu-btn" id="btn-menu" aria-label="Abrir menú">${icon('menu')}</button>
        <div class="search">${icon('search')}<input id="global-search" type="search" placeholder="Buscar cliente, factura, producto, tela…" aria-label="Búsqueda global"></div>
        <div class="spacer"></div>
        <button class="icon-btn" id="btn-private" title="Modo privado: ocultar valores" aria-label="Ocultar valores">${icon(State.privado ? 'eyeoff' : 'eye')}</button>
        <button class="icon-btn" id="btn-theme" title="Cambiar tema" aria-label="Cambiar tema">${icon('sun')}</button>
        <button class="icon-btn" id="btn-lock" title="Bloquear pantalla" aria-label="Bloquear pantalla">${icon('lock')}</button>
      </header>
      <section class="content" id="view"></section>
    </main></div>`;
  $$('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
  $('#btn-logout').onclick = () => Auth.logout();
  $('#btn-menu').onclick = () => $('.side').classList.toggle('open');
  $('#btn-private').onclick = () => { State.privado = !State.privado; render(); toast(State.privado ? 'Modo privado activado: valores ocultos' : 'Valores visibles'); };
  $('#btn-theme').onclick = () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.dataset.theme = cur === 'light' ? 'dark' : 'light';
    store.set('aurea_theme', document.documentElement.dataset.theme);
  };
  $('#btn-lock').onclick = lockScreen;
  $('#global-search').onkeydown = e => { if (e.key === 'Enter') globalSearch(e.target.value); };
}

function render() {
  if (!State.user) return renderLogin();
  if (!Auth.can(State.route)) State.route = 'panel';
  renderShell();
  const v = $('#view');
  try { (Views[State.route] || Views.panel)(v); } catch (e) { console.error(e); v.innerHTML = `<div class="card">Error al cargar el módulo: ${esc(e.message)}</div>`; }
}

function globalSearch(q) {
  q = q.trim().toLowerCase(); if (!q) return;
  const hits = [];
  DB.data.clientes.forEach(c => (c.nombre + c.doc + c.tel).toLowerCase().includes(q) && hits.push(['clientes', 'Cliente', c.nombre]));
  DB.data.facturas.forEach(f => (f.num + Fin.cli(f.clienteId)).toLowerCase().includes(q) && hits.push(['facturas', 'Factura', `${f.num} · ${Fin.cli(f.clienteId)}`]));
  DB.data.cotizaciones.forEach(f => (f.num + Fin.cli(f.clienteId)).toLowerCase().includes(q) && hits.push(['cotizaciones', 'Cotización', `${f.num} · ${Fin.cli(f.clienteId)}`]));
  DB.data.productos.forEach(p => (p.nombre + p.sku).toLowerCase().includes(q) && hits.push(['productos', 'Producto', p.nombre]));
  DB.data.telas.forEach(t => (t.nombre + t.codigo + t.color).toLowerCase().includes(q) && hits.push(['inventario', 'Tela', `${t.nombre} ${t.color}`]));
  modal({
    title: `Resultados para “${q}”`,
    body: hits.length ? `<div class="list">${hits.slice(0, 30).map(([r, t, l]) => `<div class="list-item"><span class="pill gold">${t}</span><div class="grow">${esc(l)}</div><button class="btn sm" data-goto="${r}">Abrir</button></div>`).join('')}</div>` : '<p class="muted">No se encontró nada con ese texto.</p>',
    onMount: (el, close) => $$('[data-goto]', el).forEach(b => b.onclick = () => { close(); go(b.dataset.goto); })
  });
}

/* ---------------- Ingreso y bloqueo ---------------- */
function renderLogin() {
  const c = DB.data.config;
  $('#app').innerHTML = `<div class="login">
    <section class="login-art">
      ${logoLockup(56)}
      <div><div class="eyebrow">Atelier de confección · Venta al detal y por mayor</div><div class="stitch"></div>
        <h1>Cada puntada,<br><em>cada peso,</em><br>en su lugar.</h1>
        <p class="mt">Camisas industriales, camisas de salir, pantalones, gorras, overoles y tapabocas. Ventas, cotizaciones, facturas, cartera, telas y taller en un solo sistema privado.</p></div>
      <div class="eyebrow">${esc(c.ciudad)} · ${new Date().getFullYear()}</div>
    </section>
    <section class="login-form-wrap"><form class="login-card" id="login-form" autocomplete="on">
      <div><div class="eyebrow">Acceso privado</div><h2 style="font-size:34px">Bienvenida</h2></div>
      <label class="field">Usuario<input id="lg-user" autocomplete="username" required value=""></label>
      <label class="field">Contraseña<input id="lg-pass" type="password" autocomplete="current-password" required></label>
      <button class="btn primary" type="submit" style="justify-content:center;padding:12px">${icon('lock')} Ingresar</button>
      <div id="lg-err" class="muted" role="alert"></div>
      <div class="hint">Demostración · Administradora: <b>admin</b> / <b>Aurea2026*</b> · Secretaria: <b>secretaria</b> / <b>Secre2026*</b><br>Cambie estas claves en <i>Usuarios y roles</i> antes de usar el sistema con datos reales.</div>
    </form></section></div>`;
  $('#login-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#login-form button'); btn.disabled = true;
    try {
      await Auth.login($('#lg-user').value, $('#lg-pass').value);
      const h = (location.hash || '').slice(1); State.route = Views[h] ? h : 'panel';
      render(); toast(`Hola, ${State.user.nombre}`);
    } catch (err) { $('#lg-err').textContent = err.message; $('#lg-err').style.color = 'var(--bad)'; }
    btn.disabled = false;
  };
}

function lockScreen() {
  if (!State.user || State.locked) return;
  State.locked = true; audit('Pantalla bloqueada');
  const el = document.createElement('div');
  el.className = 'lock-screen';
  el.innerHTML = `<form class="card login-card" id="unlock"><div style="display:flex;justify-content:center">${logoSVG(64)}</div>
    <h2 style="text-align:center">Pantalla bloqueada</h2><p class="muted" style="text-align:center;margin:0">${esc(State.user.nombre)}, ingrese su contraseña para continuar.</p>
    <input type="password" id="unlock-pass" autocomplete="current-password" aria-label="Contraseña"><button class="btn primary" style="justify-content:center">Desbloquear</button>
    <button type="button" class="btn ghost" id="unlock-out" style="justify-content:center">Cambiar de usuario</button><div id="unlock-err" role="alert"></div></form>`;
  document.body.appendChild(el);
  $('#unlock-pass', el).focus();
  $('#unlock', el).onsubmit = async e => {
    e.preventDefault();
    const ok = (await Crypto.hash($('#unlock-pass', el).value, State.user.salt)) === State.user.hash;
    if (ok) { State.locked = false; State.lastActivity = Date.now(); el.remove(); audit('Pantalla desbloqueada'); }
    else $('#unlock-err', el).innerHTML = '<span style="color:var(--bad)">Contraseña incorrecta.</span>';
  };
  $('#unlock-out', el).onclick = () => { State.locked = false; el.remove(); Auth.logout(); };
}

/* ---------------- Arranque ---------------- */
async function boot() {
  const t = store.get('aurea_theme'); if (t) document.documentElement.dataset.theme = t;
  $('#app').innerHTML = `<div style="display:grid;place-items:center;height:100%">${logoSVG(72)}</div>`;
  await DB.init();
  if (Auth.restore()) { const h = (location.hash || '').slice(1); State.route = Views[h] ? h : 'panel'; render(); }
  else renderLogin();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot);
