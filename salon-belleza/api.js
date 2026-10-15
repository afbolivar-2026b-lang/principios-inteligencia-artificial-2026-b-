// ===== CONEXIÓN CON LA BASE DE DATOS (Supabase) =====
// Usa solo fetch del navegador: no hace falta cargar librerías externas.
// La llave "publishable" es pública por diseño: la seguridad la ponen las reglas (RLS) de la base de datos.

const SUPABASE = {
  url: 'https://zhnwkyjoyixriasoxirf.supabase.co',
  key: 'sb_publishable_f7Dx8s7ju-cfhoEV1EaVqg_N3w66R4k',
};
const CLAVE_SESION = 'neivaBelleza.sesion';

// Mensajes claros para los códigos de error que devuelve la base de datos
const MENSAJES_ERROR = {
  HORARIO_OCUPADO: 'Ese horario se acaba de ocupar. Elige otro, por favor.',
  FESTIVO: 'Ese día es festivo y el salón está cerrado.',
  DOMINGO: 'Los domingos el salón está cerrado.',
  NO_TRABAJA: 'La profesional no trabaja ese día.',
  FUERA_DE_HORARIO: 'Ese horario está fuera de la jornada de la profesional.',
  BLOQUEADO: 'La profesional no está disponible a esa hora.',
  HORA_PASADA: 'Elige una hora con al menos 30 minutos de anticipación.',
  MUY_LEJOS: 'Solo se puede reservar con hasta 4 meses de anticipación.',
  NOMBRE_INVALIDO: 'Escribe tu nombre completo.',
  TELEFONO_INVALIDO: 'Escribe un número de celular válido.',
  LIMITE_RESERVAS: 'Ya tienes 3 citas ese día. Escríbenos por WhatsApp si necesitas más.',
  PROFESIONAL_NO_HACE_SERVICIO: 'La profesional elegida no hace uno de los servicios. Elige otra o "Sin preferencia".',
  SERVICIO_INVALIDO: 'Uno de los servicios ya no está disponible. Recarga la página.',
  MENOS_DE_24H: 'Faltan menos de 24 horas para tu cita. Para cambiarla escríbenos por WhatsApp.',
  NO_SE_PUEDE_CAMBIAR: 'Esta cita ya no se puede cambiar.',
  NO_EXISTE: 'No encontramos esa cita. Revisa el enlace.',
  CUPON_INVALIDO: 'Ese código de descuento no es válido o ya venció.',
  SALDO_INSUFICIENTE: 'La tarjeta de regalo no tiene saldo suficiente.',
  SIN_PERMISO: 'Tu cuenta no tiene permiso para hacer esto.',
  SIN_STOCK: 'Uno de los productos ya no tiene unidades suficientes. Revisa tu carrito.',
  CARRITO_VACIO: 'Tu carrito está vacío.',
  PRODUCTO_INVALIDO: 'Uno de los productos ya no está disponible. Recarga la página.',
  DIRECCION_INVALIDA: 'Escribe la dirección completa para el domicilio.',
  LIMITE_PEDIDOS: 'Ya tienes pedidos pendientes. Escríbenos por WhatsApp si necesitas otro.',
  VALOR_INVALIDO: 'Elige un valor entre $20.000 y $2.000.000.',
  TARJETA_NO_ACTIVA: 'Esa tarjeta todavía no está activa o ya venció.',
  AUN_NO_TERMINADA: 'Podrás opinar cuando termine tu cita.',
  YA_RESENADA: 'Ya dejaste tu opinión de esta cita. ¡Gracias!',
  ESTRELLAS_INVALIDAS: 'Elige de 1 a 5 estrellas.',
  FORMATO_INVALIDO: 'La foto debe ser JPG, PNG o WEBP.',
  ARCHIVO_GRANDE: 'La foto pesa más de 5 MB.',
  SUBIDA_FALLIDA: 'No se pudo subir la foto. Inténtalo de nuevo.',
  ESTADO_INVALIDO: 'Ese estado no es válido.',
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Primero confirma tu correo con el enlace que te enviamos.',
  'User already registered': 'Ya existe una cuenta con ese correo. Inicia sesión.',
};

function mensajeError(error) {
  const codigo = String(error && error.message || error).trim();
  return MENSAJES_ERROR[codigo] || 'No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.';
}

