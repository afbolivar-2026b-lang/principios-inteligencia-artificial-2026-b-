/* Nube: los datos del taller se guardan en Supabase para verlos iguales desde cualquier equipo o celular.
   Primero se entra con la cuenta del taller (correo y contraseña de Supabase); después, con el usuario interno de siempre. */
const NUBE_CFG = {
  url: 'https://bldimtnnvumcjakbgqta.supabase.co',
  // Clave pública del proyecto: solo deja leer y escribir a cuentas activadas con el código del taller (reglas RLS).
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsZGltdG5udnVtY2pha2JncXRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMzAyNjAsImV4cCI6MjEwODgwNjI2MH0.sV9gJ9pKZsnQCZ4wm32iZH3ay5B39TKbyxBP0HbCedY',
  sdk: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'
};
ICONS.nube = '<path d="M17.5 19a4.5 4.5 0 100-9 6 6 0 00-11.7 1.5A4 4 0 006 19z"/>';

const AUREA_NUBE = {
  activa: false, sb: null, email: '', version: 0, estado: 'local', timer: null, aplicando: false, ultimo: null, cambiosSinSubir: false,
  sdk() {
    if (window.supabase?.createClient) return Promise.resolve();
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = NUBE_CFG.sdk; s.onload = res; s.onerror = () => rej(new Error('Sin conexión')); document.head.appendChild(s); });
  },
  /* Devuelve true si ya se puede seguir al ingreso interno; false si muestra su propia pantalla. */
  async conectar() {
    try { await this.sdk(); } catch { this.activa = false; this.marcar('sin conexión'); setTimeout(() => toast('Sin conexión a la nube: se trabaja con los datos guardados en este equipo.', true), 400); return true; }
    if (!this.sb) this.sb = window.supabase.createClient(NUBE_CFG.url, NUBE_CFG.key, { auth: { persistSession: true, storageKey: 'aurea_nube_sesion', autoRefreshToken: true } });
    const { data: { session } } = await this.sb.auth.getSession();
    if (!session) { this.pantalla('ingresar'); return false; }
    this.email = session.user.email;
    const { data: miembro, error } = await this.sb.rpc('aurea_es_miembro');
    if (error) { this.pantalla('ingresar', 'No se pudo comprobar la cuenta: ' + error.message); return false; }
    if (!miembro) { this.pantalla('activar'); return false; }
    this.activa = true;
    await this.traer(true);
    this.vigilar();
    return true;
  },
  /* Trae la última versión guardada; la primera vez sube los datos de este equipo. */
  async traer(inicio) {
    const { data, error } = await this.sb.from('aurea_estado').select('datos, version, actualizado').eq('id', 'principal').maybeSingle();
    if (error) { this.marcar('error'); return; }
    if (!data) { if (inicio) await this.subir(); return; }
    if (data.version === this.version && !inicio) return;
    this.aplicar(data);
  },
  aplicar(row) {
    this.aplicando = true;
    DB.data = row.datos;
    if (window.AUREA_MIGRATE) AUREA_MIGRATE(DB.data);
    DB.save();
    this.aplicando = false;
    this.version = row.version; this.ultimo = row.actualizado; this.cambiosSinSubir = false;
    this.marcar('guardado');
  },
  programar() {
    if (!this.activa || this.aplicando) return;
    this.cambiosSinSubir = true; this.marcar('guardando');
    clearTimeout(this.timer); this.timer = setTimeout(() => this.subir(), 1200);
  },
  async subir() {
    clearTimeout(this.timer);
    const { data: v, error } = await this.sb.rpc('aurea_guardar', { nuevos: DB.data, esperada: this.version });
    if (error) { this.marcar('error'); this.timer = setTimeout(() => this.subir(), 15000); return; }
    if (v == null) {
      // Otro equipo guardó primero: se trae su versión para no pisarla.
      await this.traer(false);
      if (State.user && !$('.overlay')) render();
      toast('Otro equipo guardó cambios al mismo tiempo. Se cargó la versión más reciente; revise su último cambio.', true);
      return;
    }
    this.version = v; this.ultimo = new Date().toISOString(); this.cambiosSinSubir = false;
    this.marcar('guardado');
  },
  /* Revisa cada minuto y al volver a la pestaña si otro equipo guardó algo nuevo. */
  vigilar() {
    if (this.vigilando) return; this.vigilando = true;
    const revisar = async () => {
      if (!this.activa || this.cambiosSinSubir || document.hidden) return;
      const { data } = await this.sb.from('aurea_estado').select('version').eq('id', 'principal').maybeSingle();
      if (data && data.version > this.version) { await this.traer(false); if (State.user && !$('.overlay')) { render(); toast('Datos actualizados desde otro equipo'); } }
    };
    setInterval(revisar, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) revisar(); });
    window.addEventListener('beforeunload', e => { if (this.cambiosSinSubir) { this.subir(); e.preventDefault(); e.returnValue = ''; } });
  },
  marcar(estado) {
    this.estado = estado;
    const el = $('#nube-pill'); if (el) el.outerHTML = this.pill();
  },
  pill() {
    const t = { guardado: 'En la nube', guardando: 'Guardando…', error: 'Sin guardar en la nube', 'sin conexión': 'Sin conexión', local: 'Solo este equipo' }[this.estado] || this.estado;
    return `<span id="nube-pill" class="nube-pill ${this.estado.replace(' ', '-')}" title="${esc(this.activa ? 'Cuenta del taller: ' + this.email : 'Los datos están solo en este equipo')}">${icon('nube')}<span>${esc(t)}</span></span>`;
  },
  async salir() {
    if (this.cambiosSinSubir) await this.subir();
    await this.sb?.auth.signOut();
    this.activa = false; this.version = 0;
    Auth.logout(); location.reload();
  },

  /* Pantalla de la cuenta del taller: ingresar, crear la cuenta o activarla con el código. */
  pantalla(modo, aviso = '') {
    const tit = { ingresar: 'Cuenta del taller', crear: 'Crear la cuenta del taller', activar: 'Activar esta cuenta' }[modo];
    $('#app').innerHTML = `<div class="login">
      <section class="login-art">${logoLockup(56)}
        <div><div class="eyebrow">Datos en la nube · Supabase</div><div class="stitch"></div>
          <h1>Lo mismo,<br><em>en todos</em><br>sus equipos.</h1>
          <p class="mt">Las ventas, el inventario, la cartera y todo lo demás quedan guardados en la nube del taller. Entre con la cuenta del taller en cada computador o celular y verá los mismos datos.</p></div>
        <div class="eyebrow">Conexión cifrada · Solo cuentas activadas</div></section>
      <section class="login-form-wrap"><form class="login-card" id="nube-form" autocomplete="on">
        <div><div class="eyebrow">Acceso a la nube</div><h2 style="font-size:32px">${tit}</h2></div>
        ${modo === 'activar' ? `<p class="muted" style="margin:0">Sesión iniciada como <b>${esc(this.email)}</b>. Escriba el código de activación del taller para unir esta cuenta a los datos.</p>`
          : `<label class="field">Correo<input id="nb-email" type="email" autocomplete="username" required></label>
             <label class="field">Contraseña<input id="nb-pass" type="password" autocomplete="${modo === 'crear' ? 'new-password' : 'current-password'}" minlength="8" required></label>`}
        ${modo !== 'ingresar' ? '<label class="field">Código de activación<input id="nb-code" autocomplete="off" placeholder="XXXX-XXXX-XXXX" required></label>' : ''}
        <button class="btn primary" type="submit" style="justify-content:center;padding:12px">${icon('nube')} ${modo === 'ingresar' ? 'Entrar' : modo === 'crear' ? 'Crear cuenta' : 'Activar'}</button>
        <div id="nb-msg" class="muted" role="alert">${esc(aviso)}</div>
        <div class="flex" style="justify-content:space-between">${modo === 'ingresar' ? '<button type="button" class="btn ghost sm" data-nb="crear">Crear la cuenta del taller</button>' : '<button type="button" class="btn ghost sm" data-nb="ingresar">Ya tengo cuenta</button>'}
          ${modo === 'activar' ? '<button type="button" class="btn ghost sm" id="nb-out">Usar otra cuenta</button>' : ''}</div>
      </form></section></div>`;
    $$('[data-nb]').forEach(b => b.onclick = () => this.pantalla(b.dataset.nb));
    const out = $('#nb-out'); if (out) out.onclick = async () => { await this.sb.auth.signOut(); this.pantalla('ingresar'); };
    const msg = (t, bad = true) => { const m = $('#nb-msg'); m.textContent = t; m.style.color = bad ? 'var(--bad)' : 'var(--ok)'; };
    $('#nube-form').onsubmit = async (e) => {
      e.preventDefault();
      const btn = $('#nube-form button[type=submit]'); btn.disabled = true;
      try {
        if (modo === 'ingresar') {
          const { error } = await this.sb.auth.signInWithPassword({ email: $('#nb-email').value.trim(), password: $('#nb-pass').value });
          if (error) throw new Error(/confirm/i.test(error.message) ? 'Falta confirmar el correo: abra el enlace que le llegó y vuelva a entrar.' : 'Correo o contraseña incorrectos.');
          return boot();
        }
        if (modo === 'crear') {
          const { data, error } = await this.sb.auth.signUp({ email: $('#nb-email').value.trim(), password: $('#nb-pass').value });
          if (error) throw new Error(error.message);
          if (!data.session) { btn.disabled = false; return msg('Le enviamos un correo para confirmar la cuenta. Ábralo, y después entre aquí con su correo y contraseña; el código se pide al entrar.', false); }
        }
        const { error } = await this.sb.rpc('aurea_activar', { codigo: $('#nb-code').value });
        if (error) throw new Error(/incorrecto/i.test(error.message) ? 'El código de activación no es correcto.' : error.message);
        toast('Cuenta activada: los datos del taller quedan en la nube');
        return boot();
      } catch (err) { msg(err.message); }
      btn.disabled = false;
    };
  }
};
window.AUREA_NUBE = AUREA_NUBE;

