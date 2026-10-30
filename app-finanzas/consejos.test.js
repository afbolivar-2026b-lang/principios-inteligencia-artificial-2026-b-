const test = require("node:test");
const assert = require("node:assert");
const C = require("./consejos.js");

const ahora = new Date(2026, 9, 20, 12);
const rango = { desde: new Date(2026, 9, 1), hasta: new Date(2026, 10, 1) };
const g = (d, monto, desc, cat, h) => ({ id: Math.random(), tipo: "gasto", fecha: new Date(2026, 9, d, h || 10).toISOString(), monto, descripcion: desc, categoria_id: cat || 1 });
const ing = (d, monto) => ({ id: Math.random(), tipo: "ingreso", fecha: new Date(2026, 9, d, 9).toISOString(), monto, descripcion: "Sueldo", categoria_id: 9 });

test("consejos del periodo", () => {
  const movs = [ing(1, 3000000), g(2, 15000, "tinto"), g(3, 12000, "tinto"), g(5, 10000, "tinto"), g(6, 8000, "tinto"), g(7, 9000, "tinto"), g(8, 500000, "arriendo", 2), g(10, 120000, "mercado", 3, 20)];
  const ant = [g(2, 400000, "arriendo", 2), g(3, 50000, "mercado", 3)];
  const c = C.consejos(movs, ant, movs.concat(ant), { rango, ahora, saldo: 2000000, categorias: [{ id: 2, nombre: "Vivienda" }, { id: 3, nombre: "Comida" }] });
  const ids = c.map((x) => x.id);
  ["promedio", "dia", "mayor", "hormiga", "vs", "ahorro", "meta10", "alcanza", "repite", "hora", "sin"].forEach((i) => assert.ok(ids.includes(i), i));
  assert.ok(c.find((x) => x.id === "mayor").texto.includes("arriendo"));
  assert.ok(c.find((x) => x.id === "vs").texto.includes("más"));
  assert.deepStrictEqual(C.consejos([], [], [], { rango, ahora }), []);
});

test("gasto inusual", () => {
  const todos = [g(1, 20000), g(2, 25000), g(3, 22000), g(4, 18000)];
  assert.ok(C.gastoInusual({ id: 99, tipo: "gasto", monto: 150000, categoria_id: 1 }, todos));
  assert.strictEqual(C.gastoInusual({ id: 99, tipo: "gasto", monto: 30000, categoria_id: 1 }, todos), null);
  assert.strictEqual(C.gastoInusual({ id: 99, tipo: "gasto", monto: 150000, categoria_id: 7 }, todos), null);
});

test("tu semana frente a la pasada", () => {
  const s = C.semana([g(19, 100000), g(20, 50000), g(12, 100000)], new Date(2026, 9, 21, 12));   // martes
  assert.strictEqual(s.gastos, 150000);
  assert.strictEqual(s.anterior, 100000);
  assert.strictEqual(s.cambio, 50);
});

test("logros", () => {
  const l = C.logros({ movimientos: [g(1, 1000)], racha: 7, metas: [{ objetivo: 100, ahorrado: 100 }], deudasPagadas: 0, grupos: 1 });
  const hecho = (id) => l.find((x) => x.id === id).hecho;
  assert.ok(hecho("primero") && hecho("racha7") && hecho("meta") && hecho("grupo"));
  assert.ok(!hecho("cien") && !hecho("deuda") && !hecho("foto"));
});

test("calculadoras", () => {
  const c = C.cuotaCredito(10000000, 1.5, 24);
  assert.ok(c.cuota > 490000 && c.cuota < 505000);
  assert.strictEqual(C.cuotaCredito(1200, 0, 12).cuota, 100);
  assert.strictEqual(C.cuotaCredito(0, 1, 12), null);
  const a = C.ahorroFuturo(100000, 12, 0, 0);
  assert.strictEqual(a.total, 1200000);
  assert.ok(C.ahorroFuturo(100000, 12, 1, 0).ganado > 0);
  assert.deepStrictEqual(C.regla503020(2000000), { necesidades: 1000000, gustos: 600000, ahorro: 400000 });
});

