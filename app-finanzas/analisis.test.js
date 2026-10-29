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

// ---------- Modo conductor ----------
const CATS = A.CATEGORIAS_CONDUCTOR.map((c, i) => Object.assign({ id: i + 1 }, c));
const id = (n) => CATS.find((c) => c.nombre === n).id;
const mv = (dia, mes, tipo, monto, cat, extra) => Object.assign({ fecha: new Date(2026, mes, dia, 12).toISOString(), tipo, monto, categoria_id: id(cat) }, extra);

test("categorías del conductor traen su grupo", () => {
  assert.ok(A.esGanancia(CATS.find((c) => c.nombre === "Didi")));
  assert.ok(!A.esGanancia(CATS.find((c) => c.nombre === "Gasolina")));
  assert.ok(A.esGastoTrabajo(CATS.find((c) => c.nombre === "Tecnomecánica")));
  assert.ok(!A.esGastoTrabajo(null));
  assert.ok(A.GRUPOS.ingreso.includes("Apps de transporte") && A.GRUPOS.gasto.includes("Trabajo con vehículo"));
  assert.strictEqual(new Set(CATS.map((c) => c.nombre)).size, CATS.length);
});

test("resumen del trabajo: ganado, gastado, neto, viajes y por plataforma", () => {
  const movs = [
    mv(29, 9, "ingreso", 80000, "Didi", { viajes: 6 }), mv(29, 9, "ingreso", 50000, "Uber", { viajes: 3 }), mv(29, 9, "ingreso", 20000, "Didi", { viajes: 2 }),
    mv(29, 9, "gasto", 30000, "Gasolina"), mv(29, 9, "gasto", 3000, "Tinto y comida en ruta"),
    mv(29, 9, "gasto", 9999, "Gasolina", { estado: "pendiente" }), // pendiente: no cuenta
    mv(28, 9, "ingreso", 70000, "Didi", { viajes: 5 }), // ayer
    { fecha: HOY.toISOString(), tipo: "gasto", monto: 15000, categoria_id: 999 } // categoría personal: no es del trabajo
  ];
  const hoy = A.resumenTrabajo(movs, CATS, A.rangoJornada("hoy", HOY));
  assert.deepStrictEqual([hoy.ingresos, hoy.gastos, hoy.neto, hoy.viajes], [150000, 33000, 117000, 11]);
  assert.deepStrictEqual(hoy.porPlataforma.map((p) => [p.id, p.total, p.viajes]), [[id("Didi"), 100000, 8], [id("Uber"), 50000, 3]]);
  assert.deepStrictEqual(hoy.gastosPorCategoria.map((g) => g.total), [30000, 3000]);
  assert.strictEqual(Math.round(hoy.porViaje), 13636);
  assert.deepStrictEqual([hoy.operacion, hoy.fijos, hoy.netoOperativo], [33000, 0, 117000]);
  const conSoat = A.resumenTrabajo(movs.concat([mv(29, 9, "gasto", 480000, "SOAT")]), CATS, A.rangoJornada("hoy", HOY));
  assert.deepStrictEqual([conSoat.operacion, conSoat.fijos, conSoat.netoOperativo, conSoat.neto, conSoat.gastos], [33000, 480000, 117000, -363000, 513000], "el SOAT no baja la ganancia del día");
  assert.ok(A.esFijo(CATS.find((c) => c.nombre === "Cuota del vehículo")) && !A.esFijo(CATS.find((c) => c.nombre === "Gasolina")));
  const semana = A.resumenTrabajo(movs, CATS, A.rangoJornada("semana", HOY));
  assert.strictEqual(semana.ingresos, 220000);
  assert.strictEqual(A.resumenTrabajo([], CATS, A.rangoJornada("mes", HOY)).porViaje, null);
});

test("rangos de la jornada", () => {
  const r = A.rangoJornada("semana", HOY); // jueves 29 oct 2026
  assert.strictEqual(A.claveDia(r.desde), "2026-10-26");
  assert.strictEqual(A.claveDia(r.hasta), "2026-11-02");
  assert.strictEqual(A.claveDia(A.rangoJornada("mes", HOY).hasta), "2026-11-01");
  assert.strictEqual(A.claveDia(A.rangoJornada("hoy", HOY).hasta), "2026-10-30");
});

