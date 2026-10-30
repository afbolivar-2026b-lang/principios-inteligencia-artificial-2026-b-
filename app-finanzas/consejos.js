// Consejos, logros y calculadoras de NOVA. Todo se calcula en el dispositivo con tus propios movimientos.
(function (raiz) {
  "use strict";

  function num(v) { return Number(v) || 0; }
  function plata(n) { return "$ " + String(Math.round(Math.abs(num(n)))).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function dia(f) { var x = new Date(f); x.setHours(0, 0, 0, 0); return x; }
  function clave(f) { var x = new Date(f); return x.getFullYear() + "-" + (x.getMonth() + 1) + "-" + x.getDate(); }
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  function gastos(movs) { return movs.filter(function (m) { return m.tipo === "gasto"; }); }
  function suma(l) { return l.reduce(function (s, m) { return s + num(m.monto); }, 0); }
  function enRango(movs, r) { return movs.filter(function (m) { var f = new Date(m.fecha); return f >= r.desde && f < r.hasta; }); }

  // Consejos del periodo. movs: movimientos del periodo; ant: del periodo anterior; todos: todos los movimientos.
  // ctx: { rango, ahora, saldo, categorias (para nombres) }
  function consejos(movs, ant, todos, ctx) {
    var out = [], ahora = new Date(ctx.ahora || new Date()), g = gastos(movs), ing = movs.filter(function (m) { return m.tipo === "ingreso"; });
    var totalG = suma(g), totalI = suma(ing), r = ctx.rango;
    var nombreCat = function (id) { var c = (ctx.categorias || []).filter(function (x) { return x.id === id; })[0]; return c ? c.nombre : "Sin categoría"; };
    if (!g.length) return out;

    // 1. Promedio por día
    var DIA = 86400000, fin = ahora < r.hasta ? ahora : r.hasta, transcurridos = Math.max(1, Math.ceil((fin - r.desde) / DIA));
    out.push({ id: "promedio", icono: "📊", titulo: "Gasto promedio por día", texto: "Gastas en promedio " + plata(totalG / transcurridos) + " al día." });

    // 2. Día de la semana más fuerte
    var porDia = [0, 0, 0, 0, 0, 0, 0];
    g.forEach(function (m) { porDia[new Date(m.fecha).getDay()] += num(m.monto); });
    var d = porDia.indexOf(Math.max.apply(null, porDia));
    out.push({ id: "dia", icono: "📅", titulo: "Tu día de más gasto", texto: "Gastas más los " + DIAS[d] + " (" + plata(porDia[d]) + " en total)." });

    // 3. Mayor gasto
    var may = g.slice().sort(function (a, b) { return num(b.monto) - num(a.monto); })[0];
    out.push({ id: "mayor", icono: "🏆", titulo: "Tu mayor gasto", texto: "«" + may.descripcion + "» por " + plata(may.monto) + "." });

    // 4. Gastos hormiga (compras chicas que se repiten)
    var chicos = g.filter(function (m) { return num(m.monto) <= 20000; });
    if (chicos.length >= 5) out.push({ id: "hormiga", icono: "🐜", titulo: "Gastos hormiga", texto: chicos.length + " compras pequeñas (hasta $ 20.000) suman " + plata(suma(chicos)) + ". Ojo: lo pequeño también pesa." });

    // 5. Comparación con el periodo anterior
    var gAnt = suma(gastos(ant));
    if (gAnt > 0) {
      var cambio = Math.round(((totalG - gAnt) / gAnt) * 100);
      out.push({ id: "vs", icono: cambio > 0 ? "📈" : "📉", titulo: "Frente al periodo anterior", texto: cambio === 0 ? "Gastaste lo mismo que el periodo anterior." : "Gastaste " + Math.abs(cambio) + " % " + (cambio > 0 ? "más" : "menos") + " que el periodo anterior (" + plata(gAnt) + ")." });
    }

    // 6. Tasa de ahorro
    if (totalI > 0) {
      var tasa = Math.round(((totalI - totalG) / totalI) * 100);
      out.push({ id: "ahorro", icono: "🐷", titulo: "Tu tasa de ahorro", texto: tasa >= 20 ? "Ahorraste el " + tasa + " % de tus ingresos. ¡Excelente!" : tasa >= 0 ? "Ahorraste el " + tasa + " % de tus ingresos. Una buena meta es el 20 %." : "Gastaste " + Math.abs(tasa) + " % más de lo que ingresó. Revisa tus gastos grandes." });
      // 12. Meta de ahorro sugerida
      out.push({ id: "meta10", icono: "🎯", titulo: "Una meta fácil", texto: "Si apartas el 10 % de tus ingresos, ahorrarías " + plata(totalI * 0.1) + " en este periodo." });
    }

    // 7. Cuántos días alcanza el saldo
    var ritmo = totalG / transcurridos;
    if (ctx.saldo > 0 && ritmo > 0) out.push({ id: "alcanza", icono: "⏳", titulo: "¿Cuánto te alcanza?", texto: "Con tu saldo de " + plata(ctx.saldo) + " y este ritmo de gasto te alcanza para unos " + Math.floor(ctx.saldo / ritmo) + " días." });

    // 8. Lo que más repites
    var cuenta = {};
    g.forEach(function (m) { var k = String(m.descripcion || "").trim().toLowerCase(); if (k) cuenta[k] = (cuenta[k] || 0) + 1; });
    var top = Object.keys(cuenta).sort(function (a, b) { return cuenta[b] - cuenta[a]; })[0];
    if (top && cuenta[top] >= 3) out.push({ id: "repite", icono: "🔁", titulo: "Lo que más repites", texto: "«" + top + "» aparece " + cuenta[top] + " veces en este periodo." });

    // 9. Hora fuerte
    var franjas = { "la madrugada": 0, "la mañana": 0, "la tarde": 0, "la noche": 0 };
    g.forEach(function (m) { var h = new Date(m.fecha).getHours(); franjas[h < 6 ? "la madrugada" : h < 12 ? "la mañana" : h < 19 ? "la tarde" : "la noche"] += num(m.monto); });
    var fz = Object.keys(franjas).sort(function (a, b) { return franjas[b] - franjas[a]; })[0];
    if (g.length >= 5) out.push({ id: "hora", icono: "🕒", titulo: "Cuándo gastas más", texto: "Sueles gastar más en " + fz + "." });

    // 10. Categoría que más creció
    var gAntLista = gastos(ant), mejor = null;
    var porCat = function (l) { var o = {}; l.forEach(function (m) { o[m.categoria_id] = (o[m.categoria_id] || 0) + num(m.monto); }); return o; };
    var actual = porCat(g), previa = porCat(gAntLista);
    Object.keys(actual).forEach(function (k) {
      if (previa[k] > 0 && actual[k] - previa[k] >= 20000) { var c = (actual[k] - previa[k]) / previa[k]; if (!mejor || c > mejor.c) mejor = { k: k, c: c }; }
    });
    if (mejor && mejor.c >= 0.2) out.push({ id: "crece", icono: "🔺", titulo: "Lo que más subió", texto: nombreCat(Number(mejor.k)) + " subió " + Math.round(mejor.c * 100) + " % frente al periodo anterior." });

    // 11. Días sin gastar
    var conGasto = {}; g.forEach(function (m) { conGasto[clave(m.fecha)] = true; });
    var sin = 0;
    for (var t = new Date(r.desde); t <= fin && t < r.hasta; t.setDate(t.getDate() + 1)) if (!conGasto[clave(t)]) sin++;
    if (sin >= 2) out.push({ id: "sin", icono: "🧘", titulo: "Días sin gastar", texto: "Llevas " + sin + " días sin gastos en este periodo." });

    // 13. Gastos fijos detectados (se repiten en 2 o más meses con valor parecido)
    var meses = {};
    gastos(todos).forEach(function (m) { var k = String(m.descripcion || "").trim().toLowerCase(), f = new Date(m.fecha); if (!k) return; (meses[k] = meses[k] || {})[f.getFullYear() * 12 + f.getMonth()] = num(m.monto); });
    var fijos = Object.keys(meses).filter(function (k) {
      var v = Object.keys(meses[k]).map(function (x) { return meses[k][x]; });
      return v.length >= 2 && v.every(function (x) { return Math.abs(x - v[0]) <= v[0] * 0.1 && x >= 20000; });
    });
    if (fijos.length) out.push({ id: "fijos", icono: "📌", titulo: "Gastos fijos que detecté", texto: fijos.slice(0, 4).map(function (k) { return k; }).join(", ") + (fijos.length > 4 ? " y más" : "") + ": se repiten cada mes con valor parecido." });

    // 14. Concentración
    var mayorCat = Object.keys(actual).sort(function (a, b) { return actual[b] - actual[a]; })[0];
    if (mayorCat && totalG > 0 && actual[mayorCat] / totalG >= 0.35) out.push({ id: "concentra", icono: "🥧", titulo: "Dónde se va tu plata", texto: Math.round((actual[mayorCat] / totalG) * 100) + " % de tus gastos va a «" + nombreCat(Number(mayorCat)) + "»." });

    return out;
  }

  // ¿Este gasto se sale de lo normal en su categoría? (más de 3 veces el promedio y al menos 50.000)
  function gastoInusual(nuevo, todos) {
    if (nuevo.tipo !== "gasto" || num(nuevo.monto) < 50000) return null;
    var mismos = gastos(todos).filter(function (m) { return m.categoria_id === nuevo.categoria_id && m.id !== nuevo.id; });
    if (mismos.length < 4) return null;
    var prom = suma(mismos) / mismos.length;
    return num(nuevo.monto) >= prom * 3 ? { promedio: prom, veces: num(nuevo.monto) / prom } : null;
  }

  // Tu semana (lunes a hoy) frente a la semana pasada.
  function semana(todos, ahora) {
    ahora = new Date(ahora || new Date());
    var lunes = dia(ahora); lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
    var pasada = new Date(lunes); pasada.setDate(pasada.getDate() - 7);
    var fin = new Date(lunes); fin.setDate(fin.getDate() + 7);
    var a = enRango(todos, { desde: lunes, hasta: fin }), b = enRango(todos, { desde: pasada, hasta: lunes });
    var gA = suma(gastos(a)), gB = suma(gastos(b));
    return { gastos: gA, ingresos: suma(a.filter(function (m) { return m.tipo === "ingreso"; })), anterior: gB, cambio: gB > 0 ? Math.round(((gA - gB) / gB) * 100) : null, movimientos: a.length };
  }

  // Logros (insignias) según tu uso.
  function logros(ctx) {
    var movs = ctx.movimientos || [], l = [];
    function add(id, icono, titulo, texto, hecho) { l.push({ id: id, icono: icono, titulo: titulo, texto: texto, hecho: !!hecho }); }
    add("primero", "🌱", "Primer paso", "Anota tu primer movimiento", movs.length >= 1);
    add("cien", "💯", "100 movimientos", "Anota 100 movimientos", movs.length >= 100);
    add("racha7", "🔥", "Una semana seguida", "Anota 7 días seguidos", ctx.racha >= 7);
    add("racha30", "🏅", "Un mes seguido", "Anota 30 días seguidos", ctx.racha >= 30);
    add("meta", "🎉", "Meta cumplida", "Completa una meta de ahorro", (ctx.metas || []).some(function (m) { return num(m.objetivo) > 0 && num(m.ahorrado) >= num(m.objetivo); }));
    add("deuda", "🕊️", "Libre de una deuda", "Paga una deuda completa", (ctx.deudasPagadas || 0) > 0);
    add("grupo", "👥", "Cuentas claras", "Crea un grupo de gastos compartidos", (ctx.grupos || 0) > 0);
    add("foto", "📷", "Con soporte", "Guarda la foto de un recibo", movs.some(function (m) { return m.foto_ruta; }));
    return l;
  }

  // Cuota fija de un crédito (sistema francés). tasa mensual en % (ej. 1.8).
  function cuotaCredito(monto, tasaMensualPct, meses) {
    var i = num(tasaMensualPct) / 100, n = Math.round(num(meses));
    if (!(monto > 0) || n < 1) return null;
    var cuota = i === 0 ? monto / n : (monto * i) / (1 - Math.pow(1 + i, -n));
    return { cuota: Math.round(cuota), total: Math.round(cuota * n), intereses: Math.round(cuota * n - monto) };
  }

  // Cuánto tendrás ahorrando una cuota mensual (con interés mensual opcional).
  function ahorroFuturo(mensual, meses, tasaMensualPct, inicial) {
    var i = num(tasaMensualPct) / 100, saldo = num(inicial);
    for (var k = 0; k < Math.round(num(meses)); k++) saldo = saldo * (1 + i) + num(mensual);
    var aportado = num(inicial) + num(mensual) * Math.round(num(meses));
    return { total: Math.round(saldo), aportado: Math.round(aportado), ganado: Math.round(saldo - aportado) };
  }

  // Regla 50/30/20: necesidades / gustos / ahorro.
  function regla503020(ingresos) { return { necesidades: Math.round(ingresos * 0.5), gustos: Math.round(ingresos * 0.3), ahorro: Math.round(ingresos * 0.2) }; }

  // Gasto por día del mes para el calendario de calor.
  function calendario(movs, rango) {
    var porDia = {};
    gastos(movs).forEach(function (m) { var k = clave(m.fecha); porDia[k] = (porDia[k] || 0) + num(m.monto); });
    var max = 0, dias = [];
    for (var t = new Date(rango.desde); t < rango.hasta; t.setDate(t.getDate() + 1)) { var v = porDia[clave(t)] || 0; if (v > max) max = v; dias.push({ fecha: new Date(t), valor: v }); }
    return { dias: dias, max: max };
  }

  var api = { consejos: consejos, gastoInusual: gastoInusual, semana: semana, logros: logros, cuotaCredito: cuotaCredito, ahorroFuturo: ahorroFuturo, regla503020: regla503020, calendario: calendario, plata: plata };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaConsejos = api;
})(typeof window !== "undefined" ? window : this);