test("calendario de gastos", () => {
  const cal = C.calendario([g(2, 1000), g(2, 500), g(5, 3000)], rango);
  assert.strictEqual(cal.dias.length, 31);
  assert.strictEqual(cal.max, 3000);
  assert.strictEqual(cal.dias[1].valor, 1500);
});

test("salud financiera", () => {
  const buena = C.salud({ ingresos: 3000000, gastos: 2000000, saldo: 9000000, gastoMensual: 2000000, deudaPendiente: 0 });
  assert.ok(buena.puntaje >= 90 && buena.nivel === "Excelente");
  const mala = C.salud({ ingresos: 1000000, gastos: 1200000, saldo: 0, gastoMensual: 1200000, deudaPendiente: 4000000 });
  assert.ok(mala.puntaje < 20 && mala.nivel === "Para mejorar");
  assert.ok(C.salud({ ingresos: 0, gastos: 0, saldo: 0, gastoMensual: 0, deudaPendiente: 0 }).puntaje >= 0);
});

test("gasto mensual promedio y mejor/peor mes", () => {
  const f = (m, d, monto, tipo) => ({ tipo: tipo || "gasto", fecha: new Date(2026, m, d, 10).toISOString(), monto });
  const todos = [f(6, 3, 1000000), f(7, 3, 2000000), f(8, 3, 3000000), f(9, 3, 500000), f(7, 1, 4000000, "ingreso")];
  assert.strictEqual(C.gastoMensualPromedio(todos, new Date(2026, 9, 20)), 2000000);   // jul, ago, sep (oct no cuenta)
  const mp = C.mejorPeorMes(todos);
  assert.ok(mp.mejor.mes.startsWith("agosto") && mp.peor.mes.startsWith("septiembre"));
  assert.strictEqual(C.mejorPeorMes([f(9, 1, 100)]), null);
});

test("IVA, propina y hábitos", () => {
  assert.deepStrictEqual(C.iva(100000, 19, "mas"), { base: 100000, iva: 19000, total: 119000 });
  assert.deepStrictEqual(C.iva(119000, 19, "menos"), { base: 100000, iva: 19000, total: 119000 });
  assert.deepStrictEqual(C.dividirCuenta(200000, 4, 10), { propina: 20000, total: 220000, porPersona: 55000 });
  assert.strictEqual(C.dividirCuenta(100, 0, 10), null);
  assert.deepStrictEqual(C.costoHabito(5000, 5), { semana: 25000, mes: 108333, anio: 1300000 });
});

test("contado vs cuotas, CDT, prima y deudas", () => {
  const sin = C.contadoVsCuotas(1200000, 12, 100000);
  assert.strictEqual(sin.conInteres, false);
  const con = C.contadoVsCuotas(1000000, 12, 100000);
  assert.ok(con.conInteres && con.extra === 200000 && con.tasaMensualPct > 2 && con.tasaMensualPct < 3.5);
  assert.strictEqual(C.cdt(1000000, 12, 12).ganancia, 120000);
  const p = C.primaCesantias(2000000, 0, 360);
  assert.deepStrictEqual(p, { prima: 1000000, cesantias: 2000000, intereses: 240000 });
  const d = C.salirDeDeuda(1000000, 0, 100000);
  assert.strictEqual(d.meses, 10);
  assert.ok(C.salirDeDeuda(1000000, 2, 10000).imposible);
  assert.ok(C.salirDeDeuda(1000000, 2, 100000).total > 1000000);
});

test("reto de 52 semanas", () => {
  const r = C.reto52(1000, [1, 2, 3]);
  assert.strictEqual(r.total, 1378000);
  assert.strictEqual(r.ahorrado, 6000);
  assert.strictEqual(r.semanas.length, 52);
});