test("vencimientos: estado, texto y renovación", () => {
  const d = (vence, extra) => Object.assign({ vence, aviso_dias: 30, repetir_meses: 12 }, extra);
  assert.deepStrictEqual(A.estadoDocumento(d("2026-11-10"), HOY), { dias: 12, estado: "pronto", texto: "Vence en 12 días" });
  assert.strictEqual(A.estadoDocumento(d("2026-10-29"), HOY).texto, "Vence hoy");
  assert.strictEqual(A.estadoDocumento(d("2026-10-30"), HOY).texto, "Vence mañana");
  assert.deepStrictEqual(A.estadoDocumento(d("2026-10-20"), HOY), { dias: -9, estado: "vencido", texto: "Venció hace 9 días" });
  assert.strictEqual(A.estadoDocumento(d("2027-03-01"), HOY).estado, "ok");
  assert.strictEqual(A.estadoDocumento(d("2026-11-20", { aviso_dias: 7 }), HOY).estado, "ok");
  assert.strictEqual(A.sumarMeses("2026-01-31", 1), "2026-02-28");
  assert.strictEqual(A.sumarMeses("2026-11-15", 3), "2027-02-15");
  assert.strictEqual(A.sumarMeses("2024-02-29", 12), "2025-02-28");
  assert.strictEqual(A.proximoVencimiento(d("2026-11-10"), HOY), "2027-11-10"); // renueva antes: cuenta desde el vencimiento
  assert.strictEqual(A.proximoVencimiento(d("2026-09-01"), HOY), "2027-10-29"); // ya vencido: cuenta desde hoy
  assert.strictEqual(A.proximoVencimiento(d("2026-11-10", { repetir_meses: 3 }), HOY), "2027-02-10");
});

test("avisos del celular", () => {
  const docs = [{ id: 1, nombre: "SOAT", vence: "2026-11-10", aviso_dias: 30 }, { id: 2, nombre: "Tecnomecánica", vence: "2026-12-31", aviso_dias: 15 }, { id: 3, nombre: "Licencia", vence: "2026-10-27", aviso_dias: 30 },
    { id: 4, nombre: "Cuota del seguro", vence: "2026-11-02", aviso_dias: 5 }];
  const a = A.avisosDocumentos(docs, HOY); // jueves 29 oct 2026, 3 p. m.
  assert.deepStrictEqual(a.filter((x) => x.docId === 1).map((x) => [x.dias, A.claveDia(x.cuando)]), [[7, "2026-11-03"], [3, "2026-11-07"], [1, "2026-11-09"], [0, "2026-11-10"]]);
  assert.deepStrictEqual(a.filter((x) => x.docId === 2).map((x) => x.dias), [15, 7, 3, 1, 0]);
  assert.deepStrictEqual(a.filter((x) => x.docId === 4).map((x) => x.dias), [3, 1, 0], "una cuota mensual avisa pocos días antes");
  assert.strictEqual(a.find((x) => x.docId === 1 && x.dias === 0).titulo, "SOAT vence hoy");
  assert.strictEqual(a.find((x) => x.docId === 2 && x.dias === 7).titulo, "Tecnomecánica vence en 7 días");
  assert.strictEqual(a.find((x) => x.docId === 1 && x.dias === 0).id, 1000);
  assert.ok(a.every((x, i) => i === 0 || a[i - 1].cuando <= x.cuando), "ordenados");
  assert.strictEqual(new Set(a.map((x) => x.id)).size, a.length, "ids únicos");
  // Vencido: un aviso por día durante una semana, empezando mañana.
  const vencido = a.filter((x) => x.docId === 3);
  assert.strictEqual(vencido.length, 6);
  assert.deepStrictEqual(vencido.slice(0, 2).map((x) => [A.claveDia(x.cuando), x.dias]), [["2026-10-30", -3], ["2026-10-31", -4]]);
  assert.strictEqual(vencido[0].titulo, "Licencia está vencido");
  assert.ok(/Venció hace 3 días/.test(vencido[0].texto));
});

test("avisos por defecto y presets de documentos", () => {
  assert.deepStrictEqual([1, 3, 6, 12, 36].map(A.avisoPorDefecto), [5, 15, 30, 30, 30]);
  assert.strictEqual(A.presetDe({ tipo: "seguro", nombre: "Seguro de la moto (cuota mensual)" }).meses, 1);
  assert.strictEqual(A.presetDe({ tipo: "seguro", nombre: "Otro nombre" }).clave, "seguro-mensual");
  assert.strictEqual(A.presetDe({ tipo: "soat", nombre: "Mi SOAT" }).categoria, "SOAT");
  assert.ok(A.DOCUMENTOS.every((d) => A.CATEGORIAS_CONDUCTOR.some((c) => c.nombre === d.categoria) || d.categoria === "Multas" || d.categoria === "Mantenimiento y arreglos"));
  assert.strictEqual(new Set(A.DOCUMENTOS.map((d) => d.clave)).size, A.DOCUMENTOS.length);
});
