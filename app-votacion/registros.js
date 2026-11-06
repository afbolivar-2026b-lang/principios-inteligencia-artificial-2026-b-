'use strict';

// Registro de personas para la base de datos de la campaña.
// Los datos personales nunca se exponen sin la clave de administración.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ErrorValidacion } = require('./store');

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

  function texto(valor, campo, { min = 1, max = 60, patron, mensaje } = {}) {
    if (typeof valor !== 'string') throw new ErrorValidacion(`${campo} es obligatorio`);
    const t = valor.trim().replace(/\s+/g, ' ');
    if (t.length < min) throw new ErrorValidacion(`${campo} es obligatorio`);
    if (t.length > max) throw new ErrorValidacion(`${campo} supera ${max} caracteres`);
    if (patron && !patron.test(t)) throw new ErrorValidacion(mensaje || `${campo} no es válido`);
    return t;
  }

  const LETRAS = /^[\p{L}][\p{L} .'-]*$/u;

  // "5", "comuna 5" y "COMUNA5" se guardan igual: "Comuna 5".
  function normalizarComuna(c) {
    const m = c.match(/^(?:comuna\s*)?(\d{1,3})$/i);
    return m ? `Comuna ${Number(m[1])}` : c;
  }

  function agregar(datos) {
    if (!datos || typeof datos !== 'object') throw new ErrorValidacion('Datos inválidos');

    const nombre = texto(datos.nombre, 'El nombre', {
      patron: LETRAS, mensaje: 'El nombre solo puede tener letras',
    });
    const apellido = texto(datos.apellido, 'El apellido', {
      patron: LETRAS, mensaje: 'El apellido solo puede tener letras',
    });
    const cedula = texto(String(datos.cedula ?? '').replace(/[.\s]/g, ''), 'La cédula', {
      patron: /^\d{6,10}$/, mensaje: 'La cédula debe tener entre 6 y 10 dígitos',
    });
    const edad = Number(datos.edad);
    if (!Number.isInteger(edad) || edad < 18 || edad > 120) {
      throw new ErrorValidacion('La edad debe ser un número entre 18 y 120');
    }
    const telefono = texto(String(datos.telefono ?? '').replace(/[\s()-]/g, ''), 'El teléfono', {
      patron: /^(\+57)?\d{7,10}$/, mensaje: 'El teléfono debe tener entre 7 y 10 dígitos',
    });
    const barrio = texto(datos.barrio, 'El barrio', { max: 80 });
    const comuna = normalizarComuna(texto(datos.comuna, 'La comuna', { max: 40 }));

    if (typeof datos.firma !== 'string' || !datos.firma.startsWith(PREFIJO_FIRMA)) {
      throw new ErrorValidacion('La firma es obligatoria');
    }
    if (datos.firma.length > MAX_FIRMA) throw new ErrorValidacion('La firma es demasiado grande');
    const base64 = datos.firma.slice(PREFIJO_FIRMA.length);
    const bytes = Buffer.from(base64, 'base64');
    // Debe ser realmente un PNG (firma de archivo 89 50 4E 47).
    if (!/^[A-Za-z0-9+/]+=*$/.test(base64) || bytes.subarray(0, 4).toString('hex') !== '89504e47') {
      throw new ErrorValidacion('La firma no es una imagen válida');
    }

    if (datos.autorizacion !== true) {
      throw new ErrorValidacion('Debe autorizar el tratamiento de datos personales');
    }

    if (registros.some((r) => r.cedula === cedula)) {
      throw new ErrorValidacion('Esta cédula ya está registrada', 409);
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
      const k = r[clave].toLocaleLowerCase('es');
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

  return { agregar, listar, csv, eliminar, estadisticas, total: () => registros.length };
}

module.exports = { crearRegistros, MAX_FIRMA };
