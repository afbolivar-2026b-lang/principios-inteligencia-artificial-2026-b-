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

  // ---------- Salud financiera y calculadoras extra ----------
  function mesDe(f) { var x = new Date(f); return x.getFullYear() * 12 + x.getMonth(); }
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function nombreMes(k) { return MESES[k % 12] + " " + Math.floor(k / 12); }

  // Promedio mensual de gasto en los últimos meses completos con datos (hasta 3).
  function gastoMensualPromedio(todos, ahora) {
    var actual = mesDe(ahora || new Date()), por = {};
    gastos(todos).forEach(function (m) { var k = mesDe(m.fecha); if (k < actual && k >= actual - 3) por[k] = (por[k] || 0) + num(m.monto); });
    var v = Object.keys(por).map(function (k) { return por[k]; });
    return v.length ? v.reduce(function (s, x) { return s + x; }, 0) / v.length : 0;
  }

  // Mejor y peor mes (por lo que sobra: ingresos menos gastos). Necesita al menos 2 meses con movimientos.
  function mejorPeorMes(todos) {
    var por = {};
    todos.forEach(function (m) { var k = mesDe(m.fecha); por[k] = (por[k] || 0) + (m.tipo === "ingreso" ? num(m.monto) : -num(m.monto)); });
    var ks = Object.keys(por).map(Number);
    if (ks.length < 2) return null;
    ks.sort(function (a, b) { return por[b] - por[a]; });
    return { mejor: { mes: nombreMes(ks[0]), neto: por[ks[0]] }, peor: { mes: nombreMes(ks[ks.length - 1]), neto: por[ks[ks.length - 1]] } };
  }

  // Salud financiera de 0 a 100: ahorro (40), fondo de emergencia (30) y deudas (30).
  // ctx: { ingresos, gastos (del periodo), saldo, gastoMensual, deudaPendiente }
  function salud(ctx) {
    var ing = num(ctx.ingresos), gas = num(ctx.gastos);
    var tasa = ing > 0 ? (ing - gas) / ing : null;
    var puntosAhorro = tasa == null ? 0 : Math.max(0, Math.min(1, tasa / 0.2)) * 40;
    var fondo = num(ctx.gastoMensual) > 0 ? Math.max(0, num(ctx.saldo)) / num(ctx.gastoMensual) : null;
    var puntosFondo = fondo == null ? 0 : Math.min(1, fondo / 3) * 30;
    var ratio = ing > 0 ? num(ctx.deudaPendiente) / ing : null;
    var puntosDeuda = num(ctx.deudaPendiente) === 0 ? 30 : ratio == null ? 0 : Math.max(0, 1 - ratio / 3) * 30;
    var puntaje = Math.round(puntosAhorro + puntosFondo + puntosDeuda);
    var nivel = puntaje >= 80 ? "Excelente" : puntaje >= 60 ? "Buena" : puntaje >= 40 ? "Regular" : "Para mejorar";
    var consejo = tasa != null && tasa < 0.1 ? "Lo que más te ayudaría: gastar un poco menos de lo que ingresa." : fondo != null && fondo < 3 ? "Lo que más te ayudaría: armar un fondo de emergencia de 3 meses de gastos." : num(ctx.deudaPendiente) > 0 ? "Lo que más te ayudaría: bajar tus deudas." : "¡Vas muy bien! Sigue así.";
    return { puntaje: puntaje, nivel: nivel, tasaAhorro: tasa, fondoMeses: fondo, ratioDeuda: ratio, consejo: consejo };
  }

  // IVA: de un valor sin IVA a con IVA (modo "mas") o al revés (modo "menos").
  function iva(valor, pct, modo) {
    var p = num(pct) / 100, v = num(valor);
    if (!(v > 0)) return null;
    if (modo === "menos") { var base = v / (1 + p); return { base: Math.round(base), iva: Math.round(v - base), total: Math.round(v) }; }
    return { base: Math.round(v), iva: Math.round(v * p), total: Math.round(v * (1 + p)) };
  }

  // Dividir la cuenta del restaurante con propina.
  function dividirCuenta(total, personas, propinaPct) {
    var t = num(total), n = Math.round(num(personas));
    if (!(t > 0) || n < 1) return null;
    var propina = t * num(propinaPct) / 100;
    return { propina: Math.round(propina), total: Math.round(t + propina), porPersona: Math.round((t + propina) / n) };
  }

  // ¿Cuánto cuesta un hábito? (veces por semana)
  function costoHabito(monto, vecesPorSemana) {
    var m = num(monto), v = num(vecesPorSemana);
    if (!(m > 0) || !(v > 0)) return null;
    var semana = m * v;
    return { semana: Math.round(semana), mes: Math.round(semana * 52 / 12), anio: Math.round(semana * 52) };
  }

  // ¿Contado o a cuotas? Compara el precio de contado con lo que pagarías en cuotas.
  function contadoVsCuotas(precio, cuotas, valorCuota) {
    var p = num(precio), n = Math.round(num(cuotas)), c = num(valorCuota);
    if (!(p > 0) || n < 1 || !(c > 0)) return null;
    var total = c * n, extra = total - p;
    var tasa = 0;
    if (extra > 0) {          // tasa mensual implícita: p = c · (1 - (1+i)^-n) / i
      var lo = 0, hi = 1;
      for (var k = 0; k < 80; k++) { var i = (lo + hi) / 2, vp = c * (1 - Math.pow(1 + i, -n)) / i; if (vp > p) lo = i; else hi = i; }
      tasa = (lo + hi) / 2;
    }
    return { total: Math.round(total), extra: Math.round(extra), tasaMensualPct: Math.round(tasa * 10000) / 100, conInteres: extra > 1 };
  }

  // CDT o ahorro a plazo con tasa efectiva anual (antes de impuestos).
  function cdt(monto, tasaEA, meses) {
    var m = num(monto), n = num(meses);
    if (!(m > 0) || !(n > 0)) return null;
    var ganancia = m * (Math.pow(1 + num(tasaEA) / 100, n / 12) - 1);
    return { ganancia: Math.round(ganancia), total: Math.round(m + ganancia) };
  }

  // Prima de servicios y cesantías estimadas (Colombia). Base mensual = salario + auxilio de transporte.
  function primaCesantias(salario, auxilio, dias) {
    var base = num(salario) + num(auxilio), d = Math.min(360, Math.max(0, Math.round(num(dias))));
    if (!(base > 0) || !(d > 0)) return null;
    var cesantias = base * d / 360;
    return { prima: Math.round(base * Math.min(d, 180) / 360), cesantias: Math.round(cesantias), intereses: Math.round(cesantias * d * 0.12 / 360) };
  }

  // ¿En cuánto tiempo salgo de una deuda pagando una cuota fija?
  function salirDeDeuda(saldo, tasaMensualPct, cuota) {
    var s = num(saldo), i = num(tasaMensualPct) / 100, c = num(cuota);
    if (!(s > 0) || !(c > 0)) return null;
    if (c <= s * i) return { imposible: true, minima: Math.ceil(s * i) + 1 };
    var meses = 0, total = 0;
    while (s > 0.5 && meses < 1200) { var interes = s * i, pago = Math.min(c, s + interes); s = s + interes - pago; total += pago; meses++; }
    return { meses: meses, total: Math.round(total) };
  }

  // Reto de ahorro de 52 semanas: la semana k ahorras k veces el valor base.
  function reto52(base, hechas) {
    var b = num(base), semanas = [], ahorrado = 0, total = 0;
    for (var k = 1; k <= 52; k++) { var hecho = (hechas || []).indexOf(k) >= 0; semanas.push({ semana: k, valor: b * k, hecho: hecho }); total += b * k; if (hecho) ahorrado += b * k; }
    return { semanas: semanas, ahorrado: ahorrado, total: total };
  }

  var api = { consejos: consejos, gastoInusual: gastoInusual, semana: semana, logros: logros, cuotaCredito: cuotaCredito, ahorroFuturo: ahorroFuturo, regla503020: regla503020, calendario: calendario, plata: plata,
    gastoMensualPromedio: gastoMensualPromedio, mejorPeorMes: mejorPeorMes, salud: salud, iva: iva, dividirCuenta: dividirCuenta, costoHabito: costoHabito,
    contadoVsCuotas: contadoVsCuotas, cdt: cdt, primaCesantias: primaCesantias, salirDeDeuda: salirDeDeuda, reto52: reto52 };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaConsejos = api;
})(typeof window !== "undefined" ? window : this);