// --- Sesión del personal (panel) ---
function leerSesion() {
  try { return JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null'); } catch (e) { return null; }
}
function guardarSesion(s) {
  try { s ? localStorage.setItem(CLAVE_SESION, JSON.stringify(s)) : localStorage.removeItem(CLAVE_SESION); } catch (e) { /* sin almacenamiento */ }
}

async function tokenVigente() {
  let s = leerSesion();
  if (!s) return null;
  if (Date.now() / 1000 > s.expires_at - 60) {
    try {
      s = await authPeticion('token?grant_type=refresh_token', { refresh_token: s.refresh_token });
      guardarSesion(s);
    } catch (e) {
      guardarSesion(null);
      return null;
    }
  }
  return s.access_token;
}

async function authPeticion(ruta, cuerpo) {
  const r = await fetch(`${SUPABASE.url}/auth/v1/${ruta}`, {
    method: 'POST',
    headers: { apikey: SUPABASE.key, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error_description || datos.msg || 'AUTH');
  if (datos.expires_in) datos.expires_at = Math.floor(Date.now() / 1000) + datos.expires_in;
  return datos;
}

async function iniciarSesion(email, password) {
  const s = await authPeticion('token?grant_type=password', { email, password });
  guardarSesion(s);
  return s;
}

async function registrarse(email, password, nombre) {
  const r = await fetch(`${SUPABASE.url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: SUPABASE.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, data: { nombre } }),
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.msg || datos.error_description || 'AUTH');
  if (datos.access_token) {
    datos.expires_at = Math.floor(Date.now() / 1000) + datos.expires_in;
    guardarSesion(datos);
  }
  return datos; // sin access_token = debe confirmar el correo
}

async function recuperarClave(email) {
  const r = await fetch(`${SUPABASE.url}/auth/v1/recover`, {
    method: 'POST',
    headers: { apikey: SUPABASE.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) throw new Error('AUTH');
}

// Id del usuario de la sesión actual (viene dentro del token)
function usuarioActual() {
  const s = leerSesion();
  if (!s) return null;
  try { return JSON.parse(atob(s.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch (e) { return null; }
}

// Si el enlace del correo trae la sesión (#access_token=...), se guarda
function sesionDesdeEnlace() {
  if (!location.hash.includes('access_token=')) return false;
  const p = new URLSearchParams(location.hash.slice(1));
  guardarSesion({
    access_token: p.get('access_token'), refresh_token: p.get('refresh_token'),
    expires_at: Math.floor(Date.now() / 1000) + Number(p.get('expires_in') || 3600),
    tipo: p.get('type'),
  });
  history.replaceState(null, '', location.pathname);
  return p.get('type') || true;
}

async function cambiarClave(password) {
  const token = await tokenVigente();
  const r = await fetch(`${SUPABASE.url}/auth/v1/user`, {
    method: 'PUT',
    headers: { apikey: SUPABASE.key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!r.ok) throw new Error('AUTH');
}

async function cerrarSesion() {
  const token = await tokenVigente();
  guardarSesion(null);
  if (token) {
    fetch(`${SUPABASE.url}/auth/v1/logout`, { method: 'POST', headers: { apikey: SUPABASE.key, Authorization: `Bearer ${token}` } }).catch(() => {});
  }
}

// --- Peticiones a la base de datos ---
async function peticion(ruta, { method = 'GET', body, headers = {} } = {}) {
  const token = await tokenVigente();
  const r = await fetch(`${SUPABASE.url}/rest/v1/${ruta}`, {
    method,
    headers: {
      apikey: SUPABASE.key,
      Authorization: `Bearer ${token || SUPABASE.key}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (r.status === 204) return null;
  const datos = await r.json().catch(() => null);
  if (!r.ok) throw new Error((datos && (datos.message || datos.hint)) || `HTTP_${r.status}`);
  return datos;
}

const db = {
  rpc: (nombre, params = {}) => peticion(`rpc/${nombre}`, { method: 'POST', body: params }),
  leer: (tabla, consulta = 'select=*') => peticion(`${tabla}?${consulta}`),
  insertar: (tabla, filas) => peticion(tabla, { method: 'POST', body: filas, headers: { Prefer: 'return=representation' } }),
  actualizar: (tabla, filtro, cambios) => peticion(`${tabla}?${filtro}`, { method: 'PATCH', body: cambios, headers: { Prefer: 'return=representation' } }),
  borrar: (tabla, filtro) => peticion(`${tabla}?${filtro}`, { method: 'DELETE' }),
};

// Subir una foto al almacenamiento de Supabase (solo personal del salón). Devuelve la ruta guardada.
async function subirArchivo(carpeta, archivo) {
  const token = await tokenVigente();
  const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[archivo.type];
  if (!ext) throw new Error('FORMATO_INVALIDO');
  const ruta = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const r = await fetch(`${SUPABASE.url}/storage/v1/object/${carpeta}/${ruta}`, {
    method: 'POST',
    headers: { apikey: SUPABASE.key, Authorization: `Bearer ${token}`, 'Content-Type': archivo.type },
    body: archivo,
  });
  if (!r.ok) throw new Error(r.status === 413 ? 'ARCHIVO_GRANDE' : 'SUBIDA_FALLIDA');
  return ruta;
}

// Fechas: la base de datos guarda en UTC; Colombia es UTC-5 todo el año (sin horario de verano)
function aISOColombia(fechaTexto, hora) {
  const [h, m] = hora.split(':').map(Number);
  return `${fechaTexto}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-05:00`;
}
function fechaHoraColombia(iso) {
  const d = new Date(new Date(iso).getTime() - 5 * 3600 * 1000);
  const dos = (n) => String(n).padStart(2, '0');
  return {
    fecha: `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`,
    hora: `${d.getUTCHours()}:${dos(d.getUTCMinutes())}`,
    minutos: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}
