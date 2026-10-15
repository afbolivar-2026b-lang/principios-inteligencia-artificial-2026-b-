// Conexiones con servicios externos de Neiva Belleza (Supabase Edge Function).
// Cada servicio se activa solo cuando su llave secreta está guardada en Supabase
// (Project Settings → Edge Functions → Secrets). Mientras falte, responde PENDIENTE_DE_CONECTAR.
//
// Rutas:
//   GET  /integraciones/estado                 → qué servicios están conectados (solo sí/no)
//   POST /integraciones/wompi/firma            → arma el enlace de pago de Wompi para una tarjeta de regalo o un pedido
//   POST /integraciones/wompi/evento           → aviso de Wompi cuando un pago se aprueba (webhook)
//   POST /integraciones/whatsapp/recordatorios → envía por WhatsApp los recordatorios de las citas de mañana (personal del salón)
//   POST /integraciones/asistente              → asistente virtual del salón (Claude)
import { createClient } from 'npm:@supabase/supabase-js@2';

const env = (k: string) => Deno.env.get(k) ?? '';
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (datos: unknown, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const pendiente = (servicio: string) => json({ error: 'PENDIENTE_DE_CONECTAR', servicio }, 503);

async function sha256(texto: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const conectado = {
  wompi: () => Boolean(env('WOMPI_PUBLIC_KEY') && env('WOMPI_INTEGRITY_SECRET') && env('WOMPI_EVENTS_SECRET')),
  whatsapp: () => Boolean(env('WHATSAPP_TOKEN') && env('WHATSAPP_PHONE_ID')),
  asistente: () => Boolean(env('ANTHROPIC_API_KEY')),
};

// ---------- Personal del salón (para rutas privadas) ----------
async function esPersonalAdmin(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const { data } = await db.auth.getUser(token);
  if (!data?.user) return false;
  const { data: perfil } = await db.from('perfiles').select('rol').eq('user_id', data.user.id).maybeSingle();
  return Boolean(perfil && ['duena', 'recepcion'].includes(perfil.rol));
}

// ---------- WOMPI ----------
async function wompiFirma(req: Request) {
  if (!conectado.wompi()) return pendiente('wompi');
  const { tipo, codigo, volver } = await req.json().catch(() => ({}));
  let monto = 0;
  if (tipo === 'tarjeta') {
    const { data } = await db.from('tarjetas_regalo').select('valor_inicial, estado').eq('codigo', String(codigo || '').toUpperCase()).maybeSingle();
    if (!data || data.estado !== 'pendiente_pago') return json({ error: 'NO_SE_PUEDE_PAGAR' }, 400);
    monto = data.valor_inicial;
  } else if (tipo === 'pedido') {
    const { data } = await db.from('pedidos').select('total, estado, pagado').eq('codigo', String(codigo || '').toUpperCase()).maybeSingle();
    if (!data || data.pagado || data.estado === 'cancelado') return json({ error: 'NO_SE_PUEDE_PAGAR' }, 400);
    monto = data.total;
  } else {
    return json({ error: 'TIPO_INVALIDO' }, 400);
  }
  const centavos = monto * 100;
  const referencia = `${tipo === 'tarjeta' ? 'T' : 'P'}-${String(codigo).toUpperCase()}-${Date.now().toString(36)}`;
  const firma = await sha256(`${referencia}${centavos}COP${env('WOMPI_INTEGRITY_SECRET')}`);
  await db.from('pagos').insert({ referencia, tipo, codigo: String(codigo).toUpperCase(), monto_centavos: centavos });
  const url = new URL('https://checkout.wompi.co/p/');
  url.searchParams.set('public-key', env('WOMPI_PUBLIC_KEY'));
  url.searchParams.set('currency', 'COP');
  url.searchParams.set('amount-in-cents', String(centavos));
  url.searchParams.set('reference', referencia);
  url.searchParams.set('signature:integrity', firma);
  if (typeof volver === 'string' && /^https:\/\//.test(volver)) url.searchParams.set('redirect-url', volver);
  return json({ url: url.toString(), referencia });
}

// Wompi avisa aquí el resultado del pago. Se verifica la firma con el secreto de eventos.
async function wompiEvento(req: Request) {
  if (!conectado.wompi()) return pendiente('wompi');
  const evento = await req.json().catch(() => null);
  if (!evento?.signature?.properties || !evento.data) return json({ error: 'EVENTO_INVALIDO' }, 400);
  const valor = (ruta: string) => ruta.split('.').reduce((o: any, k) => (o == null ? o : o[k]), evento.data);
  const cadena = evento.signature.properties.map((p: string) => String(valor(p) ?? '')).join('') + evento.timestamp + env('WOMPI_EVENTS_SECRET');
  if ((await sha256(cadena)) !== String(evento.signature.checksum).toLowerCase()) return json({ error: 'FIRMA_INVALIDA' }, 401);

  const t = evento.data.transaction;
  if (evento.event !== 'transaction.updated' || !t?.reference) return json({ ok: true });
  const { data: pago } = await db.from('pagos').select('*').eq('referencia', t.reference).maybeSingle();
  if (!pago) return json({ ok: true, ignorado: 'referencia desconocida' });
  await db.from('pagos').update({ estado: t.status, transaccion_id: t.id, actualizada: new Date().toISOString() }).eq('referencia', t.reference);
  if (t.status === 'APPROVED' && Number(t.amount_in_cents) === Number(pago.monto_centavos)) {
    if (pago.tipo === 'tarjeta') {
      await db.from('tarjetas_regalo').update({ estado: 'activa' }).eq('codigo', pago.codigo).eq('estado', 'pendiente_pago');
    } else {
      await db.from('pedidos').update({ pagado: true }).eq('codigo', pago.codigo);
    }
  }
  return json({ ok: true });
}

// ---------- WHATSAPP (API de WhatsApp Business de Meta) ----------
async function whatsappRecordatorios(req: Request) {
  if (!(await esPersonalAdmin(req))) return json({ error: 'SIN_PERMISO' }, 403);
  if (!conectado.whatsapp()) return pendiente('whatsapp');
  // Citas de mañana (hora Colombia) sin recordatorio enviado
  const ahora = new Date(Date.now() - 5 * 3600e3);
  const manana = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate() + 1));
  const desde = new Date(manana.getTime() + 5 * 3600e3).toISOString();
  const hasta = new Date(manana.getTime() + 29 * 3600e3).toISOString();
  const { data: citas } = await db.from('reservas')
    .select('id, inicio, token, profesional_id, clientas(nombre, telefono), profesionales(nombre)')
    .gte('inicio', desde).lt('inicio', hasta).in('estado', ['pendiente', 'confirmada']).eq('recordatorio_enviado', false);
  const plantilla = env('WHATSAPP_PLANTILLA') || 'recordatorio_cita';
  const sitio = env('SITIO_URL') || 'https://neiva-belleza.netlify.app';
  let enviados = 0;
  const fallidos: string[] = [];
  for (const c of citas ?? []) {
    const cl: any = c.clientas;
    const d = new Date(new Date(c.inicio).getTime() - 5 * 3600e3);
    const hora = `${d.getUTCHours() % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${d.getUTCHours() < 12 ? 'a.m.' : 'p.m.'}`;
    let tel = String(cl?.telefono || '').replace(/\D/g, '');
    if (tel.length === 10 && tel.startsWith('3')) tel = '57' + tel;
    const r = await fetch(`https://graph.facebook.com/v21.0/${env('WHATSAPP_PHONE_ID')}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('WHATSAPP_TOKEN')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp', to: tel, type: 'template',
        template: { name: plantilla, language: { code: 'es' }, components: [{ type: 'body', parameters: [
          { type: 'text', text: String(cl?.nombre || '').split(' ')[0] },
          { type: 'text', text: hora },
          { type: 'text', text: String((c.profesionales as any)?.nombre || '') },
          { type: 'text', text: `${sitio}/cita.html?t=${c.token}` },
        ] }] },
      }),
    });
    if (r.ok) {
      enviados++;
      await db.from('reservas').update({ recordatorio_enviado: true, recordatorio_error: null }).eq('id', c.id);
    } else {
      const error = (await r.json().catch(() => ({})))?.error?.message || `HTTP ${r.status}`;
      fallidos.push(String(cl?.nombre || c.id));
      await db.from('reservas').update({ recordatorio_error: String(error).slice(0, 200) }).eq('id', c.id);
    }
  }
  return json({ enviados, fallidos, total: (citas ?? []).length });
}

// ---------- ASISTENTE VIRTUAL ----------
async function asistente(req: Request) {
  if (!conectado.asistente()) return pendiente('asistente');
  const { mensajes } = await req.json().catch(() => ({}));
  if (!Array.isArray(mensajes) || !mensajes.length) return json({ error: 'SIN_MENSAJE' }, 400);
  // Límites para controlar el costo: últimos 10 mensajes, máximo 500 caracteres cada uno
  const historial = mensajes.slice(-10)
    .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string')
    .map((m: any) => ({ role: m.role, content: m.content.slice(0, 500) }));
  if (!historial.length || historial[historial.length - 1].role !== 'user') return json({ error: 'SIN_MENSAJE' }, 400);

  const [{ data: servicios }, { data: pros }, { data: config }] = await Promise.all([
    db.from('servicios').select('nombre, precio, minutos, categoria_id').eq('activo', true),
    db.from('profesionales').select('nombre, rol, especialidad, dias, hora_inicio, hora_fin').eq('activo', true),
    db.from('config').select('valor').eq('clave', 'salon').maybeSingle(),
  ]);
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const salon: any = config?.valor ?? {};
  const sistema = `Eres la asistente virtual de ${salon.nombre || 'Neiva Belleza'}, un salón de belleza y spa en ${salon.direccion || 'Neiva, Huila'}.
Responde en español de Colombia, cálida y breve (máximo 4 frases). Usa solo esta información; si no sabes algo, sugiere escribir por WhatsApp al ${salon.whatsappVisible || ''}.
No inventes precios, horarios ni promociones. Para reservar, indica la sección "Reservar" de la página. Nunca pidas datos de pago.
Horario: ${salon.horario || 'lunes a sábado'}. Domingos y festivos cerrado. Cancelación gratis hasta 24 horas antes. Se paga en el salón.
Servicios (precio en COP · duración): ${(servicios ?? []).map((s: any) => `${s.nombre} $${s.precio.toLocaleString('es-CO')} · ${s.minutos} min`).join('; ')}.
Equipo: ${(pros ?? []).map((p: any) => `${p.nombre} (${p.rol}, ${p.especialidad}; trabaja ${p.dias.map((d: number) => DIAS[d]).join(', ')} de ${String(p.hora_inicio).slice(0, 5)} a ${String(p.hora_fin).slice(0, 5)})`).join('; ')}.`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: env('ASISTENTE_MODELO') || 'claude-haiku-5-5', max_tokens: 400, system: sistema, messages: historial }),
  });
  if (!r.ok) return json({ error: 'ASISTENTE_NO_DISPONIBLE' }, 502);
  const datos = await r.json();
  const texto = (datos.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
  return json({ respuesta: texto || 'No te entendí bien. ¿Me lo escribes de otra forma?' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const ruta = new URL(req.url).pathname.replace(/^.*\/integraciones/, '');
  try {
    if (ruta === '/estado') return json({ wompi: conectado.wompi(), whatsapp: conectado.whatsapp(), asistente: conectado.asistente() });
    if (req.method !== 'POST') return json({ error: 'NO_EXISTE' }, 404);
    if (ruta === '/wompi/firma') return await wompiFirma(req);
    if (ruta === '/wompi/evento') return await wompiEvento(req);
    if (ruta === '/whatsapp/recordatorios') return await whatsappRecordatorios(req);
    if (ruta === '/asistente') return await asistente(req);
    return json({ error: 'NO_EXISTE' }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: 'ERROR_INTERNO' }, 500);
  }
});
