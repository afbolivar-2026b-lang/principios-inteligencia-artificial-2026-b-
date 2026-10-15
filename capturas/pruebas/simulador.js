// Simulador de la API de Supabase para probar la página sin conexión a internet.
// Responde con los mismos datos y códigos de error que la base de datos real.
const fs = require('fs');
const path = require('path');
const DB = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-db.json'), 'utf8'));
const BASE = 'https://zhnwkyjoyixriasoxirf.supabase.co';

const colombia = (d) => new Date(d.getTime() - 5 * 3600e3);
const fechaCol = (d) => colombia(d).toISOString().slice(0, 10);
const iso = (fecha, hhmm) => new Date(`${fecha}T${hhmm}:00-05:00`).toISOString();
const sumarDias = (fecha, n) => { const d = new Date(fecha + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function instalarSimulador(page, opciones = {}) {
  const hoy = fechaCol(new Date());
  // Citas existentes de ejemplo (para que la agenda no salga vacía)
  const ocupados = [];
  for (let i = 0; i < 30; i++) {
    const f = sumarDias(hoy, i);
    ocupados.push(['andres', f, '13:00', '14:30'], ['andres', f, '16:00', '17:00'], ['valentina', f, '09:00', '11:00'],
      ['sofia', f, '10:00', '11:00'], ['sofia', f, '14:00', '15:30'], ['camila', f, '12:00', '13:00'],
      ['laura', f, '11:00', '12:30'], ['mariana', f, '15:00', '16:00'], ['daniela', f, '17:00', '18:00']);
  }
  ocupados.push([null, sumarDias(hoy, 3), '12:00', '13:00']); // almuerzo de todo el salón ese día
  const estado = { reserva: null, llamadas: [] };

  page.route(BASE + '/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const ruta = url.pathname.replace('/rest/v1/', '');
    const cuerpo = req.postDataJSON ? (() => { try { return req.postDataJSON(); } catch (e) { return null; } })() : null;
    const responder = (status, json) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) });
    const error = (codigo) => responder(400, { message: codigo, code: 'P0001' });
    estado.llamadas.push({ ruta, cuerpo });
    if (opciones.sinConexion) return route.abort('internetdisconnected');

    if (req.method() === 'GET' && DB[ruta]) return responder(200, DB[ruta]);
    if (ruta === 'rpc/horarios_ocupados') {
      return responder(200, ocupados.map(([p, f, a, b]) => ({ profesional_id: p, inicio: iso(f, a), fin: iso(f, b) })));
    }
    if (ruta === 'rpc/crear_reserva') {
      if (opciones.ocupado) return error('HORARIO_OCUPADO');
      const items = cuerpo.p_servicios.map((id) => {
        if (id.startsWith('diseno:')) { const d = DB.disenos.find((x) => x.id === id.slice(7)); return { id, nombre: 'Manicura ' + d.nombre, precio: d.precio, minutos: 60 }; }
        const s = DB.servicios.find((x) => x.id === id);
        const aj = cuerpo.p_largo && s.ajustes_largo && s.ajustes_largo[cuerpo.p_largo];
        return { id, nombre: s.nombre, precio: s.precio + (aj ? aj.precio : 0), minutos: s.minutos + (aj ? aj.minutos : 0) + s.limpieza_min };
      });
      const prods = cuerpo.p_productos.map((p) => { const x = DB.productos.find((y) => y.id === p.id); return { id: x.id, nombre: x.nombre, precio: x.precio, cantidad: 1 }; });
      const min = items.reduce((t, s) => t + s.minutos, 0);
      const pro = DB.profesionales.find((p) => p.id === (cuerpo.p_profesional === 'cualquiera' ? 'sofia' : cuerpo.p_profesional));
      const inicio = new Date(cuerpo.p_inicio);
      estado.reserva = {
        codigo: 'K7M2QX', token: '6f1c2b0e-3d4a-4b8e-9c1f-2a7d5e8b9c10', profesional_id: pro.id, profesional: pro.nombre,
        inicio: inicio.toISOString(), fin: new Date(inicio.getTime() + min * 60e3).toISOString(),
        servicios: items, productos: prods, total: items.reduce((t, s) => t + s.precio, 0) + prods.reduce((t, p) => t + p.precio, 0),
        codigo_referido: 'B4N9TZ', estado: 'pendiente', nombre: cuerpo.p_nombre.split(' ')[0],
      };
      return responder(200, estado.reserva);
    }
    const r = opciones.reservaGuardada || estado.reserva;
    const verReserva = () => ({ ...r, puede_cambiar: ['pendiente', 'confirmada'].includes(r.estado) && new Date(r.inicio) - Date.now() > 24 * 3600e3 });
    if (ruta === 'rpc/ver_reserva') return r ? responder(200, verReserva()) : responder(200, null);
    if (ruta === 'rpc/confirmar_asistencia') { r.estado = 'confirmada'; return responder(200, verReserva()); }
    if (ruta === 'rpc/cancelar_reserva') { r.estado = 'cancelada'; return responder(200, verReserva()); }
    if (ruta === 'rpc/reprogramar_reserva') {
      const dur = new Date(r.fin) - new Date(r.inicio);
      r.inicio = new Date(cuerpo.p_inicio).toISOString(); r.fin = new Date(new Date(cuerpo.p_inicio).getTime() + dur).toISOString();
      r.estado = 'pendiente';
      return responder(200, verReserva());
    }
    if (ruta === 'rpc/unirse_lista_espera') return responder(200, { ok: true });
    if (url.pathname.endsWith('/functions/v1/integraciones/estado')) return responder(200, { wompi: false, whatsapp: false, asistente: false });
    // ----- Etapa 3 -----
    if (req.method() === 'GET' && ruta === 'resenas') return responder(200, opciones.resenas || []);
    if (req.method() === 'GET' && ruta === 'galeria') return responder(200, opciones.galeria || []);
    if (ruta === 'rpc/validar_cupon') {
      if (String(cuerpo.p_codigo).toUpperCase() !== 'BIENVENIDA') return error('CUPON_INVALIDO');
      return responder(200, { codigo: 'BIENVENIDA', descripcion: '10% de descuento en tu primera reserva online', descuento: Math.round(cuerpo.p_subtotal * 0.1) });
    }
    if (ruta === 'rpc/aplicar_cupon') {
      const desc = Math.round(estado.reserva.total * 0.1);
      estado.reserva.total -= desc;
      return responder(200, { cupon: 'BIENVENIDA', descuento: desc, total: estado.reserva.total });
    }
    if (ruta === 'rpc/crear_pedido') {
      estado.pedido = cuerpo;
      const items = cuerpo.p_items.map((i) => { const p = DB.productos.find((x) => x.id === i.id); return { ...i, nombre: p.nombre, precio: p.precio }; });
      if (items.some((i) => i.cantidad > DB.productos.find((x) => x.id === i.id).stock)) return error('SIN_STOCK');
      return responder(200, { codigo: 'P4X9KQ', total: items.reduce((t, i) => t + i.precio * i.cantidad, 0), items, entrega: cuerpo.p_entrega });
    }
    if (ruta === 'rpc/solicitar_tarjeta_regalo') { estado.tarjeta = cuerpo; return responder(200, { codigo: '7F3A9C2B1E', valor: cuerpo.p_valor, estado: 'pendiente_pago', vence: sumarDias(hoy, 365) }); }
    if (ruta === 'rpc/saldo_tarjeta') return cuerpo.p_codigo === '7F3A9C2B1E' ? responder(200, { saldo: 100000, estado: 'activa', vence: sumarDias(hoy, 300), para: 'Lucía' }) : error('NO_EXISTE');
    if (ruta === 'rpc/dejar_resena') { estado.resena = cuerpo; return responder(200, { ok: true }); }
    return responder(404, { message: 'NO_SIMULADO ' + ruta });
  });
  return estado;
}

module.exports = { instalarSimulador, sumarDias, fechaCol };
