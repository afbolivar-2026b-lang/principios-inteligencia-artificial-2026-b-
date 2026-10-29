(function () {
  "use strict";

  var cfg = window.NOVA_CONFIG || {};
  var Parser = window.NovaParser;
  var $ = function (id) { return document.getElementById(id); };
  var pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  var hora = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" });
  var diaMes = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" });
  var DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  var ICONOS = {
    comida: '<path d="M4 8h13v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6zM17 9h1.5a2.5 2.5 0 0 1 0 5H17M8 3v2M12 3v2"/>',
    transporte: '<path d="M5 17h14v-5l-2-5H7l-2 5zM5 12h14M7 20v-3M17 20v-3"/><circle cx="8" cy="14.5" r=".6"/><circle cx="16" cy="14.5" r=".6"/>',
    hogar: '<path d="M3 11l9-7 9 7M5 10v10h14V10"/>',
    suscripciones: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    entretenimiento: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
    salud: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    compras: '<path d="M6 8h12l-1 12H7zM9 8a3 3 0 0 1 6 0"/>',
    educacion: '<path d="M3 8l9-4 9 4-9 4zM7 10v5c3 2 7 2 10 0v-5"/>',
    ingreso: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14.5h2"/>',
    otro: '<circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>'
  };
  // El nombre viene de la base de datos, pero solo elige uno de los SVG fijos de arriba.
  function icono(nombre) {
    var trazo = Object.prototype.hasOwnProperty.call(ICONOS, nombre) ? ICONOS[nombre] : ICONOS.otro;
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + trazo + "</svg>";
  }

  function el(tag, clase, texto) {
    var e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function mensaje(id, texto, error) {
    var m = $(id);
    m.textContent = texto || "";
    m.classList.toggle("error", !!error);
  }

  // Convierte "2 millones", "850.000" o "20k" en número usando el mismo intérprete.
  function leerValor(texto) {
    var r = Parser.interpretar(texto);
    return r.ok ? r.monto : NaN;
  }

  // ---------- Tema ----------
  function leerTema() { try { return localStorage.getItem("nova-tema") || "sistema"; } catch (e) { return "sistema"; } }
  function aplicarTema(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("nova-tema", t); } catch (e) { /* sin almacenamiento */ }
    document.querySelectorAll("[data-tema]").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.tema === t)); });
  }
  aplicarTema(leerTema());

  // ---------- Fuentes de datos ----------
  // Las dos fuentes (Supabase y demostración) ofrecen las mismas operaciones.
  function fuenteSupabase(cliente, usuario) {
    function q(promesa) {
      return promesa.then(function (r) { if (r.error) throw new Error(r.error.message); return r.data; });
    }
    return {
      demo: false,
      email: usuario.email,
      cargar: function () {
        return Promise.all([
          q(cliente.from("fin_cuentas").select("*").order("id")),
          q(cliente.from("fin_categorias").select("*").order("nombre")),
          q(cliente.from("fin_movimientos").select("*").order("fecha", { ascending: false }).limit(2000)),
          q(cliente.from("fin_metas").select("*").order("id"))
        ]).then(function (r) {
          var datos = { cuentas: r[0], categorias: r[1], movimientos: r[2], metas: r[3] };
          // Primera vez: crear la cuenta principal y las categorías por defecto.
          var pendientes = [];
          if (!datos.cuentas.length) {
            pendientes.push(q(cliente.from("fin_cuentas").insert({ nombre: "Principal", tipo: "debito" }).select()).then(function (c) { datos.cuentas = c; }));
          }
          if (!datos.categorias.length) {
            var filas = Parser.CATEGORIAS.map(function (c) { return { nombre: c.nombre, tipo: c.tipo, icono: c.icono }; });
            pendientes.push(q(cliente.from("fin_categorias").insert(filas).select()).then(function (c) { datos.categorias = c; }));
          }
          return Promise.all(pendientes).then(function () { return datos; });
        });
      },
      crearMovimiento: function (m) { return q(cliente.from("fin_movimientos").insert(m).select().single()); },
      borrarMovimiento: function (id) { return q(cliente.from("fin_movimientos").delete().eq("id", id)); },
      crearCategoria: function (c) { return q(cliente.from("fin_categorias").insert(c).select().single()); },
      crearCuenta: function (c) { return q(cliente.from("fin_cuentas").insert(c).select().single()); },
      crearMeta: function (m) { return q(cliente.from("fin_metas").insert(m).select().single()); },
      actualizarMeta: function (id, cambios) { return q(cliente.from("fin_metas").update(cambios).eq("id", id).select().single()); },
      borrarMeta: function (id) { return q(cliente.from("fin_metas").delete().eq("id", id)); },
      salir: function () { return cliente.auth.signOut(); }
    };
  }

  function fuenteDemo() {
    var sig = 100;
    var hoy = new Date();
    function hace(dias, h, min) {
      var d = new Date(hoy); d.setDate(d.getDate() - dias); d.setHours(h, min || 0, 0, 0);
      if (d > hoy) d = new Date(hoy.getTime() - 20 * 60000); // los ejemplos de hoy nunca quedan en el futuro
      return d.toISOString();
    }
    var categorias = Parser.CATEGORIAS.map(function (c, i) { return { id: i + 1, nombre: c.nombre, tipo: c.tipo, icono: c.icono }; });
    function cat(n) { return categorias.find(function (c) { return c.nombre === n; }).id; }
    var datos = {
      cuentas: [{ id: 1, nombre: "Nequi", tipo: "debito", saldo_inicial: 1850000 }],
      categorias: categorias,
      metas: [{ id: 1, nombre: "Audífonos nuevos", objetivo: 2000000, ahorrado: 1200000 }],
      movimientos: [
        [0, 10, 42, "gasto", "Café y pandebono", 8500, "Comida"],
        [1, 18, 30, "gasto", "Netflix", 26900, "Suscripciones"],
        [1, 13, 5, "gasto", "Almuerzo", 22000, "Comida"],
        [2, 8, 10, "gasto", "Uber a la universidad", 14500, "Transporte"],
        [3, 20, 0, "gasto", "Cine con amigos", 36000, "Entretenimiento"],
        [4, 9, 0, "ingreso", "Pago de quincena", 2400000, "Salario"],
        [5, 12, 30, "gasto", "Mercado", 145000, "Comida"],
        [8, 19, 0, "gasto", "Domicilio", 38000, "Comida"],
        [9, 7, 45, "gasto", "Gasolina", 60000, "Transporte"],
        [11, 15, 0, "gasto", "Droguería", 27000, "Salud"],
        [12, 11, 0, "gasto", "Arriendo", 850000, "Hogar"]
      ].map(function (m, i) {
        return { id: i + 1, cuenta_id: 1, fecha: hace(m[0], m[1], m[2]), tipo: m[3], descripcion: m[4], monto: m[5], categoria_id: cat(m[6]) };
      })
    };
    function copia(o) { return JSON.parse(JSON.stringify(o)); }
    return {
      demo: true,
      email: "Demostración",
      cargar: function () { return Promise.resolve(copia(datos)); },
      crearMovimiento: function (m) { var n = Object.assign({ id: sig++ }, m); datos.movimientos.unshift(n); return Promise.resolve(copia(n)); },
      borrarMovimiento: function (id) { datos.movimientos = datos.movimientos.filter(function (m) { return m.id !== id; }); return Promise.resolve(); },
      crearCategoria: function (c) { var n = Object.assign({ id: sig++ }, c); datos.categorias.push(n); return Promise.resolve(copia(n)); },
      crearCuenta: function (c) { var n = Object.assign({ id: sig++ }, c); datos.cuentas.push(n); return Promise.resolve(copia(n)); },
      crearMeta: function (m) { var n = Object.assign({ id: sig++, ahorrado: 0 }, m); datos.metas.push(n); return Promise.resolve(copia(n)); },
      actualizarMeta: function (id, cambios) { var m = datos.metas.find(function (x) { return x.id === id; }); Object.assign(m, cambios); return Promise.resolve(copia(m)); },
      borrarMeta: function (id) { datos.metas = datos.metas.filter(function (m) { return m.id !== id; }); return Promise.resolve(); },
      salir: function () { return Promise.resolve(); }
    };
  }

  // ---------- Estado y cálculos ----------
  var fuente = null;
  var datos = { cuentas: [], categorias: [], movimientos: [], metas: [] };
  var pendiente = null;

  function categoria(id) { return datos.categorias.find(function (c) { return c.id === id; }); }
  function num(v) { return Number(v) || 0; }
  function inicioSemana(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function inicioMes(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

  function saldoCuenta(c) {
    return datos.movimientos.reduce(function (s, m) {
      return m.cuenta_id !== c.id ? s : s + (m.tipo === "ingreso" ? num(m.monto) : -num(m.monto));
    }, num(c.saldo_inicial));
  }

  function resumen() {
    var ahora = new Date(), semana = inicioSemana(ahora), semanaPasada = new Date(semana), mes = inicioMes(ahora);
    semanaPasada.setDate(semanaPasada.getDate() - 7);
    var r = { total: 0, netoMes: 0, ingresosMes: 0, gastosMes: 0, semana: 0, semanaPasada: 0, dias: [0, 0, 0, 0, 0, 0, 0], porCategoria: {} };
    datos.cuentas.forEach(function (c) { r.total += saldoCuenta(c); });
    datos.movimientos.forEach(function (m) {
      var f = new Date(m.fecha), v = num(m.monto), gasto = m.tipo === "gasto";
      if (f >= mes) {
        r.netoMes += gasto ? -v : v;
        if (gasto) { r.gastosMes += v; r.porCategoria[m.categoria_id] = (r.porCategoria[m.categoria_id] || 0) + v; }
        else r.ingresosMes += v;
      }
      if (!gasto) return;
      if (f >= semana) { r.semana += v; r.dias[(f.getDay() + 6) % 7] += v; }
      else if (f >= semanaPasada) r.semanaPasada += v;
    });
    return r;
  }

  // ---------- Pintar ----------
  function filaMovimiento(m, conBorrar) {
    var c = categoria(m.categoria_id) || { nombre: "Sin categoría", icono: "otro" };
    var li = el("li", "mov");
    var ic = el("span", "mov-icono"); ic.innerHTML = icono(c.icono);
    var txt = el("div", "mov-texto");
    txt.append(el("strong", null, m.descripcion), el("small", null, "• " + c.nombre));
    var f = new Date(m.fecha), hoy = new Date(), ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
    var cuando = f.toDateString() === hoy.toDateString() ? "Hoy" : f.toDateString() === ayer.toDateString() ? "Ayer" : diaMes.format(f);
    var val = el("div", "mov-valor");
    var monto = el("strong", m.tipo === "ingreso" ? "positivo" : null, (m.tipo === "ingreso" ? "+" : "−") + pesos.format(num(m.monto)));
    val.append(monto, el("small", null, cuando + " · " + hora.format(f)));
    li.append(ic, txt, val);
    if (conBorrar) {
      var b = el("button", "icono-btn");
      b.type = "button"; b.setAttribute("aria-label", "Borrar " + m.descripcion);
      b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
      b.addEventListener("click", function () {
        b.disabled = true;
        fuente.borrarMovimiento(m.id).then(function () {
          datos.movimientos = datos.movimientos.filter(function (x) { return x.id !== m.id; });
          pintar();
        }).catch(function (e) { b.disabled = false; alerta(e); });
      });
      li.append(b);
    }
    return li;
  }

  function lista(ul, items, conBorrar, vacio) {
    ul.replaceChildren();
    if (!items.length) { ul.append(el("li", "vacio", vacio)); return; }
    items.forEach(function (m) { ul.append(filaMovimiento(m, conBorrar)); });
  }

  function pintarInicio(r) {
    $("saldo-total").textContent = pesos.format(r.total);
    var base = r.total - r.netoMes;
    var pct = base > 0 ? (r.netoMes / base) * 100 : null;
    $("saldo-mes").textContent = pct === null
      ? (r.netoMes >= 0 ? "+" : "−") + pesos.format(Math.abs(r.netoMes)) + " este mes"
      : (pct >= 0 ? "↗ +" : "↘ ") + pct.toFixed(1).replace(".", ",") + "% este mes";

    var meta = datos.metas[0];
    if (meta) {
      var p = Math.min(100, (num(meta.ahorrado) / num(meta.objetivo)) * 100);
      $("meta-valor").textContent = pesos.format(num(meta.ahorrado)) + " / " + pesos.format(num(meta.objetivo));
      $("meta-barra").style.width = p + "%";
      $("meta-nota").textContent = meta.nombre + " • " + Math.round(p) + "%";
    } else {
      $("meta-valor").textContent = "Sin metas";
      $("meta-barra").style.width = "0";
      $("meta-nota").textContent = "Crea una en Metas";
    }

    $("semana-valor").textContent = pesos.format(r.semana);
    var nota = $("semana-nota");
    nota.className = "nota";
    if (r.semanaPasada > 0) {
      var cambio = ((r.semana - r.semanaPasada) / r.semanaPasada) * 100;
      nota.textContent = (cambio <= 0 ? "Bajó " : "Subió ") + Math.abs(Math.round(cambio)) + "% vs la semana pasada";
      nota.classList.add(cambio <= 0 ? "bien" : "mal");
      $("semana-barra").style.width = Math.min(100, (r.semana / r.semanaPasada) * 100) + "%";
    } else {
      nota.textContent = "Sin datos de la semana pasada";
      $("semana-barra").style.width = r.semana ? "100%" : "0";
    }

    var g = $("grafico-semana"), max = Math.max.apply(null, r.dias.concat([1])), hoyIdx = (new Date().getDay() + 6) % 7;
    g.replaceChildren();
    g.setAttribute("aria-label", "Gastos por día: " + DIAS.map(function (d, i) { return d + " " + pesos.format(r.dias[i]); }).join(", "));
    r.dias.forEach(function (v, i) {
      var d = el("div", "dia" + (i === hoyIdx ? " hoy" : i > hoyIdx ? " futuro" : ""));
      var col = el("div", "col"), barra = el("span");
      barra.style.height = Math.max(6, (v / max) * 100) + "%";
      barra.title = DIAS[i] + ": " + pesos.format(v);
      col.append(barra);
      d.append(col, el("small", null, DIAS[i]));
      g.append(d);
    });

    lista($("lista-reciente"), datos.movimientos.slice(0, 5), false, "Aún no hay movimientos. Escribe arriba tu primer gasto.");
  }

  function pintarAnalisis(r) {
    $("mes-ingresos").textContent = pesos.format(r.ingresosMes);
    $("mes-gastos").textContent = pesos.format(r.gastosMes);
    var ul = $("por-categoria");
    ul.replaceChildren();
    var filas = Object.keys(r.porCategoria).map(function (id) { return { c: categoria(Number(id)), v: r.porCategoria[id] }; })
      .sort(function (a, b) { return b.v - a.v; });
    if (!filas.length) ul.append(el("li", "vacio", "Sin gastos este mes."));
    filas.forEach(function (f) {
      var li = el("li", "cat-fila");
      var barra = el("div", "barra"), s = el("span");
      s.style.width = (f.v / r.gastosMes) * 100 + "%";
      barra.append(s);
      li.append(el("span", null, f.c ? f.c.nombre : "Sin categoría"), el("strong", null, pesos.format(f.v)), barra);
      ul.append(li);
    });
    lista($("lista-todos"), datos.movimientos, true, "Aún no hay movimientos.");
  }

  function pintarCuentas() {
    var ul = $("lista-cuentas");
    ul.replaceChildren();
    datos.cuentas.forEach(function (c) {
      var li = el("li", "cuenta");
      var izq = el("div", "mov-texto");
      izq.append(el("strong", null, c.nombre), el("small", null, { debito: "Débito", ahorro: "Ahorros", efectivo: "Efectivo", credito: "Crédito" }[c.tipo] || c.tipo));
      li.append(izq, el("strong", null, pesos.format(saldoCuenta(c))));
      ul.append(li);
    });
  }

  function pintarMetas() {
    var ul = $("lista-metas");
    ul.replaceChildren();
    if (!datos.metas.length) ul.append(el("li", "vacio", "Todavía no tienes metas."));
    datos.metas.forEach(function (m) {
      var p = Math.min(100, (num(m.ahorrado) / num(m.objetivo)) * 100);
      var li = el("li", "meta");
      var cab = el("div", "meta-cabeza");
      cab.append(el("strong", null, m.nombre), el("span", "nota", Math.round(p) + "%"));
      var barra = el("div", "barra"), s = el("span"); s.style.width = p + "%"; barra.append(s);
      var abono = el("form", "meta-abono");
      var inp = el("input"); inp.inputMode = "numeric"; inp.placeholder = "Abonar, ej. 50 mil"; inp.setAttribute("aria-label", "Valor a abonar a " + m.nombre);
      var ok = el("button", "primario", "Abonar"); ok.type = "submit";
      var del = el("button", "peligro", "Borrar"); del.type = "button";
      abono.append(inp, ok, del);
      abono.addEventListener("submit", function (e) {
        e.preventDefault();
        var v = leerValor(inp.value);
        if (!(v > 0)) { inp.focus(); return; }
        ok.disabled = true;
        fuente.actualizarMeta(m.id, { ahorrado: num(m.ahorrado) + v }).then(function (n) {
          Object.assign(m, n); pintar();
        }).catch(alerta).finally(function () { ok.disabled = false; });
      });
      del.addEventListener("click", function () {
        del.disabled = true;
        fuente.borrarMeta(m.id).then(function () {
          datos.metas = datos.metas.filter(function (x) { return x.id !== m.id; }); pintar();
        }).catch(function (e) { del.disabled = false; alerta(e); });
      });
      li.append(cab, el("span", null, pesos.format(num(m.ahorrado)) + " de " + pesos.format(num(m.objetivo))), barra, abono);
      ul.append(li);
    });
  }

  function pintar() {
    var r = resumen();
    pintarInicio(r); pintarAnalisis(r); pintarCuentas(); pintarMetas();
    $("perfil-email").textContent = fuente.email;
    $("avatar").textContent = (fuente.email || "?").trim().charAt(0).toUpperCase();
  }

  function alerta(e) { mensaje("rapido-mensaje", "No se pudo guardar: " + (e && e.message ? e.message : e), true); }

  // ---------- Navegación ----------
  function ir(vista) {
    document.querySelectorAll(".vista").forEach(function (v) { v.hidden = v.dataset.vista !== vista; });
    document.querySelectorAll(".nav-inferior button").forEach(function (b) {
      b.classList.toggle("activo", b.dataset.ir === vista);
      if (b.dataset.ir === vista) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
  }
  document.querySelectorAll("[data-ir]").forEach(function (b) { b.addEventListener("click", function () { ir(b.dataset.ir); }); });
  document.querySelectorAll("[data-tema]").forEach(function (b) { b.addEventListener("click", function () { aplicarTema(b.dataset.tema); }); });

  // ---------- Entrada rápida ----------
  function opcionesCategoria(tipo, elegida) {
    var sel = $("previa-categoria");
    sel.replaceChildren();
    datos.categorias.filter(function (c) { return c.tipo === tipo; }).forEach(function (c) {
      var o = el("option", null, c.nombre); o.value = c.nombre; o.selected = c.nombre === elegida; sel.append(o);
    });
  }

  $("form-rapido").addEventListener("submit", function (e) {
    e.preventDefault();
    var r = Parser.interpretar($("entrada-rapida").value);
    if (!r.ok) { mensaje("rapido-mensaje", r.error, true); $("vista-previa").hidden = true; return; }
    pendiente = r;
    mensaje("rapido-mensaje", "");
    var chip = $("previa-tipo");
    chip.textContent = r.tipo === "ingreso" ? "Ingreso" : "Gasto";
    chip.className = "chip " + r.tipo;
    $("previa-monto").textContent = pesos.format(r.monto);
    $("previa-desc").textContent = r.descripcion;
    opcionesCategoria(r.tipo, r.categoria);
    $("vista-previa").hidden = false;
    $("btn-guardar").focus();
  });

  $("btn-cancelar").addEventListener("click", function () { pendiente = null; $("vista-previa").hidden = true; });

  $("btn-guardar").addEventListener("click", function () {
    if (!pendiente) return;
    var r = pendiente, btn = $("btn-guardar"), nombreCat = $("previa-categoria").value;
    btn.disabled = true;
    var cat = datos.categorias.find(function (c) { return c.nombre === nombreCat && c.tipo === r.tipo; });
    var conCategoria = cat ? Promise.resolve(cat) : fuente.crearCategoria({ nombre: nombreCat || r.categoria, tipo: r.tipo, icono: r.icono })
      .then(function (c) { datos.categorias.push(c); return c; });
    conCategoria.then(function (c) {
      return fuente.crearMovimiento({ cuenta_id: datos.cuentas[0].id, categoria_id: c.id, tipo: r.tipo, descripcion: r.descripcion, monto: r.monto, fecha: r.fecha });
    }).then(function (m) {
      datos.movimientos.unshift(m);
      datos.movimientos.sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });
      pendiente = null;
      $("vista-previa").hidden = true;
      $("entrada-rapida").value = "";
      mensaje("rapido-mensaje", (m.tipo === "ingreso" ? "Ingreso" : "Gasto") + " guardado: " + pesos.format(num(m.monto)));
      pintar();
    }).catch(alerta).finally(function () { btn.disabled = false; });
  });

  // Dictado por voz (Chrome, Edge y Safari recientes).
  var Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (Reconocimiento) {
    var voz = $("btn-voz");
    voz.hidden = false;
    voz.addEventListener("click", function () {
      var rec = new Reconocimiento();
      rec.lang = "es-CO"; rec.interimResults = false; rec.maxAlternatives = 1;
      voz.classList.add("escuchando");
      mensaje("rapido-mensaje", "Te escucho…");
      rec.onresult = function (ev) {
        $("entrada-rapida").value = ev.results[0][0].transcript;
        $("form-rapido").requestSubmit();
      };
      rec.onerror = function (ev) {
        mensaje("rapido-mensaje", ev.error === "not-allowed" ? "Permite el micrófono para dictar." : "No te entendí. Intenta de nuevo o escríbelo.", true);
      };
      rec.onend = function () { voz.classList.remove("escuchando"); if ($("rapido-mensaje").textContent === "Te escucho…") mensaje("rapido-mensaje", ""); };
      rec.start();
    });
  }

  // ---------- Formularios de cuentas y metas ----------
  $("form-cuenta").addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("cuenta-nombre").value.trim();
    var saldoTxt = $("cuenta-saldo").value.trim();
    var saldo = saldoTxt ? leerValor(saldoTxt) : 0;
    if (!nombre) return mensaje("cuenta-mensaje", "Escribe el nombre de la cuenta.", true);
    if (!isFinite(saldo)) return mensaje("cuenta-mensaje", "No entendí el saldo. Escribe por ejemplo 500 mil.", true);
    fuente.crearCuenta({ nombre: nombre, tipo: $("cuenta-tipo").value, saldo_inicial: saldo }).then(function (c) {
      datos.cuentas.push(c); e.target.reset(); mensaje("cuenta-mensaje", "Cuenta agregada."); pintar();
    }).catch(function (err) { mensaje("cuenta-mensaje", err.message, true); });
  });

  $("form-meta").addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("meta-nombre").value.trim(), objetivo = leerValor($("meta-objetivo").value);
    if (!nombre) return mensaje("meta-mensaje", "Escribe para qué ahorras.", true);
    if (!(objetivo > 0)) return mensaje("meta-mensaje", "No entendí el valor. Escribe por ejemplo 2 millones.", true);
    fuente.crearMeta({ nombre: nombre, objetivo: objetivo }).then(function (m) {
      datos.metas.push(m); e.target.reset(); mensaje("meta-mensaje", "Meta creada."); pintar();
    }).catch(function (err) { mensaje("meta-mensaje", err.message, true); });
  });

  // ---------- Sesión ----------
  var cliente = window.supabase && cfg.supabaseUrl ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey) : null;

  function mostrar(pantalla) {
    $("cargando").hidden = true;
    $("pantalla-auth").hidden = pantalla !== "auth";
    $("pantalla-app").hidden = pantalla !== "app";
  }

  function entrar(nuevaFuente) {
    fuente = nuevaFuente;
    $("aviso-demo").hidden = !fuente.demo;
    $("cargando").hidden = false;
    return fuente.cargar().then(function (d) {
      datos = d;
      mostrar("app"); ir("inicio"); pintar();
    }).catch(function (e) {
      mostrar("auth");
      mensaje("auth-mensaje", "No se pudieron cargar tus datos: " + e.message, true);
    });
  }

  $("form-auth").addEventListener("submit", function (e) {
    e.preventDefault();
    var accion = e.submitter && e.submitter.dataset.accion;
    var email = $("auth-email").value.trim(), clave = $("auth-clave").value;
    if (!email || clave.length < 6) return mensaje("auth-mensaje", "Escribe tu correo y una contraseña de al menos 6 caracteres.", true);
    if (!cliente) return mensaje("auth-mensaje", "No hay conexión con el servidor. Prueba la demostración.", true);
    var botones = e.target.querySelectorAll("button");
    botones.forEach(function (b) { b.disabled = true; });
    mensaje("auth-mensaje", accion === "registrar" ? "Creando tu cuenta…" : "Entrando…");
    var op = accion === "registrar"
      ? cliente.auth.signUp({ email: email, password: clave })
      : cliente.auth.signInWithPassword({ email: email, password: clave });
    op.then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.session) { mensaje("auth-mensaje", "Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego entra aquí."); return; }
      mensaje("auth-mensaje", "");
      return entrar(fuenteSupabase(cliente, r.data.user));
    }).catch(function (err) {
      var t = /invalid login/i.test(err.message) ? "Correo o contraseña incorrectos."
        : /not confirmed/i.test(err.message) ? "Primero confirma tu correo con el enlace que te enviamos."
        : /already registered/i.test(err.message) ? "Ese correo ya tiene cuenta. Usa Entrar."
        : err.message;
      mensaje("auth-mensaje", t, true);
    }).finally(function () { botones.forEach(function (b) { b.disabled = false; }); });
  });

  $("btn-demo").addEventListener("click", function () { entrar(fuenteDemo()); });

  $("btn-salir").addEventListener("click", function () {
    fuente.salir().finally(function () {
      fuente = null; datos = { cuentas: [], categorias: [], movimientos: [], metas: [] };
      $("form-auth").reset(); mensaje("auth-mensaje", ""); mostrar("auth");
    });
  });

  // Al abrir: si ya había sesión guardada, entrar directo.
  if (cliente) {
    cliente.auth.getSession().then(function (r) {
      var s = r.data && r.data.session;
      if (s) entrar(fuenteSupabase(cliente, s.user)); else mostrar("auth");
    }).catch(function () { mostrar("auth"); });
  } else {
    mostrar("auth");
  }
})();
