(function () {
  "use strict";

  var cfg = window.NOVA_CONFIG || {};
  var Parser = window.NovaParser;
  // ¿Corre dentro de la app de Android (Capacitor)?
  var enApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
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
          q(cliente.from("fin_metas").select("*").order("id")),
          q(cliente.from("fin_perfiles").select("*").maybeSingle()),
          q(cliente.from("fin_frecuentes").select("*").order("id"))
        ]).then(function (r) {
          var datos = { cuentas: r[0], categorias: r[1], movimientos: r[2], metas: r[3], perfil: r[4], frecuentes: r[5] };
          // Primera vez: crear el perfil, la cuenta principal y las categorías por defecto.
          var pendientes = [];
          if (!datos.perfil) {
            pendientes.push(q(cliente.from("fin_perfiles").insert({ presupuesto_ciclo: "mensual" }).select().single()).then(function (p) { datos.perfil = p; }));
          }
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
      guardarPerfil: function (cambios) { return q(cliente.from("fin_perfiles").update(cambios).eq("user_id", usuario.id).select().single()); },
      crearFrecuente: function (texto) { return q(cliente.from("fin_frecuentes").insert({ texto: texto }).select().single()); },
      borrarFrecuente: function (id) { return q(cliente.from("fin_frecuentes").delete().eq("id", id)); },
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
    // Coordenadas de ejemplo en Neiva para mostrar el mapa.
    var CAFE = [2.9273, -75.2819], U = [2.9349, -75.2808];
    var datos = {
      cuentas: [{ id: 1, nombre: "Nequi", tipo: "debito", saldo_inicial: 1850000 }],
      categorias: categorias,
      metas: [{ id: 1, nombre: "Audífonos nuevos", objetivo: 2000000, ahorrado: 1200000 }],
      perfil: { es_pro: false, presupuesto_monto: 1500000, presupuesto_ciclo: "mensual", guardar_ubicacion: false },
      frecuentes: [{ id: 1, texto: "tinto 3 mil" }, { id: 2, texto: "almuerzo 20 mil #trabajo" }],
      movimientos: [
        [0, 10, 42, "gasto", "Café y pandebono", 8500, "Comida", [], CAFE],
        [1, 18, 30, "gasto", "Netflix", 26900, "Suscripciones", [], null],
        [1, 13, 5, "gasto", "Almuerzo", 22000, "Comida", ["trabajo"], CAFE],
        [2, 8, 10, "gasto", "Uber a la universidad", 14500, "Transporte", ["universidad"], U],
        [3, 20, 0, "gasto", "Cine con amigos", 36000, "Entretenimiento", ["amigos"], null],
        [4, 9, 0, "ingreso", "Pago de quincena", 2400000, "Salario", ["trabajo"], null],
        [5, 12, 30, "gasto", "Mercado", 145000, "Comida", [], null],
        [8, 19, 0, "gasto", "Domicilio", 38000, "Comida", [], null],
        [9, 7, 45, "gasto", "Gasolina", 60000, "Transporte", [], null],
        [11, 15, 0, "gasto", "Droguería", 27000, "Salud", [], null],
        [12, 11, 0, "gasto", "Arriendo", 850000, "Hogar", [], null]
      ].map(function (m, i) {
        return { id: i + 1, cuenta_id: 1, fecha: hace(m[0], m[1], m[2]), tipo: m[3], descripcion: m[4], monto: m[5],
                 categoria_id: cat(m[6]), etiquetas: m[7], lat: m[8] ? m[8][0] : null, lng: m[8] ? m[8][1] : null };
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
      guardarPerfil: function (cambios) { Object.assign(datos.perfil, cambios); return Promise.resolve(copia(datos.perfil)); },
      crearFrecuente: function (texto) { var n = { id: sig++, texto: texto }; datos.frecuentes.push(n); return Promise.resolve(copia(n)); },
      borrarFrecuente: function (id) { datos.frecuentes = datos.frecuentes.filter(function (f) { return f.id !== id; }); return Promise.resolve(); },
      salir: function () { return Promise.resolve(); }
    };
  }

  // ---------- Estado y cálculos ----------
  function datosVacios() {
    return { cuentas: [], categorias: [], movimientos: [], metas: [], frecuentes: [],
             perfil: { es_pro: false, presupuesto_ciclo: "mensual", guardar_ubicacion: false } };
  }
  var filtroEtiqueta = null;
  var fuente = null;
  var datos = datosVacios();
  var pendiente = null;

  function categoria(id) { return datos.categorias.find(function (c) { return c.id === id; }); }
  function etiquetasUsadas() {
    var todas = [];
    datos.movimientos.forEach(function (m) { (m.etiquetas || []).forEach(function (e) { if (todas.indexOf(e) < 0) todas.push(e); }); });
    return todas.sort();
  }
  function tieneUbicacion(m) { return m.lat != null && m.lng != null; }
  // Distancia en metros entre dos pagos (fórmula del haversine).
  function distancia(a, b) {
    var R = 6371000, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function pagosCerca(m) {
    if (!tieneUbicacion(m)) return [];
    return datos.movimientos.filter(function (o) { return o.id !== m.id && tieneUbicacion(o) && distancia(m, o) <= 150; });
  }
  function cicloEfectivo() { return datos.perfil.presupuesto_ciclo || "mensual"; }
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
    var extra = el("div", "mov-extra");
    (m.etiquetas || []).forEach(function (e) { extra.append(el("span", "etiqueta-chip", "#" + e)); });
    if (tieneUbicacion(m)) {
      var mapa = el("a", null, "Ver en el mapa");
      mapa.href = "https://www.openstreetmap.org/?mlat=" + Number(m.lat) + "&mlon=" + Number(m.lng) + "#map=18/" + Number(m.lat) + "/" + Number(m.lng);
      mapa.target = "_blank"; mapa.rel = "noopener";
      extra.append(mapa);
      var cerca = pagosCerca(m);
      if (cerca.length) {
        var total = cerca.reduce(function (s, o) { return s + (o.tipo === "gasto" ? num(o.monto) : 0); }, 0);
        extra.append(el("small", null, cerca.length + (cerca.length === 1 ? " pago más" : " pagos más") + " aquí · " + pesos.format(total)));
      }
    }
    if (extra.childNodes.length) txt.append(extra);
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

    pintarPresupuesto();
    pintarFrecuentes();

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

  var fechaCorta = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" });

  function pintarPresupuesto() {
    var p = datos.perfil, ciclo = cicloEfectivo();
    var nombre = window.NovaPeriodos.CICLOS[ciclo];
    $("presupuesto-titulo").textContent = "Presupuesto " + nombre.toLowerCase();
    var barra = $("presupuesto-barra"), nota = $("presupuesto-nota");
    nota.className = "nota";
    barra.classList.remove("excedido");
    if (!p.presupuesto_monto) {
      $("presupuesto-valor").textContent = "Sin presupuesto";
      barra.style.width = "0";
      nota.textContent = "Toca Editar para definir cuánto quieres gastar.";
      return;
    }
    var rango = window.NovaPeriodos.periodo(ciclo);
    var gastado = datos.movimientos.reduce(function (s, m) {
      var f = new Date(m.fecha);
      return m.tipo === "gasto" && f >= rango.desde && f < rango.hasta ? s + num(m.monto) : s;
    }, 0);
    var limite = num(p.presupuesto_monto), resto = limite - gastado;
    var ultimoDia = new Date(rango.hasta.getTime() - 1);
    $("presupuesto-valor").textContent = pesos.format(gastado) + " de " + pesos.format(limite);
    barra.style.width = Math.min(100, (gastado / limite) * 100) + "%";
    if (resto >= 0) {
      nota.textContent = "Te quedan " + pesos.format(resto) + " hasta el " + fechaCorta.format(ultimoDia);
      if (resto / limite < 0.15) nota.classList.add("mal");
    } else {
      nota.textContent = "Te pasaste por " + pesos.format(-resto) + " en este periodo";
      nota.classList.add("mal");
      barra.classList.add("excedido");
    }
  }

  function pintarFrecuentes() {
    var cont = $("frecuentes");
    cont.replaceChildren();
    datos.frecuentes.forEach(function (f) {
      var chip = el("span", "frecuente");
      var usar = el("button", null, f.texto); usar.type = "button";
      usar.title = "Guardar ahora: " + f.texto;
      usar.addEventListener("click", function () {
        var r = Parser.interpretar(f.texto);
        if (!r.ok) { mensaje("rapido-mensaje", r.error, true); return; }
        usar.disabled = true;
        guardarRegistro(r, r.categoria, false).finally(function () { usar.disabled = false; });
      });
      var quitar = el("button", "quitar", "×"); quitar.type = "button";
      quitar.setAttribute("aria-label", "Quitar " + f.texto + " de frecuentes");
      quitar.addEventListener("click", function () {
        quitar.disabled = true;
        fuente.borrarFrecuente(f.id).then(function () {
          datos.frecuentes = datos.frecuentes.filter(function (x) { return x.id !== f.id; }); pintar();
        }).catch(function (e) { quitar.disabled = false; alerta(e); });
      });
      chip.append(usar, quitar);
      cont.append(chip);
    });
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
    // Filtro por etiqueta.
    var usadas = etiquetasUsadas(), filtros = $("filtro-etiquetas");
    if (filtroEtiqueta && usadas.indexOf(filtroEtiqueta) < 0) filtroEtiqueta = null;
    filtros.replaceChildren();
    if (usadas.length) {
      [null].concat(usadas).forEach(function (e) {
        var b = el("button", null, e ? "#" + e : "Todos"); b.type = "button";
        b.setAttribute("aria-pressed", String(filtroEtiqueta === e));
        b.addEventListener("click", function () { filtroEtiqueta = e; pintar(); });
        filtros.append(b);
      });
    }
    var movs = filtroEtiqueta
      ? datos.movimientos.filter(function (m) { return (m.etiquetas || []).indexOf(filtroEtiqueta) >= 0; })
      : datos.movimientos;
    var resumenFiltro = $("filtro-resumen");
    resumenFiltro.hidden = !filtroEtiqueta;
    if (filtroEtiqueta) {
      var g = 0, i = 0;
      movs.forEach(function (m) { if (m.tipo === "gasto") g += num(m.monto); else i += num(m.monto); });
      resumenFiltro.textContent = "#" + filtroEtiqueta + ": " + movs.length + " movimientos · gastos " + pesos.format(g) + " · ingresos " + pesos.format(i);
    }
    lista($("lista-todos"), movs, true, "Aún no hay movimientos.");
  }

  function pintarPerfil() {
    var p = datos.perfil;
    var sel = $("presupuesto-ciclo");
    sel.replaceChildren();
    Object.keys(window.NovaPeriodos.CICLOS).forEach(function (c) {
      var o = el("option", null, window.NovaPeriodos.CICLOS[c]);
      o.value = c; o.selected = c === cicloEfectivo();
      sel.append(o);
    });
    if (document.activeElement !== $("presupuesto-monto")) {
      $("presupuesto-monto").value = p.presupuesto_monto ? pesos.format(num(p.presupuesto_monto)).replace(/\s/g, "") : "";
    }
    $("perfil-ubicacion").checked = !!p.guardar_ubicacion;
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
    pintarInicio(r); pintarAnalisis(r); pintarCuentas(); pintarMetas(); pintarPerfil();
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
    var tags = $("previa-etiquetas");
    tags.replaceChildren();
    r.etiquetas.forEach(function (t) { tags.append(el("span", "etiqueta-chip", "#" + t)); });
    $("previa-frecuente").checked = false;
    opcionesCategoria(r.tipo, r.categoria);
    $("vista-previa").hidden = false;
    $("btn-guardar").focus();
  });

  $("btn-cancelar").addEventListener("click", function () { pendiente = null; $("vista-previa").hidden = true; });

  // Pide la ubicación actual; si no se puede, sigue sin ella.
  function ubicacionActual() {
    if (!datos.perfil.guardar_ubicacion || !navigator.geolocation) return Promise.resolve(null);
    return new Promise(function (resolver) {
      navigator.geolocation.getCurrentPosition(
        function (p) { resolver({ lat: p.coords.latitude, lng: p.coords.longitude }); },
        function () { resolver(null); },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  // Guarda un registro interpretado. Devuelve una promesa que no falla (los errores se muestran).
  function guardarRegistro(r, nombreCat, comoFrecuente, textoOriginal) {
    var cat = datos.categorias.find(function (c) { return c.nombre === nombreCat && c.tipo === r.tipo; });
    var conCategoria = cat ? Promise.resolve(cat) : fuente.crearCategoria({ nombre: nombreCat || r.categoria, tipo: r.tipo, icono: r.icono })
      .then(function (c) { datos.categorias.push(c); return c; });
    return Promise.all([conCategoria, ubicacionActual()]).then(function (res) {
      var c = res[0], lugar = res[1];
      var fila = { cuenta_id: datos.cuentas[0].id, categoria_id: c.id, tipo: r.tipo, descripcion: r.descripcion,
                   monto: r.monto, fecha: r.fecha, etiquetas: r.etiquetas };
      if (lugar) { fila.lat = lugar.lat; fila.lng = lugar.lng; }
      return fuente.crearMovimiento(fila);
    }).then(function (m) {
      datos.movimientos.unshift(m);
      datos.movimientos.sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });
      var aviso = (m.tipo === "ingreso" ? "Ingreso" : "Gasto") + " guardado: " + pesos.format(num(m.monto));
      if (!comoFrecuente) return aviso;
      return fuente.crearFrecuente(textoOriginal).then(function (f) {
        datos.frecuentes.push(f);
        return aviso + ". También quedó en tus frecuentes.";
      });
    }).then(function (aviso) {
      mensaje("rapido-mensaje", aviso);
      pintar();
      return true;
    }).catch(function (e) { alerta(e); return false; });
  }

  $("btn-guardar").addEventListener("click", function () {
    if (!pendiente) return;
    var btn = $("btn-guardar");
    btn.disabled = true;
    guardarRegistro(pendiente, $("previa-categoria").value, $("previa-frecuente").checked, $("entrada-rapida").value.trim())
      .then(function (ok) {
        if (!ok) return;
        pendiente = null;
        $("vista-previa").hidden = true;
        $("entrada-rapida").value = "";
      }).finally(function () { btn.disabled = false; });
  });

  // Dictado por voz. En la app de Android se usa el reconocimiento de voz del celular
  // (complemento de Capacitor); en el navegador, el de Chrome, Edge o Safari.
  var vozNativa = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition;
  var Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (vozNativa) {
    var vozApp = $("btn-voz");
    vozNativa.available().then(function (r) { vozApp.hidden = !(r && r.available); }).catch(function () {});
    vozApp.addEventListener("click", function () {
      vozApp.classList.add("escuchando");
      mensaje("rapido-mensaje", "Te escucho…");
      vozNativa.requestPermissions().then(function (p) {
        if (p.speechRecognition !== "granted") throw new Error("permiso");
        return vozNativa.start({ language: "es-CO", maxResults: 1, prompt: "Dime tu gasto o ingreso", partialResults: false, popup: true });
      }).then(function (r) {
        var dicho = r && r.matches && r.matches[0];
        if (!dicho) throw new Error("vacio");
        $("entrada-rapida").value = dicho;
        $("form-rapido").requestSubmit();
      }).catch(function (err) {
        mensaje("rapido-mensaje", err && err.message === "permiso" ? "Permite el micrófono para dictar." : "No te entendí. Intenta de nuevo o escríbelo.", true);
      }).finally(function () { vozApp.classList.remove("escuchando"); });
    });
  } else if (Reconocimiento) {
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

  // ---------- Foto del recibo ----------
  // Lee el texto de la foto en el mismo celular con Tesseract (sin servicios externos ni costo)
  // y le pasa el total y el negocio a la entrada rápida, para revisarlo antes de guardar.
  var lector = null;
  var numeroCO = new Intl.NumberFormat("es-CO");
  function cargarLector() {
    if (lector) return lector;
    lector = new Promise(function (ok, mal) {
      var s = document.createElement("script");
      s.src = "vendor/tesseract/tesseract.min.js";
      s.onload = function () {
        var base = new URL("vendor/tesseract/", location.href).href;
        window.Tesseract.createWorker("spa", 1, {
          workerPath: base + "worker.min.js",
          corePath: base + "core",
          langPath: base + "lang",
          gzip: true,
          logger: function (m) {
            if (m.status === "recognizing text") mensaje("rapido-mensaje", "Leyendo el recibo… " + Math.round(m.progress * 100) + "%");
          }
        }).then(ok, mal);
      };
      s.onerror = function () { mal(new Error("No se pudo cargar el lector de fotos. Revisa tu conexión.")); };
      document.head.appendChild(s);
    });
    lector.catch(function () { lector = null; });
    return lector;
  }

  // Achica la foto y la pasa a gris con más contraste: se lee mejor y más rápido.
  function prepararFoto(archivo) {
    return new Promise(function (ok, mal) {
      var url = URL.createObjectURL(archivo), img = new Image();
      img.onload = function () {
        var k = Math.min(1, 1800 / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        var g = c.getContext("2d");
        g.filter = "grayscale(1) contrast(1.4)";
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); mal(new Error("No se pudo abrir la foto.")); };
      img.src = url;
    });
  }

  $("btn-foto").addEventListener("click", function () { $("foto-recibo").click(); });
  $("foto-recibo").addEventListener("change", function (e) {
    var archivo = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!archivo) return;
    var btn = $("btn-foto");
    btn.disabled = true;
    mensaje("rapido-mensaje", "Preparando el lector de recibos… la primera vez tarda unos segundos.");
    Promise.all([cargarLector(), prepararFoto(archivo)]).then(function (res) {
      return res[0].recognize(res[1]);
    }).then(function (salida) {
      var rec = window.NovaRecibo.leerRecibo(salida.data.text);
      if (!rec.ok) {
        if (rec.comercio) $("entrada-rapida").value = rec.comercio + " ";
        $("entrada-rapida").focus();
        return mensaje("rapido-mensaje", rec.error, true);
      }
      $("entrada-rapida").value = numeroCO.format(rec.monto) + " " + (rec.comercio || "Compra");
      $("form-rapido").requestSubmit();
      // La descripción es el nombre del negocio completo, sin quitarle palabras como "La" o "El".
      if (pendiente && rec.comercio) { pendiente.descripcion = rec.comercio; $("previa-desc").textContent = rec.comercio; }
      mensaje("rapido-mensaje", "Leído del recibo. Revisa el valor: si no es correcto, corrige el texto y vuelve a tocar la flecha.");
    }).catch(function (err) {
      mensaje("rapido-mensaje", (err && err.message) || "No se pudo leer la foto.", true);
    }).finally(function () { btn.disabled = false; });
  });

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

  // ---------- Perfil y NOVA Pro ----------
  function guardarPerfil(cambios, idMensaje, textoOk) {
    return fuente.guardarPerfil(cambios).then(function (p) {
      datos.perfil = p; mensaje(idMensaje, textoOk); pintar();
    }).catch(function (err) { mensaje(idMensaje, err.message, true); pintar(); });
  }

  $("form-presupuesto").addEventListener("submit", function (e) {
    e.preventDefault();
    var txt = $("presupuesto-monto").value.trim();
    var monto = txt ? leerValor(txt) : null;
    if (txt && !(monto > 0)) return mensaje("presupuesto-mensaje", "No entendí el valor. Escribe por ejemplo 1 millón.", true);
    guardarPerfil({ presupuesto_monto: monto, presupuesto_ciclo: $("presupuesto-ciclo").value }, "presupuesto-mensaje",
      monto ? "Presupuesto guardado." : "Presupuesto quitado.");
  });

  $("perfil-ubicacion").addEventListener("change", function (e) {
    guardarPerfil({ guardar_ubicacion: e.target.checked }, "presupuesto-mensaje",
      e.target.checked ? "Desde ahora se guarda la ubicación de cada pago." : "Ya no se guarda la ubicación.");
  });

  // ---------- Sesión ----------
  // El enlace del correo para cambiar la contraseña llega con "type=recovery" (o con un
  // error si venció). Se lee antes de crear el cliente, porque este limpia la dirección.
  var hashInicial = new URLSearchParams(location.hash.replace(/^#/, ""));
  var esRecuperacion = hashInicial.get("type") === "recovery";
  var errorEnlace = hashInicial.get("error_description");

  var cliente = window.supabase && cfg.supabaseUrl ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey) : null;

  // Candado para ver u ocultar la contraseña.
  var CANDADO_CERRADO = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.2"/></svg>';
  var CANDADO_ABIERTO = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.7"/><circle cx="12" cy="16" r="1.2"/></svg>';
  document.querySelectorAll("[data-ver-clave]").forEach(function (b) {
    var input = $(b.dataset.verClave);
    function pintarCandado() {
      var visible = input.type === "text";
      b.innerHTML = visible ? CANDADO_ABIERTO : CANDADO_CERRADO;
      b.setAttribute("aria-pressed", String(visible));
      b.setAttribute("aria-label", visible ? "Ocultar la contraseña" : "Mostrar la contraseña");
    }
    b.addEventListener("click", function () {
      input.type = input.type === "password" ? "text" : "password";
      pintarCandado();
      input.focus();
    });
    pintarCandado();
  });

  // ¿Olvidaste tu contraseña?
  $("btn-olvide").addEventListener("click", function () {
    var email = $("auth-email").value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      $("auth-email").focus();
      return mensaje("auth-mensaje", "Escribe arriba el correo de tu cuenta y vuelve a tocar «¿Olvidaste tu contraseña?».", true);
    }
    if (!cliente) return mensaje("auth-mensaje", "No hay conexión con el servidor. Intenta más tarde.", true);
    var b = $("btn-olvide");
    b.disabled = true;
    mensaje("auth-mensaje", "Enviando el correo…");
    cliente.auth.resetPasswordForEmail(email, { redirectTo: cfg.sitioUrl || location.origin }).then(function (r) {
      if (r.error) throw r.error;
      mensaje("auth-mensaje", "Listo. Si " + email + " tiene cuenta, te llegará un correo con un enlace para crear una contraseña nueva. Revisa también Spam.");
    }).catch(function (err) {
      mensaje("auth-mensaje", /rate limit|too many/i.test(err.message)
        ? "Ya se enviaron varios correos. Espera unos minutos y vuelve a intentarlo."
        : "No se pudo enviar el correo: " + err.message, true);
    }).finally(function () { b.disabled = false; });
  });

  function pedirNuevaClave() {
    mostrar("auth");
    $("form-auth").hidden = true;
    $("btn-demo").hidden = true;
    $("form-nueva-clave").hidden = false;
    $("nueva-clave").focus();
  }

  $("form-nueva-clave").addEventListener("submit", function (e) {
    e.preventDefault();
    var c1 = $("nueva-clave").value, c2 = $("nueva-clave-2").value;
    if (c1.length < 6) return mensaje("nueva-clave-mensaje", "La contraseña debe tener al menos 6 caracteres.", true);
    if (c1 !== c2) return mensaje("nueva-clave-mensaje", "Las dos contraseñas no coinciden.", true);
    var btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    cliente.auth.updateUser({ password: c1 }).then(function (r) {
      if (r.error) throw r.error;
      history.replaceState(null, "", location.pathname);
      $("form-nueva-clave").hidden = true;
      $("form-auth").hidden = false;
      $("btn-demo").hidden = false;
      return entrar(fuenteSupabase(cliente, r.data.user));
    }).catch(function (err) {
      mensaje("nueva-clave-mensaje", /different from the old/i.test(err.message)
        ? "La nueva contraseña debe ser distinta de la anterior." : err.message, true);
    }).finally(function () { btn.disabled = false; });
  });

  // Botón para descargar la APK: solo en el navegador y solo si el archivo ya existe.
  if (!enApp) {
    fetch("descargas/NOVA.apk", { method: "HEAD" }).then(function (r) {
      var hay = r.ok && !/text\/html/.test(r.headers.get("content-type") || "");
      $("btn-apk").hidden = !hay;
      $("perfil-apk").hidden = !hay;
    }).catch(function () { /* sin APK publicada todavía */ });
  }

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
    $("btn-reenviar").hidden = true;
    // El correo de verificación le llega a la persona que crea la cuenta; su enlace abre la app.
    var op = accion === "registrar"
      ? cliente.auth.signUp({ email: email, password: clave, options: { emailRedirectTo: cfg.sitioUrl || location.origin } })
      : cliente.auth.signInWithPassword({ email: email, password: clave });
    op.then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.session) {
        mensaje("auth-mensaje", "Te enviamos un correo de verificación a " + email + ". Ábrelo, toca el enlace para confirmar tu cuenta y luego entra aquí. Revisa también Spam.");
        $("btn-reenviar").hidden = false;
        return;
      }
      mensaje("auth-mensaje", "");
      return entrar(fuenteSupabase(cliente, r.data.user));
    }).catch(function (err) {
      var noConfirmado = /not confirmed/i.test(err.message);
      var t = /invalid login/i.test(err.message) ? "Correo o contraseña incorrectos."
        : noConfirmado ? "Primero confirma tu correo con el enlace que te enviamos. Si no te llegó, pide otro abajo."
        : /already registered/i.test(err.message) ? "Ese correo ya tiene cuenta. Usa Entrar."
        : /rate limit|too many/i.test(err.message) ? "Ya se enviaron varios correos. Espera unos minutos y vuelve a intentarlo."
        : err.message;
      mensaje("auth-mensaje", t, true);
      $("btn-reenviar").hidden = !noConfirmado;
    }).finally(function () { botones.forEach(function (b) { b.disabled = false; }); });
  });

  $("btn-reenviar").addEventListener("click", function () {
    var email = $("auth-email").value.trim(), b = $("btn-reenviar");
    if (!email) { $("auth-email").focus(); return mensaje("auth-mensaje", "Escribe arriba el correo con el que creaste la cuenta.", true); }
    b.disabled = true;
    cliente.auth.resend({ type: "signup", email: email, options: { emailRedirectTo: cfg.sitioUrl || location.origin } }).then(function (r) {
      if (r.error) throw r.error;
      mensaje("auth-mensaje", "Listo, te enviamos otro correo de verificación a " + email + ".");
    }).catch(function (err) {
      mensaje("auth-mensaje", /rate limit|too many|seconds/i.test(err.message)
        ? "Espera un momento antes de pedir otro correo." : "No se pudo reenviar: " + err.message, true);
    }).finally(function () { b.disabled = false; });
  });

  $("btn-demo").addEventListener("click", function () { entrar(fuenteDemo()); });

  $("btn-salir").addEventListener("click", function () {
    fuente.salir().finally(function () {
      fuente = null; datos = datosVacios();
      $("form-auth").reset(); mensaje("auth-mensaje", ""); mostrar("auth");
    });
  });

  // Al abrir: si ya había sesión guardada, entrar directo.
  if (cliente) {
    cliente.auth.getSession().then(function (r) {
      var s = r.data && r.data.session;
      if (s && esRecuperacion) return pedirNuevaClave();
      if (s && hashInicial.get("type") === "signup") {
        // Llegó desde el enlace del correo de verificación.
        return entrar(fuenteSupabase(cliente, s.user)).then(function () {
          mensaje("rapido-mensaje", "¡Tu correo quedó verificado! Bienvenido a NOVA.");
        });
      }
      if (s) return entrar(fuenteSupabase(cliente, s.user));
      mostrar("auth");
      if (errorEnlace) {
        history.replaceState(null, "", location.pathname);
        mensaje("auth-mensaje", /expired|invalid/i.test(errorEnlace)
          ? "El enlace del correo ya venció o ya se usó. Pide uno nuevo con «¿Olvidaste tu contraseña?»."
          : "No se pudo abrir el enlace del correo: " + errorEnlace, true);
      }
    }).catch(function () { mostrar("auth"); });
  } else {
    mostrar("auth");
  }
})();
