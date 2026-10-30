const test = require("node:test");
const assert = require("node:assert");
const M = require("./monedas.js");

const TASAS = { USD: 1, COP: 3900, EUR: 0.92, CAD: 1.36, JPY: 150 };

test("tasa a pesos según tasas con base en USD", () => {
  assert.strictEqual(M.tasaACOP("COP", TASAS), 1);
  assert.strictEqual(M.tasaACOP("USD", TASAS), 3900);
  assert.strictEqual(Math.round(M.tasaACOP("EUR", TASAS)), 4239);
  assert.strictEqual(M.tasaACOP("JPY", TASAS), 26);
  assert.strictEqual(M.tasaACOP("XXX", TASAS), null);
  assert.strictEqual(M.tasaACOP("USD", null), null);
  assert.strictEqual(M.tasaACOP("USD", { USD: 1 }), null);
});

test("convertir a pesos redondeando", () => {
  assert.strictEqual(M.aCOP(50, 3900), 195000);
  assert.strictEqual(M.aCOP(19.99, 3900.5), 77971);
});

test("leer tasas escritas", () => {
  assert.strictEqual(M.leerTasa("3.900"), 3900);
  assert.strictEqual(M.leerTasa("3900,50"), 3900.5);
  assert.strictEqual(M.leerTasa("1.234.567,5"), 1234567.5);
  assert.strictEqual(M.leerTasa("0,00025"), 0.00025);
  assert.strictEqual(M.leerTasa("4 100"), 4100);
  assert.ok(isNaN(M.leerTasa("")));
  assert.ok(isNaN(M.leerTasa("abc")));
  assert.ok(isNaN(M.leerTasa("-5")));
});

test("buscar monedas sin tildes ni mayúsculas", () => {
  assert.strictEqual(M.buscar("")[0].codigo, "COP");
  assert.deepStrictEqual(M.buscar("dolar").map((m) => m.codigo).slice(0, 3), ["USD", "CAD", "AUD"]);
  assert.deepStrictEqual(M.buscar("eur").map((m) => m.codigo), ["EUR"]);
  assert.deepStrictEqual(M.buscar("mexic").map((m) => m.codigo), ["MXN"]);
  assert.strictEqual(M.info("USD").bandera, "🇺🇸");
  assert.strictEqual(M.info("ZZZ").nombre, "ZZZ");
});

test("formatos", () => {
  assert.strictEqual(M.formatoTasa(3900), "3.900");
  assert.strictEqual(M.formatoTasa(1.3612), "1,36");
  assert.strictEqual(M.formatoTasa(0.000256), "0,000256");
  assert.ok(/50/.test(M.formatoMonto(50, "USD")));
  assert.ok(/EUR|€/.test(M.formatoMonto(50, "EUR")));
  assert.strictEqual(M.formatoMonto(5, "AB"), "AB 5");
});

test("lista completa de monedas del mundo", () => {
  assert.ok(M.MONEDAS.length >= 150);
  const codigos = M.MONEDAS.map((m) => m[0]);
  assert.strictEqual(new Set(codigos).size, codigos.length);              // sin repetidas
  ["COP", "USD", "EUR", "JPY", "XOF", "VND", "AED", "ZAR", "KRW", "NGN"].forEach((c) => assert.ok(codigos.includes(c), c));
  assert.ok(M.buscar("yen").some((m) => m.codigo === "JPY"));
  assert.ok(M.buscar("franco").length >= 4);
  assert.strictEqual(M.info("JPY").bandera, "🇯🇵");
  M.MONEDAS.forEach((m) => assert.ok(m[1] && m[2], m[0]));                 // todas con nombre y bandera
});

test("leer tasas mientras se escriben (el punto es de miles)", () => {
  assert.strictEqual(M.leerTasa("3.9000"), 39000);
  assert.strictEqual(M.leerTasa("3900"), 3900);
});
