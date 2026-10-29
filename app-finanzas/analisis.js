// Cálculos de NOVA que no tocan la pantalla: periodos, análisis, búsqueda, calculadora,
// programados y exportación. Funciona en el navegador (window.NovaAnalisis) y en Node
// (require) para las pruebas.
(function (raiz) {
  "use strict";

  var Periodos = typeof module === "object" && module.exports ? require("./periodos.js") : raiz.NovaPeriodos;
  var DIA = 86400000;
  var MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  var MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
  var DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  function num(v) { return Number(v) || 0; }
  function inicioDia(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function claveDia(d) {
    var x = new Date(d);
    return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
  }

  // ---------- Periodos ----------
  // El periodo del ciclo que está n periodos antes (n < 0) o después (n > 0) del que contiene ref.
  function desplazar(ciclo, ref, n) {
    var r = Periodos.periodo(ciclo, ref);
    for (var i = 0; i < Math.abs(n); i++) {
      r = Periodos.periodo(ciclo, n < 0 ? new Date(r.desde.getTime() - 1) : r.hasta);
    }
    return r;
  }

  function nombrePeriodo(ciclo, r) {
    var d = r.desde, ultimo = new Date(r.hasta.getTime() - 1), a = d.getFullYear();
    switch (ciclo) {
      case "semanal":
        return d.getDate() + " " + MESES_CORTOS[d.getMonth()] + " – " + ultimo.getDate() + " " + MESES_CORTOS[ultimo.getMonth()] + " " + ultimo.getFullYear();
      case "quincenal": return d.getDate() + "–" + ultimo.getDate() + " " + MESES_CORTOS[d.getMonth()] + " " + a;
      case "trimestral": return "Trimestre " + (Math.floor(d.getMonth() / 3) + 1) + " · " + a;
      case "semestral": return "Semestre " + (d.getMonth() < 6 ? 1 : 2) + " · " + a;
      case "anual": return String(a);
      default: return MESES[d.getMonth()] + " " + a;
    }
  }

  // Nombre corto para los ejes de los gráficos.
  function nombreCorto(ciclo, r) {
    var d = r.desde;
    switch (ciclo) {
      case "semanal": case "quincenal": return d.getDate() + " " + MESES_CORTOS[d.getMonth()];
      case "trimestral": return "T" + (Math.floor(d.getMonth() / 3) + 1);
      case "semestral": return "S" + (d.getMonth() < 6 ? 1 : 2);
      case "anual": return String(d.getFullYear());
      default: return MESES_CORTOS[d.getMonth()];
    }
  }

  function enRango(movs, r) {
    return movs.filter(function (m) { var f = new Date(m.fecha); return f >= r.desde && f < r.hasta; });
  }

  function totales(movs) {
    var t = { ingresos: 0, gastos: 0, neto: 0, cantidad: movs.length };
    movs.forEach(function (m) { if (m.tipo === "ingreso") t.ingresos += num(m.monto); else t.gastos += num(m.monto); });
    t.neto = t.ingresos - t.gastos;
    return t;
  }

  // ---------- Análisis ----------
  // { id de categoría (o "sin") : total gastado }, de mayor a menor.
  function porCategoria(movs, tipo) {
    var m = {};
    movs.forEach(function (x) {
      if (x.tipo !== (tipo || "gasto")) return;
      var k = x.categoria_id == null ? "sin" : String(x.categoria_id);
      m[k] = (m[k] || 0) + num(x.monto);
    });
    return Object.keys(m).map(function (k) { return { id: k === "sin" ? null : Number(k), total: m[k] }; })
      .sort(function (a, b) { return b.total - a.total; });
  }

  function porEtiqueta(movs) {
    var m = {};
    movs.forEach(function (x) {
      if (x.tipo !== "gasto") return;
      (x.etiquetas || []).forEach(function (e) { m[e] = (m[e] || 0) + num(x.monto); });
    });
    return Object.keys(m).map(function (e) { return { etiqueta: e, total: m[e] }; }).sort(function (a, b) { return b.total - a.total; });
  }

  // Promedio de gasto diario, categoría top, día de la semana que más se gasta y cambio contra el periodo anterior.
  function vistaRapida(todos, ciclo, ref, hoy) {
    hoy = hoy ? new Date(hoy) : new Date();
    var r = Periodos.periodo(ciclo, ref), ant = desplazar(ciclo, ref, -1);
    var movs = enRango(todos, r), t = totales(movs), tAnt = totales(enRango(todos, ant));
    var fin = Math.min(r.hasta.getTime(), inicioDia(hoy).getTime() + DIA);
    var dias = Math.max(1, Math.round((fin - r.desde.getTime()) / DIA));
    var semana = [0, 0, 0, 0, 0, 0, 0];
    movs.forEach(function (m) { if (m.tipo === "gasto") semana[(new Date(m.fecha).getDay() + 6) % 7] += num(m.monto); });
    var maxDia = Math.max.apply(null, semana);
    var cats = porCategoria(movs);
    return {
      promedioDiario: t.gastos / dias,
      categoriaTop: cats.length ? cats[0].id : undefined,
      diaTop: maxDia > 0 ? DIAS_SEMANA[semana.indexOf(maxDia)] : null,
      vsAnterior: tAnt.gastos > 0 ? ((t.gastos - tAnt.gastos) / tAnt.gastos) * 100 : null,
      gastos: t.gastos, ingresos: t.ingresos
    };
  }

  // Ingresos y gastos de los últimos n periodos, del más viejo al actual.
  function serie(todos, ciclo, ref, n) {
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var r = desplazar(ciclo, ref, -i), t = totales(enRango(todos, r));
      out.push({ etiqueta: nombreCorto(ciclo, r), ingresos: t.ingresos, gastos: t.gastos, desde: r.desde });
    }
    return out;
  }

  // Balance proyectado a 90 días según el promedio diario de los últimos 90 días (sin contar el futuro).
  function proyeccion(todos, saldo, hoy) {
    hoy = hoy ? new Date(hoy) : new Date();
    var desde = new Date(hoy.getTime() - 90 * DIA);
    var t = totales(todos.filter(function (m) { var f = new Date(m.fecha); return f >= desde && f <= hoy; }));
    var diario = t.neto / 90;
    return [0, 30, 60, 90].map(function (d) { return { dias: d, saldo: Math.round(saldo + diario * d) }; });
  }

  // Cuánto se puede gastar por día hasta el final del periodo sin pasarse del presupuesto.
  function seguroParaGastar(limite, gastado, r, hoy) {
    hoy = inicioDia(hoy || new Date());
    var dias = Math.max(1, Math.round((r.hasta.getTime() - hoy.getTime()) / DIA));
    return { porDia: Math.max(0, (limite - gastado) / dias), dias: dias, resto: limite - gastado };
  }

  // ---------- Listas ----------
  function nombreDia(d, hoy) {
    hoy = inicioDia(hoy || new Date());
    var x = inicioDia(d), dif = Math.round((hoy - x) / DIA);
    if (dif === 0) return "Hoy";
    if (dif === 1) return "Ayer";
    return DIAS_SEMANA[(x.getDay() + 6) % 7] + ", " + x.getDate() + " " + MESES_CORTOS[x.getMonth()] + (x.getFullYear() !== hoy.getFullYear() ? " " + x.getFullYear() : "");
  }

  // Agrupa movimientos (ya ordenados) por día: [{ clave, nombre, neto, movimientos }].
  function porDia(movs, hoy) {
    var grupos = [], actual = null;
    movs.forEach(function (m) {
      var k = claveDia(m.fecha);
      if (!actual || actual.clave !== k) { actual = { clave: k, nombre: nombreDia(m.fecha, hoy), neto: 0, movimientos: [] }; grupos.push(actual); }
      actual.movimientos.push(m);
      actual.neto += m.tipo === "ingreso" ? num(m.monto) : -num(m.monto);
    });
    return grupos;
  }

  function sinTildes(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  // Busca por descripción, nota, categoría o etiqueta, con filtros opcionales.
  // f: { texto, tipo, categoriaId, etiqueta, estado, desde, hasta, orden }, nombreCategoria(id) -> texto
  function buscar(movs, f, nombreCategoria) {
    var palabras = sinTildes(f.texto).replace(/#/g, "").split(/\s+/).filter(Boolean);
    var desde = f.desde ? new Date(f.desde + "T00:00:00") : null, hasta = f.hasta ? new Date(f.hasta + "T00:00:00") : null;
    if (hasta) hasta = new Date(hasta.getTime() + DIA);
    var r = movs.filter(function (m) {
      if (f.tipo && m.tipo !== f.tipo) return false;
      if (f.categoriaId != null && m.categoria_id !== f.categoriaId) return false;
      if (f.etiqueta && (m.etiquetas || []).indexOf(f.etiqueta) < 0) return false;
      if (f.estado && (m.estado || "pagado") !== f.estado) return false;
      var fecha = new Date(m.fecha);
      if (desde && fecha < desde) return false;
      if (hasta && fecha >= hasta) return false;
      if (!palabras.length) return true;
      var donde = sinTildes([m.descripcion, m.nota, nombreCategoria ? nombreCategoria(m.categoria_id) : "", (m.etiquetas || []).join(" ")].join(" "));
      return palabras.every(function (p) { return donde.indexOf(p) >= 0; });
    });
    var orden = {
      antiguos: function (a, b) { return new Date(a.fecha) - new Date(b.fecha); },
      mayor: function (a, b) { return num(b.monto) - num(a.monto); },
      menor: function (a, b) { return num(a.monto) - num(b.monto); }
    }[f.orden] || function (a, b) { return new Date(b.fecha) - new Date(a.fecha); };
    return r.sort(orden);
  }

  // ---------- Calculadora ----------
  // Evalúa "20.000+5.000*2" (punto = miles, coma = decimales). Devuelve NaN si no se entiende.
  function evaluar(expr) {
    var s = String(expr || "").replace(/\s/g, "").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/\./g, "").replace(/,/g, ".");
    if (!s) return NaN;
    if (!/^[0-9.+\-*/]+$/.test(s)) return NaN;
    var tokens = s.match(/\d+(?:\.\d+)?|[+\-*/]/g);
    if (!tokens || tokens.join("") !== s) return NaN;
    // Primero * y /, luego + y -.
    var pila = [], op = "+", i = 0;
    if (tokens[0] === "-") { op = "-"; i = 1; }
    for (; i < tokens.length; i += 2) {
      var n = Number(tokens[i]);
      if (!isFinite(n)) return NaN;
      if (op === "+") pila.push(n);
      else if (op === "-") pila.push(-n);
      else if (op === "*") pila.push(pila.pop() * n);
      else if (op === "/") { if (n === 0) return NaN; pila.push(pila.pop() / n); }
      op = tokens[i + 1];
      if (op !== undefined && "+-*/".indexOf(op) < 0) return NaN;
    }
    if (op !== undefined) return NaN; // terminó en un operador
    return Math.round(pila.reduce(function (a, b) { return a + b; }, 0) * 100) / 100;
  }

  // ---------- Programados ----------
  var FRECUENCIAS = { diaria: "Cada día", semanal: "Cada semana", quincenal: "Cada quincena", mensual: "Cada mes", anual: "Cada año" };

  // Siguiente fecha (YYYY-MM-DD) después de la dada. Mensual respeta el día (31 → último día del mes).
  function siguienteFecha(fecha, frecuencia) {
    var p = String(fecha).slice(0, 10).split("-").map(Number), a = p[0], m = p[1] - 1, d = p[2];
    function ultimo(an, me) { return new Date(an, me + 1, 0).getDate(); }
    var n;
    switch (frecuencia) {
      case "diaria": n = new Date(a, m, d + 1); break;
      case "semanal": n = new Date(a, m, d + 7); break;
      case "quincenal": n = new Date(a, m, d + 15); break;
      case "anual": n = new Date(a + 1, m, Math.min(d, ultimo(a + 1, m))); break;
      default: n = new Date(a, m + 1, Math.min(d, ultimo(a, m + 1)));
    }
    return claveDia(n);
  }

  // Fechas que ya tocaba registrar (hasta hoy incluido), como mucho 60 para no inundar.
  function fechasPendientes(p, hoy) {
    var limite = claveDia(hoy || new Date()), f = String(p.proxima).slice(0, 10), out = [];
    while (p.activo !== false && f <= limite && out.length < 60) { out.push(f); f = siguienteFecha(f, p.frecuencia); }
    return { fechas: out, proxima: f };
  }

  // ---------- Grupos de categorías ----------
  var GRUPOS = {
    gasto: ["Comida y Bebida", "Estilo de Vida", "Familia", "Hogar y Servicios", "Transporte", "Otros"],
    ingreso: ["Ingresos Principales", "Otros Ingresos"]
  };
  var GRUPO_POR_NOMBRE = {
    comida: "Comida y Bebida", mercado: "Comida y Bebida", restaurantes: "Comida y Bebida",
    entretenimiento: "Estilo de Vida", compras: "Estilo de Vida", salud: "Estilo de Vida", educacion: "Estilo de Vida", ropa: "Estilo de Vida",
    hogar: "Hogar y Servicios", suscripciones: "Hogar y Servicios", servicios: "Hogar y Servicios", arriendo: "Hogar y Servicios",
    transporte: "Transporte", gasolina: "Transporte",
    hijos: "Familia", mascotas: "Familia", regalos: "Familia",
    salario: "Ingresos Principales", freelance: "Ingresos Principales", bonos: "Ingresos Principales"
  };
  function grupoDe(c) {
    if (c.grupo) return c.grupo;
    var g = GRUPO_POR_NOMBRE[sinTildes(c.nombre)];
    if (g) return g;
    return c.tipo === "ingreso" ? "Otros Ingresos" : "Otros";
  }

  // ---------- Exportar ----------
  function csv(filas, columnas) {
    function celda(v) {
      var t = v == null ? "" : Array.isArray(v) ? v.join(" ") : String(v);
      // Evita que Excel tome como fórmula un texto que empieza por =, +, - o @.
      if (/^[=+\-@]/.test(t) && !/^-?\d/.test(t)) t = "'" + t;
      return /[";\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    }
    var lineas = [columnas.map(function (c) { return celda(c.titulo); }).join(";")];
    filas.forEach(function (f) { lineas.push(columnas.map(function (c) { return celda(c.valor(f)); }).join(";")); });
    return "﻿" + lineas.join("\r\n");
  }

  var api = {
    desplazar: desplazar, nombrePeriodo: nombrePeriodo, nombreCorto: nombreCorto, enRango: enRango, totales: totales,
    porCategoria: porCategoria, porEtiqueta: porEtiqueta, vistaRapida: vistaRapida, serie: serie, proyeccion: proyeccion,
    seguroParaGastar: seguroParaGastar, nombreDia: nombreDia, porDia: porDia, claveDia: claveDia, buscar: buscar,
    sinTildes: sinTildes, evaluar: evaluar, FRECUENCIAS: FRECUENCIAS, siguienteFecha: siguienteFecha,
    fechasPendientes: fechasPendientes, GRUPOS: GRUPOS, grupoDe: grupoDe, csv: csv, MESES: MESES
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.NovaAnalisis = api;
})(typeof window !== "undefined" ? window : this);
