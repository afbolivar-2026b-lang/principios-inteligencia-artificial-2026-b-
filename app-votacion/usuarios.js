/*!
 * © Opita Digital — Todos los derechos reservados.
 * Perfiles del equipo de campaña: correo, contraseña, puesto, rol y permisos.
 * Las contraseñas se guardan cifradas con scrypt (nunca en texto plano).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ErrorValidacion } = require('./store');

const PERMISOS = [
  { id: 'tablero', nombre: 'Ver el tablero (Inicio)' },
  { id: 'registros', nombre: 'Ver los registros (datos personales)' },
  { id: 'eliminar', nombre: 'Eliminar registros' },
  { id: 'exportar', nombre: 'Descargar Excel, PDF y CSV' },
  { id: 'encuestas', nombre: 'Crear y cerrar encuestas' },
  { id: 'compartir', nombre: 'Compartir: anuncios y QR' },
  { id: 'ajustes', nombre: 'Cambiar ajustes y diseño' },
  { id: 'usuarios', nombre: 'Administrar usuarios y permisos' },
];
const IDS = PERMISOS.map((p) => p.id);

const ROLES = {
  director: { nombre: 'Director / CEO', permisos: IDS },
  coordinador: { nombre: 'Coordinador', permisos: ['tablero', 'registros', 'exportar', 'encuestas', 'compartir'] },
  digitador: { nombre: 'Digitador', permisos: ['tablero', 'registros'] },
  comunicaciones: { nombre: 'Comunicaciones', permisos: ['tablero', 'encuestas', 'compartir'] },
  observador: { nombre: 'Observador', permisos: ['tablero'] },
  personalizado: { nombre: 'Personalizado', permisos: [] },
};

const N_SCRYPT = 16384;

function cifrar(clave) {
  const sal = crypto.randomBytes(16);
  const hash = crypto.scryptSync(clave, sal, 32, { N: N_SCRYPT });
  return `scrypt$${sal.toString('base64')}$${hash.toString('base64')}`;
}

function comprobar(clave, guardado) {
  const [tipo, sal, hash] = String(guardado || '').split('$');
  if (tipo !== 'scrypt' || !sal || !hash) return false;
  const calculado = crypto.scryptSync(String(clave), Buffer.from(sal, 'base64'), 32, { N: N_SCRYPT });
  const esperado = Buffer.from(hash, 'base64');
  return esperado.length === calculado.length && crypto.timingSafeEqual(esperado, calculado);
}

// Para que un correo inexistente tarde lo mismo que uno real
const HASH_FALSO = cifrar(crypto.randomBytes(12).toString('hex'));

function crearUsuarios(archivo) {
  let usuarios = [];
  if (archivo && fs.existsSync(archivo)) {
    try { usuarios = JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch { usuarios = []; }
  }

  function guardar() {
    if (!archivo) return;
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    const tmp = `${archivo}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(usuarios, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, archivo);
  }

  const publico = ({ claveHash, ...u }) => ({ ...u });

  function texto(v, campo, { min = 1, max = 60, clave } = {}) {
    const t = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';
    if (t.length < min) throw new ErrorValidacion(`${campo} es obligatorio`, 400, clave);
    if (t.length > max) throw new ErrorValidacion(`${campo} supera ${max} caracteres`, 400, clave);
    return t;
  }

  function validarClave(clave) {
    if (typeof clave !== 'string' || clave.length < 8) {
      throw new ErrorValidacion('La contraseña debe tener al menos 8 caracteres', 400, 'clave');
    }
    if (clave.length > 128) throw new ErrorValidacion('La contraseña es demasiado larga', 400, 'clave');
    return clave;
  }

  function validarCorreo(correo, idPropio) {
    const c = String(correo || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) || c.length > 120) {
      throw new ErrorValidacion('El correo no es válido', 400, 'correo');
    }
    if (usuarios.some((u) => u.correo === c && u.id !== idPropio)) {
      throw new ErrorValidacion('Ya existe un perfil con ese correo', 409, 'correo');
    }
    return c;
  }

  function validarPermisos(rol, permisos) {
    if (!ROLES[rol]) throw new ErrorValidacion('Rol no válido', 400, 'rol');
    const lista = Array.isArray(permisos) ? permisos : ROLES[rol].permisos;
    const invalido = lista.find((p) => !IDS.includes(p));
    if (invalido) throw new ErrorValidacion(`Permiso desconocido: ${invalido}`, 400, 'permisos');
    return IDS.filter((p) => lista.includes(p)); // orden fijo y sin repetidos
  }

  function buscar(id) {
    const u = usuarios.find((x) => x.id === id);
    if (!u) throw new ErrorValidacion('Perfil no encontrado', 404);
    return u;
  }

  function crear(datos = {}) {
    const rol = datos.rol || 'personalizado';
    const u = {
      id: crypto.randomUUID(),
      nombre: texto(datos.nombre, 'El nombre', { min: 2, clave: 'nombre' }),
      correo: validarCorreo(datos.correo),
      puesto: texto(datos.puesto || '', 'El puesto', { min: 0, clave: 'puesto' }),
      rol,
      permisos: validarPermisos(rol, datos.permisos),
      activo: datos.activo !== false,
      claveHash: cifrar(validarClave(datos.clave)),
      creado: new Date().toISOString(),
      ultimoAcceso: null,
    };
    usuarios.push(u);
    guardar();
    return publico(u);
  }

  /** autorId: quien hace el cambio (null = clave maestra). */
  function actualizar(id, datos = {}, autorId = null) {
    const u = buscar(id);
    const nuevo = { ...u };
    if ('nombre' in datos) nuevo.nombre = texto(datos.nombre, 'El nombre', { min: 2, clave: 'nombre' });
    if ('correo' in datos) nuevo.correo = validarCorreo(datos.correo, id);
    if ('puesto' in datos) nuevo.puesto = texto(datos.puesto || '', 'El puesto', { min: 0, clave: 'puesto' });
    if ('rol' in datos || 'permisos' in datos) {
      nuevo.rol = datos.rol || u.rol;
      nuevo.permisos = validarPermisos(nuevo.rol, datos.permisos);
    }
    if ('activo' in datos) nuevo.activo = datos.activo !== false;
    if (datos.clave) {
      nuevo.claveHash = cifrar(validarClave(datos.clave));
      nuevo.solicitudClave = null; // el director ya le asignó una nueva
    }
    if (autorId === id) {
      // Nadie se puede dejar por fuera a sí mismo
      if (!nuevo.activo) throw new ErrorValidacion('No puede desactivar su propio perfil', 400, 'activo');
      if (u.permisos.includes('usuarios') && !nuevo.permisos.includes('usuarios')) {
        throw new ErrorValidacion('No puede quitarse a sí mismo el permiso de administrar usuarios', 400, 'permisos');
      }
    }
    Object.assign(u, nuevo);
    guardar();
    return publico(u);
  }

  function eliminar(id, autorId = null) {
    if (autorId === id) throw new ErrorValidacion('No puede eliminar su propio perfil', 400);
    buscar(id);
    usuarios = usuarios.filter((u) => u.id !== id);
    guardar();
  }

  /** Correo y contraseña -> perfil activo, o null. */
  function verificar(correo, clave) {
    const c = String(correo || '').trim().toLowerCase();
    const u = usuarios.find((x) => x.correo === c);
    const ok = comprobar(clave, u ? u.claveHash : HASH_FALSO);
    return ok && u && u.activo ? publico(u) : null;
  }

  function porCorreo(correo) {
    const u = usuarios.find((x) => x.correo === String(correo || '').toLowerCase() && x.activo);
    return u ? publico(u) : null;
  }

  function activo(id) {
    const u = usuarios.find((x) => x.id === id && x.activo);
    return u ? publico(u) : null;
  }

  function registrarAcceso(id) {
    const u = usuarios.find((x) => x.id === id);
    if (u) { u.ultimoAcceso = new Date().toISOString(); guardar(); }
  }

  // "Olvidé mi contraseña": queda la solicitud para que el director asigne una nueva
  function solicitarClave(correo) {
    const u = usuarios.find((x) => x.correo === String(correo || '').trim().toLowerCase() && x.activo);
    if (!u) return;
    u.solicitudClave = new Date().toISOString();
    guardar();
  }

  function cambiarClavePropia(id, actual, nueva) {
    const u = buscar(id);
    if (!comprobar(actual, u.claveHash)) throw new ErrorValidacion('La contraseña actual no es correcta', 400, 'actual');
    u.claveHash = cifrar(validarClave(nueva));
    guardar();
  }

  return {
    listar: () => usuarios.map(publico).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    crear, actualizar, eliminar, verificar, porCorreo, activo, registrarAcceso, cambiarClavePropia, solicitarClave,
  };
}

module.exports = { crearUsuarios, PERMISOS, ROLES, IDS_PERMISOS: IDS };
