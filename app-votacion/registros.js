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
    const comuna = texto(datos.comuna, 'La comuna', { max: 40 });

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

  return { agregar, listar, csv, total: () => registros.length };
}

module.exports = { crearRegistros, MAX_FIRMA };
