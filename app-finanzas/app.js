(function () {
  "use strict";

  var cfg = window.NOVA_CONFIG || {};
  var Parser = window.NovaParser;
  var A = window.NovaAnalisis;
  var Mon = window.NovaMonedas;
  var Periodos = window.NovaPeriodos;
  // ¿Corre dentro de la app de Android (Capacitor)?
  var enApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var $ = function (id) { return document.getElementById(id); };
  var pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  var numeroCO = new Intl.NumberFormat("es-CO");
  var hora = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" });
  var fechaCorta = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" });
  var fechaLarga = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
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
  var OJO_ABIERTO = '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var OJO_CERRADO = '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

  // Íconos para las categorías (con palabras para el buscador) y colores.
  var EMOJIS = [
    ["🍔", "comida hamburguesa"], ["🍕", "pizza comida"], ["🍽️", "restaurante comida plato"], ["☕", "cafe tinto"], ["🥐", "pan panaderia"],
    ["🛒", "mercado supermercado compras"], ["🍎", "fruta mercado"], ["🥩", "carne carniceria"], ["🍺", "cerveza trago bar"], ["🍷", "vino trago"],
    ["🍰", "postre torta"], ["🍦", "helado"], ["🥤", "gaseosa bebida"], ["💧", "agua botella"], ["🚗", "carro auto"],
    ["🏍️", "moto"], ["🚕", "taxi uber"], ["🚌", "bus transporte"], ["⛽", "gasolina combustible"], ["🅿️", "parqueadero parqueo"],
    ["🔧", "mecanico taller arreglo"], ["🛞", "llanta"], ["✈️", "avion viaje vuelo"], ["🧳", "viaje maleta"], ["🚲", "bicicleta"],
    ["🏠", "casa hogar arriendo"], ["💡", "luz energia servicios"], ["🚿", "agua servicios"], ["🔥", "gas"], ["📶", "internet wifi"],
    ["📱", "celular plan"], ["💻", "computador"], ["📺", "television suscripcion"], ["🎬", "cine pelicula"], ["🎮", "videojuego juego"],
    ["🎵", "musica spotify"], ["🎉", "fiesta rumba"], ["⚽", "futbol deporte"], ["🏋️", "gimnasio gym"], ["💊", "medicina drogueria"],
    ["🩺", "medico salud cita"], ["🦷", "odontologo dientes"], ["💅", "unas belleza"], ["💇", "peluqueria corte"], ["🧴", "aseo cuidado personal"],
    ["👕", "ropa camisa"], ["👟", "zapatos tenis"], ["👜", "bolso"], ["💍", "joya"], ["🎁", "regalo"],
    ["👶", "bebe hijos"], ["🧒", "hijos ninos"], ["🐶", "perro mascota"], ["🐱", "gato mascota"], ["🎓", "universidad educacion"],
    ["📚", "libros estudio"], ["✏️", "colegio utiles"], ["💼", "trabajo salario"], ["💰", "dinero ingreso"], ["💵", "efectivo plata"],
    ["🏦", "banco"], ["💳", "tarjeta credito"], ["📈", "inversion"], ["🪙", "ahorro moneda"], ["🧾", "factura recibo"],
    ["🤝", "prestamo deuda"], ["🏆", "bono premio"], ["🛠️", "herramientas freelance"], ["🧹", "limpieza aseo"], ["🌱", "plantas jardin"],
    ["⛪", "iglesia diezmo"], ["❤️", "donacion pareja"], ["🛡️", "seguro"], ["📦", "envio paquete"], ["🧺", "lavanderia"],
    ["🚬", "cigarrillo"], ["🎰", "apuestas loteria"], ["📍", "gps ubicacion"], ["🔔", "otros"], ["⭐", "favorito otros"]
  ];
  var COLORES = ["#2ee06f", "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
    "#ec4899", "#f43f5e", "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#65a30d", "#0f766e", "#1d4ed8",
    "#7c3aed", "#be123c", "#b45309", "#78716c", "#64748b", "#475569", "#a16207", "#9f1239", "#155e75", "#374151"];
  var COLOR_POR_ICONO = { comida: "#22c55e", transporte: "#3b82f6", hogar: "#6366f1", suscripciones: "#8b5cf6", entretenimiento: "#d946ef",
    salud: "#ef4444", compras: "#f97316", educacion: "#0ea5e9", ingreso: "#2ee06f", otro: "#64748b" };

  function el(tag, clase, texto) {
    var e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  }

  // Pinta el ícono de una categoría: uno de los SVG fijos o el emoji elegido (como texto, nunca como HTML).
  function pintarIcono(span, c) {
    c = c || { icono: "otro" };
    span.replaceChildren();
    if (Object.prototype.hasOwnProperty.call(ICONOS, c.icono || "otro")) {
      span.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONOS[c.icono || "otro"] + "</svg>";
    } else {
      span.append(el("span", "emoji", c.icono));
    }
    span.style.setProperty("--c", colorDe(c));
    return span;
  }
  function colorDe(c) { return (c && c.color) || COLOR_POR_ICONO[c && c.icono] || "var(--accent)"; }

  function mensaje(id, texto, error) {
    var m = $(id);
    m.textContent = texto || "";
    m.classList.toggle("error", !!error);
  }

  var toastTimer = null;
  function toast(texto) {
    var t = $("toast");
    t.textContent = texto;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  // Convierte "2 millones", "850.000" o "20k" en número usando el mismo intérprete.
  function leerValor(texto) {
    var r = Parser.interpretar(texto);
    return r.ok ? r.monto : NaN;
  }

  function guardarLocal(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ } }
  function leerLocal(clave, defecto) { try { var v = localStorage.getItem(clave); return v ? JSON.parse(v) : defecto; } catch (e) { return defecto; } }

  // ---------- Tema y valores ocultos ----------
  function aplicarTema(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("nova-tema", t); } catch (e) { /* sin almacenamiento */ }
    document.querySelectorAll("[data-tema]").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.tema === t)); });
  }
  aplicarTema((function () { try { return localStorage.getItem("nova-tema") || "sistema"; } catch (e) { return "sistema"; } })());

  var ocultos = leerLocal("nova-ocultos", false);
  function dinero(v) { return ocultos ? "$ ••••" : pesos.format(v); }
  function dineroSigno(v, tipo) { return ocultos ? "$ ••••" : (tipo === "ingreso" ? "+" : "−") + pesos.format(Math.abs(v)); }
  function pintarOjo() {
    var b = $("btn-ojo");
    b.innerHTML = ocultos ? OJO_CERRADO : OJO_ABIERTO;
    b.setAttribute("aria-pressed", String(ocultos));
    b.setAttribute("aria-label", ocultos ? "Mostrar los valores" : "Ocultar los valores");
  }
  $("btn-ojo").addEventListener("click", function () { ocultos = !ocultos; guardarLocal("nova-ocultos", ocultos); pintarOjo(); if (fuente) pintar(); });
  pintarOjo();

  // ---------- Fuentes de datos ----------
  // Las dos fuentes (Supabase y demostración) ofrecen las mismas operaciones sobre las mismas tablas.
  var TABLAS = ["cuentas", "categorias", "movimientos", "metas", "frecuentes", "programados", "limites", "conversaciones", "documentos"];

  function fuenteSupabase(cliente, usuario) {
    function q(promesa) {
      return promesa.then(function (r) { if (r.error) throw new Error(r.error.message); return r.data; });
    }
    function t(nombre) { return cliente.from("fin_" + nombre); }
    return {
      demo: false,
      email: usuario.email,
      nombre: (usuario.user_metadata && (usuario.user_metadata.full_name || usuario.user_metadata.name)) || "",
      cargar: function () {
        return Promise.all([
          q(t("cuentas").select("*").order("id")),
          q(t("categorias").select("*").order("nombre")),
          q(t("movimientos").select("*").order("fecha", { ascending: false }).limit(3000)),
          q(t("metas").select("*").order("id")),
          q(t("perfiles").select("*").maybeSingle()),
          q(t("frecuentes").select("*").order("id")),
          q(t("programados").select("*").order("proxima")),
          q(t("limites").select("*").order("id")),
          q(t("conversaciones").select("*").order("actualizado_en", { ascending: false }).limit(60)),
          q(t("documentos").select("*").order("vence"))
        ]).then(function (r) {
          var datos = { cuentas: r[0], categorias: r[1], movimientos: r[2], metas: r[3], perfil: r[4], frecuentes: r[5], programados: r[6], limites: r[7], conversaciones: r[8], documentos: r[9] };
          // Primera vez: crear el perfil, la cuenta principal y las categorías por defecto.
          var pendientes = [];
          if (!datos.perfil) {
            pendientes.push(q(t("perfiles").insert({ presupuesto_ciclo: "mensual" }).select().single()).then(function (p) { datos.perfil = p; }));
          }
          if (!datos.cuentas.length) {
            pendientes.push(q(t("cuentas").insert({ nombre: "Principal", tipo: "debito" }).select()).then(function (c) { datos.cuentas = c; }));
          }
          if (!datos.categorias.length) {
            var filas = Parser.CATEGORIAS.map(function (c) { return { nombre: c.nombre, tipo: c.tipo, icono: c.icono, grupo: A.grupoDe(c) }; });
            pendientes.push(q(t("categorias").insert(filas).select()).then(function (c) { datos.categorias = c; }));
          }
          return Promise.all(pendientes).then(function () { return datos; });
        });
      },
      crear: function (tabla, fila) { return q(t(tabla).insert(fila).select().single()); },
      crearVarios: function (tabla, filas) { return q(t(tabla).insert(filas).select()); },
      actualizar: function (tabla, id, cambios) { return q(t(tabla).update(cambios).eq("id", id).select().single()); },
      borrar: function (tabla, id) { return q(t(tabla).delete().eq("id", id)); },
      guardarPerfil: function (cambios) { return q(t("perfiles").update(cambios).eq("user_id", usuario.id).select().single()); },
      salir: function () { return cliente.auth.signOut(); }
    };
  }

  function fuenteDemo() {
    var sig = 1000;
    var hoy = new Date();
    function hace(dias, h, min) {
      var d = new Date(hoy); d.setDate(d.getDate() - dias); d.setHours(h, min || 0, 0, 0);
      if (d > hoy) d = new Date(hoy.getTime() - 20 * 60000); // los ejemplos de hoy nunca quedan en el futuro
      return d.toISOString();
    }
    var categorias = Parser.CATEGORIAS.map(function (c, i) { return { id: i + 1, nombre: c.nombre, tipo: c.tipo, icono: c.icono, grupo: A.grupoDe(c), color: null }; });
    categorias.push({ id: 50, nombre: "Mascotas", tipo: "gasto", icono: "🐶", grupo: "Familia", color: "#f59e0b" });
    function cat(n) { return categorias.find(function (c) { return c.nombre === n; }).id; }
    // Coordenadas de ejemplo en Neiva para mostrar el mapa.
    var CAFE = [2.9273, -75.2819], U = [2.9349, -75.2808];
    var tabla = {
      cuentas: [{ id: 1, nombre: "Nequi", tipo: "debito", saldo_inicial: 1850000 }],
      categorias: categorias,
      metas: [{ id: 1, nombre: "Audífonos nuevos", objetivo: 2000000, ahorrado: 1200000 }],
      frecuentes: [{ id: 1, texto: "tinto 3 mil" }, { id: 2, texto: "almuerzo 20 mil #trabajo" }],
      programados: [{ id: 1, cuenta_id: 1, categoria_id: cat("Suscripciones"), tipo: "gasto", monto: 26900, descripcion: "Netflix", etiquetas: [],
                      frecuencia: "mensual", proxima: A.siguienteFecha(A.claveDia(hace(1, 12)), "mensual"), activo: true }],
      limites: [{ id: 1, categoria_id: cat("Comida"), monto: 400000, ciclo: "mensual", recurrente: true, creado_en: hace(20, 9) }],
      conversaciones: [],
      documentos: [],
      movimientos: [
        [0, 10, 42, "gasto", "Café y pandebono", 8500, "Comida", [], CAFE],
        [1, 18, 30, "gasto", "Netflix", 26900, "Suscripciones", [], null],
        [1, 13, 5, "gasto", "Almuerzo", 22000, "Comida", ["trabajo"], CAFE],
        [2, 8, 10, "gasto", "Uber a la universidad", 14500, "Transporte", ["universidad"], U],
        [3, 20, 0, "gasto", "Cine con amigos", 36000, "Entretenimiento", ["amigos"], null],
        [4, 9, 0, "ingreso", "Pago de quincena", 2400000, "Salario", ["trabajo"], null],
        [5, 12, 30, "gasto", "Mercado", 145000, "Comida", [], null],
        [6, 17, 0, "gasto", "Concentrado para Lucas", 62000, "Mascotas", [], null],
        [8, 19, 0, "gasto", "Domicilio", 38000, "Comida", [], null],
        [9, 7, 45, "gasto", "Gasolina", 60000, "Transporte", [], null],
        [11, 15, 0, "gasto", "Droguería", 27000, "Salud", [], null],
        [12, 11, 0, "gasto", "Arriendo", 850000, "Hogar", [], null],
        [34, 11, 0, "gasto", "Arriendo", 850000, "Hogar", [], null],
        [36, 9, 0, "ingreso", "Pago de quincena", 2400000, "Salario", ["trabajo"], null],
        [40, 12, 30, "gasto", "Mercado", 182000, "Comida", [], null],
        [65, 11, 0, "gasto", "Arriendo", 850000, "Hogar", [], null],
        [66, 9, 0, "ingreso", "Pago de quincena", 2400000, "Salario", ["trabajo"], null]
      ].map(function (m, i) {
        return { id: i + 1, cuenta_id: 1, fecha: hace(m[0], m[1], m[2]), tipo: m[3], descripcion: m[4], monto: m[5], estado: "pagado", nota: null,
                 categoria_id: cat(m[6]), etiquetas: m[7], lat: m[8] ? m[8][0] : null, lng: m[8] ? m[8][1] : null };
      })
    };
    var perfil = { presupuesto_monto: 1500000, presupuesto_ciclo: "mensual", guardar_ubicacion: false, mostrar_seguro: true, modo_conductor: false, vehiculo: null, meta_diaria: null };
    function copia(o) { return JSON.parse(JSON.stringify(o)); }
    function nueva(nombre, fila) {
      var n = Object.assign({ id: sig++ }, fila);
      if (nombre === "metas" && n.ahorrado == null) n.ahorrado = 0;
      if (nombre === "movimientos" && !n.estado) n.estado = "pagado";
      if (nombre === "limites" && !n.creado_en) n.creado_en = new Date().toISOString();
      tabla[nombre].push(n);
      return copia(n);
    }
    return {
      demo: true,
      email: "Demostración",
      nombre: "Persona de demostración",
      cargar: function () { var d = copia(tabla); d.perfil = copia(perfil); return Promise.resolve(d); },
      crear: function (nombre, fila) { return Promise.resolve(nueva(nombre, fila)); },
      crearVarios: function (nombre, filas) { return Promise.resolve(filas.map(function (f) { return nueva(nombre, f); })); },
      actualizar: function (nombre, id, cambios) {
        var f = tabla[nombre].find(function (x) { return x.id === id; });
        Object.assign(f, cambios);
        return Promise.resolve(copia(f));
      },
      borrar: function (nombre, id) { tabla[nombre] = tabla[nombre].filter(function (x) { return x.id !== id; }); return Promise.resolve(); },
      guardarPerfil: function (cambios) { Object.assign(perfil, cambios); return Promise.resolve(copia(perfil)); },
      salir: function () { return Promise.resolve(); }
    };
  }

  // ---------- Estado y cálculos ----------
  function datosVacios() {
    var d = { perfil: { presupuesto_ciclo: "mensual", guardar_ubicacion: false, mostrar_seguro: true, modo_conductor: false } };
    TABLAS.forEach(function (t) { d[t] = []; });
    return d;
  }
  var fuente = null;
  var datos = datosVacios();
  var pendiente = null;
  var desfaseInicio = 0, desfaseAnalisis = 0;
  var cicloAnalisis = leerLocal("nova-ciclo-analisis", null);

  function categoria(id) { return datos.categorias.find(function (c) { return c.id === id; }); }
  function nombreCategoria(id) { var c = categoria(id); return c ? c.nombre : "Sin categoría"; }
  function etiquetasUsadas() {
    var todas = leerLocal("nova-etiquetas", []).slice();
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

  function saldoCuenta(c) {
    return datos.movimientos.reduce(function (s, m) {
      return m.cuenta_id !== c.id ? s : s + (m.tipo === "ingreso" ? num(m.monto) : -num(m.monto));
    }, num(c.saldo_inicial));
  }
  function saldoTotal() { return datos.cuentas.reduce(function (s, c) { return s + saldoCuenta(c); }, 0); }
  function gastadoEn(rango, categoriaId) {
    return datos.movimientos.reduce(function (s, m) {
      var f = new Date(m.fecha);
      if (m.tipo !== "gasto" || f < rango.desde || f >= rango.hasta) return s;
      if (categoriaId != null && m.categoria_id !== categoriaId) return s;
      return s + num(m.monto);
    }, 0);
  }
  function ordenarMovimientos() { datos.movimientos.sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); }); }

  // ---------- Listas de movimientos ----------
  function filaMovimiento(m, conFecha) {
    var c = categoria(m.categoria_id) || { nombre: "Sin categoría", icono: "otro" };
    var li = el("li", "mov");
    li.tabIndex = 0;
    li.setAttribute("role", "button");
    li.setAttribute("aria-label", "Editar " + m.descripcion);
    var ic = pintarIcono(el("span", "mov-icono"), c);
    var txt = el("div", "mov-texto");
    var otraMoneda = m.moneda && m.moneda !== "COP" && num(m.monto_original) > 0;
    txt.append(el("strong", null, m.descripcion), el("small", null, c.nombre + (m.nota ? " · " + m.nota : "") + (otraMoneda ? " · " + Mon.formatoMonto(m.monto_original, m.moneda) : "")));
    var extra = el("div", "mov-extra");
    if (m.estado === "pendiente") extra.append(el("span", "chip pendiente", "Pendiente"));
    if (m.programado_id) extra.append(el("span", "chip", "🔁"));
    (m.etiquetas || []).forEach(function (e) { extra.append(el("span", "etiqueta-chip", "#" + e)); });
    if (tieneUbicacion(m)) {
      var mapa = el("a", null, "Ver en el mapa");
      mapa.href = "https://www.openstreetmap.org/?mlat=" + Number(m.lat) + "&mlon=" + Number(m.lng) + "#map=18/" + Number(m.lat) + "/" + Number(m.lng);
      mapa.target = "_blank"; mapa.rel = "noopener";
      mapa.addEventListener("click", function (e) { e.stopPropagation(); });
      extra.append(mapa);
      var cerca = pagosCerca(m);
      if (cerca.length) {
        var total = cerca.reduce(function (s, o) { return s + (o.tipo === "gasto" ? num(o.monto) : 0); }, 0);
        extra.append(el("small", null, cerca.length + (cerca.length === 1 ? " pago más" : " pagos más") + " aquí · " + dinero(total)));
      }
    }
    if (extra.childNodes.length) txt.append(extra);
    var val = el("div", "mov-valor");
    val.append(el("strong", m.tipo === "ingreso" ? "positivo" : null, dineroSigno(num(m.monto), m.tipo)), el("small", null, (conFecha ? fechaCorta.format(new Date(m.fecha)) + " · " : "") + hora.format(new Date(m.fecha))));
    li.append(ic, txt, val);
    li.addEventListener("click", function () { abrirRegistro({ movimiento: m }); });
    li.addEventListener("keydown", function (e) { if (e.key === "Enter") abrirRegistro({ movimiento: m }); });
    return li;
  }

  // Lista agrupada por día, como en el inicio de Lukas.
  function listaPorDia(cont, movs, vacio, max) {
    cont.replaceChildren();
    if (!movs.length) { cont.append(el("p", "vacio", vacio)); return; }
    A.porDia(max ? movs.slice(0, max) : movs).forEach(function (g) {
      var grupo = el("div", "dia-grupo");
      var cab = el("div", "dia-cabeza");
      cab.append(el("span", null, g.nombre), el("span", null, ocultos ? "" : (g.neto >= 0 ? "+" : "−") + pesos.format(Math.abs(g.neto))));
      var ul = el("ul", "lista-mov");
      g.movimientos.forEach(function (m) { ul.append(filaMovimiento(m)); });
      grupo.append(cab, ul);
      cont.append(grupo);
    });
  }

  // ---------- Inicio ----------
  function rangoInicio() { return A.desplazar(cicloEfectivo(), new Date(), desfaseInicio); }

  function pintarInicio() {
    var ciclo = cicloEfectivo(), rango = rangoInicio();
    $("inicio-periodo").textContent = A.nombrePeriodo(ciclo, rango);
    var movs = A.enRango(datos.movimientos, rango), t = A.totales(movs);
    $("saldo-total").textContent = ocultos ? "$ ••••" : (t.neto < 0 ? "−" : "") + pesos.format(Math.abs(t.neto));
    var disponible = t.ingresos > 0 ? Math.max(0, Math.min(100, (t.neto / t.ingresos) * 100)) : 0;
    $("saldo-pct").textContent = Math.round(disponible) + "%";
    $("saldo-barra").style.width = disponible + "%";
    $("saldo-ingresos").textContent = ocultos ? "$ ••••" : "+" + pesos.format(t.ingresos);
    $("saldo-gastos").textContent = ocultos ? "$ ••••" : "−" + pesos.format(t.gastos);
    $("saldo-cuentas").textContent = "Saldo en cuentas: " + dinero(saldoTotal());
    $("tarjeta-deficit").hidden = t.neto >= 0;
    $("deficit-valor").textContent = ocultos ? "$ ••••" : "−" + pesos.format(Math.abs(t.neto));

    pintarSeguro(); pintarPresupuesto(); pintarFrecuentes(); pintarMiniTarjetas();
    listaPorDia($("lista-inicio"), movs, desfaseInicio === 0 ? "Aún no hay movimientos en este periodo. Toca + para agregar el primero." : "No hubo movimientos en este periodo.", 60);
  }
  document.querySelectorAll("[data-periodo-inicio]").forEach(function (b) {
    b.addEventListener("click", function () { desfaseInicio += Number(b.dataset.periodoInicio); pintarInicio(); });
  });

  function presupuestoActual() {
    var p = datos.perfil, ciclo = cicloEfectivo(), rango = Periodos.periodo(ciclo);
    var gastado = gastadoEn(rango);
    var limite = num(p.presupuesto_monto);
    if (!limite) { // sin presupuesto: lo que entró menos lo que salió en el periodo
      var t = A.totales(A.enRango(datos.movimientos, rango));
      return { limite: t.ingresos, gastado: t.gastos, rango: rango, conPresupuesto: false };
    }
    return { limite: limite, gastado: gastado, rango: rango, conPresupuesto: true };
  }

  function pintarSeguro() {
    var b = presupuestoActual(), tarjeta = $("tarjeta-seguro");
    tarjeta.hidden = datos.perfil.mostrar_seguro === false || desfaseInicio !== 0 || !(b.limite > 0);
    if (tarjeta.hidden) return;
    var s = A.seguroParaGastar(b.limite, b.gastado, b.rango);
    $("seguro-valor").textContent = dinero(s.porDia) + " por día";
    var ultimo = new Date(b.rango.hasta.getTime() - 1);
    $("seguro-nota").textContent = s.resto > 0
      ? "Te quedan " + dinero(s.resto) + (b.conPresupuesto ? " del presupuesto" : " de lo que entró") + " hasta el " + fechaCorta.format(ultimo) + " (" + s.dias + (s.dias === 1 ? " día)" : " días)")
      : "Ya gastaste todo lo " + (b.conPresupuesto ? "del presupuesto" : "que entró") + " en este periodo.";
    $("seguro-nota").className = "nota" + (s.resto > 0 ? "" : " mal");
  }

  function pintarPresupuesto() {
    var p = datos.perfil, ciclo = cicloEfectivo();
    $("presupuesto-titulo").textContent = "Presupuesto " + Periodos.CICLOS[ciclo].toLowerCase();
    var barra = $("presupuesto-barra"), nota = $("presupuesto-nota");
    nota.className = "nota";
    barra.classList.remove("excedido");
    if (!p.presupuesto_monto) {
      $("presupuesto-valor").textContent = "Sin presupuesto";
      barra.style.width = "0";
      nota.textContent = "Toca Editar para definir cuánto quieres gastar.";
      return;
    }
    var rango = Periodos.periodo(ciclo), gastado = gastadoEn(rango);
    var limite = num(p.presupuesto_monto), resto = limite - gastado;
    $("presupuesto-valor").textContent = dinero(gastado) + " de " + dinero(limite);
    barra.style.width = Math.min(100, (gastado / limite) * 100) + "%";
    if (resto >= 0) {
      nota.textContent = "Te quedan " + dinero(resto) + " hasta el " + fechaCorta.format(new Date(rango.hasta.getTime() - 1));
      if (resto / limite < 0.15) nota.classList.add("mal");
    } else {
      nota.textContent = "Te pasaste por " + dinero(-resto) + " en este periodo";
      nota.classList.add("mal");
      barra.classList.add("excedido");
    }
  }

  function pintarMiniTarjetas() {
    var meta = datos.metas[0];
    if (meta) {
      var p = Math.min(100, (num(meta.ahorrado) / num(meta.objetivo)) * 100);
      $("meta-valor").textContent = dinero(num(meta.ahorrado)) + " / " + dinero(num(meta.objetivo));
      $("meta-barra").style.width = p + "%";
      $("meta-nota").textContent = meta.nombre + " • " + Math.round(p) + "%";
    } else {
      $("meta-valor").textContent = "Sin metas";
      $("meta-barra").style.width = "0";
      $("meta-nota").textContent = "Crea una en Planes";
    }
    var ahora = new Date(), semana = inicioSemana(ahora), semanaPasada = new Date(semana);
    semanaPasada.setDate(semanaPasada.getDate() - 7);
    var gSemana = 0, gPasada = 0, dias = [0, 0, 0, 0, 0, 0, 0];
    datos.movimientos.forEach(function (m) {
      if (m.tipo !== "gasto") return;
      var f = new Date(m.fecha), v = num(m.monto);
      if (f >= semana && f <= ahora) { gSemana += v; dias[(f.getDay() + 6) % 7] += v; }
      else if (f >= semanaPasada && f < semana) gPasada += v;
    });
    $("semana-valor").textContent = dinero(gSemana);
    var nota = $("semana-nota");
    nota.className = "nota";
    if (gPasada > 0) {
      var cambio = ((gSemana - gPasada) / gPasada) * 100;
      nota.textContent = (cambio <= 0 ? "Bajó " : "Subió ") + Math.abs(Math.round(cambio)) + "% vs la semana pasada";
      nota.classList.add(cambio <= 0 ? "bien" : "mal");
      $("semana-barra").style.width = Math.min(100, (gSemana / gPasada) * 100) + "%";
    } else {
      nota.textContent = "Sin datos de la semana pasada";
      $("semana-barra").style.width = gSemana ? "100%" : "0";
    }
    var g = $("grafico-semana"), max = Math.max.apply(null, dias.concat([1])), hoyIdx = (ahora.getDay() + 6) % 7;
    g.replaceChildren();
    g.setAttribute("aria-label", "Gastos por día: " + DIAS.map(function (d, i) { return d + " " + dinero(dias[i]); }).join(", "));
    dias.forEach(function (v, i) {
      var d = el("div", "dia" + (i === hoyIdx ? " hoy" : i > hoyIdx ? " futuro" : ""));
      var col = el("div", "col"), barra = el("span");
      barra.style.height = Math.max(6, (v / max) * 100) + "%";
      barra.title = DIAS[i] + ": " + dinero(v);
      col.append(barra);
      d.append(col, el("small", null, DIAS[i]));
      g.append(d);
    });
  }

  function pintarFrecuentes() {
    var cont = $("frecuentes");
    cont.replaceChildren();
    datos.frecuentes.forEach(function (f) {
      var chip = el("span", "frecuente");
      var usar = el("button", null, "⚡ " + f.texto); usar.type = "button";
      usar.title = "Guardar ahora: " + f.texto;
      usar.addEventListener("click", function () {
        var r = Parser.interpretar(f.texto);
        if (!r.ok) { mensaje("rapido-mensaje", r.error, true); return; }
        usar.disabled = true;
        guardarRegistro(r, r.categoria, false).finally(function () { usar.disabled = false; });
      });
      chip.append(usar);
      cont.append(chip);
    });
  }

  // ---------- Planes: límites y metas ----------
  function estadoLimite(l) {
    var rango = Periodos.periodo(l.ciclo);
    var creado = l.creado_en ? new Date(l.creado_en) : new Date();
    var vigente = l.recurrente || (creado >= rango.desde && creado < rango.hasta);
    return { rango: rango, vigente: vigente, gastado: vigente ? gastadoEn(rango, l.categoria_id) : 0 };
  }

  function pintarPlanes() {
    var ul = $("lista-limites");
    ul.replaceChildren();
    $("planes-vacio").hidden = !!(datos.limites.length || datos.metas.length);
    if (!datos.limites.length) ul.append(el("li", "vacio", "Sin límites. Crea uno para controlar cuánto gastas en una categoría."));
    datos.limites.forEach(function (l) {
      var c = l.categoria_id != null ? categoria(l.categoria_id) : null;
      var e = estadoLimite(l), limite = num(l.monto), p = Math.min(100, (e.gastado / limite) * 100);
      var li = el("li", "limite");
      li.tabIndex = 0; li.setAttribute("role", "button");
      var cab = el("div", "limite-cabeza");
      var ic = pintarIcono(el("span", "mov-icono chico"), c || { icono: "otro", color: "#2ee06f" });
      var txt = el("div", "mov-texto");
      txt.append(el("strong", null, c ? c.nombre : "Todas las categorías"),
        el("small", null, Periodos.CICLOS[l.ciclo] + (l.recurrente ? " · se renueva" : "") + " · " + A.nombrePeriodo(l.ciclo, e.rango)));
      cab.append(ic, txt, el("strong", null, Math.round(p) + "%"));
      var barra = el("div", "barra"), s = el("span"); s.style.width = p + "%"; barra.append(s);
      if (e.gastado > limite) s.classList.add("excedido");
      var resto = limite - e.gastado;
      var nota = el("span", "nota" + (resto < 0 ? " mal" : resto / limite < 0.15 ? " mal" : ""),
        !e.vigente ? "Este límite ya terminó." : dinero(e.gastado) + " de " + dinero(limite) + " · " + (resto >= 0 ? "te quedan " + dinero(resto) : "te pasaste por " + dinero(-resto)));
      li.append(cab, barra, nota);
      li.addEventListener("click", function () { abrirLimite(l); });
      li.addEventListener("keydown", function (ev) { if (ev.key === "Enter") abrirLimite(l); });
      ul.append(li);
    });
    pintarMetas();
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
        fuente.actualizar("metas", m.id, { ahorrado: num(m.ahorrado) + v }).then(function (n) {
          Object.assign(m, n); toast("Abonaste " + pesos.format(v) + " a " + m.nombre); pintar();
        }).catch(function (err) { mensaje("meta-mensaje", err.message, true); }).finally(function () { ok.disabled = false; });
      });
      del.addEventListener("click", function () {
        if (!confirm("¿Borrar la meta «" + m.nombre + "»?")) return;
        del.disabled = true;
        fuente.borrar("metas", m.id).then(function () {
          datos.metas = datos.metas.filter(function (x) { return x.id !== m.id; }); pintar();
        }).catch(function (err) { del.disabled = false; mensaje("meta-mensaje", err.message, true); });
      });
      li.append(cab, el("span", null, dinero(num(m.ahorrado)) + " de " + dinero(num(m.objetivo))), barra, abono);
      ul.append(li);
    });
  }

  $("form-meta").addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("meta-nombre").value.trim(), objetivo = leerValor($("meta-objetivo").value);
    if (!nombre) return mensaje("meta-mensaje", "Escribe para qué ahorras.", true);
    if (!(objetivo > 0)) return mensaje("meta-mensaje", "No entendí el valor. Escribe por ejemplo 2 millones.", true);
    fuente.crear("metas", { nombre: nombre, objetivo: objetivo }).then(function (m) {
      datos.metas.push(m); e.target.reset(); mensaje("meta-mensaje", "Meta creada."); pintar();
    }).catch(function (err) { mensaje("meta-mensaje", err.message, true); });
  });

  // Pantalla de límite.
  var limiteActual = null, limiteCategoria = null;
  function abrirLimite(l) {
    limiteActual = l || null;
    limiteCategoria = l ? l.categoria_id : null;
    $("lim-titulo").textContent = l ? "Editar límite" : "Nuevo límite";
    $("lim-monto").value = l ? pesos.format(num(l.monto)) : "";
    var sel = $("lim-ciclo");
    sel.replaceChildren();
    Object.keys(Periodos.CICLOS).forEach(function (c) {
      var o = el("option", null, Periodos.CICLOS[c]); o.value = c; o.selected = c === (l ? l.ciclo : cicloEfectivo()); sel.append(o);
    });
    $("lim-recurrente").checked = l ? !!l.recurrente : true;
    $("lim-borrar").hidden = !l;
    mensaje("lim-mensaje", "");
    pintarLimiteCategoria(); pintarLimiteRango();
    abrirCapa("pantalla-limite");
  }
  function pintarLimiteCategoria() {
    var c = limiteCategoria != null ? categoria(limiteCategoria) : null;
    pintarIcono($("lim-cat-icono"), c || { icono: "otro", color: "#2ee06f" });
    $("lim-cat-nombre").textContent = c ? c.nombre : "Todas las categorías";
  }
  function pintarLimiteRango() {
    var c = $("lim-ciclo").value, r = Periodos.periodo(c);
    $("lim-rango").textContent = fechaCorta.format(r.desde) + " – " + fechaCorta.format(new Date(r.hasta.getTime() - 1));
  }
  $("lim-ciclo").addEventListener("change", pintarLimiteRango);
  $("lim-categoria").addEventListener("click", function () {
    elegirCategoria("gasto", function (c) { limiteCategoria = c ? c.id : null; pintarLimiteCategoria(); }, true);
  });
  document.querySelectorAll("[data-nuevo-limite]").forEach(function (b) { b.addEventListener("click", function () { abrirLimite(null); }); });
  $("form-limite").addEventListener("submit", function (e) {
    e.preventDefault();
    var monto = leerValor($("lim-monto").value);
    if (!(monto > 0)) return mensaje("lim-mensaje", "Escribe el límite, por ejemplo 400 mil.", true);
    var fila = { monto: monto, categoria_id: limiteCategoria, ciclo: $("lim-ciclo").value, recurrente: $("lim-recurrente").checked };
    var op = limiteActual ? fuente.actualizar("limites", limiteActual.id, fila) : fuente.crear("limites", fila);
    op.then(function (l) {
      if (limiteActual) Object.assign(limiteActual, l); else datos.limites.push(l);
      toast("Límite guardado"); cerrarCapa(); pintar();
    }).catch(function (err) { mensaje("lim-mensaje", err.message, true); });
  });
  $("lim-borrar").addEventListener("click", function () {
    if (!limiteActual || !confirm("¿Borrar este límite?")) return;
    var id = limiteActual.id;
    fuente.borrar("limites", id).then(function () {
      datos.limites = datos.limites.filter(function (x) { return x.id !== id; });
      toast("Límite borrado"); cerrarCapa(); pintar();
    }).catch(function (err) { mensaje("lim-mensaje", err.message, true); });
  });

  // ---------- Análisis ----------
  var WIDGETS = [
    { id: "rapida", nombre: "Vista rápida" },
    { id: "categorias", nombre: "Gastos por categoría" },
    { id: "etiquetas", nombre: "Gasto por etiqueta" },
    { id: "ingresos-gastos", nombre: "Ingresos vs gastos" },
    { id: "tendencia", nombre: "Tendencia de gastos" },
    { id: "proyeccion", nombre: "Proyección de balance" }
  ];
  function configWidgets() {
    var guardado = leerLocal("nova-widgets", null) || [];
    var lista = guardado.filter(function (w) { return WIDGETS.some(function (x) { return x.id === w.id; }); });
    WIDGETS.forEach(function (w) { if (!lista.some(function (x) { return x.id === w.id; })) lista.push({ id: w.id, visible: true }); });
    return lista;
  }
  function cicloDeAnalisis() { return cicloAnalisis || cicloEfectivo(); }

  function pintarAnalisis() {
    var ciclo = cicloDeAnalisis(), ref = A.desplazar(ciclo, new Date(), desfaseAnalisis).desde;
    var pest = $("analisis-ciclos");
    pest.replaceChildren();
    Object.keys(Periodos.CICLOS).forEach(function (c) {
      var b = el("button", null, Periodos.CICLOS[c]); b.type = "button";
      b.setAttribute("aria-pressed", String(c === ciclo));
      b.addEventListener("click", function () { cicloAnalisis = c; guardarLocal("nova-ciclo-analisis", c); desfaseAnalisis = 0; pintarAnalisis(); });
      pest.append(b);
    });
    var rango = Periodos.periodo(ciclo, ref);
    $("analisis-periodo").textContent = A.nombrePeriodo(ciclo, rango);
    var movs = A.enRango(datos.movimientos, rango);
    var cont = $("widgets");
    cont.replaceChildren();
    configWidgets().forEach(function (w) {
      if (!w.visible) return;
      var art = el("article", "tarjeta widget");
      art.dataset.widget = w.id;
      ({ rapida: wRapida, categorias: wCategorias, etiquetas: wEtiquetas, "ingresos-gastos": wIngresosGastos, tendencia: wTendencia, proyeccion: wProyeccion })[w.id](art, movs, ciclo, ref, rango);
      cont.append(art);
    });
  }
  document.querySelectorAll("[data-periodo-analisis]").forEach(function (b) {
    b.addEventListener("click", function () { desfaseAnalisis += Number(b.dataset.periodoAnalisis); pintarAnalisis(); });
  });

  function titulo(art, texto) { art.append(el("h2", "titulo-widget", texto)); }

  function wRapida(art, movs, ciclo, ref) {
    titulo(art, "Vista rápida");
    var v = A.vistaRapida(datos.movimientos, ciclo, ref);
    var rej = el("div", "rejilla-rapida");
    var top = v.categoriaTop === undefined ? "—" : nombreCategoria(v.categoriaTop);
    [["💲", "Promedio de gasto diario", dinero(v.promedioDiario)],
     ["🏷", "Categoría top", top],
     ["📅", "Día que más gastas", v.diaTop || "—"],
     ["📈", "vs periodo anterior", v.vsAnterior === null ? "—" : (v.vsAnterior > 0 ? "+" : "") + Math.round(v.vsAnterior) + "%"]
    ].forEach(function (x, i) {
      var d = el("div", "dato-rapido");
      d.append(el("span", "dato-icono", x[0]), el("small", null, x[1]), el("strong", i === 3 && v.vsAnterior > 0 ? "negativo" : i === 3 && v.vsAnterior < 0 ? "positivo" : null, x[2]));
      rej.append(d);
    });
    art.append(rej);
  }

  function wCategorias(art, movs, ciclo, ref, rango) {
    titulo(art, "Gastos por categoría");
    var filas = A.porCategoria(movs), total = filas.reduce(function (s, f) { return s + f.total; }, 0);
    if (!filas.length) { art.append(el("p", "vacio", "Sin gastos en este periodo.")); return; }
    var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 120 120"); svg.setAttribute("class", "dona"); svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Gastos por categoría: " + filas.map(function (f) { return nombreCategoria(f.id) + " " + dinero(f.total); }).join(", "));
    var acumulado = 0, R = 46, L = 2 * Math.PI * R;
    filas.forEach(function (f) {
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", 60); c.setAttribute("cy", 60); c.setAttribute("r", R);
      c.setAttribute("fill", "none"); c.setAttribute("stroke-width", 16);
      c.setAttribute("stroke", colorDe(categoria(f.id) || { icono: "otro" }));
      var parte = (f.total / total) * L;
      c.setAttribute("stroke-dasharray", Math.max(0, parte - 1.5) + " " + (L - Math.max(0, parte - 1.5)));
      c.setAttribute("stroke-dashoffset", -acumulado);
      c.setAttribute("transform", "rotate(-90 60 60)");
      acumulado += parte;
      svg.append(c);
    });
    var centro = el("div", "dona-centro");
    centro.append(el("strong", null, dinero(total)), el("small", null, "gastado"));
    var caja = el("div", "dona-caja"); caja.append(svg, centro);
    art.append(caja);
    var ul = el("ul", "por-categoria");
    filas.forEach(function (f, i) {
      var c = categoria(f.id) || { nombre: "Sin categoría", icono: "otro" };
      var li = el("li", "cat-fila" + (i >= 6 ? " extra" : ""));
      var punto = el("span", "punto"); punto.style.background = colorDe(c);
      var nombre = el("span", "cat-nombre"); nombre.append(punto, document.createTextNode(c.nombre));
      li.append(nombre, el("strong", null, dinero(f.total)), el("small", "nota", Math.round((f.total / total) * 100) + "%"));
      li.tabIndex = 0; li.setAttribute("role", "button");
      li.title = "Ver los movimientos de " + c.nombre;
      li.addEventListener("click", function () {
        abrirBusqueda({ categoriaId: f.id, desde: A.claveDia(rango.desde), hasta: A.claveDia(new Date(rango.hasta.getTime() - 1)), tipo: "gasto" });
      });
      ul.append(li);
    });
    art.append(ul);
    if (filas.length > 6) {
      var ver = el("button", "enlace", "Ver todas"); ver.type = "button";
      ver.addEventListener("click", function () { ul.classList.toggle("todas"); ver.textContent = ul.classList.contains("todas") ? "Ver menos" : "Ver todas"; });
      art.append(ver);
    }
  }

  function wEtiquetas(art, movs) {
    titulo(art, "Gasto por etiqueta");
    var filas = A.porEtiqueta(movs);
    if (!filas.length) { art.append(el("p", "vacio", "Sin gastos con etiquetas en este periodo. Usa #etiqueta al registrar.")); return; }
    var max = filas[0].total, ul = el("ul", "por-categoria");
    filas.forEach(function (f) {
      var li = el("li", "cat-fila");
      var barra = el("div", "barra"), s = el("span"); s.style.width = (f.total / max) * 100 + "%"; barra.append(s);
      li.append(el("span", "etiqueta-chip", "#" + f.etiqueta), el("strong", null, dinero(f.total)), barra);
      ul.append(li);
    });
    art.append(ul);
  }

  // Barras dobles (ingresos y gastos) de los últimos 6 periodos.
  function wIngresosGastos(art, movs, ciclo, ref) {
    titulo(art, "Ingresos vs gastos");
    var s = A.serie(datos.movimientos, ciclo, ref, 6);
    var max = Math.max.apply(null, s.map(function (x) { return Math.max(x.ingresos, x.gastos); }).concat([1]));
    var g = el("div", "barras-dobles");
    g.setAttribute("role", "img");
    g.setAttribute("aria-label", s.map(function (x) { return x.etiqueta + ": ingresos " + dinero(x.ingresos) + ", gastos " + dinero(x.gastos); }).join("; "));
    s.forEach(function (x, i) {
      var col = el("div", "par" + (i === s.length - 1 ? " actual" : ""));
      var barras = el("div", "par-barras");
      var bi = el("span", "b-ingreso"), bg = el("span", "b-gasto");
      bi.style.height = Math.max(2, (x.ingresos / max) * 100) + "%"; bg.style.height = Math.max(2, (x.gastos / max) * 100) + "%";
      bi.title = "Ingresos " + x.etiqueta + ": " + dinero(x.ingresos); bg.title = "Gastos " + x.etiqueta + ": " + dinero(x.gastos);
      barras.append(bi, bg);
      col.append(barras, el("small", null, x.etiqueta));
      g.append(col);
    });
    var ult = s[s.length - 1];
    var ley = el("div", "leyenda");
    ley.append(el("span", "l-ingreso", "Ingresos " + dinero(ult.ingresos)), el("span", "l-gasto", "Gastos " + dinero(ult.gastos)));
    art.append(g, ley);
  }

  function lineaSVG(puntos, etiquetas, clase) {
    var NS = "http://www.w3.org/2000/svg", W = 300, H = 120, P = 10;
    var min = Math.min.apply(null, puntos), max = Math.max.apply(null, puntos);
    if (max === min) { max += 1; min -= 1; }
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + (H + 18)); svg.setAttribute("class", "linea " + (clase || ""));
    var xy = puntos.map(function (v, i) {
      return [P + (i * (W - 2 * P)) / Math.max(1, puntos.length - 1), P + (H - 2 * P) * (1 - (v - min) / (max - min))];
    });
    var area = document.createElementNS(NS, "path");
    area.setAttribute("d", "M" + xy[0][0] + "," + H + " L" + xy.map(function (p) { return p.join(","); }).join(" L") + " L" + xy[xy.length - 1][0] + "," + H + " Z");
    area.setAttribute("class", "area");
    var linea = document.createElementNS(NS, "polyline");
    linea.setAttribute("points", xy.map(function (p) { return p.join(","); }).join(" "));
    linea.setAttribute("fill", "none");
    svg.append(area, linea);
    xy.forEach(function (p, i) {
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); c.setAttribute("r", 3.5);
      var t = document.createElementNS(NS, "title"); t.textContent = etiquetas[i] + ": " + dinero(puntos[i]);
      c.append(t);
      var tx = document.createElementNS(NS, "text");
      tx.setAttribute("x", p[0]); tx.setAttribute("y", H + 14); tx.setAttribute("text-anchor", "middle");
      tx.textContent = etiquetas[i];
      svg.append(c, tx);
    });
    return svg;
  }

  function wTendencia(art, movs, ciclo, ref) {
    titulo(art, "Tendencia de gastos");
    var s = A.serie(datos.movimientos, ciclo, ref, 8);
    var svg = lineaSVG(s.map(function (x) { return x.gastos; }), s.map(function (x) { return x.etiqueta; }), "gastos");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Gastos por periodo: " + s.map(function (x) { return x.etiqueta + " " + dinero(x.gastos); }).join(", "));
    art.append(svg);
    var actual = s[s.length - 1], anterior = s[s.length - 2];
    if (anterior && anterior.gastos > 0) {
      var cambio = Math.round(((actual.gastos - anterior.gastos) / anterior.gastos) * 100);
      art.append(el("p", "nota " + (cambio > 0 ? "mal" : "bien"), (cambio > 0 ? "Subió " : "Bajó ") + Math.abs(cambio) + "% frente al periodo anterior."));
    }
  }

  function wProyeccion(art) {
    titulo(art, "Balance futuro");
    art.append(el("p", "nota", "Proyección a 90 días según tu promedio de los últimos 90 días (sin contar los límites)."));
    var p = A.proyeccion(datos.movimientos, saldoTotal());
    var svg = lineaSVG(p.map(function (x) { return x.saldo; }), ["Hoy", "30d", "60d", "90d"], p[3].saldo < p[0].saldo ? "baja" : "sube");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Balance proyectado: " + p.map(function (x) { return x.dias + " días " + dinero(x.saldo); }).join(", "));
    art.append(svg);
    var fila = el("div", "fila-proyeccion");
    fila.append(el("span", "nota", "Proyectado en 90 días"), el("strong", p[3].saldo < 0 ? "negativo" : "positivo", (p[3].saldo < 0 ? "−" : "") + dinero(Math.abs(p[3].saldo))));
    art.append(fila);
  }

  // Personalizar: mostrar u ocultar y reordenar los gráficos.
  function pintarPersonalizar() {
    var ul = $("lista-widgets"), lista = configWidgets();
    ul.replaceChildren();
    lista.forEach(function (w, i) {
      var info = WIDGETS.find(function (x) { return x.id === w.id; });
      var li = el("li", "fila-widget");
      var lab = el("label", "casilla");
      var chk = el("input"); chk.type = "checkbox"; chk.checked = w.visible;
      chk.addEventListener("change", function () { w.visible = chk.checked; guardarLocal("nova-widgets", lista); pintarAnalisis(); });
      lab.append(chk, document.createTextNode(info.nombre));
      var sube = el("button", "icono-btn", "↑"); sube.type = "button"; sube.disabled = i === 0; sube.setAttribute("aria-label", "Subir " + info.nombre);
      var baja = el("button", "icono-btn", "↓"); baja.type = "button"; baja.disabled = i === lista.length - 1; baja.setAttribute("aria-label", "Bajar " + info.nombre);
      function mover(d) { var x = lista.splice(i, 1)[0]; lista.splice(i + d, 0, x); guardarLocal("nova-widgets", lista); pintarPersonalizar(); pintarAnalisis(); }
      sube.addEventListener("click", function () { mover(-1); });
      baja.addEventListener("click", function () { mover(1); });
      li.append(lab, sube, baja);
      ul.append(li);
    });
  }
  $("btn-personalizar").addEventListener("click", function () { var p = $("personalizar"); p.hidden = !p.hidden; if (!p.hidden) pintarPersonalizar(); });
  $("btn-listo-widgets").addEventListener("click", function () { $("personalizar").hidden = true; });

  // ---------- Buscar ----------
  var filtros = { texto: "", tipo: "", categoriaId: null, etiqueta: "", estado: "", desde: "", hasta: "", orden: "recientes" };
  function resultadosBusqueda() { return A.buscar(datos.movimientos, filtros, nombreCategoria); }
  function pintarBuscar() {
    document.querySelectorAll("#buscar-tipo button").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.tipo === filtros.tipo)); });
    var selCat = $("filtro-categoria");
    selCat.replaceChildren(el("option", null, "Todas"));
    selCat.firstChild.value = "";
    datos.categorias.slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre); }).forEach(function (c) {
      var o = el("option", null, c.nombre + (c.tipo === "ingreso" ? " (ingreso)" : "")); o.value = c.id; o.selected = c.id === filtros.categoriaId; selCat.append(o);
    });
    var selEt = $("filtro-etiqueta");
    selEt.replaceChildren(el("option", null, "Todas"));
    selEt.firstChild.value = "";
    etiquetasUsadas().forEach(function (e) { var o = el("option", null, "#" + e); o.value = e; o.selected = e === filtros.etiqueta; selEt.append(o); });
    $("filtro-estado").value = filtros.estado;
    $("filtro-desde").value = filtros.desde; $("filtro-hasta").value = filtros.hasta;
    $("buscar-orden").value = filtros.orden;
    var activos = ["categoriaId", "etiqueta", "estado", "desde", "hasta"].filter(function (k) { return filtros[k] !== "" && filtros[k] != null; }).length;
    $("btn-filtros").textContent = activos ? "Filtros (" + activos + ")" : "Filtros";
    var r = resultadosBusqueda(), t = A.totales(r);
    $("buscar-resumen").textContent = r.length + (r.length === 1 ? " movimiento" : " movimientos") + " · " + (ocultos ? "$ ••••" : (t.neto < 0 ? "−" : "+") + pesos.format(Math.abs(t.neto)));
    if (filtros.orden === "recientes" || filtros.orden === "antiguos") listaPorDia($("lista-buscar"), r, "No hay movimientos con esa búsqueda.");
    else {
      var cont = $("lista-buscar"), ul = el("ul", "lista-mov");
      cont.replaceChildren(ul);
      if (!r.length) cont.replaceChildren(el("p", "vacio", "No hay movimientos con esa búsqueda."));
      r.forEach(function (m) { ul.append(filaMovimiento(m, true)); });
    }
  }
  function abrirBusqueda(f) {
    filtros = Object.assign({ texto: "", tipo: "", categoriaId: null, etiqueta: "", estado: "", desde: "", hasta: "", orden: "recientes" }, f || {});
    $("buscar-texto").value = filtros.texto;
    $("filtros").hidden = !(f && (f.desde || f.categoriaId != null));
    ir("buscar");
  }
  $("buscar-texto").addEventListener("input", function (e) { filtros.texto = e.target.value; pintarBuscar(); });
  document.querySelectorAll("#buscar-tipo button").forEach(function (b) { b.addEventListener("click", function () { filtros.tipo = b.dataset.tipo; pintarBuscar(); }); });
  $("btn-filtros").addEventListener("click", function () { var f = $("filtros"); f.hidden = !f.hidden; $("btn-filtros").setAttribute("aria-expanded", String(!f.hidden)); });
  $("filtro-categoria").addEventListener("change", function (e) { filtros.categoriaId = e.target.value ? Number(e.target.value) : null; pintarBuscar(); });
  $("filtro-etiqueta").addEventListener("change", function (e) { filtros.etiqueta = e.target.value; pintarBuscar(); });
  $("filtro-estado").addEventListener("change", function (e) { filtros.estado = e.target.value; pintarBuscar(); });
  $("filtro-desde").addEventListener("change", function (e) { filtros.desde = e.target.value; pintarBuscar(); });
  $("filtro-hasta").addEventListener("change", function (e) { filtros.hasta = e.target.value; pintarBuscar(); });
  $("buscar-orden").addEventListener("change", function (e) { filtros.orden = e.target.value; pintarBuscar(); });
  $("btn-limpiar-filtros").addEventListener("click", function () { abrirBusqueda({ texto: filtros.texto, tipo: filtros.tipo }); $("filtros").hidden = false; });
  $("btn-exportar-busqueda").addEventListener("click", function () { exportarMovimientos(resultadosBusqueda(), "nova-busqueda"); });

  // ---------- Configuración ----------
  function pintarAjustes() {
    $("perfil-email").textContent = fuente.email;
    var inicial = (fuente.email || "?").trim().charAt(0).toUpperCase();
    $("avatar").textContent = inicial; $("perfil-avatar").textContent = inicial;
    $("aj-ciclo").textContent = Periodos.CICLOS[cicloEfectivo()] + (datos.perfil.presupuesto_monto ? " · " + dinero(num(datos.perfil.presupuesto_monto)) : "");
    $("aj-categorias").textContent = "Categorías (" + datos.categorias.length + ")";
    $("perfil-ubicacion").checked = !!datos.perfil.guardar_ubicacion;
    $("perfil-seguro").checked = datos.perfil.mostrar_seguro !== false;
    // Periodo de presupuesto
    var cont = $("lista-ciclos");
    cont.replaceChildren();
    Object.keys(Periodos.CICLOS).forEach(function (c) {
      var r = Periodos.periodo(c);
      var lab = el("label", "opcion");
      var radio = el("input"); radio.type = "radio"; radio.name = "ciclo"; radio.value = c; radio.checked = c === cicloEfectivo();
      var txt = el("span"); txt.append(el("strong", null, Periodos.CICLOS[c]), el("small", null, fechaCorta.format(r.desde) + " – " + fechaCorta.format(new Date(r.hasta.getTime() - 1))));
      lab.append(radio, txt);
      cont.append(lab);
    });
    if (document.activeElement !== $("presupuesto-monto")) {
      $("presupuesto-monto").value = datos.perfil.presupuesto_monto ? pesos.format(num(datos.perfil.presupuesto_monto)) : "";
    }
    pintarCategoriasAjustes(); pintarComunes(); pintarEtiquetas(); pintarProgramadas(); pintarCuentas();
    $("exp-movimientos").textContent = "Todos los movimientos · " + datos.movimientos.length;
    $("exp-categorias").textContent = "Categorías · " + datos.categorias.length;
    $("exp-limites").textContent = "Presupuesto y límites · " + (datos.limites.length + (datos.perfil.presupuesto_monto ? 1 : 0));
  }

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
    var elegido = document.querySelector("#lista-ciclos input:checked");
    guardarPerfil({ presupuesto_monto: monto, presupuesto_ciclo: elegido ? elegido.value : "mensual" }, "presupuesto-mensaje", "Guardado.");
    desfaseInicio = 0;
  });
  $("perfil-ubicacion").addEventListener("change", function (e) {
    guardarPerfil({ guardar_ubicacion: e.target.checked }, "ajustes-mensaje",
      e.target.checked ? "Desde ahora se guarda la ubicación de cada pago." : "Ya no se guarda la ubicación.");
  });
  $("perfil-seguro").addEventListener("change", function (e) {
    guardarPerfil({ mostrar_seguro: e.target.checked }, "ajustes-mensaje",
      e.target.checked ? "«Seguro para gastar» se muestra en el inicio." : "«Seguro para gastar» ya no se muestra.");
  });

  // Categorías
  var tipoCategorias = "gasto";
  function categoriasAgrupadas(tipo, texto) {
    var q = A.sinTildes(texto || "");
    var grupos = {};
    datos.categorias.filter(function (c) { return c.tipo === tipo && (!q || A.sinTildes(c.nombre).indexOf(q) >= 0); })
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre); })
      .forEach(function (c) { var g = A.grupoDe(c); (grupos[g] = grupos[g] || []).push(c); });
    var orden = A.GRUPOS[tipo].concat(Object.keys(grupos).filter(function (g) { return A.GRUPOS[tipo].indexOf(g) < 0; }));
    return orden.filter(function (g) { return grupos[g]; }).map(function (g) { return { grupo: g, categorias: grupos[g] }; });
  }
  function usosCategoria(id) { return datos.movimientos.filter(function (m) { return m.categoria_id === id; }).length; }

  function pintarCategoriasAjustes() {
    document.querySelectorAll("#cat-tipo button").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.tipo === tipoCategorias)); });
    var cont = $("lista-categorias");
    cont.replaceChildren();
    var grupos = categoriasAgrupadas(tipoCategorias, $("cat-buscar").value);
    if (!grupos.length) cont.append(el("p", "vacio", "No hay categorías con ese nombre."));
    grupos.forEach(function (g) {
      cont.append(el("h3", "grupo-titulo", g.grupo));
      var ul = el("ul", "lista-simple");
      g.categorias.forEach(function (c) {
        var li = el("li", "fila-categoria");
        li.tabIndex = 0; li.setAttribute("role", "button");
        var txt = el("span", "mov-texto"); txt.append(el("strong", null, c.nombre), el("small", null, usosCategoria(c.id) + " movimientos"));
        li.append(pintarIcono(el("span", "mov-icono chico"), c), txt, el("span", "flecha", "›"));
        li.addEventListener("click", function () { abrirCategoria(c); });
        li.addEventListener("keydown", function (e) { if (e.key === "Enter") abrirCategoria(c); });
        ul.append(li);
      });
      cont.append(ul);
    });
  }
  document.querySelectorAll("#cat-tipo button").forEach(function (b) { b.addEventListener("click", function () { tipoCategorias = b.dataset.tipo; pintarCategoriasAjustes(); }); });
  $("cat-buscar").addEventListener("input", pintarCategoriasAjustes);
  document.querySelectorAll("[data-nueva-categoria]").forEach(function (b) { b.addEventListener("click", function () { abrirCategoria(null, tipoCategorias); }); });

  // Pantalla de categoría (nueva o editar).
  var catActual = null, catForm = null, alGuardarCategoria = null;
  function abrirCategoria(c, tipo, alGuardar) {
    catActual = c || null;
    alGuardarCategoria = alGuardar || null;
    catForm = c ? { tipo: c.tipo, icono: c.icono || "otro", color: colorDe(c).charAt(0) === "#" ? colorDe(c) : "#2ee06f", grupo: A.grupoDe(c) }
      : { tipo: tipo || "gasto", icono: "⭐", color: "#2ee06f", grupo: tipo === "ingreso" ? "Otros Ingresos" : "Otros" };
    $("cat-titulo").textContent = c ? "Editar categoría" : "Nueva categoría";
    $("cat-nombre").value = c ? c.nombre : "";
    $("cat-borrar").hidden = !c;
    $("cat-icono-buscar").value = "";
    mensaje("cat-mensaje", "");
    mostrarPestana("iconos");
    pintarFormCategoria();
    abrirCapa("pantalla-categoria");
  }
  function pintarFormCategoria() {
    document.querySelectorAll("#cat-form-tipo button").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.tipo === catForm.tipo)); });
    pintarIcono($("cat-vista"), { icono: catForm.icono, color: catForm.color });
    var sel = $("cat-grupo");
    sel.replaceChildren();
    var grupos = A.GRUPOS[catForm.tipo].slice();
    if (grupos.indexOf(catForm.grupo) < 0) grupos.push(catForm.grupo);
    grupos.forEach(function (g) { var o = el("option", null, g); o.value = g; o.selected = g === catForm.grupo; sel.append(o); });
    var q = A.sinTildes($("cat-icono-buscar").value);
    var rej = $("cat-iconos");
    rej.replaceChildren();
    var opciones = Object.keys(ICONOS).map(function (k) { return [k, k]; }).concat(EMOJIS);
    opciones.filter(function (x) { return !q || A.sinTildes(x[1]).indexOf(q) >= 0; }).forEach(function (x) {
      var b = el("button", "opcion-icono"); b.type = "button";
      b.setAttribute("aria-label", x[1]); b.setAttribute("aria-pressed", String(x[0] === catForm.icono));
      pintarIcono(b, { icono: x[0], color: catForm.color });
      b.addEventListener("click", function () { catForm.icono = x[0]; pintarFormCategoria(); });
      rej.append(b);
    });
    var col = $("cat-panel-colores");
    col.replaceChildren();
    COLORES.forEach(function (c) {
      var b = el("button", "opcion-color"); b.type = "button";
      b.style.background = c; b.setAttribute("aria-label", "Color " + c); b.setAttribute("aria-pressed", String(c === catForm.color));
      b.addEventListener("click", function () { catForm.color = c; pintarFormCategoria(); });
      col.append(b);
    });
  }
  function mostrarPestana(p) {
    document.querySelectorAll("#cat-pestanas button").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.pestana === p)); });
    $("cat-panel-iconos").hidden = p !== "iconos";
    $("cat-panel-colores").hidden = p !== "colores";
  }
  document.querySelectorAll("#cat-pestanas button").forEach(function (b) { b.addEventListener("click", function () { mostrarPestana(b.dataset.pestana); }); });
  document.querySelectorAll("#cat-form-tipo button").forEach(function (b) {
    b.addEventListener("click", function () { catForm.tipo = b.dataset.tipo; catForm.grupo = A.GRUPOS[catForm.tipo][A.GRUPOS[catForm.tipo].length - 1]; pintarFormCategoria(); });
  });
  $("cat-grupo").addEventListener("change", function (e) { catForm.grupo = e.target.value; });
  $("cat-icono-buscar").addEventListener("input", pintarFormCategoria);
  $("form-categoria").addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("cat-nombre").value.trim();
    if (!nombre) return mensaje("cat-mensaje", "Escribe el nombre de la categoría.", true);
    var repetida = datos.categorias.some(function (c) { return c.tipo === catForm.tipo && c.nombre.toLowerCase() === nombre.toLowerCase() && (!catActual || c.id !== catActual.id); });
    if (repetida) return mensaje("cat-mensaje", "Ya tienes una categoría con ese nombre.", true);
    var fila = { nombre: nombre, tipo: catForm.tipo, icono: catForm.icono, color: catForm.color, grupo: catForm.grupo };
    var op = catActual ? fuente.actualizar("categorias", catActual.id, fila) : fuente.crear("categorias", fila);
    var cb = alGuardarCategoria;
    op.then(function (c) {
      if (catActual) Object.assign(catActual, c); else datos.categorias.push(c);
      toast("Categoría guardada");
      cerrarCapa();
      pintar();
      if (cb) cb(c);
    }).catch(function (err) { mensaje("cat-mensaje", err.message, true); });
  });
  $("cat-borrar").addEventListener("click", function () {
    if (!catActual) return;
    var n = usosCategoria(catActual.id);
    if (!confirm("¿Borrar la categoría «" + catActual.nombre + "»?" + (n ? " Sus " + n + " movimientos quedarán sin categoría (no se borran)." : ""))) return;
    var id = catActual.id;
    fuente.borrar("categorias", id).then(function () {
      datos.categorias = datos.categorias.filter(function (c) { return c.id !== id; });
      datos.movimientos.forEach(function (m) { if (m.categoria_id === id) m.categoria_id = null; });
      datos.limites = datos.limites.filter(function (l) { return l.categoria_id !== id; });
      toast("Categoría borrada"); cerrarCapa(); pintar();
    }).catch(function (err) { mensaje("cat-mensaje", err.message, true); });
  });

  // Hoja para elegir categoría (con buscador, frecuentes y grupos).
  var alElegirCategoria = null, tipoHoja = "gasto", conTodas = false;
  function elegirCategoria(tipo, cb, todas) {
    alElegirCategoria = cb; tipoHoja = tipo; conTodas = !!todas;
    $("hoja-categoria-buscar").value = "";
    pintarHojaCategoria();
    abrirCapa("hoja-categoria");
  }
  function filaElegir(c, nombre) {
    var b = el("button", "fila-elegir"); b.type = "button";
    b.append(pintarIcono(el("span", "mov-icono chico"), c || { icono: "otro", color: "#2ee06f" }), el("span", null, nombre || c.nombre));
    b.addEventListener("click", function () { var cb = alElegirCategoria; cerrarCapa(); if (cb) cb(c); });
    return b;
  }
  function pintarHojaCategoria() {
    var cont = $("hoja-categoria-lista"), q = $("hoja-categoria-buscar").value;
    cont.replaceChildren();
    if (conTodas && !q) cont.append(filaElegir(null, "Todas las categorías"));
    if (!q) {
      var cuenta = {};
      datos.movimientos.forEach(function (m) { if (m.tipo === tipoHoja && m.categoria_id != null) cuenta[m.categoria_id] = (cuenta[m.categoria_id] || 0) + 1; });
      var frec = Object.keys(cuenta).sort(function (a, b) { return cuenta[b] - cuenta[a]; }).slice(0, 4).map(Number).map(categoria).filter(Boolean);
      if (frec.length) {
        cont.append(el("h3", "grupo-titulo", "Frecuentes"));
        var rej = el("div", "rejilla-frecuentes");
        frec.forEach(function (c) { rej.append(filaElegir(c)); });
        cont.append(rej);
      }
    }
    var grupos = categoriasAgrupadas(tipoHoja, q);
    if (!grupos.length) cont.append(el("p", "vacio", "No hay categorías con ese nombre."));
    grupos.forEach(function (g) {
      cont.append(el("h3", "grupo-titulo", g.grupo));
      g.categorias.forEach(function (c) { cont.append(filaElegir(c)); });
    });
  }
  $("hoja-categoria-buscar").addEventListener("input", pintarHojaCategoria);
  $("hoja-categoria-nueva").addEventListener("click", function () {
    var cb = alElegirCategoria, tipo = tipoHoja;
    cerrarYLuego(function () { abrirCategoria(null, tipo, cb); });
  });

  // Registros comunes
  function pintarComunes() {
    var ul = $("lista-comunes");
    ul.replaceChildren();
    if (!datos.frecuentes.length) ul.append(el("li", "vacio", "Todavía no tienes registros comunes."));
    datos.frecuentes.forEach(function (f) {
      var r = Parser.interpretar(f.texto);
      var li = el("li", "fila-categoria");
      var txt = el("span", "mov-texto");
      txt.append(el("strong", null, f.texto), el("small", null, r.ok ? (r.tipo === "ingreso" ? "Ingreso · " : "Gasto · ") + pesos.format(r.monto) + " · " + r.categoria : "No tiene un valor claro"));
      var quitar = el("button", "icono-btn", "✕"); quitar.type = "button"; quitar.setAttribute("aria-label", "Quitar " + f.texto);
      quitar.addEventListener("click", function () {
        quitar.disabled = true;
        fuente.borrar("frecuentes", f.id).then(function () {
          datos.frecuentes = datos.frecuentes.filter(function (x) { return x.id !== f.id; }); pintar();
        }).catch(function (err) { quitar.disabled = false; mensaje("comun-mensaje", err.message, true); });
      });
      li.append(el("span", "mov-icono chico", "⚡"), txt, quitar);
      ul.append(li);
    });
  }
  $("form-comun").addEventListener("submit", function (e) {
    e.preventDefault();
    var texto = $("comun-texto").value.trim(), r = Parser.interpretar(texto);
    if (!r.ok) return mensaje("comun-mensaje", "Escribe lo que gastas y el valor, por ejemplo «tinto 3 mil».", true);
    fuente.crear("frecuentes", { texto: texto }).then(function (f) {
      datos.frecuentes.push(f); $("comun-texto").value = ""; mensaje("comun-mensaje", "Listo: aparece en el inicio para registrarlo de un toque."); pintar();
    }).catch(function (err) { mensaje("comun-mensaje", err.message, true); });
  });

  // Etiquetas
  function limpiarEtiqueta(t) { return A.sinTildes(t).replace(/^#/, "").replace(/[^a-z0-9ñ_-]/g, "").slice(0, 30); }
  function pintarEtiquetas() {
    var ul = $("lista-etiquetas");
    ul.replaceChildren();
    var todas = etiquetasUsadas();
    if (!todas.length) ul.append(el("li", "vacio", "Todavía no tienes etiquetas. Escribe arriba y toca Agregar para crear la primera."));
    todas.forEach(function (e) {
      var movs = datos.movimientos.filter(function (m) { return (m.etiquetas || []).indexOf(e) >= 0; });
      var t = A.totales(movs);
      var li = el("li", "fila-categoria");
      var txt = el("span", "mov-texto");
      txt.append(el("strong", null, "#" + e), el("small", null, movs.length + " movimientos · gastos " + dinero(t.gastos)));
      var ver = el("button", "icono-btn", "🔍"); ver.type = "button"; ver.setAttribute("aria-label", "Ver movimientos con #" + e);
      ver.addEventListener("click", function () { abrirBusqueda({ etiqueta: e }); });
      var renombrar = el("button", "icono-btn", "✎"); renombrar.type = "button"; renombrar.setAttribute("aria-label", "Cambiar nombre de #" + e);
      renombrar.addEventListener("click", function () {
        var nuevo = limpiarEtiqueta(prompt("Nuevo nombre para #" + e, e) || "");
        if (!nuevo || nuevo === e) return;
        cambiarEtiqueta(e, nuevo);
      });
      var quitar = el("button", "icono-btn", "✕"); quitar.type = "button"; quitar.setAttribute("aria-label", "Borrar #" + e);
      quitar.addEventListener("click", function () {
        if (!confirm("¿Quitar #" + e + "?" + (movs.length ? " Se quitará de " + movs.length + " movimientos (los movimientos no se borran)." : ""))) return;
        cambiarEtiqueta(e, null);
      });
      li.append(el("span", "mov-icono chico", "#"), txt, ver, renombrar, quitar);
      ul.append(li);
    });
  }
  function cambiarEtiqueta(vieja, nueva) {
    var guardadas = leerLocal("nova-etiquetas", []).filter(function (x) { return x !== vieja; });
    if (nueva && guardadas.indexOf(nueva) < 0) guardadas.push(nueva);
    guardarLocal("nova-etiquetas", guardadas);
    var afectados = datos.movimientos.filter(function (m) { return (m.etiquetas || []).indexOf(vieja) >= 0; });
    Promise.all(afectados.map(function (m) {
      var et = m.etiquetas.filter(function (x) { return x !== vieja; });
      if (nueva && et.indexOf(nueva) < 0) et.push(nueva);
      return fuente.actualizar("movimientos", m.id, { etiquetas: et }).then(function (n) { Object.assign(m, n); });
    })).then(function () { toast(nueva ? "Etiqueta cambiada a #" + nueva : "Etiqueta quitada"); pintar(); })
      .catch(function (err) { toast("No se pudo: " + err.message); pintar(); });
  }
  $("form-etiqueta").addEventListener("submit", function (e) {
    e.preventDefault();
    var t = limpiarEtiqueta($("etiqueta-nueva").value);
    if (!t) return;
    var guardadas = leerLocal("nova-etiquetas", []);
    if (guardadas.indexOf(t) < 0) guardadas.push(t);
    guardarLocal("nova-etiquetas", guardadas);
    $("etiqueta-nueva").value = "";
    toast("Etiqueta #" + t + " creada");
    pintarEtiquetas();
  });

  // Programadas
  function pintarProgramadas() {
    var ul = $("lista-programadas");
    ul.replaceChildren();
    if (!datos.programados.length) ul.append(el("li", "vacio", "Sin movimientos programados. Crea uno o marca «Hacer recurrente» al registrar un gasto."));
    datos.programados.forEach(function (p) {
      var c = categoria(p.categoria_id);
      var li = el("li", "fila-categoria" + (p.activo ? "" : " pausado"));
      var txt = el("span", "mov-texto");
      txt.append(el("strong", null, p.descripcion),
        el("small", null, (A.FRECUENCIAS[p.frecuencia] || p.frecuencia) + " · " + (p.activo ? "próxima: " + fechaCorta.format(new Date(p.proxima + "T12:00:00")) : "en pausa")));
      var valor = el("strong", p.tipo === "ingreso" ? "positivo" : null, dineroSigno(num(p.monto), p.tipo));
      var interruptor = el("input", "interruptor"); interruptor.type = "checkbox"; interruptor.checked = !!p.activo;
      interruptor.setAttribute("aria-label", (p.activo ? "Pausar " : "Activar ") + p.descripcion);
      interruptor.addEventListener("change", function () {
        fuente.actualizar("programados", p.id, { activo: interruptor.checked }).then(function (n) { Object.assign(p, n); pintar(); })
          .catch(function (err) { toast(err.message); pintar(); });
      });
      var quitar = el("button", "icono-btn", "✕"); quitar.type = "button"; quitar.setAttribute("aria-label", "Borrar " + p.descripcion);
      quitar.addEventListener("click", function () {
        if (!confirm("¿Borrar la programación «" + p.descripcion + "»? Los movimientos que ya se registraron no se borran.")) return;
        fuente.borrar("programados", p.id).then(function () {
          datos.programados = datos.programados.filter(function (x) { return x.id !== p.id; }); toast("Programación borrada"); pintar();
        }).catch(function (err) { toast(err.message); });
      });
      li.append(pintarIcono(el("span", "mov-icono chico"), c), txt, valor, interruptor, quitar);
      ul.append(li);
    });
  }
  $("btn-nueva-programada").addEventListener("click", function () { abrirRegistro({ tipo: "gasto", recurrente: true }); });

  // Registra los movimientos programados que ya tocaba (al entrar a la app).
  function procesarProgramados() {
    var trabajos = datos.programados.map(function (p) {
      var pend = A.fechasPendientes(p, new Date());
      if (!pend.fechas.length) return Promise.resolve(0);
      var filas = pend.fechas.map(function (f) {
        return { cuenta_id: p.cuenta_id, categoria_id: p.categoria_id, tipo: p.tipo, descripcion: p.descripcion, monto: p.monto,
                 etiquetas: p.etiquetas || [], fecha: new Date(f + "T12:00:00").toISOString(), programado_id: p.id, estado: "pagado" };
      });
      // Primero se mueve la próxima fecha, así nunca se registra dos veces.
      return fuente.actualizar("programados", p.id, { proxima: pend.proxima }).then(function (n) {
        Object.assign(p, n);
        return fuente.crearVarios("movimientos", filas);
      }).then(function (creados) {
        Array.prototype.push.apply(datos.movimientos, creados);
        return creados.length;
      });
    });
    return Promise.all(trabajos).then(function (n) {
      var total = n.reduce(function (a, b) { return a + b; }, 0);
      if (total) { ordenarMovimientos(); pintar(); toast("🔁 Se registraron " + total + (total === 1 ? " movimiento programado" : " movimientos programados")); }
    }).catch(function (err) { toast("No se pudieron registrar los programados: " + err.message); });
  }

  // Cuentas
  function pintarCuentas() {
    var ul = $("lista-cuentas");
    ul.replaceChildren();
    datos.cuentas.forEach(function (c) {
      var li = el("li", "cuenta");
      var izq = el("div", "mov-texto");
      izq.append(el("strong", null, c.nombre), el("small", null, { debito: "Débito", ahorro: "Ahorros", efectivo: "Efectivo", credito: "Crédito" }[c.tipo] || c.tipo));
      li.append(izq, el("strong", null, dinero(saldoCuenta(c))));
      ul.append(li);
    });
  }
  $("form-cuenta").addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("cuenta-nombre").value.trim();
    var saldoTxt = $("cuenta-saldo").value.trim();
    var saldo = saldoTxt ? leerValor(saldoTxt) : 0;
    if (!nombre) return mensaje("cuenta-mensaje", "Escribe el nombre de la cuenta.", true);
    if (!isFinite(saldo)) return mensaje("cuenta-mensaje", "No entendí el saldo. Escribe por ejemplo 500 mil.", true);
    fuente.crear("cuentas", { nombre: nombre, tipo: $("cuenta-tipo").value, saldo_inicial: saldo }).then(function (c) {
      datos.cuentas.push(c); e.target.reset(); mensaje("cuenta-mensaje", "Cuenta agregada."); pintar();
    }).catch(function (err) { mensaje("cuenta-mensaje", err.message, true); });
  });

  // ---------- Modo conductor (Didi, Uber, inDrive…) ----------
  function conductor() { return !!datos.perfil.modo_conductor; }
  var cualTrabajo = leerLocal("nova-trabajo", "hoy");
  var ICONO_DOC = { soat: "🛡️", tecnomecanica: "📋", impuesto: "🧾", licencia: "🪪", seguro: "🔒", aceite: "🛢️", revision: "🔧", otro: "📌" };

  function categoriasDelGrupo(esDelGrupo) { return datos.categorias.filter(esDelGrupo).sort(function (a, b) { return a.nombre.localeCompare(b.nombre); }); }
  function asegurarCategoriasConductor() {
    var faltan = A.CATEGORIAS_CONDUCTOR.filter(function (c) { return !datos.categorias.some(function (x) { return x.nombre === c.nombre && x.tipo === c.tipo; }); });
    if (!faltan.length) return Promise.resolve();
    return fuente.crearVarios("categorias", faltan).then(function (creadas) { Array.prototype.push.apply(datos.categorias, creadas); });
  }
  // La categoría de trabajo que más se usa (o la primera) para abrir el registro ya con ella elegida.
  function categoriaDeTrabajo(tipo) {
    var es = tipo === "ingreso" ? A.esGanancia : A.esGastoTrabajo, uso = {};
    datos.movimientos.slice(0, 300).forEach(function (m) { var c = categoria(m.categoria_id); if (m.tipo === tipo && es(c)) uso[c.id] = (uso[c.id] || 0) + 1; });
    var mas = Object.keys(uso).sort(function (a, b) { return uso[b] - uso[a]; })[0];
    return mas ? categoria(Number(mas)) : categoriasDelGrupo(es)[0] || null;
  }
  function nuevoTrabajo(cual, catId) {
    var tipo = cual === "ganancia" ? "ingreso" : "gasto", c = catId != null ? categoria(catId) : categoriaDeTrabajo(tipo);
    abrirRegistro({ tipo: tipo, categoriaId: c ? c.id : null });
  }

  function documentosPorVencer() {
    return datos.documentos.map(function (d) { return { d: d, e: A.estadoDocumento(d) }; })
      .filter(function (x) { return x.e.estado !== "ok"; }).sort(function (a, b) { return a.e.dias - b.e.dias; });
  }

  function pintarConductor() {
    var on = conductor();
    $("tarjeta-jornada").hidden = !on;
    $("mas-conductor").hidden = !on;
    $("aj-trabajo").hidden = !on;
    $("perfil-conductor").checked = on;
    var al = $("alertas-docs");
    al.replaceChildren();
    function alerta(clase, icono, texto, alClick) {
      var b = el("button", "alerta-doc " + clase); b.type = "button";
      b.append(el("span", null, icono), el("span", null, texto), el("span", "flecha", "›"));
      b.addEventListener("click", alClick);
      al.append(b);
    }
    if (on) {
      var porVencer = documentosPorVencer();
      porVencer.slice(0, 3).forEach(function (x) {
        alerta(x.e.estado, x.e.estado === "vencido" ? "⛔" : "⚠️", x.d.nombre + " · " + x.e.texto.toLowerCase(), function () { ir("trabajo"); });
      });
      if (!datos.documentos.length) alerta("pronto", "🛡️", "Pon la fecha de tu SOAT y tu tecnomecánica para que no se te olviden", function () { ir("trabajo"); abrirDocumento(null, "soat"); });
      else if (!porVencer.length) {
        var sig = datos.documentos.slice().sort(function (a, b) { return String(a.vence).localeCompare(String(b.vence)); })[0];
        alerta("ok", "🗓️", "Próximo vencimiento: " + sig.nombre + " · " + A.estadoDocumento(sig).texto.toLowerCase(), function () { ir("trabajo"); });
      }
    }
    if (!on) return;
    var r = A.resumenTrabajo(datos.movimientos, datos.categorias, A.rangoJornada("hoy"));
    $("jornada-neto").textContent = (r.netoOperativo < 0 && !ocultos ? "−" : "") + dinero(Math.abs(r.netoOperativo));
    $("jornada-ganado").textContent = ocultos ? "$ ••••" : "+" + pesos.format(r.ingresos);
    $("jornada-gastos").textContent = ocultos ? "$ ••••" : "−" + pesos.format(r.operacion);
    var meta = num(datos.perfil.meta_diaria), caja = $("jornada-meta-barra-caja");
    caja.hidden = !meta;
    var nota = $("jornada-nota");
    if (meta) {
      $("jornada-meta-barra").style.width = Math.min(100, (r.ingresos / meta) * 100) + "%";
      nota.textContent = r.ingresos >= meta ? "🎉 ¡Meta del día cumplida!" : "Llevas " + dinero(r.ingresos) + " de tu meta de " + dinero(meta) + " (" + Math.round((r.ingresos / meta) * 100) + "%)";
    } else nota.textContent = r.viajes ? r.viajes + (r.viajes === 1 ? " viaje" : " viajes") + " hoy · " + dinero(r.porViaje) + " por viaje" : "Anota tus ganancias después de cada carrera.";
    pintarTrabajo();
  }

  function filaPlataforma(ul, nombre, color, total, detalle, max) {
    var li = el("li", "cat-fila");
    var punto = el("span", "punto"); punto.style.background = color;
    var n = el("span", "cat-nombre"); n.append(punto, document.createTextNode(nombre));
    var barra = el("div", "barra"), sp = el("span"); sp.style.width = (total / (max || 1)) * 100 + "%"; sp.style.background = color; barra.append(sp);
    li.append(n, el("strong", null, dinero(total)), barra);
    if (detalle) li.append(el("small", "nota detalle", detalle));
    ul.append(li);
  }

  function pintarTrabajo() {
    if (!conductor()) return;
    document.querySelectorAll("#trabajo-periodos button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.cual === cualTrabajo)); });
    var r = A.resumenTrabajo(datos.movimientos, datos.categorias, A.rangoJornada(cualTrabajo));
    $("trabajo-neto").textContent = (r.netoOperativo < 0 && !ocultos ? "−" : "") + dinero(Math.abs(r.netoOperativo));
    $("trabajo-ganado").textContent = ocultos ? "$ ••••" : "+" + pesos.format(r.ingresos);
    $("trabajo-gastos").textContent = ocultos ? "$ ••••" : "−" + pesos.format(r.operacion);
    $("trabajo-fijos").textContent = r.fijos ? "Papeles y cuotas (SOAT, seguro, cuota…): " + dinero(r.fijos) + " · Después de todo: " + (r.neto < 0 && !ocultos ? "−" : "") + dinero(Math.abs(r.neto)) : "";
    $("trabajo-viajes").textContent = r.viajes ? r.viajes + (r.viajes === 1 ? " viaje" : " viajes") + " · " + dinero(r.porViaje) + " por viaje"
      : r.movimientos ? "Sin viajes anotados" : "Aún no hay movimientos en este periodo";
    var meta = num(datos.perfil.meta_diaria);
    $("trabajo-meta-caja").hidden = !(meta && cualTrabajo === "hoy");
    $("trabajo-meta-nota").textContent = meta && cualTrabajo === "hoy" ? (r.ingresos >= meta ? "🎉 ¡Meta del día cumplida!" : "Meta del día: " + dinero(meta) + " (" + Math.round((r.ingresos / meta) * 100) + "%)") : "";
    $("trabajo-meta-barra").style.width = meta ? Math.min(100, (r.ingresos / meta) * 100) + "%" : "0";

    function chips(cont, lista, cual) {
      cont.replaceChildren();
      lista.forEach(function (c) {
        var b = el("button", "chip-rapido"); b.type = "button";
        b.append(pintarIcono(el("span", "mov-icono chico"), c), document.createTextNode(c.nombre));
        b.addEventListener("click", function () { nuevoTrabajo(cual, c.id); });
        cont.append(b);
      });
    }
    chips($("trabajo-apps"), categoriasDelGrupo(A.esGanancia), "ganancia");
    chips($("trabajo-gastos-rapidos"), categoriasDelGrupo(A.esGastoTrabajo), "gasto");

    var ulp = $("trabajo-plataformas"), maxP = r.porPlataforma.length ? r.porPlataforma[0].total : 1;
    ulp.replaceChildren();
    if (!r.porPlataforma.length) ulp.append(el("li", "vacio", "Todavía no hay ganancias en este periodo."));
    r.porPlataforma.forEach(function (p) {
      var c = categoria(p.id);
      filaPlataforma(ulp, c ? c.nombre : "Otra", colorDe(c), p.total, p.viajes ? p.viajes + (p.viajes === 1 ? " viaje" : " viajes") + " · " + dinero(p.total / p.viajes) + " por viaje" : "", maxP);
    });
    var ulg = $("trabajo-categorias"), maxG = r.gastosPorCategoria.length ? r.gastosPorCategoria[0].total : 1;
    ulg.replaceChildren();
    if (!r.gastosPorCategoria.length) ulg.append(el("li", "vacio", "Todavía no hay gastos del trabajo en este periodo."));
    r.gastosPorCategoria.forEach(function (g) {
      var c = categoria(g.id);
      filaPlataforma(ulg, c ? c.nombre : "Otro", colorDe(c), g.total, r.ingresos ? Math.round((g.total / r.ingresos) * 100) + "% de lo que ganaste" : "", maxG);
    });

    pintarDocumentos();
    var rap = $("doc-rapidos");
    rap.replaceChildren();
    ["soat", "tecnomecanica", "seguro-mensual", "seguro-anual", "cuota", "impuesto"].forEach(function (clave) {
      var x = A.DOCUMENTOS.find(function (y) { return y.clave === clave; });
      if (datos.documentos.some(function (d) { return d.tipo === x.tipo && d.nombre === x.nombre; })) return;
      var b = el("button", "chip-rapido", "＋ " + x.nombre); b.type = "button";
      b.addEventListener("click", function () { cadenaSetup = []; abrirDocumento(null, clave); });
      rap.append(b);
    });
    if (document.activeElement !== $("vehiculo-nombre")) $("vehiculo-nombre").value = datos.perfil.vehiculo || "";
    if (document.activeElement !== $("meta-diaria")) $("meta-diaria").value = datos.perfil.meta_diaria ? pesos.format(num(datos.perfil.meta_diaria)) : "";
  }
  document.querySelectorAll("#trabajo-periodos button").forEach(function (b) {
    b.addEventListener("click", function () { cualTrabajo = b.dataset.cual; guardarLocal("nova-trabajo", cualTrabajo); pintarTrabajo(); });
  });

  $("perfil-conductor").addEventListener("change", function (e) {
    var on = e.target.checked;
    (on ? asegurarCategoriasConductor() : Promise.resolve()).then(function () {
      return guardarPerfil({ modo_conductor: on }, "ajustes-mensaje",
        on ? "Modo conductor activado." : "Modo conductor apagado. Tus datos quedan guardados.");
    }).then(function () {
      programarAvisos();
      if (!on) return;
      toast("🚖 Modo conductor activado");
      ir("trabajo");
      // Para que no se le olvide: se piden de una vez las fechas del SOAT y de la tecnomecánica.
      if (!datos.documentos.length) { cadenaSetup = ["tecnomecanica"]; abrirDocumento(null, "soat"); }
    })
      .catch(function (err) { mensaje("ajustes-mensaje", err.message, true); pintar(); });
  });

  $("form-vehiculo").addEventListener("submit", function (e) {
    e.preventDefault();
    var txt = $("meta-diaria").value.trim(), meta = txt ? leerValor(txt) : null;
    if (txt && !(meta > 0)) return mensaje("vehiculo-mensaje", "No entendí la meta. Escribe por ejemplo 150 mil.", true);
    guardarPerfil({ vehiculo: $("vehiculo-nombre").value.trim() || null, meta_diaria: meta }, "vehiculo-mensaje", "Guardado.");
  });

  // Vencimientos (SOAT, tecnomecánica…)
  function pintarDocumentos() {
    var ul = $("lista-documentos");
    ul.replaceChildren();
    if (!datos.documentos.length) ul.append(el("li", "vacio", "Aún no has agregado vencimientos. Toca «+ Agregar» y pon la fecha de tu SOAT y de la tecnomecánica."));
    datos.documentos.slice().sort(function (a, b) { return String(a.vence).localeCompare(String(b.vence)); }).forEach(function (d) {
      var e = A.estadoDocumento(d);
      var li = el("li", "fila-categoria documento " + e.estado);
      li.tabIndex = 0; li.setAttribute("role", "button");
      var txt = el("span", "mov-texto");
      txt.append(el("strong", null, d.nombre), el("small", e.estado === "ok" ? null : "estado-" + e.estado, fechaCorta.format(parteFechaLocal(d.vence)) + " · " + e.texto));
      var ren = el("button", "chip-opcion", "Renovar"); ren.type = "button";
      ren.addEventListener("click", function (ev) { ev.stopPropagation(); renovarDocumento(d); });
      li.append(el("span", "mov-icono chico", ICONO_DOC[d.tipo] || "📌"), txt, ren);
      li.addEventListener("click", function () { abrirDocumento(d); });
      li.addEventListener("keydown", function (ev) { if (ev.key === "Enter") abrirDocumento(d); });
      ul.append(li);
    });
  }
  function parteFechaLocal(f) { var p = String(f).slice(0, 10).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }

  var docActual = null, cadenaSetup = []; // cadenaSetup: documentos que se piden uno tras otro al activar el modo conductor
  function abrirDocumento(d, clave) {
    docActual = d || null;
    if (d) cadenaSetup = [];
    var sel = $("doc-tipo");
    sel.replaceChildren();
    A.DOCUMENTOS.forEach(function (x) { var o = el("option", null, x.nombre); o.value = x.clave; sel.append(o); });
    var preset = d ? A.presetDe(d) : A.DOCUMENTOS.find(function (x) { return x.clave === (clave || "soat"); });
    sel.value = preset.clave;
    $("doc-titulo").textContent = d ? "Editar vencimiento" : "Nuevo vencimiento: " + preset.nombre;
    $("doc-nombre").value = d ? d.nombre : preset.nombre;
    $("doc-vence").value = d ? String(d.vence).slice(0, 10) : "";
    $("doc-costo").value = d && d.costo ? pesos.format(num(d.costo)) : "";
    $("doc-aviso").value = String(d ? d.aviso_dias : A.avisoPorDefecto(preset.meses));
    $("doc-repetir").value = String(d ? d.repetir_meses : preset.meses);
    $("doc-renovar").hidden = !d; $("doc-borrar").hidden = !d;
    mensaje("doc-mensaje", "");
    abrirCapa("pantalla-documento");
  }
  $("doc-tipo").addEventListener("change", function (e) {
    var x = A.DOCUMENTOS.find(function (y) { return y.clave === e.target.value; });
    if (!x) return;
    if ($("doc-nombre").value === "" || A.DOCUMENTOS.some(function (y) { return y.nombre === $("doc-nombre").value; })) $("doc-nombre").value = x.nombre;
    $("doc-repetir").value = String(x.meses);
    $("doc-aviso").value = String(A.avisoPorDefecto(x.meses));
  });
  $("btn-nuevo-documento").addEventListener("click", function () { cadenaSetup = []; abrirDocumento(null); });
  $("form-documento").addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = $("doc-nombre").value.trim(), vence = $("doc-vence").value, txt = $("doc-costo").value.trim(), costo = txt ? leerValor(txt) : null;
    if (!nombre) return mensaje("doc-mensaje", "Escribe el nombre.", true);
    if (!vence) return mensaje("doc-mensaje", "Elige la fecha de vencimiento.", true);
    if (txt && !(costo > 0)) return mensaje("doc-mensaje", "No entendí el costo. Escribe por ejemplo 400 mil.", true);
    var preset = A.DOCUMENTOS.find(function (y) { return y.clave === $("doc-tipo").value; }) || A.DOCUMENTOS[A.DOCUMENTOS.length - 1];
    var fila = { tipo: preset.tipo, nombre: nombre, vence: vence, costo: costo, aviso_dias: Number($("doc-aviso").value), repetir_meses: Number($("doc-repetir").value) };
    var op = docActual ? fuente.actualizar("documentos", docActual.id, fila) : fuente.crear("documentos", fila);
    var editando = !!docActual;
    op.then(function (d) {
      if (docActual) Object.assign(docActual, d); else datos.documentos.push(d);
      toast("✓ Vencimiento guardado: " + d.nombre); programarAvisos(); pintar();
      var siguiente = editando ? null : cadenaSetup.shift();
      if (siguiente) cerrarYLuego(function () { abrirDocumento(null, siguiente); }); else cerrarCapa();
    }).catch(function (err) { mensaje("doc-mensaje", err.message, true); });
  });
  $("doc-borrar").addEventListener("click", function () {
    if (!docActual || !confirm("¿Borrar el vencimiento «" + docActual.nombre + "»? Los gastos que ya anotaste no se borran.")) return;
    var id = docActual.id;
    fuente.borrar("documentos", id).then(function () {
      datos.documentos = datos.documentos.filter(function (x) { return x.id !== id; });
      toast("Vencimiento borrado"); programarAvisos(); cerrarCapa(); pintar();
    }).catch(function (err) { mensaje("doc-mensaje", err.message, true); });
  });
  $("doc-renovar").addEventListener("click", function () { var d = docActual; cerrarYLuego(function () { renovarDocumento(d); }); });

  // "Ya lo renové": abre el registro del gasto con la categoría y el costo, y al guardarlo corre la fecha.
  function renovarDocumento(d) {
    var x = A.presetDe(d);
    var c = datos.categorias.find(function (k) { return k.nombre === x.categoria && k.tipo === "gasto"; });
    abrirRegistro({ tipo: "gasto", categoriaId: c ? c.id : null, expr: d.costo ? String(Math.round(num(d.costo))) : "", desc: d.nombre, documentoId: d.id });
  }
  function renovarDocumentoListo(docId) {
    var d = datos.documentos.find(function (x) { return x.id === docId; });
    if (!d) return;
    fuente.actualizar("documentos", d.id, { vence: A.proximoVencimiento(d) }).then(function (n) {
      Object.assign(d, n); toast("✓ " + d.nombre + " renovado: ahora vence el " + fechaCorta.format(parteFechaLocal(d.vence)) + " " + parteFechaLocal(d.vence).getFullYear());
      programarAvisos(); pintar();
    }).catch(function (err) { toast("No se pudo mover la fecha: " + err.message); });
  }

  // Avisos en el celular (solo en la app instalada): se vuelven a programar cada vez que cambia algo.
  function programarAvisos() {
    var N = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
    if (!N || !fuente || fuente.demo) return Promise.resolve();
    var avisos = conductor() ? A.avisosDocumentos(datos.documentos).slice(0, 60) : [];
    return N.getPending().then(function (p) {
      var viejos = (p && p.notifications || []).map(function (n) { return { id: n.id }; });
      return viejos.length ? N.cancel({ notifications: viejos }) : null;
    }).then(function () {
      if (!avisos.length) return null;
      return N.requestPermissions().then(function (perm) {
        if (!perm || perm.display !== "granted") return null;
        return N.schedule({ notifications: avisos.map(function (a) {
          return { id: a.id, title: a.titulo, body: a.texto, schedule: { at: a.cuando, allowWhileIdle: true } };
        }) });
      });
    }).catch(function () { /* sin permiso o sin el complemento: los avisos dentro de la app siguen funcionando */ });
  }

  // ---------- Exportar ----------
  function aBase64(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function descargar(nombre, contenido, tipo) {
    var binario = typeof contenido !== "string";
    if (!binario && /^text\/csv/.test(tipo) && contenido.charAt(0) !== "\ufeff") contenido = "\ufeff" + contenido; // para que Excel lea bien las tildes
    if (enApp) {
      // En la app: se guarda en una carpeta temporal y se abre el menú de compartir de Android
      // (Guardar en Drive, WhatsApp, correo, Archivos...).
      var P = window.Capacitor.Plugins || {};
      if (!P.Filesystem || !P.Share) {
        mensaje("exportar-mensaje", "Actualiza NOVA a la última versión para poder descargar desde la app.", true);
        return;
      }
      mensaje("exportar-mensaje", "Preparando " + nombre + "…");
      var archivo = { path: nombre, data: binario ? aBase64(contenido) : contenido, directory: "CACHE" };
      if (!binario) archivo.encoding = "utf8";
      P.Filesystem.writeFile(archivo)
        .then(function (r) { return P.Share.share({ title: nombre, text: "Informe de NOVA · OPITA-DIGITAL", url: r.uri, dialogTitle: "Guardar o enviar " + nombre }); })
        .then(function () { mensaje("exportar-mensaje", "Listo: elige dónde guardar " + nombre + "."); })
        .catch(function (e) {
          if (e && /cancel/i.test(String(e.message || e))) return mensaje("exportar-mensaje", "");
          mensaje("exportar-mensaje", "No se pudo exportar: " + (e && e.message ? e.message : e), true);
        });
      return;
    }
    var url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    var a = el("a"); a.href = url; a.download = nombre;
    document.body.append(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    mensaje("exportar-mensaje", "Se descargó " + nombre + ".");
  }
  function hoyArchivo() { return A.claveDia(new Date()); }
  function exportarMovimientos(movs, nombre) {
    var cuenta = function (id) { var c = datos.cuentas.find(function (x) { return x.id === id; }); return c ? c.nombre : ""; };
    descargar((nombre || "nova-transacciones") + "-" + hoyArchivo() + ".csv", A.csv(movs, [
      { titulo: "Fecha", valor: function (m) { return A.claveDia(m.fecha); } },
      { titulo: "Hora", valor: function (m) { return hora.format(new Date(m.fecha)); } },
      { titulo: "Tipo", valor: function (m) { return m.tipo === "ingreso" ? "Ingreso" : "Gasto"; } },
      { titulo: "Descripción", valor: function (m) { return m.descripcion; } },
      { titulo: "Categoría", valor: function (m) { return nombreCategoria(m.categoria_id); } },
      { titulo: "Valor", valor: function (m) { return (m.tipo === "ingreso" ? 1 : -1) * num(m.monto); } },
      { titulo: "Cuenta", valor: function (m) { return cuenta(m.cuenta_id); } },
      { titulo: "Estado", valor: function (m) { return m.estado || "pagado"; } },
      { titulo: "Etiquetas", valor: function (m) { return (m.etiquetas || []).map(function (e) { return "#" + e; }); } },
      { titulo: "Nota", valor: function (m) { return m.nota || ""; } }
    ]), "text/csv;charset=utf-8");
  }
  document.querySelectorAll("[data-exportar]").forEach(function (b) {
    b.addEventListener("click", function () {
      var que = b.dataset.exportar;
      if (que === "movimientos") return exportarMovimientos(datos.movimientos);
      if (que === "categorias") {
        return descargar("nova-categorias-" + hoyArchivo() + ".csv", A.csv(datos.categorias, [
          { titulo: "Nombre", valor: function (c) { return c.nombre; } },
          { titulo: "Tipo", valor: function (c) { return c.tipo; } },
          { titulo: "Grupo", valor: function (c) { return A.grupoDe(c); } },
          { titulo: "Movimientos", valor: function (c) { return usosCategoria(c.id); } }
        ]), "text/csv;charset=utf-8");
      }
      if (que === "limites") {
        var filas = datos.limites.map(function (l) { var e = estadoLimite(l); return { n: l.categoria_id != null ? nombreCategoria(l.categoria_id) : "Todas las categorías", c: l.ciclo, m: l.monto, g: e.gastado, r: l.recurrente }; });
        if (datos.perfil.presupuesto_monto) filas.unshift({ n: "Presupuesto general", c: cicloEfectivo(), m: datos.perfil.presupuesto_monto, g: gastadoEn(Periodos.periodo(cicloEfectivo())), r: true });
        return descargar("nova-presupuestos-" + hoyArchivo() + ".csv", A.csv(filas, [
          { titulo: "Nombre", valor: function (f) { return f.n; } }, { titulo: "Periodo", valor: function (f) { return f.c; } },
          { titulo: "Límite", valor: function (f) { return num(f.m); } }, { titulo: "Gastado este periodo", valor: function (f) { return f.g; } },
          { titulo: "Recurrente", valor: function (f) { return f.r ? "Sí" : "No"; } }
        ]), "text/csv;charset=utf-8");
      }
      if (que === "respaldo") {
        var copia = { app: "NOVA", creada_por: "OPITA-DIGITAL", exportado: new Date().toISOString(), perfil: datos.perfil };
        TABLAS.forEach(function (t) { copia[t] = datos[t]; });
        return descargar("nova-respaldo-" + hoyArchivo() + ".json", JSON.stringify(copia, null, 2), "application/json");
      }
      if (que === "pdf" || que === "excel") return exportarInforme(que);
    });
  });

  // Informe completo (PDF o Excel con gráficos): aquí se calculan las cifras y informes.js arma el archivo.
  var DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  function nombreDePersona() {
    if (fuente.nombre) return fuente.nombre;
    var local = String(fuente.email || "").split("@")[0].replace(/[._-]+/g, " ").replace(/\d+/g, "").trim();
    return local ? local.replace(/\b\w/g, function (l) { return l.toUpperCase(); }) : "Usuario de NOVA";
  }
  function construirInforme() {
    var ciclo = cicloEfectivo(), rango = rangoInicio(), movs = A.enRango(datos.movimientos, rango), t = A.totales(movs);
    var cuentaNombre = function (id) { var c = datos.cuentas.find(function (x) { return x.id === id; }); return c ? c.nombre : ""; };
    var rapida = A.vistaRapida(datos.movimientos, ciclo, rango.desde);
    var gastos = movs.filter(function (m) { return m.tipo === "gasto"; });
    var mayor = gastos.reduce(function (mx, m) { return !mx || num(m.monto) > num(mx.monto) ? m : mx; }, null);
    var semana = DIAS_CORTOS.map(function (d) { return { dia: d, total: 0 }; });
    gastos.forEach(function (m) { semana[(new Date(m.fecha).getDay() + 6) % 7].total += num(m.monto); });
    var forma = function (m) {
      return { fecha: new Date(m.fecha), tipo: m.tipo, descripcion: m.descripcion || "", categoria: nombreCategoria(m.categoria_id), monto: Math.abs(num(m.monto)),
        cuenta: cuentaNombre(m.cuenta_id), estado: m.estado || "pagado", etiquetas: m.etiquetas || [], nota: m.nota || "" };
    };
    var presupuestos = datos.limites.map(function (l) {
      var e = estadoLimite(l);
      return { nombre: l.categoria_id != null ? nombreCategoria(l.categoria_id) : "Todas las categorías", ciclo: Periodos.CICLOS[l.ciclo] || l.ciclo, limite: num(l.monto), gastado: e.gastado };
    });
    if (datos.perfil.presupuesto_monto) {
      presupuestos.unshift({ nombre: "Presupuesto general", ciclo: Periodos.CICLOS[ciclo], limite: num(datos.perfil.presupuesto_monto), gastado: gastadoEn(Periodos.periodo(ciclo)) });
    }
    var inf = {
      persona: { nombre: nombreDePersona(), email: fuente.email }, generado: new Date(), periodoNombre: A.nombrePeriodo(ciclo, rango),
      ciclo: ciclo, cicloNombre: Periodos.CICLOS[ciclo], desde: rango.desde, hasta: new Date(rango.hasta.getTime() - 1),
      kpis: {
        ingresos: t.ingresos, gastos: t.gastos, balance: t.neto, saldoTotal: saldoTotal(), promedioDiario: rapida.promedioDiario, movimientos: movs.length,
        ahorroPct: t.ingresos > 0 ? (t.neto / t.ingresos) * 100 : null, mayorGasto: mayor ? { descripcion: mayor.descripcion || nombreCategoria(mayor.categoria_id), monto: num(mayor.monto) } : null
      },
      categorias: A.porCategoria(movs).map(function (f) {
        return { nombre: nombreCategoria(f.id), total: f.total, pct: t.gastos > 0 ? (f.total / t.gastos) * 100 : 0,
          cantidad: gastos.filter(function (m) { return (m.categoria_id == null ? null : m.categoria_id) === f.id; }).length };
      }),
      serie: A.serie(datos.movimientos, ciclo, rango.desde, 6), semana: semana,
      cuentas: datos.cuentas.map(function (c) { return { nombre: c.nombre, tipo: c.tipo ? String(c.tipo).charAt(0).toUpperCase() + String(c.tipo).slice(1) : "Cuenta", saldo: saldoCuenta(c) }; }),
      presupuestos: presupuestos, movimientos: movs.map(forma), todos: datos.movimientos.map(forma), conductor: null
    };
    if (conductor()) {
      var r = A.resumenTrabajo(datos.movimientos, datos.categorias, rango);
      inf.conductor = { vehiculo: datos.perfil.vehiculo || "", ingresos: r.ingresos, gastos: r.gastos, neto: r.neto, operacion: r.operacion, fijos: r.fijos, netoOperativo: r.netoOperativo, viajes: r.viajes, porViaje: r.porViaje,
        plataformas: r.porPlataforma.map(function (p) { return { nombre: nombreCategoria(p.id), total: p.total, viajes: p.viajes }; }) };
    }
    return inf;
  }
  var generandoInforme = false;
  function exportarInforme(tipo) {
    if (generandoInforme) return;
    if (!window.NovaInformes) return mensaje("exportar-mensaje", "No se pudo preparar el informe. Actualiza NOVA.", true);
    generandoInforme = true;
    mensaje("exportar-mensaje", "Preparando tu informe " + (tipo === "pdf" ? "en PDF" : "en Excel") + "… puede tardar unos segundos.");
    setTimeout(function () {
      var listo;
      try { listo = window.NovaInformes[tipo](construirInforme()); } catch (e) { listo = Promise.reject(e); }
      listo.then(function (r) { descargar(r.nombre, r.bytes, r.tipo); })
        .catch(function (e) { mensaje("exportar-mensaje", "No se pudo crear el informe: " + (e && e.message ? e.message : e), true); })
        .then(function () { generandoInforme = false; });
    }, 30);
  }

  // ---------- Pintar todo ----------
  function pintar() {
    if (!fuente) return;
    pintarInicio(); pintarPlanes(); pintarAnalisis(); pintarBuscar(); pintarAjustes(); pintarIA(); pintarConductor();
  }

  function alerta(e) { mensaje("rapido-mensaje", "No se pudo guardar: " + (e && e.message ? e.message : e), true); }

  // ---------- Navegación ----------
  var PRINCIPALES = ["inicio", "planes", "ia", "analisis", "buscar", "ajustes"];
  function ir(vista) {
    document.querySelectorAll(".vista").forEach(function (v) { v.hidden = v.dataset.vista !== vista; });
    var principal = PRINCIPALES.indexOf(vista) >= 0 ? vista : vista === "trabajo" ? "inicio" : "ajustes";
    document.querySelectorAll(".nav-inferior button").forEach(function (b) {
      b.classList.toggle("activo", b.dataset.ir === principal);
      if (b.dataset.ir === principal) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    enVista = vista;
    actualizarFab();
    if (vista === "buscar") pintarBuscar();
    if (vista === "ia") pintarIA();
    window.scrollTo(0, 0);
  }
  // El botón + se esconde donde estorba: en pantallas de configuración y mientras se ve la entrada rápida del inicio.
  var enVista = "inicio", rapidoVisible = false;
  function actualizarFab() {
    $("btn-mas").classList.toggle("oculto", ["inicio", "analisis", "buscar", "planes"].indexOf(enVista) < 0 || (enVista === "inicio" && rapidoVisible));
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { rapidoVisible = e[0].isIntersecting; actualizarFab(); }).observe($("form-rapido"));
  }
  document.querySelectorAll("[data-ir]").forEach(function (b) { b.addEventListener("click", function () { ir(b.dataset.ir); }); });
  document.querySelectorAll("[data-tema]").forEach(function (b) { b.addEventListener("click", function () { aplicarTema(b.dataset.tema); }); });

  // Capas (pantallas encima de la app) y hojas. El botón Atrás de Android las cierra.
  var pilaCapas = [];
  function abrirCapa(id) {
    var c = $(id);
    if (pilaCapas.indexOf(id) >= 0) return;
    pilaCapas.push(id);
    c.hidden = false;
    document.body.classList.add("con-capa");
    history.pushState({ capa: id }, "");
    var foco = c.querySelector("input:not([type=checkbox]):not([type=date]), textarea, button");
    if (c.classList.contains("capa") && foco && id !== "pantalla-registro") setTimeout(function () { foco.focus({ preventScroll: true }); }, 30);
  }
  function ocultarCapa() {
    var id = pilaCapas.pop();
    if (id) $(id).hidden = true;
    if (!pilaCapas.length) document.body.classList.remove("con-capa");
  }
  function cerrarCapa() { if (pilaCapas.length) history.back(); }
  window.addEventListener("popstate", function () { if (pilaCapas.length) ocultarCapa(); });
  document.querySelectorAll("[data-cerrar]").forEach(function (b) { b.addEventListener("click", cerrarCapa); });
  document.querySelectorAll(".hoja-fondo").forEach(function (f) { f.addEventListener("click", function (e) { if (e.target === f) cerrarCapa(); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pilaCapas.length) cerrarCapa(); });
  // Cierra la capa de arriba y, cuando el navegador terminó de volver atrás, ejecuta fn.
  function cerrarYLuego(fn) {
    var listo = function () { window.removeEventListener("popstate", listo); setTimeout(fn, 0); };
    window.addEventListener("popstate", listo);
    cerrarCapa();
  }
  function abrirDesdeHoja(fn) {
    if (pilaCapas[pilaCapas.length - 1] === "hoja-mas") cerrarYLuego(fn); else fn();
  }
  $("btn-mas").addEventListener("click", function () { abrirCapa("hoja-mas"); });
  document.querySelectorAll("[data-abrir]").forEach(function (b) {
    b.addEventListener("click", function () {
      var id = b.dataset.abrir;
      abrirDesdeHoja(function () { if (id === "pantalla-chat") abrirChat(null); else abrirCapa(id); });
    });
  });
  document.querySelectorAll("[data-trabajo]").forEach(function (b) {
    b.addEventListener("click", function () { var cual = b.dataset.trabajo; abrirDesdeHoja(function () { nuevoTrabajo(cual); }); });
  });
  document.querySelectorAll("[data-nuevo]").forEach(function (b) {
    b.addEventListener("click", function () { var t = b.dataset.nuevo; abrirDesdeHoja(function () { abrirRegistro({ tipo: t }); }); });
  });

  // ---------- Nuevo / editar movimiento ----------
  var reg = null;
  function abrirRegistro(o) {
    o = o || {};
    var m = o.movimiento;
    reg = {
      editar: m || null,
      tipo: m ? m.tipo : o.tipo || "gasto",
      expr: m ? textoMonto(m.moneda && m.moneda !== "COP" && num(m.monto_original) > 0 ? num(m.monto_original) : num(m.monto)) : (o.expr || ""),
      categoriaId: m ? m.categoria_id : (o.categoriaId != null ? o.categoriaId : null),
      documentoId: o.documentoId || null,
      etiquetas: m ? (m.etiquetas || []).slice() : [],
      moneda: m && m.moneda ? m.moneda : "COP",
      tasa: m && m.tasa ? Number(m.tasa) : null,
      tasaAuto: null, tasaFecha: "", tasaEditada: !!(m && m.tasa)
    };
    $("reg-fecha").value = A.claveDia(m ? m.fecha : new Date());
    $("reg-desc").value = m ? m.descripcion : (o.desc || "");
    $("reg-viajes").value = m && m.viajes ? m.viajes : "";
    $("reg-nota").value = m && m.nota ? m.nota : "";
    $("reg-estado").value = m && m.estado ? m.estado : "pagado";
    $("reg-etiqueta").value = "";
    var freq = $("reg-frecuencia");
    freq.replaceChildren();
    Object.keys(A.FRECUENCIAS).forEach(function (f) { var op = el("option", null, A.FRECUENCIAS[f]); op.value = f; op.selected = f === "mensual"; freq.append(op); });
    $("reg-bloque-estado").hidden = !(m && m.estado === "pendiente");
    $("reg-bloque-nota").hidden = !(m && m.nota);
    $("reg-bloque-recurrente").hidden = !o.recurrente;
    $("reg-btn-recurrente").hidden = !!m;
    $("reg-otro-fila").hidden = !!m;
    $("reg-borrar").hidden = !m;
    var sel = $("reg-cuenta");
    sel.replaceChildren();
    datos.cuentas.forEach(function (c) { var op = el("option", null, c.nombre); op.value = c.id; op.selected = m ? c.id === m.cuenta_id : false; sel.append(op); });
    sel.hidden = $("reg-cuenta-etiqueta").hidden = datos.cuentas.length < 2;
    mensaje("reg-mensaje", "");
    $("teclado").hidden = false;
    pintarRegistro();
    abrirCapa("pantalla-registro");
  }
  // 19.99 -> "19,99" (la coma es el decimal que se escribe con el teclado de la app)
  function textoMonto(n) { return String(Math.round(n * 100) / 100).replace(".", ","); }
  function formatearExpr(expr) {
    if (!expr) return "0";
    return expr.replace(/\d+(,\d*)?/g, function (d) {
      var p = d.split(",");
      return numeroCO.format(Number(p[0])) + (p.length > 1 ? "," + p[1] : "");
    });
  }

  // Tasas de cambio (base USD): se piden una vez al día y se guardan en el celular.
  function cargarTasas() {
    var g = leerLocal("nova-tasas", null);
    if (g && g.rates && Date.now() - g.guardado < 12 * 3600000) return Promise.resolve(g);
    var origen = cliente && fuente && !fuente.demo
      ? cliente.functions.invoke("nova-ia", { body: { tasas: true } }).then(function (res) { if (res.error || !res.data || !res.data.rates) throw new Error("tasas"); return res.data; })
      : fetch("https://open.er-api.com/v6/latest/USD").then(function (r) { return r.json(); }).then(function (d) { if (d.result !== "success") throw new Error("tasas"); return { rates: d.rates, fecha: d.time_last_update_utc }; });
    return origen.then(function (d) {
      var t = { rates: d.rates, fecha: d.fecha || "", guardado: Date.now() };
      guardarLocal("nova-tasas", t);
      return t;
    }).catch(function () { return g && g.rates ? g : null; });
  }
  function elegirMoneda() {
    abrirCapa("hoja-moneda");
    $("hoja-moneda-buscar").value = "";
    pintarHojaMoneda();
  }
  function pintarHojaMoneda() {
    var cont = $("hoja-moneda-lista");
    cont.replaceChildren();
    var lista = Mon.buscar($("hoja-moneda-buscar").value);
    if (!lista.length) cont.append(el("p", "vacio", "No hay monedas con ese nombre."));
    lista.forEach(function (m) {
      var b = el("button", "fila-moneda"); b.type = "button";
      var txt = el("span", "mov-texto"); txt.append(el("strong", null, m.codigo), el("small", null, m.nombre));
      b.append(el("span", "bandera", m.bandera), txt, el("span", "marca", m.codigo === reg.moneda ? "✓" : ""));
      b.addEventListener("click", function () { cerrarYLuego(function () { cambiarMoneda(m.codigo); }); });
      cont.append(b);
    });
  }
  $("hoja-moneda-buscar").addEventListener("input", pintarHojaMoneda);
  $("reg-moneda").addEventListener("click", elegirMoneda);
  function cambiarMoneda(codigo) {
    reg.moneda = codigo;
    reg.tasaAuto = null;
    if (codigo === "COP") { reg.tasa = null; reg.tasaEditada = false; return pintarRegistro(); }
    if (!reg.tasaEditada) reg.tasa = null;
    pintarRegistro();
    cargarTasas().then(function (t) {
      if (!reg || reg.moneda !== codigo) return;
      reg.tasaAuto = t ? Mon.tasaACOP(codigo, t.rates) : null;
      reg.tasaFecha = t ? t.fecha : "";
      if (!reg.tasaEditada && reg.tasaAuto) reg.tasa = reg.tasaAuto;
      pintarRegistro();
    });
  }
  $("reg-tasa").addEventListener("input", function (e) {
    var v = Mon.leerTasa(e.target.value);
    reg.tasa = isNaN(v) ? null : v;
    reg.tasaEditada = true;
    pintarRegistro();
  });
  function pintarRegistro() {
    $("reg-titulo").textContent = (reg.editar ? "Editar " : "Nuevo ") + (reg.tipo === "ingreso" ? "ingreso" : "gasto") + ($("reg-bloque-recurrente").hidden ? "" : " recurrente");
    document.querySelectorAll("#reg-tipo button").forEach(function (b) { b.setAttribute("aria-checked", String(b.dataset.tipo === reg.tipo)); });
    $("pantalla-registro").classList.toggle("es-ingreso", reg.tipo === "ingreso");
    $("reg-monto-texto").textContent = formatearExpr(reg.expr);
    var v = A.evaluar(reg.expr), ext = reg.moneda !== "COP", mi = Mon.info(reg.moneda);
    $("reg-resultado").textContent = /[+\-×÷−]/.test(reg.expr.replace(/^-/, "")) ? (isNaN(v) ? "…" : "= " + (ext ? Mon.formatoMonto(v, reg.moneda) : pesos.format(v))) : "";
    $("reg-moneda-bandera").textContent = mi.bandera; $("reg-moneda-codigo").textContent = mi.codigo;
    $("reg-moneda").classList.toggle("activo", ext);
    $("reg-bloque-moneda").hidden = !ext;
    if (ext) {
      $("reg-conversion").textContent = v > 0 && reg.tasa > 0 ? "= " + pesos.format(Mon.aCOP(v, reg.tasa)) + " COP" : "Escribe el valor y la tasa para ver los pesos";
      $("reg-tasa-etiqueta").textContent = "Tasa: 1 " + reg.moneda + " = ? COP";
      if (document.activeElement !== $("reg-tasa")) $("reg-tasa").value = reg.tasa ? Mon.formatoTasa(reg.tasa) : "";
      $("reg-tasa-nota").textContent = reg.tasa && reg.tasaAuto && Math.abs(reg.tasa - reg.tasaAuto) < 1e-9 ? "Tasa del día" + (reg.tasaFecha ? " · " + reg.tasaFecha.slice(5, 16) : "")
        : reg.tasaAuto ? "Tasa del día: " + Mon.formatoTasa(reg.tasaAuto) + " (la cambiaste)"
        : reg.tasa ? "Tasa escrita por ti" : "No pude consultar la tasa del día: escríbela a mano.";
    }
    $("reg-desc").placeholder = reg.tipo === "ingreso" ? "¿De dónde proviene?" : "¿En qué gastaste?";
    var c = reg.categoriaId != null ? categoria(reg.categoriaId) : null;
    if (c && c.tipo !== reg.tipo) { reg.categoriaId = null; c = null; }
    pintarIcono($("reg-cat-icono"), c || { icono: "otro", color: "#64748b" });
    $("reg-bloque-viajes").hidden = !A.esGanancia(c);
    $("reg-cat-nombre").textContent = c ? c.nombre : "Seleccionar categoría";
    var tags = $("reg-etiquetas");
    tags.replaceChildren();
    reg.etiquetas.forEach(function (t) {
      var b = el("button", "etiqueta-chip", "#" + t + " ✕"); b.type = "button"; b.setAttribute("aria-label", "Quitar #" + t);
      b.addEventListener("click", function () { reg.etiquetas = reg.etiquetas.filter(function (x) { return x !== t; }); pintarRegistro(); });
      tags.append(b);
    });
    var sug = $("reg-sugerencias");
    sug.replaceChildren();
    var escrito = limpiarEtiqueta($("reg-etiqueta").value);
    etiquetasUsadas().filter(function (t) { return reg.etiquetas.indexOf(t) < 0 && (!escrito || t.indexOf(escrito) === 0); }).slice(0, 8).forEach(function (t) {
      var b = el("button", "etiqueta-chip sugerida", "#" + t); b.type = "button";
      b.addEventListener("click", function () { reg.etiquetas.push(t); $("reg-etiqueta").value = ""; pintarRegistro(); });
      sug.append(b);
    });
    $("reg-btn-estado").classList.toggle("activo", !$("reg-bloque-estado").hidden);
    $("reg-btn-nota").classList.toggle("activo", !$("reg-bloque-nota").hidden);
    $("reg-btn-recurrente").classList.toggle("activo", !$("reg-bloque-recurrente").hidden);
  }
  document.querySelectorAll("#reg-tipo button").forEach(function (b) { b.addEventListener("click", function () { reg.tipo = b.dataset.tipo; pintarRegistro(); }); });
  $("reg-monto").addEventListener("click", function () { $("teclado").hidden = false; });
  document.querySelectorAll("#teclado button, #reg-borrar-digito").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.dataset.tecla, e = reg.expr;
      if (t === "borrar") e = e.slice(0, -1);
      else if ("+−×÷".indexOf(t) >= 0) { if (!e) return; e = /[+−×÷]$/.test(e) ? e.slice(0, -1) + t : e + t; }
      else if (t === ",") {
        var seg = e.match(/[\d,]*$/)[0];
        if (seg.indexOf(",") >= 0) return;
        e += seg ? "," : "0,";
      }
      else if (t === "000") { if (!e || /[+−×÷]$/.test(e) || /,$/.test(e)) return; e += "000"; }
      else {
        var ult = e.match(/[\d,]*$/)[0];
        if (ult.indexOf(",") >= 0 && ult.split(",")[1].length >= 2) return; // máximo 2 decimales
        e = (/(^|[+−×÷])0$/.test(e) ? e.slice(0, -1) : e) + t;
      }
      if (e.replace(/\D/g, "").length > 15) return;
      reg.expr = e;
      pintarRegistro();
    });
  });
  // Teclado físico (computador) para el valor.
  $("pantalla-registro").addEventListener("keydown", function (e) {
    if (e.target.matches("input, textarea, select")) return;
    var mapa = { "*": "×", "/": "÷", "-": "−", "+": "+", Backspace: "borrar", ",": ",", ".": "," };
    var t = /^\d$/.test(e.key) ? e.key : mapa[e.key];
    var b = t && document.querySelector('[data-tecla="' + t + '"]');
    if (b) { e.preventDefault(); b.click(); }
  });
  ["reg-desc", "reg-etiqueta", "reg-nota"].forEach(function (id) { $(id).addEventListener("focus", function () { $("teclado").hidden = true; }); });
  $("reg-categoria").addEventListener("click", function () {
    elegirCategoria(reg.tipo, function (c) { if (c) { reg.categoriaId = c.id; if (c.tipo !== reg.tipo) reg.tipo = c.tipo; } pintarRegistro(); });
  });
  function agregarEtiquetaEscrita() {
    var t = limpiarEtiqueta($("reg-etiqueta").value);
    if (t && reg.etiquetas.indexOf(t) < 0) reg.etiquetas.push(t);
    $("reg-etiqueta").value = "";
    pintarRegistro();
  }
  $("reg-etiqueta").addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " " || e.key === ",") { e.preventDefault(); agregarEtiquetaEscrita(); } });
  $("reg-etiqueta").addEventListener("input", function () { if (/[\s,]$/.test($("reg-etiqueta").value)) agregarEtiquetaEscrita(); else pintarRegistro(); });
  $("reg-etiqueta").addEventListener("blur", function () { if ($("reg-etiqueta").value.trim()) agregarEtiquetaEscrita(); });
  [["reg-btn-estado", "reg-bloque-estado"], ["reg-btn-nota", "reg-bloque-nota"], ["reg-btn-recurrente", "reg-bloque-recurrente"]].forEach(function (p) {
    $(p[0]).addEventListener("click", function () { var b = $(p[1]); b.hidden = !b.hidden; pintarRegistro(); if (!b.hidden) { var f = b.querySelector("select, textarea"); if (f) f.focus(); } });
  });

  // Busca (o crea) la categoría "Otros gastos"/"Otros ingresos" cuando no se eligió ninguna.
  function categoriaPorNombre(nombre, tipo, icono) {
    var c = datos.categorias.find(function (x) { return x.nombre === nombre && x.tipo === tipo; });
    if (c) return Promise.resolve(c);
    return fuente.crear("categorias", { nombre: nombre, tipo: tipo, icono: icono || "otro", grupo: A.grupoDe({ nombre: nombre, tipo: tipo }) })
      .then(function (n) { datos.categorias.push(n); return n; });
  }

  $("form-registro").addEventListener("submit", function (e) {
    e.preventDefault();
    if ($("reg-etiqueta").value.trim()) agregarEtiquetaEscrita();
    var montoOriginal = A.evaluar(reg.expr), ext = reg.moneda !== "COP";
    if (!(montoOriginal > 0)) { $("teclado").hidden = false; return mensaje("reg-mensaje", "Escribe el valor con el teclado de números.", true); }
    if (ext && !(reg.tasa > 0)) return mensaje("reg-mensaje", "Escribe la tasa de cambio: cuántos pesos vale 1 " + reg.moneda + ".", true);
    var monto = ext ? Mon.aCOP(montoOriginal, reg.tasa) : montoOriginal;
    if (!(monto > 0)) return mensaje("reg-mensaje", "El valor en pesos quedó en cero. Revisa la tasa.", true);
    var fechaTxt = $("reg-fecha").value;
    if (!fechaTxt) return mensaje("reg-mensaje", "Elige la fecha.", true);
    var recurrente = !reg.editar && !$("reg-bloque-recurrente").hidden;
    var hoy = A.claveDia(new Date());
    var fecha = fechaTxt === hoy ? new Date() : new Date(fechaTxt + "T12:00:00");
    if (reg.editar && fechaTxt === A.claveDia(reg.editar.fecha)) fecha = new Date(reg.editar.fecha); // conserva la hora original
    var btn = $("reg-guardar");
    btn.disabled = true;
    var conCategoria = reg.categoriaId != null ? Promise.resolve(categoria(reg.categoriaId))
      : categoriaPorNombre(reg.tipo === "ingreso" ? "Otros ingresos" : "Otros gastos", reg.tipo);
    var editar = reg.editar, otro = $("reg-otro").checked, docId = reg.documentoId;
    conCategoria.then(function (c) {
      var fila = {
        cuenta_id: Number($("reg-cuenta").value) || datos.cuentas[0].id, categoria_id: c.id, tipo: reg.tipo,
        descripcion: $("reg-desc").value.trim() || c.nombre, monto: monto, fecha: fecha.toISOString(),
        etiquetas: reg.etiquetas, estado: $("reg-estado").value, nota: $("reg-nota").value.trim() || null,
        moneda: reg.moneda, monto_original: ext ? montoOriginal : null, tasa: ext ? reg.tasa : null,
        viajes: A.esGanancia(c) && parseInt($("reg-viajes").value, 10) > 0 ? Math.min(1000, parseInt($("reg-viajes").value, 10)) : null
      };
      if (editar) return fuente.actualizar("movimientos", editar.id, fila).then(function (n) { Object.assign(editar, n); return { m: editar, c: c }; });
      var prog = Promise.resolve(null);
      if (recurrente) {
        var futuro = fechaTxt > hoy;
        prog = fuente.crear("programados", {
          cuenta_id: fila.cuenta_id, categoria_id: c.id, tipo: fila.tipo, monto: monto, descripcion: fila.descripcion, etiquetas: fila.etiquetas,
          frecuencia: $("reg-frecuencia").value, proxima: futuro ? fechaTxt : A.siguienteFecha(fechaTxt, $("reg-frecuencia").value), activo: true
        }).then(function (p) { datos.programados.push(p); return { p: p, futuro: futuro }; });
      }
      return prog.then(function (pr) {
        if (pr && pr.futuro) return { m: null, c: c, programado: pr.p };
        if (pr) fila.programado_id = pr.p.id;
        return ubicacionActual().then(function (lugar) {
          if (lugar) { fila.lat = lugar.lat; fila.lng = lugar.lng; }
          return fuente.crear("movimientos", fila);
        }).then(function (m) { datos.movimientos.push(m); return { m: m, c: c, programado: pr && pr.p }; });
      });
    }).then(function (r) {
      ordenarMovimientos();
      if (docId) renovarDocumentoListo(docId);
      var etiquetaDesc = r.m ? r.m.descripcion : r.programado.descripcion;
      toast((editar ? "✓ Cambios guardados: " : "✓ ¡Guardado! ") + etiquetaDesc + " " + pesos.format(monto) + (ext ? " (" + Mon.formatoMonto(montoOriginal, reg.moneda) + ")" : "") + (r.m && r.m.viajes ? " · " + r.m.viajes + (r.m.viajes === 1 ? " viaje" : " viajes") : "") + (r.programado ? " · 🔁 " + A.FRECUENCIAS[r.programado.frecuencia].toLowerCase() : ""));
      pintar();
      if (otro && !editar) {
        reg.expr = ""; reg.etiquetas = []; $("reg-desc").value = ""; $("reg-nota").value = ""; $("teclado").hidden = false;
        mensaje("reg-mensaje", ""); pintarRegistro();
      } else cerrarCapa();
    }).catch(function (err) { mensaje("reg-mensaje", "No se pudo guardar: " + err.message, true); })
      .finally(function () { btn.disabled = false; });
  });
  $("reg-borrar").addEventListener("click", function () {
    var m = reg && reg.editar;
    if (!m || !confirm("¿Borrar «" + m.descripcion + "» de " + pesos.format(num(m.monto)) + "?")) return;
    fuente.borrar("movimientos", m.id).then(function () {
      datos.movimientos = datos.movimientos.filter(function (x) { return x.id !== m.id; });
      toast("Movimiento borrado"); cerrarCapa(); pintar();
    }).catch(function (err) { mensaje("reg-mensaje", err.message, true); });
  });

  // ---------- Entrada rápida ----------
  function opcionesCategoria(tipo, elegida) {
    var sel = $("previa-categoria");
    sel.replaceChildren();
    var nombres = datos.categorias.filter(function (c) { return c.tipo === tipo; }).map(function (c) { return c.nombre; });
    if (elegida && nombres.indexOf(elegida) < 0) nombres.push(elegida);
    nombres.sort().forEach(function (n) { var o = el("option", null, n); o.value = n; o.selected = n === elegida; sel.append(o); });
  }

  // ---------- IA (Gemini, a través de la función nova-ia de Supabase) ----------
  // Se usa con sesión iniciada. Si todavía no hay clave, se acabó la cuota gratis del día
  // o algo falla, la app sigue con su propio intérprete y su propio lector de recibos.
  var iaActiva = true;
  function iaDisponible() { return iaActiva && !!cliente && !!fuente && !fuente.demo; }
  function hoyLocal() { return A.claveDia(new Date()); }
  function invocarIA(cuerpo) {
    return cliente.functions.invoke("nova-ia", { body: cuerpo }).then(function (res) {
      if (res.error) {
        var estado = res.error.context && res.error.context.status;
        if (estado === 503) iaActiva = false; // la clave de Gemini todavía no está puesta
        var err = new Error(estado === 503 ? "La IA todavía no tiene su clave de Google en Supabase."
          : estado === 429 ? "Se acabó el cupo gratis de la IA por hoy. Intenta mañana."
          : "La IA no pudo responder. Intenta otra vez en un momento.");
        err.estado = estado;
        throw err;
      }
      iaActiva = true;
      return res.data || {};
    });
  }
  function registroDeIA(d) {
    var fecha = new Date();
    fecha.setDate(fecha.getDate() - ({ ayer: 1, anteayer: 2 }[d.dia] || 0));
    var base = Parser.CATEGORIAS.find(function (c) { return c.nombre === d.categoria; });
    return { ok: true, ia: true, tipo: d.tipo === "ingreso" ? "ingreso" : "gasto", monto: d.monto, categoria: d.categoria,
             icono: base ? base.icono : "otro", descripcion: d.descripcion || d.categoria, fecha: fecha.toISOString(),
             etiquetas: Array.isArray(d.etiquetas) ? d.etiquetas : [] };
  }
  function cuerpoIA(extra) { return Object.assign({ categorias: datos.categorias.map(function (c) { return c.nombre; }), hoy: hoyLocal() }, extra); }
  function preguntarIA(entrada) {
    if (!iaDisponible()) return Promise.reject(new Error("IA no disponible"));
    return invocarIA(cuerpoIA(entrada)).then(function (d) {
      if (!(d.monto > 0)) throw new Error("La IA no encontró el valor");
      return registroDeIA(d);
    });
  }

  // ---------- NOVA IA: conversaciones guardadas ----------
  // Cada pregunta lleva un resumen de los datos de la persona; la conversación se guarda en su cuenta.
  var chatActual = { id: null, titulo: "", mensajes: [] };
  function contextoFinanzas() {
    var ciclo = cicloEfectivo(), rango = Periodos.periodo(ciclo), t = A.totales(A.enRango(datos.movimientos, rango)), p = datos.perfil;
    var hace90 = new Date(Date.now() - 90 * 86400000);
    var b = presupuestoActual(), seguro = b.limite > 0 ? A.seguroParaGastar(b.limite, b.gastado, b.rango) : null;
    var contexto = {
      hoy: hoyLocal(),
      saldo_en_cuentas: saldoTotal(),
      cuentas: datos.cuentas.map(function (c) { return { nombre: c.nombre, saldo: saldoCuenta(c) }; }),
      periodo_actual: {
        nombre: A.nombrePeriodo(ciclo, rango), ingresos: t.ingresos, gastos: t.gastos,
        gastos_por_categoria: A.porCategoria(A.enRango(datos.movimientos, rango)).map(function (f) { return { categoria: nombreCategoria(f.id), total: f.total }; })
      },
      gastos_por_mes: A.serie(datos.movimientos, "mensual", new Date(), 6).map(function (x) { return { mes: x.etiqueta, ingresos: x.ingresos, gastos: x.gastos }; }),
      gastos_por_categoria_90_dias: A.porCategoria(datos.movimientos.filter(function (m) { return new Date(m.fecha) >= hace90; }))
        .map(function (f) { return { categoria: nombreCategoria(f.id), total: f.total }; }),
      seguro_para_gastar_por_dia: seguro ? Math.round(seguro.porDia) : null,
      metas: datos.metas.map(function (m) { return { nombre: m.nombre, objetivo: num(m.objetivo), ahorrado: num(m.ahorrado) }; }),
      limites: datos.limites.map(function (l) { var e = estadoLimite(l); return { categoria: l.categoria_id != null ? nombreCategoria(l.categoria_id) : "todas", ciclo: l.ciclo, limite: num(l.monto), gastado: e.gastado }; }),
      programados: datos.programados.filter(function (x) { return x.activo; }).map(function (x) { return { descripcion: x.descripcion, tipo: x.tipo, monto: num(x.monto), frecuencia: x.frecuencia, proxima: x.proxima }; }),
      movimientos_recientes: datos.movimientos.slice(0, 150).map(function (m) {
        var o = { fecha: A.claveDia(m.fecha), tipo: m.tipo, monto: num(m.monto), descripcion: m.descripcion,
                  categoria: nombreCategoria(m.categoria_id), etiquetas: m.etiquetas || [], estado: m.estado || "pagado" };
        if (m.moneda && m.moneda !== "COP") { o.moneda = m.moneda; o.monto_original = num(m.monto_original); }
        return o;
      })
    };
    if (p.presupuesto_monto) {
      contexto.presupuesto = { ciclo: ciclo, limite: num(p.presupuesto_monto), gastado: gastadoEn(rango),
                               desde: A.claveDia(rango.desde), hasta: A.claveDia(new Date(rango.hasta.getTime() - 1)) };
    }
    if (conductor()) {
      var nombreDe = function (f) { return { nombre: nombreCategoria(f.id), total: f.total }; };
      contexto.trabajo = { vehiculo: p.vehiculo || null, meta_diaria: p.meta_diaria ? num(p.meta_diaria) : null };
      ["hoy", "semana", "mes"].forEach(function (cual) {
        var r = A.resumenTrabajo(datos.movimientos, datos.categorias, A.rangoJornada(cual));
        contexto.trabajo[cual] = { ganado: r.ingresos, gastos_de_operacion: r.operacion, papeles_y_cuotas: r.fijos, ganancia_neta_de_trabajar: r.netoOperativo, ganancia_despues_de_papeles_y_cuotas: r.neto, viajes: r.viajes, ganancia_por_viaje: r.porViaje ? Math.round(r.porViaje) : null,
          por_app: r.porPlataforma.map(function (x) { return { app: nombreCategoria(x.id), total: x.total, viajes: x.viajes }; }), gastos_por_categoria: r.gastosPorCategoria.map(nombreDe) };
      });
      contexto.trabajo.vencimientos = datos.documentos.map(function (d) { var e = A.estadoDocumento(d); return { nombre: d.nombre, vence: String(d.vence).slice(0, 10), dias: e.dias, costo: d.costo ? num(d.costo) : null }; });
    }
    return contexto;
  }

  function haceTiempo(f) {
    var min = Math.max(0, Math.round((Date.now() - new Date(f).getTime()) / 60000));
    if (min < 1) return "ahora";
    if (min < 60) return "hace " + min + (min === 1 ? " minuto" : " minutos");
    var h = Math.round(min / 60);
    if (h < 24) return "hace " + h + (h === 1 ? " hora" : " horas");
    var d = Math.round(h / 24);
    return d < 30 ? "hace " + d + (d === 1 ? " día" : " días") : fechaCorta.format(new Date(f));
  }
  function pintarIA() {
    var ul = $("lista-chats"), q = A.sinTildes($("chat-buscar").value);
    ul.replaceChildren();
    var lista = datos.conversaciones.filter(function (c) { return !q || A.sinTildes(c.titulo).indexOf(q) >= 0; });
    if (!lista.length) {
      ul.append(el("li", "vacio", datos.conversaciones.length ? "No hay conversaciones con ese nombre."
        : "Todavía no tienes conversaciones. Toca el lápiz de arriba para preguntarle algo a NOVA IA."));
    }
    lista.forEach(function (c) {
      var li = el("li", "chat-fila");
      li.tabIndex = 0; li.setAttribute("role", "button");
      var txt = el("span", "mov-texto"); txt.append(el("strong", null, c.titulo), el("small", null, haceTiempo(c.actualizado_en || c.creado_en)));
      li.append(txt, el("span", "flecha", "›"));
      li.addEventListener("click", function () { abrirChat(c); });
      li.addEventListener("keydown", function (e) { if (e.key === "Enter") abrirChat(c); });
      ul.append(li);
    });
  }
  $("chat-buscar").addEventListener("input", pintarIA);
  $("btn-chat-nuevo").addEventListener("click", function () { abrirChat(null); });

  // Preguntas sugeridas con los datos de la persona (como las de la app de referencia).
  function sugerenciasChat() {
    var lista = conductor() ? ["¿Cuánto he ganado hoy con las apps?", "¿Cuál app me deja más por viaje?", "¿Cuánto me queda libre esta semana después de gasolina y gastos?"] : ["¿Cuál fue mi gasto más grande este período?"];
    if (conductor() && documentosPorVencer().length) lista.push("¿Qué documentos de mi vehículo se me vencen pronto?");
    var hace90 = new Date(Date.now() - 90 * 86400000);
    var top = A.porCategoria(datos.movimientos.filter(function (m) { return new Date(m.fecha) >= hace90; }))[0];
    lista.push(top && top.id != null ? "¿Cuánto he gastado en " + nombreCategoria(top.id) + " los últimos 3 meses?" : "¿En qué gasto más este mes?");
    var b = presupuestoActual(), seguro = b.limite > 0 ? A.seguroParaGastar(b.limite, b.gastado, b.rango) : null;
    lista.push(seguro && seguro.porDia >= 1000 ? "¿Puedo gastar " + pesos.format(Math.round(seguro.porDia / 1000) * 1000) + " hoy sin afectar mi presupuesto?" : "¿Cuánto me queda del presupuesto?");
    if (!conductor()) lista.push("¿Qué puedo hacer para ahorrar más?");
    if (datos.metas.length) lista.push("¿Cómo voy con mis metas?");
    if (datos.programados.some(function (x) { return x.activo; })) lista.push("¿Qué pagos tengo programados?");
    return lista;
  }
  function burbuja(clase, texto) {
    var li = el("li", clase, texto);
    $("chat").append(li);
    li.scrollIntoView({ block: "nearest" });
    return li;
  }
  function pintarChat() {
    $("chat").replaceChildren();
    chatActual.mensajes.forEach(function (m) { $("chat").append(el("li", m.rol === "usuario" ? "yo" : "nova", m.texto)); });
    $("chat-bienvenida").hidden = chatActual.mensajes.length > 0;
    $("chat-titulo").textContent = chatActual.titulo || "Nueva conversación";
    $("chat-borrar").hidden = !chatActual.id;
    var sug = $("chat-sugerencias");
    sug.replaceChildren();
    sugerenciasChat().forEach(function (t) {
      var b = el("button", "sugerencia", t); b.type = "button";
      b.addEventListener("click", function () { preguntarNova(t); });
      sug.append(b);
    });
  }
  function abrirChat(conv) {
    chatActual = conv ? { id: conv.id, titulo: conv.titulo, mensajes: (conv.mensajes || []).slice() } : { id: null, titulo: "", mensajes: [] };
    mensaje("chat-mensaje", "");
    $("chat-pregunta").value = "";
    pintarChat();
    abrirCapa("pantalla-chat");
    var ol = $("chat"); setTimeout(function () { ol.scrollTop = ol.scrollHeight; }, 30);
  }
  function reiniciarChat() {
    chatActual = { id: null, titulo: "", mensajes: [] };
    $("chat-buscar").value = "";
  }
  function guardarConversacion() {
    var mensajes = chatActual.mensajes.slice(-40).map(function (m) { return { rol: m.rol, texto: String(m.texto).slice(0, 4000) }; });
    var ahora = new Date().toISOString();
    if (chatActual.id) {
      var c = datos.conversaciones.find(function (x) { return x.id === chatActual.id; });
      return fuente.actualizar("conversaciones", chatActual.id, { mensajes: mensajes, actualizado_en: ahora }).then(function (n) {
        if (c) Object.assign(c, n);
        datos.conversaciones.sort(function (a, b) { return new Date(b.actualizado_en) - new Date(a.actualizado_en); });
      });
    }
    var titulo = chatActual.mensajes[0].texto.replace(/\s+/g, " ").trim().slice(0, 60) || "Conversación";
    return fuente.crear("conversaciones", { titulo: titulo, mensajes: mensajes, actualizado_en: ahora }).then(function (c) {
      datos.conversaciones.unshift(c);
      chatActual.id = c.id; chatActual.titulo = c.titulo;
      $("chat-titulo").textContent = c.titulo; $("chat-borrar").hidden = false;
    });
  }
  $("chat-borrar").addEventListener("click", function () {
    var id = chatActual.id;
    if (!id || !confirm("¿Borrar esta conversación?")) return;
    fuente.borrar("conversaciones", id).then(function () {
      datos.conversaciones = datos.conversaciones.filter(function (c) { return c.id !== id; });
      reiniciarChat(); cerrarCapa(); pintarIA(); toast("Conversación borrada");
    }).catch(function (e) { mensaje("chat-mensaje", e.message, true); });
  });

  function preguntarNova(pregunta) {
    pregunta = pregunta.trim();
    if (!pregunta) return;
    if (!cliente || !fuente || fuente.demo) {
      mensaje("chat-mensaje", "Inicia sesión con tu cuenta para preguntarle a la IA.", true);
      return;
    }
    var boton = $("form-chat").querySelector("button[type=submit]");
    boton.disabled = true;
    $("chat-bienvenida").hidden = true;
    mensaje("chat-mensaje", "");
    burbuja("yo", pregunta);
    var espera = burbuja("nova pensando", "✦ Pensando…");
    var historial = chatActual.mensajes.slice(-6);
    invocarIA({ pregunta: pregunta, historial: historial, contexto: contextoFinanzas() }).then(function (d) {
      if (!d.respuesta) throw new Error("La IA no pudo responder. Intenta otra vez en un momento.");
      espera.textContent = d.respuesta;
      espera.classList.remove("pensando");
      chatActual.mensajes.push({ rol: "usuario", texto: pregunta }, { rol: "nova", texto: d.respuesta });
      $("chat-pregunta").value = "";
      return guardarConversacion().catch(function () { mensaje("chat-mensaje", "La respuesta no se pudo guardar en tu historial, pero puedes seguir chateando.", true); });
    }).then(pintarIA).catch(function (e) {
      espera.remove();
      if (!chatActual.mensajes.length) $("chat-bienvenida").hidden = false;
      mensaje("chat-mensaje", e.message, true);
    }).finally(function () { boton.disabled = false; });
  }
  $("form-chat").addEventListener("submit", function (e) { e.preventDefault(); preguntarNova($("chat-pregunta").value); });

  var consulta = 0;
  $("form-rapido").addEventListener("submit", function (e) {
    e.preventDefault();
    var texto = $("entrada-rapida").value, local = Parser.interpretar(texto), id = ++consulta;
    if (!texto.trim() || !iaDisponible()) return terminar(local);
    var enviar = e.target.querySelector("button[type=submit]");
    enviar.disabled = true;
    mensaje("rapido-mensaje", "✦ La IA está leyendo…");
    preguntarIA({ texto: texto }).then(function (r) {
      // Las etiquetas escritas con # siempre se respetan.
      (local.etiquetas || []).forEach(function (t) { if (r.etiquetas.indexOf(t) < 0) r.etiquetas.push(t); });
      return r;
    }).catch(function () { return local; }).then(function (r) {
      enviar.disabled = false;
      if (id === consulta) terminar(r);
    });
    function terminar(r) {
      if (!r.ok) { mensaje("rapido-mensaje", r.error, true); $("vista-previa").hidden = true; return; }
      mensaje("rapido-mensaje", "");
      mostrarPrevia(r);
    }
  });

  function mostrarPrevia(r) {
    pendiente = r;
    $("previa-ia").hidden = !r.ia;
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
  }

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
    return Promise.all([categoriaPorNombre(nombreCat || r.categoria, r.tipo, r.icono), ubicacionActual()]).then(function (res) {
      var c = res[0], lugar = res[1];
      var fila = { cuenta_id: datos.cuentas[0].id, categoria_id: c.id, tipo: r.tipo, descripcion: r.descripcion,
                   monto: r.monto, fecha: r.fecha, etiquetas: r.etiquetas, estado: "pagado" };
      if (lugar) { fila.lat = lugar.lat; fila.lng = lugar.lng; }
      return fuente.crear("movimientos", fila);
    }).then(function (m) {
      datos.movimientos.push(m);
      ordenarMovimientos();
      var aviso = "✓ ¡Guardado! " + m.descripcion + " " + pesos.format(num(m.monto));
      if (!comoFrecuente) return aviso;
      return fuente.crear("frecuentes", { texto: textoOriginal.slice(0, 120) }).then(function (f) {
        datos.frecuentes.push(f);
        return aviso + " · también quedó en registros comunes";
      });
    }).then(function (aviso) {
      mensaje("rapido-mensaje", "");
      toast(aviso);
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

  // ---------- Voz ----------
  // En la app de Android se usa el reconocimiento de voz del celular (complemento de Capacitor);
  // en el navegador, el de Chrome, Edge o Safari.
  var vozNativa = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition;
  var Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
  var hayVoz = !!(vozNativa || Reconocimiento);
  function dictar(pista) {
    if (vozNativa) {
      return vozNativa.requestPermissions().then(function (p) {
        if (p.speechRecognition !== "granted") throw new Error("Permite el micrófono para dictar.");
        return vozNativa.start({ language: "es-CO", maxResults: 1, prompt: pista, partialResults: false, popup: true });
      }).then(function (r) {
        var dicho = r && r.matches && r.matches[0];
        if (!dicho) throw new Error("No te entendí. Intenta de nuevo o escríbelo.");
        return dicho;
      });
    }
    return new Promise(function (ok, mal) {
      var rec = new Reconocimiento();
      rec.lang = "es-CO"; rec.interimResults = false; rec.maxAlternatives = 1;
      var listo = false;
      rec.onresult = function (ev) { listo = true; ok(ev.results[0][0].transcript); };
      rec.onerror = function (ev) { listo = true; mal(new Error(ev.error === "not-allowed" ? "Permite el micrófono para dictar." : "No te entendí. Intenta de nuevo o escríbelo.")); };
      rec.onend = function () { if (!listo) mal(new Error("No te escuché. Intenta de nuevo.")); };
      rec.start();
    });
  }
  if (vozNativa) vozNativa.available().then(function (r) { $("btn-voz").hidden = !(r && r.available); $("asis-dictar").hidden = !(r && r.available); }).catch(function () {});
  else { $("btn-voz").hidden = !hayVoz; $("asis-dictar").hidden = !hayVoz; }
  $("btn-voz").addEventListener("click", function () {
    var voz = $("btn-voz");
    voz.classList.add("escuchando");
    mensaje("rapido-mensaje", "Te escucho…");
    dictar("Dime tu gasto o ingreso").then(function (dicho) {
      mensaje("rapido-mensaje", "");
      $("entrada-rapida").value = dicho;
      $("form-rapido").requestSubmit();
    }).catch(function (err) { mensaje("rapido-mensaje", err.message, true); })
      .finally(function () { voz.classList.remove("escuchando"); });
  });

  // ---------- Foto del recibo ----------
  // Primero con la IA; sin ella, lee el texto en el mismo celular con Tesseract (sin servicios externos ni costo).
  var lector = null;
  function cargarLector(avisar) {
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
          logger: function (m) { if (m.status === "recognizing text" && lectorAviso) lectorAviso("Leyendo el recibo… " + Math.round(m.progress * 100) + "%"); }
        }).then(ok, mal);
      };
      s.onerror = function () { mal(new Error("No se pudo cargar el lector de fotos. Revisa tu conexión.")); };
      document.head.appendChild(s);
    });
    lector.catch(function () { lector = null; });
    return lector;
  }
  var lectorAviso = null;

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

  // Devuelve { r (registro interpretado) | null, texto para la entrada, comercio, aviso }.
  function interpretarFoto(archivo, avisar) {
    return prepararFoto(archivo).then(function (foto) {
      if (!iaDisponible()) return conTesseract(foto);
      avisar("✦ La IA está leyendo el recibo…");
      var jpeg = foto.toDataURL("image/jpeg", 0.85).split(",")[1];
      return preguntarIA({ imagen: jpeg, mime: "image/jpeg" }).then(function (r) {
        return { r: r, texto: numeroCO.format(r.monto) + " " + r.descripcion, aviso: "✦ Leído con IA." };
      }, function () { return conTesseract(foto); });
    });
    function conTesseract(foto) {
      avisar("Preparando el lector de recibos… la primera vez tarda unos segundos.");
      lectorAviso = avisar;
      return cargarLector().then(function (l) { return l.recognize(foto); }).then(function (salida) {
        var rec = window.NovaRecibo.leerRecibo(salida.data.text);
        if (!rec.ok) return { r: null, texto: rec.comercio ? rec.comercio + " " : "", error: rec.error };
        var texto = numeroCO.format(rec.monto) + " " + (rec.comercio || "Compra");
        var r = Parser.interpretar(texto);
        // La descripción es el nombre del negocio completo, sin quitarle palabras como "La" o "El".
        if (rec.comercio) r.descripcion = rec.comercio;
        return { r: r, texto: texto, aviso: "Leído del recibo." };
      });
    }
  }

  $("btn-foto").addEventListener("click", function () { $("foto-recibo").click(); });
  $("foto-recibo").addEventListener("change", function (e) {
    var archivo = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!archivo) return;
    var btn = $("btn-foto");
    btn.disabled = true;
    var avisar = function (t) { mensaje("rapido-mensaje", t); };
    interpretarFoto(archivo, avisar).then(function (x) {
      $("entrada-rapida").value = x.texto;
      if (!x.r) { $("entrada-rapida").focus(); return mensaje("rapido-mensaje", x.error, true); }
      mostrarPrevia(x.r);
      mensaje("rapido-mensaje", x.aviso + " Revisa el valor: si no es correcto, corrige el texto y vuelve a tocar la flecha.");
    }).catch(function (err) { mensaje("rapido-mensaje", (err && err.message) || "No se pudo leer la foto.", true); })
      .finally(function () { btn.disabled = false; });
  });

  // ---------- Asistente inteligente (varios registros a la vez) ----------
  var asisItems = [];
  function lineasDe(texto) {
    // Una por línea, o separadas por comas que no sean decimales ("1,5 millones").
    return texto.split(/\n|;|,(?=\s*[^\d\s])/).map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 30);
  }
  function interpretarLocal(texto) {
    return lineasDe(texto).map(function (l) { var r = Parser.interpretar(l); r.linea = l; return r; });
  }
  $("asis-leer").addEventListener("click", function () {
    var texto = $("asis-texto").value.trim();
    if (!texto) { $("asis-texto").focus(); return mensaje("asis-mensaje", "Escribe o dicta tus gastos, uno por línea.", true); }
    var b = $("asis-leer");
    b.disabled = true;
    var local = interpretarLocal(texto);
    var op = !iaDisponible() ? Promise.resolve(local) : (mensaje("asis-mensaje", "✦ La IA está leyendo…"), invocarIA(cuerpoIA({ texto: texto.slice(0, 2000), varios: true })).then(function (d) {
      var lista = (d.movimientos || []).filter(function (x) { return x.monto > 0; }).map(registroDeIA);
      if (!lista.length) throw new Error("vacío");
      // Si la IA encontró lo mismo que las líneas, cada uno conserva las etiquetas # de su línea.
      if (lista.length === local.length) lista.forEach(function (r, i) { (local[i].etiquetas || []).forEach(function (t) { if (r.etiquetas.indexOf(t) < 0) r.etiquetas.push(t); }); });
      return lista;
    }).catch(function () { return local; }));
    op.then(function (lista) {
      asisItems = lista.map(function (r) { return Object.assign({ elegido: !!r.ok }, r); });
      var buenos = asisItems.filter(function (r) { return r.ok; }).length;
      mensaje("asis-mensaje", buenos ? (asisItems[0] && asisItems[0].ia ? "✦ " : "") + "Encontré " + buenos + (buenos === 1 ? " registro" : " registros") + ". Revisa y toca Guardar." : "No encontré valores. Escribe por ejemplo «almuerzo 20 mil».", !buenos);
      pintarAsistente();
    }).finally(function () { b.disabled = false; });
  });
  function pintarAsistente() {
    var ul = $("asis-lista");
    ul.replaceChildren();
    asisItems.forEach(function (r, i) {
      var li = el("li", "asis-item" + (r.ok ? "" : " malo"));
      if (!r.ok) { li.append(el("span", "nota mal", "«" + (r.linea || "") + "»: " + r.error)); ul.append(li); return; }
      var chk = el("input"); chk.type = "checkbox"; chk.checked = r.elegido; chk.setAttribute("aria-label", "Guardar " + r.descripcion);
      chk.addEventListener("change", function () { r.elegido = chk.checked; pintarBotonAsistente(); });
      var desc = el("input", "asis-desc"); desc.value = r.descripcion; desc.maxLength = 120; desc.setAttribute("aria-label", "Descripción");
      desc.addEventListener("input", function () { r.descripcion = desc.value; });
      var monto = el("input", "asis-monto"); monto.value = pesos.format(r.monto); monto.inputMode = "numeric"; monto.setAttribute("aria-label", "Valor");
      monto.addEventListener("change", function () { var v = leerValor(monto.value); if (v > 0) r.monto = v; monto.value = pesos.format(r.monto); });
      var tipo = el("button", "chip " + r.tipo, r.tipo === "ingreso" ? "Ingreso" : "Gasto"); tipo.type = "button";
      tipo.addEventListener("click", function () { r.tipo = r.tipo === "ingreso" ? "gasto" : "ingreso"; r.categoria = r.tipo === "ingreso" ? "Otros ingresos" : "Otros gastos"; pintarAsistente(); });
      var sel = el("select", "asis-cat"); sel.setAttribute("aria-label", "Categoría");
      var nombres = datos.categorias.filter(function (c) { return c.tipo === r.tipo; }).map(function (c) { return c.nombre; });
      if (nombres.indexOf(r.categoria) < 0) nombres.push(r.categoria);
      nombres.sort().forEach(function (n) { var o = el("option", null, n); o.value = n; o.selected = n === r.categoria; sel.append(o); });
      sel.addEventListener("change", function () { r.categoria = sel.value; });
      var quitar = el("button", "icono-btn", "✕"); quitar.type = "button"; quitar.setAttribute("aria-label", "Quitar");
      quitar.addEventListener("click", function () { asisItems.splice(i, 1); pintarAsistente(); });
      var fila1 = el("div", "asis-fila"); fila1.append(chk, desc, quitar);
      var fila2 = el("div", "asis-fila"); fila2.append(tipo, monto, sel);
      li.append(fila1, fila2);
      if (r.etiquetas && r.etiquetas.length) li.append(el("span", "etiqueta-chip", r.etiquetas.map(function (t) { return "#" + t; }).join(" ")));
      ul.append(li);
    });
    pintarBotonAsistente();
  }
  function pintarBotonAsistente() {
    var n = asisItems.filter(function (r) { return r.ok && r.elegido; }).length;
    var b = $("asis-guardar");
    b.hidden = !asisItems.length;
    b.disabled = !n;
    b.textContent = "Guardar " + n + (n === 1 ? " registro" : " registros");
  }
  $("asis-guardar").addEventListener("click", function () {
    var elegidos = asisItems.filter(function (r) { return r.ok && r.elegido; });
    if (!elegidos.length) return;
    var b = $("asis-guardar");
    b.disabled = true;
    // Uno por uno, para crear las categorías que falten sin repetirlas.
    elegidos.reduce(function (p, r) {
      return p.then(function (filas) {
        return categoriaPorNombre(r.categoria, r.tipo, r.icono).then(function (c) {
          filas.push({ cuenta_id: datos.cuentas[0].id, categoria_id: c.id, tipo: r.tipo, descripcion: (r.descripcion || c.nombre).slice(0, 120),
                       monto: r.monto, fecha: r.fecha || new Date().toISOString(), etiquetas: r.etiquetas || [], estado: "pagado" });
          return filas;
        });
      });
    }, Promise.resolve([])).then(function (filas) {
      return fuente.crearVarios("movimientos", filas);
    }).then(function (creados) {
      Array.prototype.push.apply(datos.movimientos, creados);
      ordenarMovimientos();
      toast("✓ Se guardaron " + creados.length + (creados.length === 1 ? " registro" : " registros"));
      asisItems = []; $("asis-texto").value = ""; mensaje("asis-mensaje", ""); pintarAsistente();
      pintar(); cerrarCapa();
    }).catch(function (err) { mensaje("asis-mensaje", "No se pudo guardar: " + err.message, true); })
      .finally(function () { b.disabled = false; });
  });
  $("asis-dictar").addEventListener("click", function () {
    var b = $("asis-dictar");
    b.classList.add("escuchando");
    mensaje("asis-mensaje", "Te escucho… di uno o varios gastos.");
    dictar("Dime tus gastos o ingresos").then(function (dicho) {
      var t = $("asis-texto");
      t.value = (t.value.trim() ? t.value.trim() + "\n" : "") + dicho;
      mensaje("asis-mensaje", "Listo. Puedes dictar más o tocar Interpretar.");
    }).catch(function (err) { mensaje("asis-mensaje", err.message, true); })
      .finally(function () { b.classList.remove("escuchando"); });
  });
  $("asis-foto").addEventListener("click", function () { $("asis-foto-archivo").click(); });
  $("asis-foto-archivo").addEventListener("change", function (e) {
    var archivo = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!archivo) return;
    var b = $("asis-foto");
    b.disabled = true;
    interpretarFoto(archivo, function (t) { mensaje("asis-mensaje", t); }).then(function (x) {
      if (!x.r) return mensaje("asis-mensaje", x.error, true);
      asisItems.push(Object.assign({ elegido: true }, x.r));
      mensaje("asis-mensaje", x.aviso + " Revisa el valor y toca Guardar.");
      pintarAsistente();
    }).catch(function (err) { mensaje("asis-mensaje", (err && err.message) || "No se pudo leer la foto.", true); })
      .finally(function () { b.disabled = false; });
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
      enfriar(60);
      abrirRecuperar(email);
    }).catch(function (err) {
      mensaje("auth-mensaje", errorDeCorreo(err) || "No se pudo enviar el correo: " + err.message, true);
    }).finally(function () { b.disabled = false; });
  });

  // ---------- Códigos del correo: crear cuenta y cambiar la contraseña ----------
  // El correo trae un código (plantilla de Supabase con {{ .Token }}) que se escribe aquí. Sirve más que
  // un enlace: Gmail y otros programas abren los enlaces antes que la persona y los dejan sin efecto.
  var FORMULARIOS_AUTH = ["form-auth", "form-nueva-clave", "form-codigo", "form-recuperar", "btn-demo"];
  var codigoDe = { email: "", tipo: "" };
  function verAuth(cual) {
    FORMULARIOS_AUTH.forEach(function (id) { $(id).hidden = id !== cual; });
    $("pantalla-auth").classList.add("en-codigo");
  }
  function volverAuth() {
    FORMULARIOS_AUTH.forEach(function (id) { $(id).hidden = !(id === "form-auth" || id === "btn-demo"); });
    $("pantalla-auth").classList.remove("en-codigo");
    pintarEnfriamiento();
  }
  function mostrarReenviar(si) { $("btn-reenviar").hidden = $("btn-tengo-codigo").hidden = !si; }
  function soloCodigo(valor) { return String(valor || "").replace(/\D/g, ""); }
  function textoErrorCodigo(err) {
    var m = String(err && err.message || "");
    if (/expired|invalid|not found|otp/i.test(m)) return "Ese código no sirve: está mal escrito o ya venció. Usa el del último correo que te llegó, o pide uno nuevo con «Reenviar el código».";
    return errorDeCorreo(err) || m;
  }
  function abrirCodigo(email) {
    codigoDe = { email: email, tipo: "signup" };
    $("codigo-texto").textContent = "Te enviamos un código a " + email + ". Escríbelo aquí para terminar de crear tu cuenta. Revisa también Spam.";
    $("codigo-valor").value = ""; mensaje("codigo-mensaje", "");
    verAuth("form-codigo"); $("codigo-valor").focus(); pintarEnfriamiento();
  }
  function abrirRecuperar(email) {
    codigoDe = { email: email, tipo: "recovery" };
    $("recuperar-texto").textContent = "Si " + email + " tiene cuenta, te enviamos un código. Escríbelo aquí y elige tu contraseña nueva. Revisa también Spam.";
    ["recuperar-codigo", "recuperar-clave", "recuperar-clave-2"].forEach(function (id) { $(id).value = ""; });
    mensaje("recuperar-mensaje", "");
    verAuth("form-recuperar"); $("recuperar-codigo").focus(); pintarEnfriamiento();
  }
  $("codigo-volver").addEventListener("click", volverAuth);
  $("recuperar-volver").addEventListener("click", volverAuth);

  $("form-codigo").addEventListener("submit", function (e) {
    e.preventDefault();
    var token = soloCodigo($("codigo-valor").value);
    if (token.length < 6) return mensaje("codigo-mensaje", "Escribe el código completo que te llegó al correo.", true);
    var btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; mensaje("codigo-mensaje", "Verificando…");
    cliente.auth.verifyOtp({ email: codigoDe.email, token: token, type: "signup" }).then(function (r) {
      if (r.error) throw r.error;
      mensaje("codigo-mensaje", "");
      volverAuth(); $("form-auth").reset();
      return entrar(fuenteSupabase(cliente, r.data.user));
    }).catch(function (err) { mensaje("codigo-mensaje", textoErrorCodigo(err), true); })
      .finally(function () { btn.disabled = false; });
  });
  $("codigo-reenviar").addEventListener("click", function () {
    cliente.auth.resend({ type: "signup", email: codigoDe.email, options: { emailRedirectTo: cfg.sitioUrl || location.origin } }).then(function (r) {
      if (r.error) throw r.error;
      enfriar(60); mensaje("codigo-mensaje", "Listo, te enviamos un código nuevo. Usa solo el último.");
    }).catch(function (err) { mensaje("codigo-mensaje", errorDeCorreo(err) || err.message, true); });
  });

  $("form-recuperar").addEventListener("submit", function (e) {
    e.preventDefault();
    var token = soloCodigo($("recuperar-codigo").value), c1 = $("recuperar-clave").value, c2 = $("recuperar-clave-2").value;
    if (token.length < 6) return mensaje("recuperar-mensaje", "Escribe el código completo que te llegó al correo.", true);
    if (c1.length < 6) return mensaje("recuperar-mensaje", "La contraseña debe tener al menos 6 caracteres.", true);
    if (c1 !== c2) return mensaje("recuperar-mensaje", "Las dos contraseñas no coinciden.", true);
    var btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; mensaje("recuperar-mensaje", "Cambiando tu contraseña…");
    cliente.auth.verifyOtp({ email: codigoDe.email, token: token, type: "recovery" }).then(function (r) {
      if (r.error) throw r.error;
      return cliente.auth.updateUser({ password: c1 });
    }).then(function (r) {
      if (r.error) throw r.error;
      mensaje("recuperar-mensaje", "");
      volverAuth(); $("form-auth").reset();
      toast("✓ Contraseña cambiada");
      return entrar(fuenteSupabase(cliente, r.data.user));
    }).catch(function (err) {
      mensaje("recuperar-mensaje", /different from the old/i.test(err.message) ? "La nueva contraseña debe ser distinta de la anterior." : textoErrorCodigo(err), true);
    }).finally(function () { btn.disabled = false; });
  });
  $("recuperar-reenviar").addEventListener("click", function () {
    cliente.auth.resetPasswordForEmail(codigoDe.email, { redirectTo: cfg.sitioUrl || location.origin }).then(function (r) {
      if (r.error) throw r.error;
      enfriar(60); mensaje("recuperar-mensaje", "Listo, te enviamos un código nuevo. Usa solo el último.");
    }).catch(function (err) { mensaje("recuperar-mensaje", errorDeCorreo(err) || err.message, true); });
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

  // Botón para descargar la APK: solo en el navegador. Se baja desde esta misma página (la última
  // que se publicó), con una copia en GitHub como respaldo y ayuda por si no deja instalar.
  document.querySelectorAll(".apk-respaldo").forEach(function (a) { if (cfg.apkRespaldoUrl) a.href = cfg.apkRespaldoUrl; else a.parentNode.hidden = true; });
  function mostrarApk(si) {
    $("btn-apk").hidden = $("perfil-apk").hidden = !si;
    document.querySelectorAll(".respaldo, .ayuda-instalar").forEach(function (e) { e.hidden = !si; });
  }
  mostrarApk(false);
  if (!enApp) {
    $("btn-apk").href = $("perfil-apk").href = "descargas/NOVA.apk";
    $("btn-apk").setAttribute("download", "NOVA.apk"); $("perfil-apk").setAttribute("download", "NOVA.apk");
    fetch("descargas/NOVA.apk", { method: "HEAD" }).then(function (r) {
      mostrarApk(r.ok && !/text\/html/.test(r.headers.get("content-type") || ""));
    }).catch(function () { mostrarApk(false); });
  }

  // Dentro de la app instalada: si ya hay una APK más nueva, avisar con un botón para bajarla.
  // version-app.json lo escribe el flujo al armar la APK; la versión publicada se pide con el
  // HTTP del celular (CapacitorHttp), que no depende de los permisos entre sitios del navegador.
  function buscarActualizacion() {
    var http = window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp;
    if (!http || !cfg.apkVersionUrl || !cfg.apkUrl) return;
    fetch("version-app.json").then(function (r) { return r.json(); }).then(function (local) {
      return http.get({ url: cfg.apkVersionUrl + "?t=" + Date.now(), responseType: "json" }).then(function (res) {
        var remota = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
        if (!(Number(remota.versionCode) > Number(local.versionCode))) return;
        var aviso = $("aviso-version");
        aviso.href = cfg.apkUrl;
        aviso.target = "_blank";
        $("aviso-version-texto").textContent = "Versión " + remota.versionName + " (tienes la " + local.versionName +
          "). Toca para descargarla y, al abrir el archivo, toca Actualizar.";
        aviso.hidden = false;
      });
    }).catch(function () { /* sin conexión o APK armada sin número de versión */ });
  }
  if (enApp) {
    buscarActualizacion();
    document.addEventListener("visibilitychange", function () { if (!document.hidden) buscarActualizacion(); });
  }

  function mostrar(pantalla) {
    $("cargando").hidden = true;
    $("pantalla-auth").hidden = pantalla !== "auth";
    $("pantalla-app").hidden = pantalla !== "app";
  }

  function entrar(nuevaFuente) {
    fuente = nuevaFuente;
    reiniciarChat();
    desfaseInicio = 0; desfaseAnalisis = 0;
    $("aviso-demo").hidden = !fuente.demo;
    $("cargando").hidden = false;
    return fuente.cargar().then(function (d) {
      datos = Object.assign(datosVacios(), d);
      ordenarMovimientos();
      mostrar("app"); ir("inicio"); pintar();
      programarAvisos();
      // Si salieron categorías nuevas del modo conductor (como "Cuota del vehículo"), se agregan solas.
      if (conductor()) asegurarCategoriasConductor().then(pintar).catch(function () { /* se intentará la próxima vez */ });
      return procesarProgramados();
    }).catch(function (e) {
      mostrar("auth");
      mensaje("auth-mensaje", "No se pudieron cargar tus datos: " + e.message, true);
    });
  }

  // Pedir correos seguidos gasta el cupo de la hora y deja sin efecto el enlace del correo anterior.
  // Por eso, después de pedir uno, "Crear cuenta" y "Reenviar" esperan un minuto.
  var enfriarHasta = Number(leerLocal("nova-correo-hasta", 0)) || 0, enfriarReloj = null;
  function segundosEspera() { return Math.max(0, Math.ceil((enfriarHasta - Date.now()) / 1000)); }
  function pintarEnfriamiento() {
    var seg = segundosEspera(), crear = document.querySelector("#form-auth [data-accion=registrar]"), re = $("btn-reenviar");
    crear.disabled = re.disabled = seg > 0;
    crear.textContent = seg > 0 ? "Crear cuenta (" + seg + " s)" : "Crear cuenta";
    re.textContent = seg > 0 ? "Reenviar el correo de verificación (" + seg + " s)" : "Reenviar el correo de verificación";
    ["codigo-reenviar", "recuperar-reenviar"].forEach(function (id) {
      $(id).disabled = seg > 0;
      $(id).textContent = seg > 0 ? "Reenviar el código (" + seg + " s)" : "Reenviar el código";
    });
    if (seg <= 0 && enfriarReloj) { clearInterval(enfriarReloj); enfriarReloj = null; }
  }
  function enfriar(segundos) {
    enfriarHasta = Date.now() + segundos * 1000;
    guardarLocal("nova-correo-hasta", enfriarHasta);
    pintarEnfriamiento();
    if (!enfriarReloj) enfriarReloj = setInterval(pintarEnfriamiento, 1000);
  }
  if (segundosEspera() > 0) { pintarEnfriamiento(); enfriarReloj = setInterval(pintarEnfriamiento, 1000); }
  // Traduce los errores del envío de correos a algo que se pueda entender y hacer.
  function errorDeCorreo(err) {
    var m = String(err && err.message || "");
    var seg = (m.match(/after (\d+) second/i) || [])[1];
    if (seg) { enfriar(Number(seg) + 1); return "Espera " + (Number(seg) + 1) + " segundos antes de pedir otro correo."; }
    if (/email rate limit|over_email_send_rate_limit/i.test(m + " " + (err && err.code || ""))) {
      enfriar(300);
      return "Se acabó el cupo de correos de esta hora: el servicio gratis de correos manda muy pocos por hora. Espera un rato (hasta una hora) y vuelve a intentarlo. Si ya habías pedido uno, abre solo el más reciente.";
    }
    return null;
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
    mostrarReenviar(false);
    // El correo de verificación le llega a la persona que crea la cuenta; su enlace abre la app.
    var op = accion === "registrar"
      ? cliente.auth.signUp({ email: email, password: clave, options: { emailRedirectTo: cfg.sitioUrl || location.origin } })
      : cliente.auth.signInWithPassword({ email: email, password: clave });
    op.then(function (r) {
      if (r.error) throw r.error;
      if (!r.data.session) {
        // Supabase no avisa con un error cuando el correo ya tiene cuenta: devuelve un usuario sin identidades.
        if (r.data.user && Array.isArray(r.data.user.identities) && !r.data.user.identities.length) {
          mensaje("auth-mensaje", "Ese correo ya tiene cuenta. Toca Entrar. Si no recuerdas la contraseña, toca «¿Olvidaste tu contraseña?».", true);
          return;
        }
        enfriar(60);
        mensaje("auth-mensaje", "");
        abrirCodigo(email);
        return;
      }
      mensaje("auth-mensaje", "");
      return entrar(fuenteSupabase(cliente, r.data.user));
    }).catch(function (err) {
      var noConfirmado = /not confirmed/i.test(err.message);
      var t = errorDeCorreo(err) || (/invalid login/i.test(err.message) ? "Correo o contraseña incorrectos."
        : noConfirmado ? "Tu cuenta todavía no está verificada. Toca «Ya tengo el código del correo», o pide un código nuevo con «Reenviar»."
        : /already registered/i.test(err.message) ? "Ese correo ya tiene cuenta. Usa Entrar."
        : err.message);
      mensaje("auth-mensaje", t, true);
      mostrarReenviar(noConfirmado);
    }).finally(function () { botones.forEach(function (b) { b.disabled = false; }); pintarEnfriamiento(); });
  });

  $("btn-reenviar").addEventListener("click", function () {
    var email = $("auth-email").value.trim(), b = $("btn-reenviar");
    if (!email) { $("auth-email").focus(); return mensaje("auth-mensaje", "Escribe arriba el correo con el que creaste la cuenta.", true); }
    b.disabled = true;
    cliente.auth.resend({ type: "signup", email: email, options: { emailRedirectTo: cfg.sitioUrl || location.origin } }).then(function (r) {
      if (r.error) throw r.error;
      enfriar(60);
      mensaje("auth-mensaje", "");
      abrirCodigo(email);
    }).catch(function (err) {
      mensaje("auth-mensaje", errorDeCorreo(err) || "No se pudo reenviar: " + err.message, true);
    }).finally(function () { pintarEnfriamiento(); if (segundosEspera() <= 0) b.disabled = false; });
  });

  $("btn-tengo-codigo").addEventListener("click", function () {
    var email = $("auth-email").value.trim();
    if (!email) { $("auth-email").focus(); return mensaje("auth-mensaje", "Escribe arriba el correo con el que creaste la cuenta.", true); }
    abrirCodigo(email);
  });

  // ---------- Entrar con Google ----------
  // El botón aparece solo si Google está activado en Supabase (se pregunta a /auth/v1/settings).
  // En el navegador se va a Google y vuelve a la página. En la app instalada, Google no deja entrar desde
  // la ventana interna, así que se abre en el navegador del celular y vuelve a NOVA con un enlace propio.
  var plugApp = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  var plugNavegador = enApp && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser;
  if (cliente && cfg.supabaseUrl) {
    fetch(cfg.supabaseUrl + "/auth/v1/settings", { headers: { apikey: cfg.supabaseKey } }).then(function (r) { return r.json(); }).then(function (a) {
      $("bloque-google").hidden = !(a && a.external && a.external.google);
    }).catch(function () { /* sin conexión: el botón no se muestra */ });
  }
  $("btn-google").addEventListener("click", function () {
    var b = $("btn-google");
    b.disabled = true;
    mensaje("auth-mensaje", "Abriendo Google…");
    var app = enApp && plugNavegador;
    cliente.auth.signInWithOAuth({ provider: "google", options: app
      ? { redirectTo: cfg.appEsquema, skipBrowserRedirect: true, queryParams: { prompt: "select_account" } }
      : { redirectTo: cfg.sitioUrl || location.origin, queryParams: { prompt: "select_account" } } }).then(function (r) {
      if (r.error) throw r.error;
      if (app) return plugNavegador.open({ url: r.data.url });
    }).catch(function (err) {
      mensaje("auth-mensaje", /not enabled|Unsupported provider/i.test(err.message) ? "Entrar con Google todavía no está activado." : "No se pudo abrir Google: " + err.message, true);
    }).finally(function () { setTimeout(function () { b.disabled = false; }, 1500); });
  });
  // Al volver de Google a la app instalada llega un enlace co.novafinanzas.app://login-callback#access_token=…
  if (plugApp && cliente) {
    plugApp.addListener("appUrlOpen", function (ev) {
      var url = String(ev && ev.url || "");
      if (!cfg.appEsquema || url.indexOf(cfg.appEsquema) !== 0) return;
      var params = new URLSearchParams(url.split("#")[1] || (url.split("?")[1] || ""));
      try { if (plugNavegador) plugNavegador.close(); } catch (e) { /* en Android la ventana del navegador se cierra sola */ }
      if (params.get("error")) { mostrar("auth"); return mensaje("auth-mensaje", "No se pudo entrar con Google: " + (params.get("error_description") || params.get("error")).replace(/\+/g, " "), true); }
      if (!params.get("access_token") || !params.get("refresh_token")) return;
      mostrar("auth"); mensaje("auth-mensaje", "Entrando…");
      cliente.auth.setSession({ access_token: params.get("access_token"), refresh_token: params.get("refresh_token") }).then(function (r) {
        if (r.error) throw r.error;
        mensaje("auth-mensaje", "");
        return entrar(fuenteSupabase(cliente, r.data.user));
      }).catch(function (err) { mensaje("auth-mensaje", "No se pudo entrar con Google: " + err.message, true); });
    });
  }

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
        return entrar(fuenteSupabase(cliente, s.user)).then(function () { toast("¡Tu correo quedó verificado! Bienvenido a NOVA."); });
      }
      if (s) return entrar(fuenteSupabase(cliente, s.user));
      mostrar("auth");
      if (errorEnlace) {
        history.replaceState(null, "", location.pathname);
        mensaje("auth-mensaje", /expired|invalid/i.test(errorEnlace)
          ? "El enlace del correo ya se usó o venció (a veces Gmail lo abre antes que tú). Si es de verificar tu cuenta, puede que ya esté verificada: escribe tu correo y contraseña y toca Entrar. Si no entra, pide un correo nuevo y abre solo el último."
          : "No se pudo completar el inicio de sesión: " + errorEnlace.replace(/\+/g, " "), true);
      }
    }).catch(function () { mostrar("auth"); });
  } else {
    mostrar("auth");
  }
})();
