// Monedas y cambio a pesos colombianos (COP). Funciona en el navegador (window.NovaMonedas)
// y en Node (require) para las pruebas.
(function (raiz) {
  "use strict";

  // [código, nombre, bandera]. La primera es la moneda de la app.
  var MONEDAS = [
    ["COP", "Peso Colombiano", "🇨🇴"], ["USD", "Dólar Estadounidense", "🇺🇸"], ["EUR", "Euro", "🇪🇺"],
    ["CAD", "Dólar Canadiense", "🇨🇦"], ["MXN", "Peso Mexicano", "🇲🇽"], ["BRL", "Real Brasileño", "🇧🇷"],
    ["ARS", "Peso Argentino", "🇦🇷"], ["CLP", "Peso Chileno", "🇨🇱"], ["PEN", "Sol Peruano", "🇵🇪"],
    ["GBP", "Libra Esterlina", "🇬🇧"], ["CHF", "Franco Suizo", "🇨🇭"], ["JPY", "Yen Japonés", "🇯🇵"],
    ["CNY", "Yuan Chino", "🇨🇳"], ["AUD", "Dólar Australiano", "🇦🇺"], ["NZD", "Dólar Neozelandés", "🇳🇿"],
    ["VES", "Bolívar Venezolano", "🇻🇪"], ["UYU", "Peso Uruguayo", "🇺🇾"], ["BOB", "Boliviano", "🇧🇴"],
    ["PYG", "Guaraní Paraguayo", "🇵🇾"], ["DOP", "Peso Dominicano", "🇩🇴"], ["CRC", "Colón Costarricense", "🇨🇷"],
    ["PAB", "Balboa Panameño", "🇵🇦"], ["GTQ", "Quetzal Guatemalteco", "🇬🇹"], ["HNL", "Lempira Hondureño", "🇭🇳"],
    ["NIO", "Córdoba Nicaragüense", "🇳🇮"], ["CUP", "Peso Cubano", "🇨🇺"], ["SEK", "Corona Sueca", "🇸🇪"],
    ["NOK", "Corona Noruega", "🇳🇴"], ["DKK", "Corona Danesa", "🇩🇰"], ["PLN", "Esloti Polaco", "🇵🇱"],
    ["TRY", "Lira Turca", "🇹🇷"], ["INR", "Rupia India", "🇮🇳"], ["KRW", "Won Surcoreano", "🇰🇷"],
    ["AED", "Dírham de EAU", "🇦🇪"], ["ILS", "Nuevo Séquel", "🇮🇱"], ["ZAR", "Rand Sudafricano", "🇿🇦"]
  ];
  var BASE = "COP";

  function sinTildes(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function info(codigo) {
    for (var i = 0; i < MONEDAS.length; i++) if (MONEDAS[i][0] === codigo) return { codigo: codigo, nombre: MONEDAS[i][1], bandera: MONEDAS[i][2] };
    return { codigo: codigo, nombre: codigo, bandera: "🏳️" };
  }
  function buscar(texto) {
    var q = sinTildes(texto);
    return MONEDAS.filter(function (m) { return !q || sinTildes(m[0] + " " + m[1]).indexOf(q) >= 0; })
      .map(function (m) { return { codigo: m[0], nombre: m[1], bandera: m[2] }; });
  }

  // Cuántos pesos vale 1 unidad de la moneda, según una tabla de tasas con base en USD
  // (como la que entrega open.er-api.com: { USD: 1, COP: 3900, EUR: 0.9, … }). null si falta.
  function tasaACOP(codigo, tasas) {
    if (codigo === BASE) return 1;
    if (!tasas) return null;
    var de = Number(tasas[codigo]), a = Number(tasas[BASE]);
    return de > 0 && a > 0 ? a / de : null;
  }

  // Pesos (redondeados) que valen "monto" unidades de la moneda con esa tasa.
  function aCOP(monto, tasa) { return Math.round(Number(monto) * Number(tasa)); }

  // La tasa se muestra con pocos decimales si es grande y más si es pequeña (1 COP en USD).
  function formatoTasa(t) {
    var n = Number(t);
    if (!(n > 0)) return "";
    return new Intl.NumberFormat("es-CO", { maximumFractionDigits: n >= 100 ? 0 : n >= 1 ? 2 : 6 }).format(n);
  }
  // Lee una tasa escrita por la persona: "3.900", "3900,50", "3 900".
  function leerTasa(texto) {
    var s = String(texto || "").replace(/\s/g, "");
    if (!s) return NaN;
    if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    var n = Number(s);
    return n > 0 && isFinite(n) ? n : NaN;
  }
  function formatoMonto(monto, codigo) {
    var n = Number(monto);
    try { return new Intl.NumberFormat("es-CO", { style: "currency", currency: codigo, maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2 }).format(n); }
    catch (e) { return codigo + " " + n; }
  }

  var api = { MONEDAS: MONEDAS, BASE: BASE, info: info, buscar: buscar, tasaACOP: tasaACOP, aCOP: aCOP, formatoTasa: formatoTasa, leerTasa: leerTasa, formatoMonto: formatoMonto };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaMonedas = api;
})(typeof window !== "undefined" ? window : this);
