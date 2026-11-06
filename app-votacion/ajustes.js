/*!
 * © Opita Digital — Todos los derechos reservados.
 * Ajustes de la campaña que se cambian desde el panel: nombre, eslogan,
 * diseño (tema) y enlace público para compartir.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ErrorValidacion } = require('./store');

const TEMAS = ['opita', 'oscuro', 'limpio', 'popular'];

function crearAjustes(archivo, iniciales = {}) {
  let ajustes = {
    nombre: iniciales.nombre || 'Mi Campaña',
    eslogan: 'Tu barrio también decide.',
    tema: 'opita',
    urlPublica: '',
  };
  if (archivo && fs.existsSync(archivo)) {
    try {
      ajustes = { ...ajustes, ...JSON.parse(fs.readFileSync(archivo, 'utf8')) };
    } catch { /* se usan los valores por defecto */ }
  }

  function guardar() {
    if (!archivo) return;
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    const tmp = `${archivo}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(ajustes, null, 2));
    fs.renameSync(tmp, archivo);
  }

  function texto(v, campo, max, clave) {
    if (typeof v !== 'string' || !v.trim()) throw new ErrorValidacion(`${campo} es obligatorio`, 400, clave);
    const t = v.trim().replace(/\s+/g, ' ');
    if (t.length > max) throw new ErrorValidacion(`${campo} supera ${max} caracteres`, 400, clave);
    return t;
  }

  function actualizar(datos = {}) {
    const nuevo = { ...ajustes };
    if ('nombre' in datos) nuevo.nombre = texto(datos.nombre, 'El nombre de la campaña', 40, 'nombre');
    if ('eslogan' in datos) nuevo.eslogan = texto(datos.eslogan, 'El eslogan', 80, 'eslogan');
    if ('tema' in datos) {
      if (!TEMAS.includes(datos.tema)) throw new ErrorValidacion('Diseño no válido', 400, 'tema');
      nuevo.tema = datos.tema;
    }
    if ('urlPublica' in datos) {
      const u = String(datos.urlPublica || '').trim();
      if (u) {
        let url;
        try { url = new URL(u); } catch { throw new ErrorValidacion('El enlace no es válido', 400, 'urlPublica'); }
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new ErrorValidacion('El enlace debe empezar por https://', 400, 'urlPublica');
        }
        nuevo.urlPublica = url.origin + url.pathname.replace(/\/+$/, '');
      } else {
        nuevo.urlPublica = '';
      }
    }
    ajustes = nuevo;
    guardar();
    return { ...ajustes };
  }

  return { obtener: () => ({ ...ajustes }), actualizar };
}

module.exports = { crearAjustes, TEMAS };
