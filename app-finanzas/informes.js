// Informes de NOVA: PDF y Excel con gráficos, hechos en el celular (sin servidor).
// Recibe un objeto "informe" ya calculado por app.js y devuelve los bytes del archivo.
// Las librerías (jsPDF y ExcelJS) están en vendor/informes y se cargan solo al exportar.
(function (raiz) {
  "use strict";

  var VERDE = "#1f9d55", VERDE_OSC = "#0e5a30", ROJO = "#c0392b", GRIS = "#5d695f", CLARO = "#f2f5f3";
  var PALETA = ["#1f9d55", "#2a7de1", "#e67e22", "#8e44ad", "#d35400", "#16a085", "#c0392b", "#f1c40f", "#34495e", "#e84393", "#7f8c8d"];
  var MARCA = "NOVA · Creada por OPITA-DIGITAL · © 2026. Todos los derechos reservados.";

  // ---------- Utilidades ----------
  var fmtNum = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
  var fmtDec = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  function cop(v) { v = Math.round(Number(v) || 0); return (v < 0 ? "-" : "") + "$ " + fmtNum.format(Math.abs(v)); }
  function pct(v) { return fmtDec.format(Number(v) || 0) + " %"; }
  function corto(v) {
    var a = Math.abs(v), s = v < 0 ? "-" : "";
    if (a >= 1e6) return s + fmtDec.format(a / 1e6).replace(",0", "") + " M";
    if (a >= 1e3) return s + fmtNum.format(Math.round(a / 1e3)) + " mil";
    return s + fmtNum.format(Math.round(a));
  }
  function fechaTxt(d) { return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" }).format(d); }
  function fechaCortaTxt(d) { return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d); }
  function horaTxt(d) { return new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" }).format(d); }
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function archivoSeguro(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  function cargarScript(src) {
    return new Promise(function (ok, mal) {
      var s = document.createElement("script");
      s.src = src; s.onload = ok;
      s.onerror = function () { mal(new Error("No se pudo cargar " + src + ". Revisa tu conexión e inténtalo otra vez.")); };
      document.head.append(s);
    });
  }
  var cargado = {};
  function cargar(clave, archivos) {
    if (!cargado[clave]) {
      cargado[clave] = archivos.reduce(function (p, a) { return p.then(function () { return cargarScript("vendor/informes/" + a); }); }, Promise.resolve())
        .catch(function (e) { cargado[clave] = null; throw e; });
    }
    return cargado[clave];
  }

  // ---------- Gráficos (se dibujan en un canvas y se meten como imagen) ----------
  function lienzo(w, h) {
    var c = document.createElement("canvas"), k = 2;
    c.width = w * k; c.height = h * k;
    var g = c.getContext("2d");
    g.scale(k, k);
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
    g.textBaseline = "middle";
    return { c: c, g: g, w: w, h: h };
  }
  var FUENTE = "Helvetica, Arial, sans-serif";
  function texto(g, t, x, y, tam, color, alinear, peso) {
    g.font = (peso || "normal") + " " + tam + "px " + FUENTE; g.fillStyle = color; g.textAlign = alinear || "left"; g.fillText(t, x, y);
  }
  function recortar(g, t, max) {
    if (g.measureText(t).width <= max) return t;
    while (t.length > 1 && g.measureText(t + "…").width > max) t = t.slice(0, -1);
    return t + "…";
  }

  // Dona con leyenda: items = [{ nombre, total }]
  function graficoDona(items, totalTxt) {
    var L = lienzo(900, 380), g = L.g, cx = 190, cy = 190, R = 160, r = 98;
    if (!items.length) { texto(g, "Sin gastos en este periodo", 450, 190, 22, GRIS, "center"); return L.c.toDataURL("image/png"); }
    var tot = items.reduce(function (s, i) { return s + i.total; }, 0), a0 = -Math.PI / 2;
    items.forEach(function (it, i) {
      var a1 = a0 + (it.total / tot) * Math.PI * 2;
      g.beginPath(); g.arc(cx, cy, R, a0, a1); g.arc(cx, cy, r, a1, a0, true); g.closePath();
      g.fillStyle = PALETA[i % PALETA.length]; g.fill();
      g.lineWidth = 3; g.strokeStyle = "#fff"; g.stroke();
      a0 = a1;
    });
    texto(g, "Total gastado", cx, cy - 14, 17, GRIS, "center");
    texto(g, totalTxt, cx, cy + 16, 24, "#15201a", "center", "bold");
    items.slice(0, 10).forEach(function (it, i) {
      var y = 40 + i * 33;
      g.fillStyle = PALETA[i % PALETA.length]; g.fillRect(400, y - 9, 18, 18);
      g.font = "19px " + FUENTE;
      texto(g, recortar(g, it.nombre, 250), 430, y, 19, "#15201a");
      texto(g, pct(it.pct), 760, y, 19, GRIS, "right");
      texto(g, corto(it.total), 880, y, 19, "#15201a", "right", "bold");
    });
    return L.c.toDataURL("image/png");
  }

  // Barras agrupadas: serie = [{ etiqueta, ingresos, gastos }]
  function graficoSerie(serie) {
    var L = lienzo(900, 340), g = L.g, x0 = 80, x1 = 880, y0 = 40, y1 = 270;
    var max = Math.max.apply(null, serie.map(function (s) { return Math.max(s.ingresos, s.gastos); }).concat([1]));
    var paso = Math.pow(10, Math.floor(Math.log10(max))), techo = Math.ceil(max / paso) * paso;
    if (techo / paso < 3) { paso /= 2; techo = Math.ceil(max / paso) * paso; }
    for (var v = 0; v <= techo + 1; v += paso) {
      var y = y1 - (v / techo) * (y1 - y0);
      g.strokeStyle = "#e3e8e5"; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
      texto(g, corto(v), x0 - 10, y, 15, GRIS, "right");
    }
    var ancho = (x1 - x0) / serie.length, bw = Math.min(46, ancho * 0.32);
    serie.forEach(function (s, i) {
      var c = x0 + ancho * i + ancho / 2;
      [[s.ingresos, VERDE, -bw - 2], [s.gastos, ROJO, 2]].forEach(function (b) {
        var h = (b[0] / techo) * (y1 - y0);
        g.fillStyle = b[1]; g.fillRect(c + b[2], y1 - h, bw, h);
        if (b[0] > 0) texto(g, corto(b[0]), c + b[2] + bw / 2, y1 - h - 11, 13, "#15201a", "center", "bold");
      });
      texto(g, s.etiqueta, c, y1 + 22, 16, GRIS, "center");
    });
    g.fillStyle = VERDE; g.fillRect(x0, 308, 16, 16); texto(g, "Ingresos", x0 + 24, 316, 16, "#15201a");
    g.fillStyle = ROJO; g.fillRect(x0 + 130, 308, 16, 16); texto(g, "Gastos", x0 + 154, 316, 16, "#15201a");
    return L.c.toDataURL("image/png");
  }

  // Barras por día de la semana: dias = [{ dia, total }]
  function graficoSemana(dias) {
    var L = lienzo(900, 260), g = L.g, x0 = 40, x1 = 880, y1 = 200, y0 = 30;
    var max = Math.max.apply(null, dias.map(function (d) { return d.total; }).concat([1])), ancho = (x1 - x0) / dias.length, bw = Math.min(70, ancho * 0.5);
    var tope = dias.reduce(function (m, d, i) { return d.total > dias[m].total ? i : m; }, 0);
    dias.forEach(function (d, i) {
      var c = x0 + ancho * i + ancho / 2, h = (d.total / max) * (y1 - y0);
      g.fillStyle = d.total > 0 && i === tope ? VERDE : "#9fd8b6"; g.fillRect(c - bw / 2, y1 - h, bw, h);
      if (d.total > 0) texto(g, corto(d.total), c, y1 - h - 12, 15, "#15201a", "center", "bold");
      texto(g, d.dia, c, y1 + 24, 17, GRIS, "center");
    });
    g.strokeStyle = "#cfd6d2"; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x1, y1); g.stroke();
    return L.c.toDataURL("image/png");
  }

  function graficos(inf) {
    var cats = inf.categorias.slice(0, 9), resto = inf.categorias.slice(9);
    if (resto.length) cats = cats.concat([{ nombre: "Otras", total: resto.reduce(function (s, c) { return s + c.total; }, 0), pct: resto.reduce(function (s, c) { return s + c.pct; }, 0) }]);
    return { dona: graficoDona(cats, cop(inf.kpis.gastos)), serie: graficoSerie(inf.serie), semana: graficoSemana(inf.semana) };
  }

  // ---------- PDF ----------
  function generarPDF(inf) {
    return cargar("pdf", ["jspdf.umd.min.js", "jspdf.plugin.autotable.min.js"]).then(function () {
      var jsPDF = raiz.jspdf.jsPDF, doc = new jsPDF({ unit: "mm", format: "a4", compress: true }), G = graficos(inf);
      var W = 210, H = 297, M = 14, ANCHO = W - M * 2, y;
      doc.setProperties({ title: "Informe NOVA - " + inf.periodoNombre, subject: "Informe financiero personal", author: "OPITA-DIGITAL", creator: "NOVA · OPITA-DIGITAL" });

      function tabla(opc) {
        var base = {
          margin: { left: M, right: M, top: 18, bottom: 16 }, styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2, textColor: [30, 40, 34], lineColor: [226, 230, 228], lineWidth: 0.1 },
          headStyles: { fillColor: hex(VERDE), textColor: 255, fontStyle: "bold" }, alternateRowStyles: { fillColor: [246, 249, 247] }, theme: "grid"
        };
        var o = Object.assign(base, opc);
        if (typeof doc.autoTable === "function") doc.autoTable(o); else (raiz.jspdfAutoTable.default || raiz.jspdfAutoTable.autoTable || raiz.jspdfAutoTable)(doc, o);
        return doc.lastAutoTable.finalY;
      }
      function espacio(alto) { if (y + alto > H - 16) { doc.addPage(); y = 18; } }
      function titulo(t, alto) {
        espacio(10 + (alto || 20));
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor.apply(doc, hex(VERDE_OSC)); doc.text(t, M, y);
        doc.setDrawColor.apply(doc, hex(VERDE)); doc.setLineWidth(0.5); doc.line(M, y + 1.8, M + 22, y + 1.8);
        y += 7;
      }

      // Encabezado
      doc.setFillColor.apply(doc, hex(VERDE_OSC)); doc.rect(0, 0, W, 36, "F");
      doc.setFillColor.apply(doc, hex(VERDE)); doc.rect(0, 36, W, 1.6, "F");
      doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.text("NOVA", M, 17);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.text("Informe financiero personal", M, 25);
      doc.setFontSize(8.5); doc.text("Creada por OPITA-DIGITAL", M, 31);
      doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(inf.periodoNombre, W - M, 16, { align: "right" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      doc.text("Generado el " + fechaTxt(inf.generado) + ", " + horaTxt(inf.generado), W - M, 23, { align: "right" });
      doc.text("Ciclo: " + inf.cicloNombre, W - M, 29, { align: "right" });

      // Quién es la persona
      y = 46;
      doc.setFillColor.apply(doc, hex(CLARO)); doc.setDrawColor(220, 226, 222); doc.roundedRect(M, y, ANCHO, 22, 2, 2, "FD");
      doc.setTextColor.apply(doc, hex(GRIS)); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
      doc.text("INFORME DE", M + 5, y + 6); doc.text("PERIODO ANALIZADO", M + 112, y + 6);
      doc.setTextColor(21, 32, 26); doc.setFontSize(13); doc.text(inf.persona.nombre, M + 5, y + 13);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor.apply(doc, hex(GRIS)); doc.text(inf.persona.email, M + 5, y + 19);
      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(21, 32, 26);
      doc.text("Del " + fechaCortaTxt(inf.desde) + " al " + fechaCortaTxt(inf.hasta), M + 112, y + 13);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor.apply(doc, hex(GRIS)); doc.text(inf.kpis.movimientos + " movimientos registrados", M + 112, y + 19);

      // Tarjetas de cifras
      y = 74;
      function tarjetas(lista) {
        var cw = (ANCHO - 9) / 4;
        lista.forEach(function (k, i) {
          var x = M + i * (cw + 3);
          doc.setFillColor(255, 255, 255); doc.setDrawColor(214, 221, 217); doc.setLineWidth(0.3); doc.roundedRect(x, y, cw, 19, 2, 2, "FD");
          doc.setFillColor.apply(doc, hex(k.color || VERDE)); doc.rect(x, y + 3, 1.2, 13, "F");
          doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor.apply(doc, hex(GRIS)); doc.text(k.t.toUpperCase(), x + 4, y + 6);
          doc.setFontSize(k.chico ? 8.5 : 12); doc.setTextColor.apply(doc, hex(k.color || "#15201a")); doc.text(k.v, x + 4, y + 13.5, { maxWidth: cw - 6 });
          if (k.n) { doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor.apply(doc, hex(GRIS)); doc.text(k.n, x + 4, y + 17.2, { maxWidth: cw - 6 }); }
        });
        y += 23;
      }
      var K = inf.kpis;
      tarjetas([
        { t: "Ingresos", v: cop(K.ingresos), color: VERDE }, { t: "Gastos", v: cop(K.gastos), color: ROJO },
        { t: "Balance del periodo", v: cop(K.balance), color: K.balance >= 0 ? VERDE : ROJO }, { t: "Saldo en cuentas", v: cop(K.saldoTotal), color: "#15201a" }
      ]);
      tarjetas([
        { t: "Gasto promedio por día", v: cop(K.promedioDiario) }, { t: "Ahorro del periodo", v: K.ahorroPct == null ? "Sin ingresos" : pct(K.ahorroPct), n: "del total de ingresos", color: K.ahorroPct != null && K.ahorroPct < 0 ? ROJO : VERDE },
        { t: "Movimientos", v: String(K.movimientos) }, { t: "Mayor gasto", v: K.mayorGasto ? cop(K.mayorGasto.monto) : "-", n: K.mayorGasto ? K.mayorGasto.descripcion : "", chico: false }
      ]);

      // Gráficos
      y += 5; titulo("A dónde se fue tu dinero", ANCHO * 380 / 900);
      doc.addImage(G.dona, "PNG", M, y, ANCHO, ANCHO * 380 / 900); y += ANCHO * 380 / 900 + 6;
      titulo("Ingresos y gastos, últimos " + inf.serie.length + " periodos", ANCHO * 340 / 900);
      doc.addImage(G.serie, "PNG", M, y, ANCHO, ANCHO * 340 / 900); y += ANCHO * 340 / 900 + 6;
      titulo("En qué día de la semana gastas más", ANCHO * 260 / 900);
      doc.addImage(G.semana, "PNG", M, y, ANCHO, ANCHO * 260 / 900); y += ANCHO * 260 / 900 + 6;

      // Tablas
      if (inf.categorias.length) {
        titulo("Gastos por categoría");
        y = tabla({
          startY: y, head: [["Categoría", "Movimientos", "Total", "% del gasto", ""]],
          body: inf.categorias.map(function (c) { return [c.nombre, c.cantidad, cop(c.total), pct(c.pct), ""]; }),
          foot: [["Total", inf.categorias.reduce(function (s, c) { return s + c.cantidad; }, 0), cop(K.gastos), "100,0 %", ""]],
          footStyles: { fillColor: [232, 240, 235], textColor: [21, 32, 26], fontStyle: "bold" },
          columnStyles: { 1: { halign: "center", cellWidth: 24 }, 2: { halign: "right", cellWidth: 34 }, 3: { halign: "right", cellWidth: 24 }, 4: { cellWidth: 40 } },
          didDrawCell: function (d) {
            if (d.section === "body" && d.column.index === 4) {
              var c = inf.categorias[d.row.index], w = (d.cell.width - 4) * Math.min(1, c.pct / 100);
              doc.setFillColor.apply(doc, hex(PALETA[d.row.index % PALETA.length])); doc.rect(d.cell.x + 2, d.cell.y + d.cell.height / 2 - 1.5, Math.max(0.6, w), 3, "F");
            }
          }
        }) + 8;
      }
      if (inf.presupuestos.length) {
        titulo("Presupuestos y límites");
        y = tabla({
          startY: y, head: [["Nombre", "Periodo", "Límite", "Gastado", "Usado", "Estado"]],
          body: inf.presupuestos.map(function (p) {
            var u = p.limite > 0 ? p.gastado / p.limite * 100 : 0;
            return [p.nombre, p.ciclo, cop(p.limite), cop(p.gastado), pct(u), u > 100 ? "Te pasaste" : u >= 80 ? "Cuidado" : "Va bien"];
          }),
          columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
          didParseCell: function (d) {
            if (d.section === "body" && d.column.index === 5) { d.cell.styles.fontStyle = "bold"; d.cell.styles.textColor = d.cell.raw === "Te pasaste" ? hex(ROJO) : d.cell.raw === "Cuidado" ? [200, 120, 20] : hex(VERDE_OSC); }
          }
        }) + 8;
      }
      if (inf.cuentas.length) {
        titulo("Mis cuentas");
        y = tabla({
          startY: y, head: [["Cuenta", "Tipo", "Saldo actual"]], body: inf.cuentas.map(function (c) { return [c.nombre, c.tipo, cop(c.saldo)]; }),
          foot: [["Total", "", cop(K.saldoTotal)]], footStyles: { fillColor: [232, 240, 235], textColor: [21, 32, 26], fontStyle: "bold" }, columnStyles: { 2: { halign: "right" } }
        }) + 8;
      }
      if (inf.conductor) {
        var C = inf.conductor;
        titulo("Mi trabajo como conductor" + (C.vehiculo ? " · " + C.vehiculo : ""));
        y = tabla({
          startY: y, head: [["Concepto", "Valor"]],
          body: [["Ganado", cop(C.ingresos)], ["Gastos de operación (gasolina, tinto, peajes, arreglos)", cop(C.operacion)], ["Papeles y cuotas (SOAT, seguro, cuota)", cop(C.fijos)],
            ["Ganancia después de gastos de operación", cop(C.netoOperativo)], ["Ganancia neta, después de todo", cop(C.neto)], ["Viajes", String(C.viajes)], ["Ganancia por viaje", C.porViaje == null ? "-" : cop(C.porViaje)]],
          columnStyles: { 1: { halign: "right" } }
        }) + 4;
        if (C.plataformas.length) y = tabla({ startY: y, head: [["Plataforma", "Viajes", "Ganado"]], body: C.plataformas.map(function (p) { return [p.nombre, p.viajes, cop(p.total)]; }), columnStyles: { 1: { halign: "center" }, 2: { halign: "right" } } }) + 8;
        else y += 4;
      }
      if (inf.movimientos.length) {
        titulo("Movimientos del periodo (" + inf.movimientos.length + ")");
        tabla({
          startY: y, head: [["Fecha", "Descripción", "Categoría", "Cuenta", "Valor"]],
          body: inf.movimientos.map(function (m) { return [fechaCortaTxt(m.fecha), m.descripcion + (m.estado === "pendiente" ? " (pendiente)" : ""), m.categoria, m.cuenta, (m.tipo === "ingreso" ? "+" : "-") + cop(m.monto).replace("-", "")]; }),
          columnStyles: { 0: { cellWidth: 22 }, 4: { halign: "right", cellWidth: 32 } }, styles: { fontSize: 8, cellPadding: 1.7, font: "helvetica", lineColor: [226, 230, 228], lineWidth: 0.1 },
          didParseCell: function (d) {
            if (d.section === "body" && d.column.index === 4) { var m = inf.movimientos[d.row.index]; d.cell.styles.textColor = m.tipo === "ingreso" ? hex(VERDE_OSC) : hex(ROJO); d.cell.styles.fontStyle = "bold"; }
          }
        });
      }

      // Pie de página en todas las hojas
      var n = doc.getNumberOfPages();
      for (var p = 1; p <= n; p++) {
        doc.setPage(p);
        doc.setDrawColor(210, 218, 213); doc.setLineWidth(0.2); doc.line(M, H - 11, W - M, H - 11);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor.apply(doc, hex(GRIS));
        doc.text(MARCA, M, H - 6.5); doc.text("Página " + p + " de " + n, W - M, H - 6.5, { align: "right" });
        if (p > 1) { doc.setFont("helvetica", "bold"); doc.setTextColor.apply(doc, hex(VERDE_OSC)); doc.text("NOVA", M, 10); doc.setFont("helvetica", "normal"); doc.setTextColor.apply(doc, hex(GRIS)); doc.text(inf.persona.nombre + " · " + inf.periodoNombre, W - M, 10, { align: "right" }); }
      }
      return { bytes: new Uint8Array(doc.output("arraybuffer")), nombre: "NOVA-informe-" + archivoSeguro(inf.periodoNombre) + ".pdf", tipo: "application/pdf" };
    });
  }

  // ---------- Excel ----------
  function generarExcel(inf) {
    return cargar("xlsx", ["exceljs.min.js"]).then(function () {
      var wb = new raiz.ExcelJS.Workbook(), G = graficos(inf), K = inf.kpis;
      wb.creator = "OPITA-DIGITAL"; wb.lastModifiedBy = "NOVA"; wb.created = inf.generado; wb.title = "Informe NOVA - " + inf.periodoNombre; wb.company = "OPITA-DIGITAL";
      var argb = function (h) { return "FF" + h.slice(1).toUpperCase(); };
      var rell = function (h) { return { type: "pattern", pattern: "solid", fgColor: { argb: argb(h) } }; };
      var borde = { style: "thin", color: { argb: "FFD6DDD9" } }, bordes = { top: borde, left: borde, bottom: borde, right: borde };
      var MON = '"$" #,##0;[Red]-"$" #,##0';
      function utc(d) { return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); }
      function encabezado(ws, fila, cols) {
        var r = ws.getRow(fila); r.height = 22;
        cols.forEach(function (t, i) { var c = r.getCell(i + 1); c.value = t; c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 }; c.fill = rell(VERDE); c.alignment = { vertical: "middle", horizontal: "center", wrapText: true }; c.border = bordes; });
      }
      function pie(ws, fila, ncols) { var c = ws.getCell(fila, 1); c.value = MARCA; c.font = { italic: true, size: 9, color: { argb: "FF5D695F" } }; ws.mergeCells(fila, 1, fila, ncols); }

      // ---- Hoja 1: Dashboard ----
      var d = wb.addWorksheet("Dashboard", { views: [{ showGridLines: false }], properties: { tabColor: { argb: argb(VERDE) } }, pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
      d.columns = [{ width: 2 }].concat(Array.apply(null, Array(11)).map(function (_, i) { return { width: [14, 14, 3, 14, 14, 3, 14, 14, 3, 14, 14][i] }; }));
      d.mergeCells("B1:L2"); var t = d.getCell("B1"); t.value = "NOVA · Informe financiero personal"; t.font = { bold: true, size: 22, color: { argb: "FFFFFFFF" } }; t.fill = rell(VERDE_OSC); t.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      d.getRow(1).height = 22; d.getRow(2).height = 22;
      d.mergeCells("B3:L3"); t = d.getCell("B3"); t.value = "Periodo: " + inf.periodoNombre + "   |   Del " + fechaCortaTxt(inf.desde) + " al " + fechaCortaTxt(inf.hasta) + "   |   Ciclo " + inf.cicloNombre; t.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } }; t.fill = rell(VERDE); t.alignment = { vertical: "middle", indent: 1 }; d.getRow(3).height = 20;
      d.mergeCells("B5:F5"); d.getCell("B5").value = "INFORME DE"; d.getCell("B5").font = { bold: true, size: 9, color: { argb: "FF5D695F" } };
      d.mergeCells("H5:L5"); d.getCell("H5").value = "GENERADO"; d.getCell("H5").font = { bold: true, size: 9, color: { argb: "FF5D695F" } };
      d.mergeCells("B6:F6"); d.getCell("B6").value = inf.persona.nombre; d.getCell("B6").font = { bold: true, size: 15 };
      d.mergeCells("H6:L6"); d.getCell("H6").value = fechaTxt(inf.generado) + ", " + horaTxt(inf.generado); d.getCell("H6").font = { bold: true, size: 12 };
      d.mergeCells("B7:F7"); d.getCell("B7").value = inf.persona.email; d.getCell("B7").font = { size: 10, color: { argb: "FF5D695F" } };
      d.mergeCells("H7:L7"); d.getCell("H7").value = K.movimientos + " movimientos en el periodo"; d.getCell("H7").font = { size: 10, color: { argb: "FF5D695F" } };
      d.getRow(6).height = 24;

      function tile(fila, col, titulo, valor, nota, color, esNum) {
        var c1 = col, c2 = col + 1;
        [fila, fila + 1, fila + 2].forEach(function (f) { d.mergeCells(f, c1, f, c2); });
        var a = d.getCell(fila, c1), b = d.getCell(fila + 1, c1), n = d.getCell(fila + 2, c1);
        a.value = titulo.toUpperCase(); a.font = { bold: true, size: 9, color: { argb: "FF5D695F" } }; a.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
        b.value = valor; b.font = { bold: true, size: esNum ? 18 : 12, color: { argb: argb(color || "#15201a") } }; b.alignment = { horizontal: "left", vertical: "middle", indent: 1, wrapText: true };
        if (esNum) b.numFmt = MON;
        n.value = nota || ""; n.font = { size: 8, color: { argb: "FF5D695F" } }; n.alignment = { horizontal: "left", vertical: "middle", indent: 1, wrapText: true };
        for (var f = fila; f <= fila + 2; f++) for (var c = c1; c <= c2; c++) { var cel = d.getCell(f, c); cel.fill = rell(CLARO); cel.border = { top: f === fila ? { style: "medium", color: { argb: argb(color || VERDE) } } : undefined, bottom: f === fila + 2 ? borde : undefined, left: c === c1 ? borde : undefined, right: c === c2 ? borde : undefined }; }
        d.getRow(fila + 1).height = 30;
      }
      tile(9, 2, "Ingresos", K.ingresos, "Todo lo que entró", VERDE, true);
      tile(9, 5, "Gastos", K.gastos, "Todo lo que salió", ROJO, true);
      tile(9, 8, "Balance del periodo", K.balance, K.balance >= 0 ? "Te sobró dinero" : "Gastaste más de lo que entró", K.balance >= 0 ? VERDE : ROJO, true);
      tile(9, 11, "Saldo en cuentas", K.saldoTotal, "Lo que tienes hoy", "#15201a", true);
      tile(13, 2, "Gasto promedio por día", K.promedioDiario, "En el periodo", "#15201a", true);
      tile(13, 5, "Ahorro del periodo", K.ahorroPct == null ? "Sin ingresos" : pct(K.ahorroPct), "Del total de ingresos", K.ahorroPct != null && K.ahorroPct < 0 ? ROJO : VERDE, false);
      tile(13, 8, "Movimientos", K.movimientos, "Registros del periodo", "#15201a", false);
      tile(13, 11, "Mayor gasto", K.mayorGasto ? K.mayorGasto.monto : "-", K.mayorGasto ? K.mayorGasto.descripcion : "", ROJO, !!K.mayorGasto);

      function seccion(fila, texto) { d.mergeCells(fila, 2, fila, 12); var c = d.getCell(fila, 2); c.value = texto; c.font = { bold: true, size: 13, color: { argb: argb(VERDE_OSC) } }; c.border = { bottom: { style: "medium", color: { argb: argb(VERDE) } } }; d.getRow(fila).height = 22; }
      function imagen(url, fila, col, ancho, alto) { var id = wb.addImage({ base64: url, extension: "png" }); d.addImage(id, { tl: { col: col, row: fila - 1 }, ext: { width: ancho, height: alto } }); }
      seccion(17, "A dónde se fue tu dinero");
      imagen(G.dona, 18, 1.05, 760, 321);          // ~16 filas
      seccion(35, "Ingresos y gastos, últimos " + inf.serie.length + " periodos");
      imagen(G.serie, 36, 1.05, 760, 287);
      seccion(51, "En qué día de la semana gastas más");
      imagen(G.semana, 52, 1.05, 760, 220);
      pie(d, 65, 12);
      for (var f = 17; f <= 64; f++) if (![17, 35, 51].includes(f)) d.getRow(f).height = 20;

      // ---- Hoja 2: Transacciones ----
      var tx = wb.addWorksheet("Transacciones", { views: [{ state: "frozen", ySplit: 3, showGridLines: false }], properties: { tabColor: { argb: argb("#2a7de1") } } });
      tx.mergeCells("A1:J1"); tx.getCell("A1").value = "Transacciones · " + inf.persona.nombre + " · " + inf.todos.length + " movimientos (todo el historial)"; tx.getCell("A1").font = { bold: true, size: 14, color: { argb: argb(VERDE_OSC) } }; tx.getRow(1).height = 26;
      encabezado(tx, 3, ["Fecha", "Hora", "Tipo", "Descripción", "Categoría", "Valor", "Cuenta", "Estado", "Etiquetas", "Nota"]);
      tx.columns = [{ width: 13 }, { width: 13 }, { width: 11 }, { width: 34 }, { width: 22 }, { width: 16 }, { width: 18 }, { width: 11 }, { width: 18 }, { width: 34 }];
      inf.todos.forEach(function (m, i) {
        var r = tx.getRow(4 + i);
        r.values = [utc(m.fecha), horaTxt(m.fecha), m.tipo === "ingreso" ? "Ingreso" : "Gasto", m.descripcion, m.categoria, (m.tipo === "ingreso" ? 1 : -1) * m.monto, m.cuenta, m.estado === "pendiente" ? "Pendiente" : "Pagado", (m.etiquetas || []).map(function (e) { return "#" + e; }).join(" "), m.nota || ""];
        r.getCell(1).numFmt = "dd/mm/yyyy"; r.getCell(6).numFmt = MON;
        r.getCell(6).font = { bold: true, color: { argb: argb(m.tipo === "ingreso" ? VERDE_OSC : ROJO) } };
        r.getCell(3).font = { bold: true, color: { argb: argb(m.tipo === "ingreso" ? VERDE_OSC : ROJO) } };
        for (var c = 1; c <= 10; c++) { r.getCell(c).border = bordes; if (i % 2) r.getCell(c).fill = rell("#f6f9f7"); }
      });
      var ult = 3 + inf.todos.length, tr = tx.getRow(ult + 1);
      tr.getCell(5).value = "Balance total"; tr.getCell(5).font = { bold: true }; tr.getCell(5).alignment = { horizontal: "right" };
      tr.getCell(6).value = { formula: "SUM(F4:F" + ult + ")", result: inf.todos.reduce(function (s, m) { return s + (m.tipo === "ingreso" ? m.monto : -m.monto); }, 0) };
      tr.getCell(6).numFmt = MON; tr.getCell(6).font = { bold: true, size: 12 };
      for (var c = 5; c <= 6; c++) { tr.getCell(c).fill = rell("#e8f0eb"); tr.getCell(c).border = bordes; }
      if (inf.todos.length) tx.autoFilter = { from: "A3", to: "J" + ult };
      pie(tx, ult + 3, 10);

      // ---- Hoja 3: Por categoría ----
      var ca = wb.addWorksheet("Por categoría", { views: [{ showGridLines: false }], properties: { tabColor: { argb: argb("#e67e22") } } });
      ca.columns = [{ width: 30 }, { width: 14 }, { width: 18 }, { width: 14 }];
      ca.mergeCells("A1:D1"); ca.getCell("A1").value = "Gastos por categoría · " + inf.periodoNombre; ca.getCell("A1").font = { bold: true, size: 14, color: { argb: argb(VERDE_OSC) } }; ca.getRow(1).height = 26;
      encabezado(ca, 3, ["Categoría", "Movimientos", "Total gastado", "% del gasto"]);
      inf.categorias.forEach(function (c, i) {
        var r = ca.getRow(4 + i); r.values = [c.nombre, c.cantidad, c.total, c.pct / 100];
        r.getCell(3).numFmt = MON; r.getCell(4).numFmt = "0.0%"; r.getCell(2).alignment = { horizontal: "center" };
        for (var k = 1; k <= 4; k++) r.getCell(k).border = bordes;
      });
      var fc = 3 + inf.categorias.length;
      if (inf.categorias.length) {
        ca.getRow(fc + 1).values = ["Total", { formula: "SUM(B4:B" + fc + ")", result: inf.categorias.reduce(function (s, c) { return s + c.cantidad; }, 0) }, { formula: "SUM(C4:C" + fc + ")", result: K.gastos }, 1];
        ca.getRow(fc + 1).eachCell(function (c) { c.font = { bold: true }; c.fill = rell("#e8f0eb"); c.border = bordes; });
        ca.getCell(fc + 1, 3).numFmt = MON; ca.getCell(fc + 1, 4).numFmt = "0.0%"; ca.getCell(fc + 1, 2).alignment = { horizontal: "center" };
        ca.addConditionalFormatting({ ref: "D4:D" + fc, rules: [{ type: "dataBar", priority: 1, cfvo: [{ type: "num", value: 0 }, { type: "num", value: 1 }], color: { argb: argb("#2ee06f") }, gradient: false }] });
      } else { ca.getCell("A4").value = "Sin gastos en este periodo."; }
      pie(ca, fc + 4, 4);

      // ---- Hoja 4: Evolución ----
      var ev = wb.addWorksheet("Evolución", { views: [{ showGridLines: false }], properties: { tabColor: { argb: argb("#8e44ad") } } });
      ev.columns = [{ width: 22 }, { width: 18 }, { width: 18 }, { width: 18 }];
      ev.mergeCells("A1:D1"); ev.getCell("A1").value = "Ingresos y gastos por periodo"; ev.getCell("A1").font = { bold: true, size: 14, color: { argb: argb(VERDE_OSC) } }; ev.getRow(1).height = 26;
      encabezado(ev, 3, ["Periodo", "Ingresos", "Gastos", "Balance"]);
      inf.serie.forEach(function (s, i) {
        var r = ev.getRow(4 + i); r.values = [s.etiqueta, s.ingresos, s.gastos, { formula: "B" + (4 + i) + "-C" + (4 + i), result: s.ingresos - s.gastos }];
        for (var k = 2; k <= 4; k++) r.getCell(k).numFmt = MON;
        for (k = 1; k <= 4; k++) r.getCell(k).border = bordes;
      });
      var ie = ev.addImage ? wb.addImage({ base64: G.serie, extension: "png" }) : null;
      ev.addImage(ie, { tl: { col: 0.1, row: 5 + inf.serie.length }, ext: { width: 640, height: 242 } });
      pie(ev, 6 + inf.serie.length + 14, 4);

      // ---- Hoja 5: Cuentas y límites ----
      var cu = wb.addWorksheet("Cuentas y límites", { views: [{ showGridLines: false }], properties: { tabColor: { argb: argb("#16a085") } } });
      cu.columns = [{ width: 30 }, { width: 16 }, { width: 18 }, { width: 18 }, { width: 14 }, { width: 14 }];
      cu.mergeCells("A1:F1"); cu.getCell("A1").value = "Cuentas, presupuestos y límites"; cu.getCell("A1").font = { bold: true, size: 14, color: { argb: argb(VERDE_OSC) } }; cu.getRow(1).height = 26;
      encabezado(cu, 3, ["Cuenta", "Tipo", "Saldo actual"]);
      inf.cuentas.forEach(function (c, i) { var r = cu.getRow(4 + i); r.values = [c.nombre, c.tipo, c.saldo]; r.getCell(3).numFmt = MON; for (var k = 1; k <= 3; k++) r.getCell(k).border = bordes; });
      var fcu = 4 + inf.cuentas.length;
      cu.getRow(fcu).values = ["Total", "", { formula: "SUM(C4:C" + (fcu - 1) + ")", result: K.saldoTotal }]; cu.getRow(fcu).eachCell(function (c) { c.font = { bold: true }; c.fill = rell("#e8f0eb"); c.border = bordes; }); cu.getCell(fcu, 3).numFmt = MON;
      var fp = fcu + 3;
      cu.getCell(fp - 1, 1).value = "Presupuestos y límites"; cu.getCell(fp - 1, 1).font = { bold: true, size: 12, color: { argb: argb(VERDE_OSC) } };
      encabezado(cu, fp, ["Nombre", "Periodo", "Límite", "Gastado", "Usado", "Estado"]);
      inf.presupuestos.forEach(function (p, i) {
        var u = p.limite > 0 ? p.gastado / p.limite : 0, r = cu.getRow(fp + 1 + i);
        r.values = [p.nombre, p.ciclo, p.limite, p.gastado, u, u > 1 ? "Te pasaste" : u >= 0.8 ? "Cuidado" : "Va bien"];
        r.getCell(3).numFmt = MON; r.getCell(4).numFmt = MON; r.getCell(5).numFmt = "0%";
        r.getCell(6).font = { bold: true, color: { argb: argb(u > 1 ? ROJO : u >= 0.8 ? "#c87814" : VERDE_OSC) } };
        for (var k = 1; k <= 6; k++) r.getCell(k).border = bordes;
      });
      if (!inf.presupuestos.length) cu.getCell(fp + 1, 1).value = "Aún no tienes presupuestos ni límites.";
      pie(cu, fp + inf.presupuestos.length + 4, 6);

      // ---- Hoja 6: Conductor (solo si el modo conductor está activo) ----
      if (inf.conductor) {
        var C = inf.conductor, co = wb.addWorksheet("Mi trabajo", { views: [{ showGridLines: false }], properties: { tabColor: { argb: argb("#d35400") } } });
        co.columns = [{ width: 52 }, { width: 18 }, { width: 14 }];
        co.mergeCells("A1:C1"); co.getCell("A1").value = "Mi trabajo como conductor" + (C.vehiculo ? " · " + C.vehiculo : "") + " · " + inf.periodoNombre; co.getCell("A1").font = { bold: true, size: 14, color: { argb: argb(VERDE_OSC) } }; co.getRow(1).height = 26;
        encabezado(co, 3, ["Concepto", "Valor", ""]);
        [["Ganado", C.ingresos], ["Gastos de operación (gasolina, tinto, peajes, arreglos)", C.operacion], ["Papeles y cuotas (SOAT, seguro, cuota)", C.fijos], ["Ganancia después de gastos de operación", C.netoOperativo], ["Ganancia neta, después de todo", C.neto], ["Viajes", C.viajes], ["Ganancia por viaje", C.porViaje == null ? "-" : C.porViaje]].forEach(function (f, i) {
          var r = co.getRow(4 + i); r.values = f; if (i !== 5) r.getCell(2).numFmt = MON; for (var k = 1; k <= 2; k++) r.getCell(k).border = bordes;
          if (i === 3 || i === 4) r.eachCell(function (c) { c.font = { bold: true }; c.fill = rell("#e8f0eb"); });
        });
        var fpl = 13; encabezado(co, fpl, ["Plataforma", "Ganado", "Viajes"]);
        C.plataformas.forEach(function (p, i) { var r = co.getRow(fpl + 1 + i); r.values = [p.nombre, p.total, p.viajes]; r.getCell(2).numFmt = MON; for (var k = 1; k <= 3; k++) r.getCell(k).border = bordes; });
        pie(co, fpl + C.plataformas.length + 3, 3);
      }

      wb.eachSheet(function (h) { if (h.name !== "Dashboard") h.pageSetup = { orientation: h.name === "Transacciones" ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 }; });
      return wb.xlsx.writeBuffer().then(function (buf) {
        return { bytes: new Uint8Array(buf), nombre: "NOVA-informe-" + archivoSeguro(inf.periodoNombre) + ".xlsx", tipo: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
      });
    });
  }

  raiz.NovaInformes = { pdf: generarPDF, excel: generarExcel, cop: cop, corto: corto };
})(typeof window !== "undefined" ? window : this);
