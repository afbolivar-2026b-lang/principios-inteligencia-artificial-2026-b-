// Ejecutar con: node --test app-finanzas/parser.test.js
const test = require("node:test");
const assert = require("node:assert");
const { interpretar } = require("./parser.js");

const AHORA = "2026-10-29T15:00:00.000Z";
const casos = [
  ["gasté 20 mil en almuerzo", { tipo: "gasto", monto: 20000, categoria: "Comida", descripcion: "Almuerzo" }],
  ["uber 15k", { tipo: "gasto", monto: 15000, categoria: "Transporte", descripcion: "Uber" }],
  ["pagué el arriendo 850.000", { tipo: "gasto", monto: 850000, categoria: "Hogar" }],
  ["me pagaron 2 millones de salario", { tipo: "ingreso", monto: 2000000, categoria: "Salario" }],
  ["netflix $26.900", { tipo: "gasto", monto: 26900, categoria: "Suscripciones" }],
  ["1,5 millones prima", { tipo: "ingreso", monto: 1500000, categoria: "Salario" }],
  ["cine con amigos 30 lucas", { tipo: "gasto", monto: 30000, categoria: "Entretenimiento" }],
  ["vendí la bici en 2 palos", { tipo: "ingreso", monto: 2000000, categoria: "Otros ingresos" }],
  ["2 millones 500 mil matrícula", { tipo: "gasto", monto: 2500000, categoria: "Educación" }],
  ["algo raro 7000", { tipo: "gasto", monto: 7000, categoria: "Otros gastos", descripcion: "Algo raro" }],
];

for (const [frase, esperado] of casos) {
  test(frase, () => {
    const r = interpretar(frase, AHORA);
    assert.ok(r.ok, r.error);
    for (const k of Object.keys(esperado)) assert.strictEqual(r[k], esperado[k], k);
  });
}

test("ayer resta un día", () => {
  const r = interpretar("ayer gasté 10 mil en tinto", AHORA);
  assert.strictEqual(r.fecha.slice(0, 10), "2026-10-28");
  assert.strictEqual(r.categoria, "Comida");
});

test("sin valor da error claro", () => {
  const r = interpretar("almuerzo", AHORA);
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /valor/);
});

test("vacío da error", () => {
  assert.strictEqual(interpretar("   ", AHORA).ok, false);
});