test("suscripciones detectadas", () => {
  const ahora = new Date(2026, 9, 20);
  const f = (m, d, monto, desc) => ({ tipo: "gasto", fecha: new Date(2026, m, d, 10).toISOString(), monto, descripcion: desc });
  const todos = [f(7, 5, 26900, "Netflix"), f(8, 5, 26900, "Netflix"), f(9, 5, 27500, "Netflix"), f(8, 2, 20000, "Taxi"), f(9, 3, 90000, "Taxi"), f(7, 1, 1000, "tinto"), f(8, 1, 1000, "tinto"), f(9, 1, 1000, "tinto")];
  const s = C.suscripciones(todos, ahora);
  assert.deepStrictEqual(s.lista.map((x) => x.nombre), ["Netflix"]);
  assert.strictEqual(s.mensual, 27500);
  assert.strictEqual(s.lista[0].anual, 330000);
});

test("inflación personal", () => {
  const f = (m, d, monto) => ({ tipo: "gasto", fecha: new Date(2026, m, d, 10).toISOString(), monto, descripcion: "Café" });
  const r = C.inflacionPersonal([f(0, 1, 3000), f(2, 1, 3000), f(6, 1, 3600), f(8, 1, 3600)]);
  assert.strictEqual(r.lista[0].cambioPct, 20);
  assert.strictEqual(r.general, 20);
  assert.strictEqual(C.inflacionPersonal([f(0, 1, 3000), f(0, 5, 3300)]).general, null);
});

test("comparar meses y costo de un evento", () => {
  const f = (m, d, monto, cat, et) => ({ tipo: "gasto", fecha: new Date(2026, m, d, 10).toISOString(), monto, categoria_id: cat, etiquetas: et || [] });
  const todos = [f(8, 2, 100, 1), f(8, 3, 50, 2), f(9, 2, 300, 1), f(9, 9, 20, 3, ["viaje"]), f(9, 10, 80, 3, ["viaje"])];
  const cmp = C.compararMeses(todos, 8 + 2026 * 12, 9 + 2026 * 12);
  assert.strictEqual(cmp.totalA, 150); assert.strictEqual(cmp.totalB, 400); assert.strictEqual(cmp.filas[0].categoria_id, 1);
  assert.strictEqual(C.mesesConDatos(todos).length, 2);
  const ev = C.costoEvento(todos, "viaje");
  assert.strictEqual(ev.total, 100); assert.strictEqual(ev.cantidad, 2);
  assert.strictEqual(C.costoEvento(todos, "nada"), null);
  assert.deepStrictEqual(C.etiquetasUsadas(todos), ["viaje"]);
});

test("importar CSV", () => {
  const csv = "Fecha;Descripción;Monto;Tipo\n2026-10-01;Mercado;120.000;gasto\n05/10/2026;Sueldo;\"2.000.000\";ingreso\n2026-10-03;Taxi;-15000,50;\nmala;x;y;z\n";
  const r = C.importarCSV(csv);
  assert.strictEqual(r.filas.length, 3);
  assert.strictEqual(r.errores.length, 1);
  assert.deepStrictEqual(r.filas.map((x) => [x.descripcion, x.monto, x.tipo]), [["Mercado", 120000, "gasto"], ["Sueldo", 2000000, "ingreso"], ["Taxi", 15000.5, "gasto"]]);
  assert.strictEqual(new Date(r.filas[1].fecha).getDate(), 5);
  const sinTipo = C.importarCSV("fecha,detalle,valor\n2026-10-01,Almuerzo,-20000\n2026-10-02,Pago,50000");
  assert.deepStrictEqual(sinTipo.filas.map((x) => x.tipo), ["gasto", "ingreso"]);
  assert.ok(C.importarCSV("a,b\n1,2").errores[0].includes("columnas"));
});
