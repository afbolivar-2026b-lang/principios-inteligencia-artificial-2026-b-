'use strict';

// Registro de personas para la base de datos de la campaña.
// Los datos personales nunca se exponen sin la clave de administración.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ErrorValidacion, claveTexto } = require('./store');

const MAX_FIRMA = 150 * 1024; // tamaño máximo de la imagen de la firma (data URL)
const PREFIJO_FIRMA = 'data:image/png;base64,';

function crearRegistros(archivo) {
  let registros = [];

  if (archivo && fs.existsSync(archivo)) {
    try {
      registros = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    } catch {
      registros = [];
    }
  }

  function guardar() {
    if (!archivo) return;
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    const tmp = `${archivo}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(registros, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, archivo);
  }

  function texto(valor, campo, { min = 1, max = 60, patron, mensaje, clave } = {}) {
    const error = (m) => new ErrorValidacion(m, 400, clave);
    if (typeof valor !== 'string') throw error(`${campo} es obligatorio`);
    const t = valor.trim().replace(/\s+/g, ' ');
    if (t.length < min) throw error(`${campo} es obligatorio`);
    if (t.length > max) throw error(`${campo} supera ${max} caracteres`);
    if (patron && !patron.test(t)) throw error(mensaje || `${campo} no es válido`);
    return t;
  }

  // "carlos DE la ossa" -> "Carlos de la Ossa"
  const MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e']);
  // Solo se corrige si viene todo en minúsculas o todo en mayúsculas.
  function capitalizar(t) {
    const conLetras = /\p{L}/u.test(t);
    if (!conLetras || (t !== t.toLocaleLowerCase('es') && t !== t.toLocaleUpperCase('es'))) return t;
    return t.toLocaleLowerCase('es').split(' ').map((p, i) =>
      (i > 0 && MENORES.has(p)) ? p : p.replace(/(^|[-'])(\p{L})/gu, (m, s, l) => s + l.toLocaleUpperCase('es')))
      .join(' ');
  }

  // Si ya existe un barrio o comuna escrito igual (sin importar mayúsculas ni
  // tildes), se reutiliza esa misma forma para no crear duplicados.
  function formaExistente(campo, valor) {
    const k = claveTexto(valor);
    const conteo = new Map();
    for (const r of registros) {
      if (claveTexto(r[campo]) === k) conteo.set(r[campo], (conteo.get(r[campo]) || 0) + 1);
    }
    if (!conteo.size) return capitalizar(valor);
    return [...conteo.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  const LETRAS = /^[\p{L}][\p{L} .'-]*$/u;

  // "5", "comuna 5" y "COMUNA5" se guardan igual: "Comuna 5".
  function normalizarComuna(c) {
    const m = c.match(/^(?:comuna\s*)?(\d{1,3})$/i);
    return m ? `Comuna ${Number(m[1])}` : c;
  }

  function agregar(datos) {
    if (!datos || typeof datos !== 'object') throw new ErrorValidacion('Datos inválidos');

    const nombre = capitalizar(texto(datos.nombre, 'El nombre', {
      patron: LETRAS, mensaje: 'El nombre solo puede tener letras', clave: 'nombre',
    }));
    const apellido = capitalizar(texto(datos.apellido, 'El apellido', {
      patron: LETRAS, mensaje: 'El apellido solo puede tener letras', clave: 'apellido',
    }));
    const cedula = texto(String(datos.cedula ?? '').replace(/[.\s]/g, ''), 'La cédula', {
      patron: /^\d{6,10}$/, mensaje: 'La cédula debe tener entre 6 y 10 dígitos', clave: 'cedula',
    });
    const edad = Number(datos.edad);
    if (!Number.isInteger(edad) || edad < 18 || edad > 120) {
      throw new ErrorValidacion('La edad debe ser un número entre 18 y 120', 400, 'edad');
    }
    const telefono = texto(String(datos.telefono ?? '').replace(/[\s().-]/g, ''), 'El teléfono', {
      patron: /^(\+57)?\d{7,10}$/, mensaje: 'El teléfono debe tener entre 7 y 10 dígitos', clave: 'telefono',
    }).replace(/^\+57/, '');
    const barrio = formaExistente('barrio', texto(datos.barrio, 'El barrio', { max: 80, clave: 'barrio' }));
    const comuna = formaExistente('comuna',
      normalizarComuna(texto(datos.comuna, 'La comuna', { max: 40, clave: 'comuna' })));

    if (typeof datos.firma !== 'string' || !datos.firma.startsWith(PREFIJO_FIRMA)) {
      throw new ErrorValidacion('La firma es obligatoria', 400, 'firma');
    }
    if (datos.firma.length > MAX_FIRMA) throw new ErrorValidacion('La firma es demasiado grande');
    const base64 = datos.firma.slice(PREFIJO_FIRMA.length);
    const bytes = Buffer.from(base64, 'base64');
    // Debe ser realmente un PNG (firma de archivo 89 50 4E 47).
    if (!/^[A-Za-z0-9+/]+=*$/.test(base64) || bytes.subarray(0, 4).toString('hex') !== '89504e47') {
      throw new ErrorValidacion('La firma no es una imagen válida');
    }

    if (datos.autorizacion !== true) {
      throw new ErrorValidacion('Debe autorizar el tratamiento de datos personales', 400, 'autorizacion');
    }

    // Evitar personas repetidas.
    if (registros.some((r) => r.cedula === cedula)) {
      throw new ErrorValidacion('Esta cédula ya está registrada. No hace falta registrarse otra vez.', 409, 'cedula');
    }
    if (registros.some((r) => r.telefono === telefono)) {
      throw new ErrorValidacion('Este teléfono ya está registrado con otra persona.', 409, 'telefono');
    }

    const registro = {
      id: crypto.randomUUID(),
      nombre,
      apellido,
      cedula,
      edad,
      telefono,
      barrio,
      comuna,
      firma: datos.firma,
      autorizacion: true,
      fecha: new Date().toISOString(),
    };
    registros.push(registro);
    guardar();
    return { id: registro.id, nombre: registro.nombre, fecha: registro.fecha };
  }

  function listar() {
    return [...registros].sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  // Exporta a CSV (sin la imagen de la firma, que solo indica si existe).
  function csv() {
    const columnas = ['nombre', 'apellido', 'cedula', 'edad', 'telefono', 'barrio', 'comuna', 'firmado', 'fecha'];
    const celda = (v) => {
      let s = String(v ?? '');
      // Evita inyección de fórmulas al abrir en Excel.
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const filas = listar().map((r) =>
      columnas.map((c) => celda(c === 'firmado' ? (r.firma ? 'Sí' : 'No') : r[c])).join(','));
    // BOM para que Excel reconozca UTF-8 (tildes y ñ).
    return '﻿' + [columnas.join(','), ...filas].join('\r\n') + '\r\n';
  }

  function eliminar(id) {
    const i = registros.findIndex((r) => r.id === id);
    if (i === -1) throw new ErrorValidacion('Registro no encontrado', 404);
    registros.splice(i, 1);
    guardar();
  }

  const diaBogota = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const dia = (fecha) => diaBogota.format(new Date(fecha));

  // Agrupa sin distinguir mayúsculas; muestra la forma más usada.
  function agrupar(lista, clave) {
    const grupos = new Map();
    for (const r of lista) {
      const k = claveTexto(r[clave]);
      const g = grupos.get(k) || { total: 0, formas: new Map(), comunas: new Map() };
      g.total += 1;
      g.formas.set(r[clave], (g.formas.get(r[clave]) || 0) + 1);
      g.comunas.set(r.comuna, (g.comunas.get(r.comuna) || 0) + 1);
      grupos.set(k, g);
    }
    const masUsada = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return [...grupos.values()]
      .map((g) => ({ nombre: masUsada(g.formas), comuna: masUsada(g.comunas), total: g.total }))
      .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
  }

  function estadisticas(ahora = new Date()) {
    const hoy = dia(ahora);
    const porDiaMapa = new Map();
    for (const r of registros) {
      const d = dia(r.fecha);
      porDiaMapa.set(d, (porDiaMapa.get(d) || 0) + 1);
    }
    const porDia = [];
    for (let i = 29; i >= 0; i--) {
      const d = dia(new Date(ahora.getTime() - i * 86400000));
      porDia.push({ fecha: d, total: porDiaMapa.get(d) || 0 });
    }
    const suma = (arr) => arr.reduce((s, x) => s + x.total, 0);

    const rangos = [[18, 25], [26, 35], [36, 45], [46, 55], [56, 65], [66, 120]];
    const edades = rangos.map(([a, b]) => ({
      rango: b === 120 ? `${a}+` : `${a}–${b}`,
      total: registros.filter((r) => r.edad >= a && r.edad <= b).length,
    }));

    const comunas = agrupar(registros, 'comuna').map(({ nombre, total }) => ({ nombre, total }));
    const barrios = agrupar(registros, 'barrio');

    return {
      total: registros.length,
      hoy: porDiaMapa.get(hoy) || 0,
      semana: suma(porDia.slice(-7)),
      semanaAnterior: suma(porDia.slice(-14, -7)),
      edadPromedio: registros.length
        ? Math.round(registros.reduce((s, r) => s + r.edad, 0) / registros.length)
        : null,
      totalComunas: comunas.length,
      totalBarrios: barrios.length,
      porDia,
      edades,
      comunas,
      barrios: barrios.slice(0, 8),
      recientes: listar().slice(0, 6).map(({ nombre, apellido, barrio, comuna, fecha }) =>
        ({ nombre, apellido, barrio, comuna, fecha })),
    };
  }

  // Barrios ya registrados (sin datos personales) para sugerirlos en el formulario.
  function barrios() {
    return agrupar(registros, 'barrio').map(({ nombre, comuna }) => ({ nombre, comuna }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  return { agregar, listar, csv, eliminar, estadisticas, barrios, total: () => registros.length };
}

module.exports = { crearRegistros, MAX_FIRMA };