/* Cada vez que se guarda en el equipo, se programa la subida a la nube. */
const nubeSaveBase = DB.save.bind(DB);
DB.save = function () { nubeSaveBase(); AUREA_NUBE.programar(); };

/* Estado de la nube en la barra superior. */
const nubeShellBase = renderShell;
renderShell = function () {
  nubeShellBase();
  $('.topbar .spacer')?.insertAdjacentHTML('afterend', AUREA_NUBE.pill());
};

/* Configuración: datos de la cuenta del taller y acciones de la nube. */
const nubeConfigBase = Views.config;
Views.config = (v) => {
  nubeConfigBase(v);
  const N = AUREA_NUBE;
  v.insertAdjacentHTML('beforeend', `<div class="card mt"><h3>${icon('nube')} Nube del taller <span class="eyebrow">Supabase</span></h3>
    ${N.activa ? `<p>Conectada con la cuenta <b>${esc(N.email)}</b>. Versión ${N.version}${N.ultimo ? ' · última vez guardado ' + esc(new Date(N.ultimo).toLocaleString('es-CO')) : ''}.</p>
      <p class="muted" style="font-size:13.5px">Para usar el sistema en otro equipo, abra la misma dirección, entre con esta cuenta y luego con su usuario. Para darle acceso a otra persona con su propio correo, que cree su cuenta en la pantalla de la nube con el código de activación del taller.</p>
      <div class="flex"><button class="btn" id="nb-sync">${icon('nube')} Guardar ahora</button><button class="btn ghost" id="nb-salir">Cerrar la sesión de la nube en este equipo</button></div>`
    : `<p class="muted">${N.estado === 'sin conexión' ? 'No hay conexión a internet: los cambios quedan en este equipo y se suben cuando vuelva a entrar con internet.' : 'Los datos están solo en este equipo.'}</p>`}</div>`);
  const s = $('#nb-sync', v); if (s) s.onclick = async () => { await N.subir(); toast('Datos guardados en la nube'); render(); };
  const o = $('#nb-salir', v); if (o) o.onclick = () => ask('¿Cerrar la sesión de la nube en este equipo? Para volver a entrar se pide el correo y la contraseña del taller.', () => N.salir(), 'Cerrar sesión');
};

Object.assign(FUNCIONES, {
  'Nube del taller': ['Datos guardados en la nube (Supabase)', 'Los mismos datos en todos los computadores y celulares', 'Cuenta del taller con correo y contraseña', 'Código de activación para unir cada cuenta', 'Guardado automático después de cada cambio', 'Aviso cuando otro equipo guardó al mismo tiempo', 'Actualización desde otros equipos al volver a la pestaña', 'Estado de la nube en la barra superior', 'Trabajo sin internet con los datos del equipo']
});
