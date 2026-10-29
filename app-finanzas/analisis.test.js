const test = require("node:test");
const assert = require("node:assert");
const A = require("./analisis.js");

const HOY = new Date(2026, 9, 29, 15, 0); // jueves 29 de octubre de 2026
const m = (dia, mes, tipo, monto, extra) => Object.assign({ fecha: new Date(2026, mes, dia, 12).toISOString(), tipo, monto }, extra);

test("desplazar y nombrar periodos", () => {
  assert.strictEqual(A.nombrePeriodo("mensual", A.desplazar("mensual", HOY, 0)), "Octubre 2026");
  assert.strictEqual(A.nombrePeriodo("mensual", A.desplazar("mensual", HOY, -10)), "Diciembre 2025");
  assert.strictEqual(A.nombrePeriodo("quincenal", A.desplazar("quincenal", HOY, -1)), "1–15 oct 2026");
  assert.strictEqual(A.nombrePeriodo("trimestral", A.desplazar("trimestral", HOY, 1)), "Trimestre 1 · 2027");
  assert.strictEqual(A.nombrePeriodo("semanal", A.desplazar("semanal", HOY, 0)), "26 oct – 1 nov 2026");
});

test("vista rápida", () => {
  const movs = [m(1, 9, "gasto", 30000, { categoria_id: 1 }), m(6, 9, "gasto", 60000, { categoria_id: 2 }), m(13, 9, "gasto", 9000, { categoria_id: 2 }),
    m(2, 8, "gasto", 50000, { categoria_id: 1 }), m(5, 9, "ingreso", 1000000)];
  const v = A.vistaRapida(movs, "mensual", HOY, HOY);
  assert.strictEqual(v.gastos, 99000);
  assert.strictEqual(Math.round(v.promedioDiario), Math.round(99000 / 29));
  assert.strictEqual(v.categoriaTop, 2);
  assert.strictEqual(v.diaTop, "Martes"); // 6 y 13 de octubre de 2026 son martes
  assert.strictEqual(Math.round(v.vsAnterior), 98);
});

test("serie, proyección y seguro para gastar", () => {
  const movs = [m(5, 9, "ingreso", 900000), m(6, 9, "gasto", 300000), m(6, 8, "gasto", 100000)];
  const s = A.serie(movs, "mensual", HOY, 3);
  assert.deepStrictEqual(s.map((x) => [x.etiqueta, x.ingresos, x.gastos]), [["ago", 0, 0], ["sept", 0, 100000], ["oct", 900000, 300000]]);
  const p = A.proyeccion(movs, 500000, HOY);
  assert.deepStrictEqual(p.map((x) => x.saldo), [500000, 666667, 833333, 1000000]);
  const seguro = A.seguroParaGastar(1000000, 400000, { desde: new Date(2026, 9, 1), hasta: new Date(2026, 10, 1) }, HOY);
  assert.strictEqual(seguro.dias, 3);
  assert.strictEqual(seguro.porDia, 200000);
});

test("agrupar por día con nombres", () => {
  const movs = [m(29, 9, "gasto", 5000), m(29, 9, "ingreso", 20000), m(28, 9, "gasto", 1000), m(5, 9, "gasto", 7000)];
  const g = A.porDia(movs, HOY);
  assert.deepStrictEqual(g.map((x) => [x.nombre, x.neto, x.movimientos.length]), [["Hoy", 15000, 2], ["Ayer", -1000, 1], ["Lunes, 5 oct", -7000, 1]]);
});

test("buscar por texto, categoría, etiqueta y fechas", () => {
  const movs = [
    m(3, 9, "gasto", 8000, { descripcion: "Café", categoria_id: 1, etiquetas: ["trabajo"] }),
    m(4, 9, "gasto", 50000, { descripcion: "Mercado", categoria_id: 2, nota: "frutas y verduras" }),
    m(20, 9, "ingreso", 900000, { descripcion: "Sueldo", categoria_id: 3, estado: "pendiente" })
  ];
  const nombre = (id) => ({ 1: "Comida", 2: "Mercado", 3: "Salario" })[id];
  assert.deepStrictEqual(A.buscar(movs, { texto: "cafe" }, nombre).map((x) => x.descripcion), ["Café"]);
  assert.deepStrictEqual(A.buscar(movs, { texto: "comida" }, nombre).map((x) => x.descripcion), ["Café"]);
  assert.deepStrictEqual(A.buscar(movs, { texto: "verduras" }, nombre).map((x) => x.descripcion), ["Mercado"]);
  assert.deepStrictEqual(A.buscar(movs, { texto: "#trabajo" }, nombre).map((x) => x.descripcion), ["Café"]);
  assert.deepStrictEqual(A.buscar(movs, { tipo: "gasto", orden: "mayor" }, nombre).map((x) => x.descripcion), ["Mercado", "Café"]);
  assert.deepStrictEqual(A.buscar(movs, { desde: "2026-10-04", hasta: "2026-10-20" }, nombre).map((x) => x.descripcion), ["Sueldo", "Mercado"]);
  assert.deepStrictEqual(A.buscar(movs, { estado: "pendiente" }, nombre).map((x) => x.descripcion), ["Sueldo"]);
});

test("calculadora", () => {
  assert.strictEqual(A.evaluar("55.000"), 55000);
  assert.strictEqual(A.evaluar("20.000+5.000×2"), 30000);
  assert.strictEqual(A.evaluar("100.000÷4−5.000"), 20000);
  assert.strictEqual(A.evaluar("1,5"), 1.5);
  assert.ok(isNaN(A.evaluar("20+")));
  assert.ok(isNaN(A.evaluar("5/0")));
  assert.ok(isNaN(A.evaluar("alert(1)")));
});

test("programados: siguiente fecha y pendientes", () => {
  assert.strictEqual(A.siguienteFecha("2026-01-31", "mensual"), "2026-02-28");
  assert.strictEqual(A.siguienteFecha("2026-10-25", "semanal"), "2026-11-01");
  assert.strictEqual(A.siguienteFecha("2024-02-29", "anual"), "2025-02-28");
  const p = A.fechasPendientes({ proxima: "2026-10-15", frecuencia: "semanal", activo: true }, HOY);
  assert.deepStrictEqual(p.fechas, ["2026-10-15", "2026-10-22", "2026-10-29"]);
  assert.strictEqual(p.proxima, "2026-11-05");
  assert.deepStrictEqual(A.fechasPendientes({ proxima: "2026-10-15", frecuencia: "diaria", activo: false }, HOY).fechas, []);
});

test("grupos y CSV", () => {
  assert.strictEqual(A.grupoDe({ nombre: "Educación", tipo: "gasto" }), "Estilo de Vida");
  assert.strictEqual(A.grupoDe({ nombre: "Moto", tipo: "gasto" }), "Otros");
  assert.strictEqual(A.grupoDe({ nombre: "Moto", tipo: "gasto", grupo: "Transporte" }), "Transporte");
  const texto = A.csv([{ a: "x;y", b: "=SUMA(1)" }, { a: 5, b: ["t1", "t2"] }], [{ titulo: "A", valor: (f) => f.a }, { titulo: "B", valor: (f) => f.b }]);
  assert.strictEqual(texto, '﻿A;B\r\n"x;y";\'=SUMA(1)\r\n5;t1 t2');
});
