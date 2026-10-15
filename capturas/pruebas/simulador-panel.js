// Simulador del panel: imita Supabase (auth + REST con filtros + funciones) en memoria.
const fs = require('fs');
const path = require('path');
const BASE = 'https://zhnwkyjoyixriasoxirf.supabase.co';
const { sumarDias, fechaCol } = require('./simulador');

const iso = (fecha, hhmm) => new Date(`${fecha}T${hhmm}:00-05:00`).toISOString();
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub, email) => `${b64({ alg: 'HS256' })}.${b64({ sub, email, exp: Math.floor(Date.now() / 1000) + 3600 })}.firma`;

function datosIniciales() {
  const DB = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-db.json'), 'utf8'));
  const hoy = fechaCol(new Date());
  const id = (() => { let n = 0; return () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`; })();
  DB.config.forEach((c) => { c.publica = true; });
  DB.config.push({ clave: 'fidelidad', valor: { sellosParaPremio: 10, premio: 'Manicura clásica gratis' }, publica: true });
  const clientas = [
    ['Laura Méndez', '3104567890', ['VIP'], 'Alérgica al látex', 7, '1990-' + hoy.slice(5)],
    ['Carolina Pérez', '3157778899', [], '', 3, null], ['Juliana Torres', '3201112233', ['Novia'], '', 9, null],
    ['Paola Rincón', '3009876543', [], '', 1, null], ['Andrea Gil', '3145556677', ['Frecuente'], '', 5, null],
    ['Natalia Vargas', '3012223344', [], '', 0, null], ['Diana Rojas', '3186665544', [], '', 2, null],
  ].map(([nombre, telefono, etiquetas, alergias, sellos, cumpleanos], i) => ({
    id: id(), nombre, telefono, email: '', etiquetas, alergias, sellos, puntos: sellos * 50, cumpleanos, notas: '',
    acepta_promos: i % 2 === 0, codigo_referido: 'REF' + i, creada: new Date(Date.now() - (i + 1) * 86400e3 * 9).toISOString(),
  }));
  const S = (sid) => { const s = DB.servicios.find((x) => x.id === sid); return { id: s.id, nombre: s.nombre, precio: s.precio, minutos: s.minutos }; };
  const reservas = [];
  const cita = (cl, pro, fecha, h, servs, estado, origen = 'web', minutos) => {
    const ss = servs.map(S);
    const min = minutos || ss.reduce((t, s) => t + s.minutos, 0);
    reservas.push({ id: id(), codigo: 'C' + Math.random().toString(36).slice(2, 7).toUpperCase(), token: id(), clienta_id: clientas[cl].id,
      profesional_id: pro, inicio: iso(fecha, h), fin: new Date(new Date(iso(fecha, h)).getTime() + min * 60e3).toISOString(),
      servicios: ss, productos: [], total: ss.reduce((t, s) => t + s.precio, 0), estado, origen, nota: '', creada: new Date(Date.now() - 3600e3).toISOString() });
  };
  cita(0, 'sofia', hoy, '09:00', ['mani-semi'], 'terminada', 'instagram');
  cita(1, 'valentina', hoy, '09:30', ['color'], 'en_curso', 'web', 150);
  cita(2, 'andres', hoy, '11:00', ['corte'], 'confirmada', 'salon');
  cita(3, 'camila', hoy, '14:00', ['mani-clasica', 'pedi-spa'], 'pendiente');
  cita(4, 'laura', hoy, '15:00', ['limpieza'], 'confirmada', 'google');
  cita(5, 'daniela', hoy, '16:00', ['maq-social'], 'pendiente', 'whatsapp');
  cita(6, 'mariana', hoy, '10:00', ['corte'], 'no_asistio');
  cita(0, 'andres', sumarDias(hoy, 1), '12:00', ['corte'], 'pendiente');
  cita(2, 'mariana', sumarDias(hoy, 2), '09:00', ['maq-novia'], 'confirmada', 'referido');
  for (let d = 1; d <= 25; d++) cita(d % 7, ['sofia', 'andres', 'valentina', 'laura'][d % 4], sumarDias(hoy, -d), '10:00', [['mani-semi', 'corte', 'color', 'masaje'][d % 4]], 'terminada', ['web', 'instagram', 'salon', 'google'][d % 4]);
  const ventas = reservas.filter((r) => r.estado === 'terminada').map((r, i) => ({ id: id(), reserva_id: r.id, clienta_id: r.clienta_id, profesional_id: r.profesional_id,
    fecha: r.fin, items: r.servicios.map((s) => ({ tipo: 'servicio', id: s.id, nombre: s.nombre, precio: s.precio, cantidad: 1, profesional_id: r.profesional_id })),
    subtotal: r.total, descuento: 0, propina: i % 3 ? 0 : 5000, total: r.total + (i % 3 ? 0 : 5000), metodo_pago: ['efectivo', 'nequi', 'tarjeta', 'transferencia'][i % 4], anulada: false, turno_id: null }));
  return { ...DB,
    perfiles: [{ user_id: 'u-duena', nombre: 'Andrea Bolívar', rol: 'duena', profesional_id: null }, { user_id: 'u-sofia', nombre: 'Sofía Martínez', rol: 'estilista', profesional_id: 'sofia' }],
    solicitudes_acceso: [{ user_id: 'u-nueva', email: 'karen@correo.com', nombre: 'Karen Peña', aprobada: false, creada: new Date().toISOString() }],
    clientas, reservas, ventas,
    caja_turnos: [{ id: id(), abierta: iso(hoy, '08:30'), base_inicial: 100000, cerrada: null, efectivo_contado: null, notas: '' }],
    bloqueos: [{ id: id(), profesional_id: 'andres', inicio: iso(hoy, '13:00'), fin: iso(hoy, '14:00'), motivo: 'Almuerzo' }],
    gastos: [{ id: id(), fecha: hoy.slice(0, 8) + '02', categoria: 'arriendo', valor: 1800000, metodo_pago: 'transferencia', descripcion: 'Arriendo del local' },
      { id: id(), fecha: hoy.slice(0, 8) + '05', categoria: 'insumos', valor: 420000, metodo_pago: 'efectivo', descripcion: 'Esmaltes y acetona' }],
    inventario_movimientos: [{ id: id(), producto_id: 'aceite-cuticula', motivo: 'venta', cantidad: -2, nota: 'Venta en caja', fecha: new Date().toISOString() },
      { id: id(), producto_id: 'shampoo', motivo: 'compra', cantidad: 12, nota: 'Pedido mensual', fecha: new Date(Date.now() - 86400e3 * 3).toISOString() }],
    proveedores: [{ id: id(), nombre: 'Distribuidora Belleza Huila', telefono: '3001239876', contacto: 'Marta' }],
    lista_espera: [{ id: id(), nombre: 'Valeria Cruz', telefono: '3167778888', fecha: sumarDias(hoy, 1), profesional_id: 'sofia', servicio_id: 'mani-semi', avisada: false, creada: new Date().toISOString() }],
    pedidos: [{ id: id(), codigo: 'P4X9KQ', nombre: 'Lucía Ramírez', telefono: '3105551234', items: [{ id: 'shampoo', nombre: 'Shampoo nutritivo', precio: 32000, cantidad: 2 }, { id: 'esmalte-rose', nombre: 'Esmalte Rosé Ivory', precio: 28000, cantidad: 1 }],
      total: 92000, estado: 'nuevo', entrega: 'domicilio', direccion: 'Calle 10 # 5-20, barrio Altico', notas: '', creada: new Date(Date.now() - 1800e3).toISOString() }],
    tarjetas_regalo: [{ codigo: '7F3A9C2B1E', valor_inicial: 200000, saldo: 200000, de: 'Andrea', para: 'Mi mamá', telefono: '3001234567', mensaje: 'Feliz día', estado: 'pendiente_pago', vence: sumarDias(hoy, 365), creada: new Date().toISOString() },
      { codigo: 'A1B2C3D4E5', valor_inicial: 100000, saldo: 100000, de: 'Carlos', para: 'Paola', telefono: '3157778899', mensaje: '', estado: 'activa', vence: sumarDias(hoy, 200), creada: new Date(Date.now() - 86400e3 * 30).toISOString() }],
    resenas: [{ id: id(), nombre: 'Laura M.', servicio: 'Manicura semipermanente', profesional_id: 'sofia', estrellas: 5, texto: 'Texto de prueba de una reseña por revisar.', aprobada: false, creada: new Date().toISOString() },
      { id: id(), nombre: 'Andrea G.', servicio: 'Corte & estilizado', profesional_id: 'andres', estrellas: 4, texto: 'Reseña de prueba ya publicada.', aprobada: true, creada: new Date(Date.now() - 86400e3 * 5).toISOString() }],
    cupones: [{ codigo: 'BIENVENIDA', descripcion: '10% de descuento en tu primera reserva online', tipo: 'porcentaje', valor: 10, minimo: 0, desde: null, hasta: null, usos_max: null, usos: 4, activo: true, creada: new Date().toISOString() }],
    galeria: [],
    fichas: [{ id: id(), clienta_id: clientas[0].id, fecha: sumarDias(hoy, -20), servicio: 'Coloración', profesional_id: 'valentina', formula: '7.1 + 20 vol, 35 min', notas: 'Le gustó el tono' }],
    auditoria: [
      { id: 1, fecha: new Date(Date.now() - 600e3).toISOString(), usuario: null, tabla: 'reservas', accion: 'crear', detalle: { origen: 'instagram' } },
      { id: 2, fecha: new Date(Date.now() - 1800e3).toISOString(), usuario: 'u-duena', tabla: 'reservas', accion: 'cambio_panel', detalle: { estado: ['pendiente', 'confirmada'] } },
      { id: 3, fecha: new Date(Date.now() - 3600e3).toISOString(), usuario: null, tabla: 'reservas', accion: 'reprogramar_clienta', detalle: { antes: iso(sumarDias(hoy, 2), '10:00'), despues: iso(sumarDias(hoy, 3), '15:00') } },
      { id: 4, fecha: new Date(Date.now() - 7200e3).toISOString(), usuario: 'u-sofia', tabla: 'reservas', accion: 'cambio_panel', detalle: { estado: ['confirmada', 'terminada'] } },
      { id: 5, fecha: new Date(Date.now() - 9000e3).toISOString(), usuario: null, tabla: 'reservas', accion: 'cancelar_clienta', detalle: {} },
      { id: 6, fecha: new Date(Date.now() - 86400e3).toISOString(), usuario: 'u-duena', tabla: 'perfiles', accion: 'aprobar', detalle: { rol: 'estilista' } },
    ],
  };
}

// Filtros PostgREST básicos
function aplicarConsulta(filas, qs) {
  const p = new URLSearchParams(qs);
  let r = filas.slice();
  for (const [k, v] of p.entries()) {
    if (['select', 'order', 'limit'].includes(k)) continue;
    if (k === 'or') {
      const conds = v.slice(1, -1).split(',').map((c) => { const [col, op, ...val] = c.split('.'); return [col, op, val.join('.')]; });
      r = r.filter((f) => conds.some(([col, op, val]) => cumple(f[col], op, val)));
      continue;
    }
    const i = v.indexOf('.');
    const op = v.slice(0, i); const val = v.slice(i + 1);
    r = r.filter((f) => cumple(f[k], op, val));
  }
  if (p.get('order')) {
    const ords = p.get('order').split(',').map((o) => o.split('.'));
    r.sort((a, b) => { for (const [c, dir] of ords) { if (a[c] === b[c]) continue; const s = a[c] > b[c] ? 1 : -1; return dir === 'desc' ? -s : s; } return 0; });
  }
  if (p.get('limit')) r = r.slice(0, Number(p.get('limit')));
  return r;
}
function cumple(x, op, val) {
  const num = (s) => (typeof x === 'number' ? Number(s) : s);
  const cmp = (s) => (typeof x === 'string' && /^\d{4}-\d\d-\d\dT/.test(x) && /T/.test(s) ? new Date(x) - new Date(s) : (x > num(s) ? 1 : x < num(s) ? -1 : 0));
  switch (op) {
    case 'eq': return String(x) === val;
    case 'neq': return String(x) !== val;
    case 'gt': return cmp(val) > 0;
    case 'gte': return cmp(val) >= 0;
    case 'lt': return cmp(val) < 0;
    case 'lte': return cmp(val) <= 0;
    case 'is': return val === 'null' ? x == null : String(x) === val;
    case 'not': return val === 'is.null' ? x != null : true;
    case 'ilike': { const t = val.replace(/\*/g, '').toLowerCase(); return String(x || '').toLowerCase().includes(t); }
    default: return true;
  }
}

function instalarSimuladorPanel(page, { usuario = 'u-duena', email = 'anfebolivar@gmail.com' } = {}) {
  const DB = datosIniciales();
  const estado = { DB, llamadas: [], errores: [] };
  page.route(BASE + '/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const ruta = url.pathname;
    let cuerpo = null; try { cuerpo = req.postDataJSON(); } catch (e) { /* sin cuerpo */ }
    const ok = (json, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) });
    estado.llamadas.push(`${req.method()} ${ruta}${url.search}`);

    if (ruta.startsWith('/auth/v1/')) {
      if (ruta.endsWith('/token')) {
        if (cuerpo.password === 'mala-clave') return ok({ error_description: 'Invalid login credentials' }, 400);
        return ok({ access_token: jwt(usuario, email), refresh_token: 'r', expires_in: 3600, user: { id: usuario, email } });
      }
      return ok({});
    }
    if (ruta.startsWith('/storage/v1/object/')) return ok({ Key: ruta });
    const tabla = ruta.replace('/rest/v1/', '');
    if (tabla.startsWith('rpc/')) { const r = rpc(tabla.slice(4), cuerpo || {}, DB); return r && r.__error ? ok({ message: r.__error }, 400) : ok(r); }
    const filas = DB[tabla];
    if (!filas) { estado.errores.push('tabla ' + tabla); return ok({ message: 'NO_SIMULADO ' + tabla }, 404); }
    const qs = url.search.slice(1);
    if (req.method() === 'GET') {
      let r = aplicarConsulta(filas, qs);
      if (tabla === 'reservas' && /clientas\(/.test(decodeURIComponent(qs))) r = r.map((x) => ({ ...x, clientas: DB.clientas.find((c) => c.id === x.clienta_id) || null }));
      if (tabla === 'perfiles' && usuario === 'u-pendiente') r = [];
      return ok(r);
    }
    if (req.method() === 'POST') {
      const nuevas = (Array.isArray(cuerpo) ? cuerpo : [cuerpo]).map((f) => ({ id: `nuevo-${Math.random().toString(36).slice(2, 10)}`, fecha: new Date().toISOString(), abierta: new Date().toISOString(), creada: new Date().toISOString(), anulada: false, ...f }));
      if (tabla === 'config' && nuevas.some((n) => filas.find((f) => f.clave === n.clave))) return ok({ message: 'duplicate key' }, 409);
      filas.push(...nuevas);
      return ok(nuevas, 201);
    }
    const objetivo = aplicarConsulta(filas, qs);
    if (req.method() === 'PATCH') { objetivo.forEach((f) => Object.assign(f, cuerpo)); return ok(objetivo); }
    if (req.method() === 'DELETE') { objetivo.forEach((f) => filas.splice(filas.indexOf(f), 1)); return route.fulfill({ status: 204, body: '' }); }
    return ok({ message: 'NO_SIMULADO' }, 404);
  });
  return estado;
}

function rpc(nombre, p, DB) {
  if (nombre === 'horarios_ocupados') return DB.reservas.filter((r) => !['cancelada', 'no_asistio'].includes(r.estado)).map((r) => ({ profesional_id: r.profesional_id, inicio: r.inicio, fin: r.fin }));
  if (nombre === 'mover_cita') { const r = DB.reservas.find((x) => x.id === p.p_id); const dur = new Date(r.fin) - new Date(r.inicio); r.inicio = new Date(p.p_inicio).toISOString(); r.fin = new Date(new Date(p.p_inicio).getTime() + dur).toISOString(); if (p.p_profesional) r.profesional_id = p.p_profesional; return r; }
  if (nombre === 'crear_cita_salon') {
    const ss = p.p_servicios.map((sid) => { const s = DB.servicios.find((x) => x.id === sid); return { id: s.id, nombre: s.nombre, precio: s.precio, minutos: s.minutos }; });
    let cl = DB.clientas.find((c) => c.telefono === p.p_telefono);
    if (!cl) { cl = { id: 'cl-' + Date.now(), nombre: p.p_nombre, telefono: p.p_telefono, etiquetas: [], sellos: 0, puntos: 0 }; DB.clientas.push(cl); }
    const min = ss.reduce((t, s) => t + s.minutos, 0);
    const r = { id: 'r-' + Date.now(), codigo: 'NUEVA1', clienta_id: cl.id, profesional_id: p.p_profesional, inicio: new Date(p.p_inicio).toISOString(), fin: new Date(new Date(p.p_inicio).getTime() + min * 60e3).toISOString(), servicios: ss, productos: [], total: ss.reduce((t, s) => t + s.precio, 0), estado: 'confirmada', origen: 'salon', nota: p.p_nota || '' };
    DB.reservas.push(r); return r;
  }
  if (nombre === 'aprobar_acceso') { const s = DB.solicitudes_acceso.find((x) => x.user_id === p.p_user); s.aprobada = true; DB.perfiles.push({ user_id: s.user_id, nombre: s.nombre, rol: p.p_rol, profesional_id: p.p_profesional }); return null; }
  if (nombre === 'usar_tarjeta') {
    const t = DB.tarjetas_regalo.find((x) => x.codigo === String(p.p_codigo).toUpperCase());
    if (!t || t.estado !== 'activa') return { __error: 'TARJETA_NO_ACTIVA' };
    if (t.saldo < p.p_valor) return { __error: 'SALDO_INSUFICIENTE' };
    t.saldo -= p.p_valor; return { saldo: t.saldo };
  }
  if (nombre === 'solicitar_tarjeta_regalo') { const t = { codigo: 'NUEVA00001', valor_inicial: p.p_valor, saldo: p.p_valor, de: p.p_de, para: p.p_para, telefono: p.p_telefono, mensaje: p.p_mensaje, estado: 'pendiente_pago', vence: '2027-10-15', creada: new Date().toISOString() }; DB.tarjetas_regalo.push(t); return { codigo: t.codigo, valor: t.valor_inicial }; }
  const enRango = (f) => { const d = fechaCol(new Date(f)); return d >= p.p_desde && d <= p.p_hasta; };
  const ventas = DB.ventas.filter((v) => !v.anulada && enRango(v.fecha));
  if (nombre === 'comisiones') {
    return DB.profesionales.map((pr) => {
      const vs = ventas.filter((v) => v.profesional_id === pr.id);
      return { id: pr.id, nombre: pr.nombre, comision_servicio: pr.comision_servicio, comision_producto: pr.comision_producto,
        servicios: vs.reduce((t, v) => t + v.subtotal, 0), productos: 0, propinas: vs.reduce((t, v) => t + v.propina, 0) };
    });
  }
  if (nombre === 'reporte') {
    const citas = DB.reservas.filter((r) => enRango(r.inicio));
    const porDia = {}; ventas.forEach((v) => { const d = fechaCol(new Date(v.fecha)); porDia[d] = (porDia[d] || 0) + v.total; });
    const suma = (arr, f) => arr.reduce((t, x) => t + f(x), 0);
    const agrupar = (arr, k, f) => arr.reduce((o, x) => { o[k(x)] = (o[k(x)] || 0) + f(x); return o; }, {});
    const gastos = DB.gastos.filter((g) => g.fecha >= p.p_desde && g.fecha <= p.p_hasta);
    const top = {}; citas.forEach((r) => r.servicios.forEach((s) => { top[s.nombre] = top[s.nombre] || { nombre: s.nombre, veces: 0, valor: 0 }; top[s.nombre].veces++; top[s.nombre].valor += s.precio; }));
    const pico = {}; citas.forEach((r) => { const d = new Date(new Date(r.inicio).getTime() - 5 * 3600e3); const k = d.getUTCDay() + '-' + d.getUTCHours(); pico[k] = (pico[k] || 0) + 1; });
    return {
      ingresos_total: suma(ventas, (v) => v.total), ticket_promedio: ventas.length ? Math.round(suma(ventas, (v) => v.total) / ventas.length) : 0,
      gastos_total: suma(gastos, (g) => g.valor), citas_total: citas.length, citas_terminadas: citas.filter((r) => r.estado === 'terminada').length,
      canceladas: citas.filter((r) => r.estado === 'cancelada').length, no_asistio: citas.filter((r) => r.estado === 'no_asistio').length,
      clientas_nuevas: 3, clientas_recurrentes: 4,
      ingresos_dia: Object.entries(porDia).map(([dia, total]) => ({ dia, total })),
      por_profesional: DB.profesionales.map((pr) => ({ id: pr.id, nombre: pr.nombre, ventas: suma(ventas.filter((v) => v.profesional_id === pr.id), (v) => v.total),
        citas: citas.filter((r) => r.profesional_id === pr.id && r.estado === 'terminada').length,
        minutos_reservados: suma(citas.filter((r) => r.profesional_id === pr.id), (r) => (new Date(r.fin) - new Date(r.inicio)) / 60000) })),
      servicios_top: Object.values(top).sort((a, b) => b.veces - a.veces),
      por_metodo: agrupar(ventas, (v) => v.metodo_pago, (v) => v.total), origen: agrupar(citas, (r) => r.origen, () => 1),
      gastos_categoria: agrupar(gastos, (g) => g.categoria, (g) => g.valor),
      horas_pico: Object.entries(pico).map(([k, n]) => { const [dia, hora] = k.split('-').map(Number); return { dia, hora, n }; }),
    };
  }
  return null;
}

module.exports = { instalarSimuladorPanel };
