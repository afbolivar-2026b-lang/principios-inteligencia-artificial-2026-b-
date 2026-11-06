'use strict';

// Almacén de encuestas en memoria con persistencia opcional en un archivo JSON.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const LIMITES = {
  preguntaMax: 200,
  opcionMax: 100,
  opcionesMin: 2,
  opcionesMax: 10,
};

class ErrorValidacion extends Error {
  constructor(mensaje, estado = 400) {
    super(mensaje);
    this.estado = estado;
  }
}

function crearStore(archivo) {
  let encuestas = {};

  if (archivo && fs.existsSync(archivo)) {
    try {
      encuestas = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    } catch {
      encuestas = {};
    }
  }

  function guardar() {
    if (!archivo) return;
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    const tmp = `${archivo}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(encuestas, null, 2));
    fs.renameSync(tmp, archivo);
  }

  function vistaPublica(e, votante) {
    const total = e.opciones.reduce((s, o) => s + o.votos, 0);
    return {
      id: e.id,
      pregunta: e.pregunta,
      creada: e.creada,
      cerrada: e.cerrada,
      totalVotos: total,
      opciones: e.opciones.map((o) => ({ texto: o.texto, votos: o.votos })),
      miVoto: votante && e.votantes[hash(votante)] !== undefined
        ? e.votantes[hash(votante)]
        : null,
    };
  }

  function hash(valor) {
    return crypto.createHash('sha256').update(String(valor)).digest('hex');
  }

  function limpiarTexto(valor, max, campo) {
    if (typeof valor !== 'string') throw new ErrorValidacion(`${campo} debe ser texto`);
    const t = valor.trim().replace(/\s+/g, ' ');
    if (!t) throw new ErrorValidacion(`${campo} no puede estar vacío`);
    if (t.length > max) throw new ErrorValidacion(`${campo} supera ${max} caracteres`);
    return t;
  }

  function crear({ pregunta, opciones }) {
    const p = limpiarTexto(pregunta, LIMITES.preguntaMax, 'La pregunta');
    if (!Array.isArray(opciones)) throw new ErrorValidacion('Las opciones deben ser una lista');
    const ops = opciones
      .filter((o) => typeof o === 'string' && o.trim())
      .map((o) => limpiarTexto(o, LIMITES.opcionMax, 'Cada opción'));
    if (ops.length < LIMITES.opcionesMin || ops.length > LIMITES.opcionesMax) {
      throw new ErrorValidacion(
        `Debe haber entre ${LIMITES.opcionesMin} y ${LIMITES.opcionesMax} opciones`
      );
    }
    if (new Set(ops.map((o) => o.toLowerCase())).size !== ops.length) {
      throw new ErrorValidacion('Las opciones no pueden repetirse');
    }

    const id = crypto.randomBytes(6).toString('base64url');
    const claveAdmin = crypto.randomBytes(18).toString('base64url');
    encuestas[id] = {
      id,
      pregunta: p,
      opciones: ops.map((texto) => ({ texto, votos: 0 })),
      creada: new Date().toISOString(),
      cerrada: false,
      claveAdminHash: hash(claveAdmin),
      votantes: {},
    };
    guardar();
    return { encuesta: vistaPublica(encuestas[id]), claveAdmin };
  }

  function obtener(id, votante) {
    const e = Object.prototype.hasOwnProperty.call(encuestas, id) ? encuestas[id] : null;
    return e ? vistaPublica(e, votante) : null;
  }

  function listar() {
    return Object.values(encuestas)
      .sort((a, b) => b.creada.localeCompare(a.creada))
      .map((e) => vistaPublica(e));
  }

  function votar(id, indice, votante) {
    const e = Object.prototype.hasOwnProperty.call(encuestas, id) ? encuestas[id] : null;
    if (!e) throw new ErrorValidacion('Encuesta no encontrada', 404);
    if (e.cerrada) throw new ErrorValidacion('La encuesta está cerrada', 409);
    if (!Number.isInteger(indice) || indice < 0 || indice >= e.opciones.length) {
      throw new ErrorValidacion('Opción no válida');
    }
    if (!votante) throw new ErrorValidacion('Votante no identificado');
    const h = hash(votante);
    if (e.votantes[h] !== undefined) throw new ErrorValidacion('Ya votaste en esta encuesta', 409);
    e.votantes[h] = indice;
    e.opciones[indice].votos += 1;
    guardar();
    return vistaPublica(e, votante);
  }

  function cerrar(id, claveAdmin) {
    const e = Object.prototype.hasOwnProperty.call(encuestas, id) ? encuestas[id] : null;
    if (!e) throw new ErrorValidacion('Encuesta no encontrada', 404);
    const esperado = Buffer.from(e.claveAdminHash, 'hex');
    const recibido = Buffer.from(hash(claveAdmin || ''), 'hex');
    if (!crypto.timingSafeEqual(esperado, recibido)) {
      throw new ErrorValidacion('Clave de administración incorrecta', 403);
    }
    e.cerrada = true;
    guardar();
    return vistaPublica(e);
  }

  return { crear, obtener, listar, votar, cerrar };
}

module.exports = { crearStore, ErrorValidacion, LIMITES };
