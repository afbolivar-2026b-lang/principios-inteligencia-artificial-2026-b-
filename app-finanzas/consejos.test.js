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
