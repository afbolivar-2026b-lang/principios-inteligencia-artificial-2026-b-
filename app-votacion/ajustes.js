/*!
 * © Opita Digital — Todos los derechos reservados.
 * Ajustes de la campaña que se cambian desde el panel: nombre, eslogan,
 * diseño (tema) y enlace público para compartir.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { ErrorValidacion } = require('./store');

const TEMAS = ['elegante', 'opita', 'oscuro', 'limpio', 'popular'];

function crearAjustes(archivo, iniciales = {}) {
  let ajustes = {
    nombre: iniciales.nombre || 'Mi Campaña',
    eslogan: 'Tu barrio también decide.',
    tema: 'elegante',
    urlPublica: '',
    candidato: '',
    foto: '',
    correosEquipo: [],
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
    if ('candidato' in datos) {
      const c = String(datos.candidato || '').trim().replace(/\s+/g, ' ');
      if (c.length > 60) throw new ErrorValidacion('El nombre del candidato supera 60 caracteres', 400, 'candidato');
      nuevo.candidato = c;
    }
    if ('correosEquipo' in datos) {
      const lista = Array.isArray(datos.correosEquipo) ? datos.correosEquipo : String(datos.correosEquipo || '').split(/[\s,;]+/);
      const correos = [...new Set(lista.map((c) => String(c).trim().toLowerCase()).filter(Boolean))];
      const malo = correos.find((c) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) || c.length > 120);
      if (malo) throw new ErrorValidacion(`El correo "${malo}" no es válido`, 400, 'correosEquipo');
      if (correos.length > 30) throw new ErrorValidacion('Máximo 30 correos', 400, 'correosEquipo');
      nuevo.correosEquipo = correos;
    }
    if ('foto' in datos) {
      const f = String(datos.foto || '');
      if (f) {
        const m = f.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+=*)$/);
        if (!m) throw new ErrorValidacion('La foto debe ser JPG, PNG o WEBP', 400, 'foto');
        if (f.length > 600 * 1024) throw new ErrorValidacion('La foto es demasiado grande', 400, 'foto');
        const b = Buffer.from(m[2], 'base64').subarray(0, 12).toString('hex');
        const firmas = { jpeg: /^ffd8ff/, png: /^89504e47/, webp: /^52494646.{8}57454250/ };
        if (!firmas[m[1]].test(b)) throw new ErrorValidacion('La foto no es una imagen válida', 400, 'foto');
      }
      nuevo.foto = f;
    }
    ajustes = nuevo;
    guardar();
    return { ...ajustes };
  }

  return { obtener: () => ({ ...ajustes }), actualizar };
}

module.exports = { crearAjustes, TEMAS };
