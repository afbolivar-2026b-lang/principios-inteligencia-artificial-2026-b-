// ===== SECCIONES EXTRA DE LA PÁGINA: galería, novias, tienda, regalos, opiniones, mapa e idioma =====
// Usa lo que ya cargó script.js (estado, irAPaso, desplazarA) y datos.js (catálogo, SALON).

const $id = (id) => document.getElementById(id);

// ----- GALERÍA DE TRABAJOS REALES -----
const CATEGORIA_GALERIA = { unas: 'Uñas', cabello: 'Cabello', maquillaje: 'Maquillaje', spa: 'Spa' };
let fotosGaleria = [];
let filtroGaleria = 'todas';

function urlFoto(ruta) {
  if (!ruta) return '';
  return escaparHTML(/^(https?:|img\/)/.test(ruta) ? ruta : `${SUPABASE.url}/storage/v1/object/public/galeria/${encodeURI(ruta)}`);
}

function pintarGaleria() {
  const cats = ['todas', ...Object.keys(CATEGORIA_GALERIA).filter((c) => fotosGaleria.some((f) => f.categoria === c))];
  $id('filtros-galeria').innerHTML = cats.length > 2 ? cats.map((c) => `<button type="button" class="chip" role="tab"
    aria-selected="${c === filtroGaleria}" data-cat="${c}">${c === 'todas' ? 'Todos' : CATEGORIA_GALERIA[c]}</button>`).join('') : '';
  const lista = fotosGaleria.filter((f) => filtroGaleria === 'todas' || f.categoria === filtroGaleria);
  $id('grid-galeria').innerHTML = lista.map((f, i) => `
    <button type="button" class="foto-galeria" data-foto="${fotosGaleria.indexOf(f)}" aria-label="Ver ${escaparHTML(f.titulo || 'foto')} en grande">
      <img src="${urlFoto(f.foto)}" alt="${escaparHTML(f.titulo || CATEGORIA_GALERIA[f.categoria] || 'Trabajo del salón')}" loading="lazy">
      ${f.foto_antes ? '<span class="etiqueta-antes">Antes y después</span>' : ''}
      ${f.titulo ? `<span class="pie-foto">${escaparHTML(f.titulo)}</span>` : ''}
    </button>`).join('');
}

function abrirVisor(f) {
  const visor = $id('visor');
  const titulo = escaparHTML(f.titulo || '');
  $id('visor-contenido').innerHTML = `
    <button type="button" class="cerrar-dialogo" data-cerrar aria-label="Cerrar">✕</button>
    ${f.foto_antes ? `
      <div class="comparador" style="--corte:50%">
        <img src="${urlFoto(f.foto)}" alt="Después: ${titulo}">
        <img class="antes" src="${urlFoto(f.foto_antes)}" alt="Antes: ${titulo}">
        <span class="marca marca-antes">Antes</span><span class="marca marca-despues">Después</span>
        <input type="range" min="0" max="100" value="50" aria-label="Deslizar para comparar antes y después">
      </div>` : `<img class="foto-grande" src="${urlFoto(f.foto)}" alt="${titulo}">`}
    ${titulo ? `<p class="visor-titulo">${titulo}${f.profesional_id ? ' · ' + escaparHTML((profesionalPorIdSeguro(f.profesional_id) || {}).nombre || '') : ''}</p>` : ''}`;
  const rango = visor.querySelector('input[type=range]');
  if (rango) rango.addEventListener('input', () => visor.querySelector('.comparador').style.setProperty('--corte', rango.value + '%'));
  visor.showModal();
}

$id('grid-galeria').addEventListener('click', (e) => {
  const b = e.target.closest('[data-foto]');
  if (b) abrirVisor(fotosGaleria[b.dataset.foto]);
});
$id('filtros-galeria').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]');
  if (b) { filtroGaleria = b.dataset.cat; pintarGaleria(); }
});
$id('visor').addEventListener('click', (e) => {
  if (e.target.closest('[data-cerrar]') || e.target.id === 'visor') $id('visor').close();
});

// Mientras el salón no suba fotos, se muestran las del catálogo de diseños
function galeriaDeRespaldo() {
  return DISENOS.map((d) => ({ foto: d.foto, titulo: d.nombre, categoria: 'unas' }));
}

// ----- NOVIAS -----
function pintarNovias() {
  const maq = (CATEGORIAS.find((c) => c.id === 'maquillaje') || { servicios: [] }).servicios;
  const novia = maq.find((s) => s.id === 'maq-novia');
  const extras = [
    novia && [novia.nombre, `${formatoCOP(novia.precio)} · ${duracionTexto(novia.minutos)}`, novia.detalle],
    ['Peinado de evento', 'Con Mariana López', 'Recogidos, ondas y semirecogidos que duran toda la noche'],
    ['Manicura para la boda', 'Desde ' + formatoCOP(Math.min(...DISENOS.map((d) => d.precio))), 'Elige un diseño del catálogo: el French Perlado es el favorito de las novias'],
    ['Cortejo y familia', 'Precio por persona', 'Maquillaje y peinado para mamás, damas de honor y quinceañeras'],
  ].filter(Boolean);
  $id('novias-incluye').innerHTML = extras.map(([t, p, d]) => `<li><strong>${escaparHTML(t)}</strong><small>${escaparHTML(p)}</small><span>${escaparHTML(d)}</span></li>`).join('');
  $id('cotizar-novia').href = `https://wa.me/${SALON.whatsapp}?text=${encodeURIComponent('Hola, quiero cotizar maquillaje y peinado para mi boda. La fecha es: ')}`;
}
$id('reservar-prueba-novia').addEventListener('click', () => {
  if (!servicioPorId('maq-novia')) { desplazarA('reservar'); return; }
  estado.servicios = ['maq-novia']; estado.largo = null; estado.profesional = null; estado.hora = null; estado.enviada = null;
  irAPaso(1);
});

// ----- TIENDA Y CARRITO -----
const CLAVE_CARRITO = 'neivaBelleza.carrito';
const carrito = { items: leerLocal(CLAVE_CARRITO, []), entrega: 'recoger', enviado: null, error: '', enviando: false };

const productoDe = (id) => PRODUCTOS.find((p) => p.id === id);
const itemsCarrito = () => carrito.items.filter((i) => productoDe(i.id));
const totalCarrito = () => itemsCarrito().reduce((t, i) => t + productoDe(i.id).precio * i.cantidad, 0);

function guardarCarrito() {
  guardarLocal(CLAVE_CARRITO, carrito.items);
  const n = itemsCarrito().reduce((t, i) => t + i.cantidad, 0);
  $id('contador-bolsa').textContent = n;
  $id('contador-bolsa').hidden = n === 0;
}

function textoStock(p) {
  if (p.stock === undefined) return '';
  if (p.stock <= 0) return '<span class="stock agotado">Agotado</span>';
  if (p.stock <= 3) return `<span class="stock pocas">Últimas ${p.stock}</span>`;
  return '<span class="stock">Disponible</span>';
}

function pintarTienda() {
  $id('grid-tienda').innerHTML = PRODUCTOS.map((p) => {
    const enCarrito = carrito.items.find((i) => i.id === p.id);
    return `<article class="producto-tienda">
      <img src="${escaparHTML(p.foto)}" alt="${escaparHTML(p.nombre)}" loading="lazy">
      <div class="producto-info">
        <h3>${escaparHTML(p.nombre)}</h3>
        <p>${escaparHTML(p.detalle)}</p>
        ${p.modoUso ? `<details><summary>Cómo se usa</summary><p>${escaparHTML(p.modoUso)}</p>${p.ingredientes ? `<p><b>Ingredientes:</b> ${escaparHTML(p.ingredientes)}</p>` : ''}</details>` : ''}
        <div class="producto-pie"><strong>${formatoCOP(p.precio)}</strong>${textoStock(p)}</div>
        <button type="button" class="btn btn-pequeno ${enCarrito ? 'btn-borde' : ''}" data-agregar="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
          ${enCarrito ? `En tu carrito (${enCarrito.cantidad}) · agregar otro` : 'Agregar al carrito'}</button>
      </div></article>`;
  }).join('');
}

function carritoHTML() {
  const items = itemsCarrito();
  if (carrito.enviado) {
    const p = carrito.enviado;
    const msg = `Hola ${SALON.nombre}, hice el pedido ${p.codigo} en la página (${formatoCOP(p.total)}). ${p.entrega === 'domicilio' ? 'Es para domicilio.' : 'Lo recojo en el salón.'}`;
    return `<div class="exito">
      <div class="sello">✓</div>
      <h3>¡Pedido recibido!</h3>
      <p class="codigo-reserva">Código <b>${escaparHTML(p.codigo)}</b></p>
      <p>${p.entrega === 'domicilio' ? 'Te escribimos por WhatsApp para confirmar el valor del domicilio y la hora de entrega.'
        : 'Te avisamos por WhatsApp cuando esté listo para recoger en el salón.'} Pagas al recibir: ${formatoCOP(p.total)}.</p>
      ${botonPagoHTML('pedido', p.codigo)}
      <div class="acciones-exito"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${SALON.whatsapp}?text=${encodeURIComponent(msg)}">Avisar por WhatsApp</a>
      <button type="button" class="btn btn-borde" data-cerrar>Seguir comprando</button></div></div>`;
  }
  if (!items.length) {
    return `<p class="vacio-carrito">Tu carrito está vacío.</p><a class="btn" href="#tienda" data-cerrar>Ver la tienda</a>`;
  }
  const d = leerLocal(CLAVE_MIS_DATOS, {});
  return `
    <ul class="lineas-carrito">${items.map((i) => {
      const p = productoDe(i.id);
      return `<li><img src="${escaparHTML(p.foto)}" alt=""><div><strong>${escaparHTML(p.nombre)}</strong><small>${formatoCOP(p.precio)}</small></div>
        <div class="cantidad"><button type="button" data-menos="${p.id}" aria-label="Quitar uno">−</button><span>${i.cantidad}</span>
        <button type="button" data-mas="${p.id}" aria-label="Agregar uno" ${i.cantidad >= Math.min(10, p.stock ?? 10) ? 'disabled' : ''}>+</button></div></li>`;
    }).join('')}</ul>
    <div class="fila-resumen total"><span>Total</span><span>${formatoCOP(totalCarrito())} COP</span></div>
    <form id="form-pedido" novalidate>
      <div class="opciones-entrega" role="radiogroup" aria-label="Entrega">
        <button type="button" class="chip" data-entrega="recoger" aria-pressed="${carrito.entrega === 'recoger'}">Recoger en el salón</button>
        <button type="button" class="chip" data-entrega="domicilio" aria-pressed="${carrito.entrega === 'domicilio'}">Domicilio en Neiva</button>
      </div>
      <div class="campo"><label for="pedido-nombre">Nombre</label><input id="pedido-nombre" maxlength="60" autocomplete="name" value="${escaparHTML(d.nombre || '')}"><small class="error"></small></div>
      <div class="campo"><label for="pedido-tel">Celular / WhatsApp</label><input id="pedido-tel" type="tel" maxlength="20" autocomplete="tel" value="${escaparHTML(d.telefono || '')}"><small class="error"></small></div>
      ${carrito.entrega === 'domicilio' ? `<div class="campo"><label for="pedido-dir">Dirección y barrio</label><input id="pedido-dir" maxlength="200" autocomplete="street-address"><small class="error"></small></div>
        <p class="nota-enlace">El valor del domicilio se confirma por WhatsApp según el barrio.</p>` : ''}
      <div class="campo"><label for="pedido-notas">Notas (opcional)</label><input id="pedido-notas" maxlength="300"></div>
      ${carrito.error ? `<p class="error-general" role="alert">${escaparHTML(carrito.error)}</p>` : ''}
      <button class="btn btn-ancho" type="submit" ${carrito.enviando ? 'disabled' : ''}>${carrito.enviando ? 'Enviando…' : 'Hacer pedido · pago al recibir'}</button>
      ${SERVIDOR.wompi ? '<p class="nota-enlace">Después de hacer el pedido puedes pagarlo en línea.</p>' : '<p class="nota-enlace"><span class="pendiente-conectar">Pago en línea: pendiente de conectar</span></p>'}
    </form>`;
}

function pintarCarrito() {
  $id('carrito-contenido').innerHTML = `
    <div class="carrito-cabecera"><h2 id="carrito-titulo">Tu carrito</h2><button type="button" class="cerrar-dialogo" data-cerrar aria-label="Cerrar">✕</button></div>
    <div class="carrito-cuerpo">${carritoHTML()}</div>`;
}
function abrirCarrito() { carrito.error = ''; pintarCarrito(); $id('carrito').showModal(); }

function agregarAlCarrito(id) {
  const p = productoDe(id);
  if (!p) return;
  const i = carrito.items.find((x) => x.id === id);
  if (i) i.cantidad = Math.min(i.cantidad + 1, 10, p.stock ?? 10);
  else carrito.items.push({ id, cantidad: 1 });
  carrito.enviado = null;
  guardarCarrito();
  pintarTienda();
  abrirCarrito();
}

$id('grid-tienda').addEventListener('click', (e) => {
  const b = e.target.closest('[data-agregar]');
  if (b) agregarAlCarrito(b.dataset.agregar);
});
$id('abrir-carrito').addEventListener('click', abrirCarrito);
$id('carrito').addEventListener('click', (e) => {
  if (e.target.id === 'carrito' || e.target.closest('[data-cerrar]')) { $id('carrito').close(); if (carrito.enviado) { carrito.enviado = null; } return; }
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset;
  // Guardar lo escrito antes de repintar
  const datos = ['pedido-nombre', 'pedido-tel', 'pedido-dir', 'pedido-notas'].map((x) => [x, $id(x) && $id(x).value]);
  if (d.mas || d.menos) {
    const i = carrito.items.find((x) => x.id === (d.mas || d.menos));
    i.cantidad += d.mas ? 1 : -1;
    carrito.items = carrito.items.filter((x) => x.cantidad > 0);
    guardarCarrito(); pintarTienda();
  } else if (d.entrega) {
    carrito.entrega = d.entrega;
  } else return;
  pintarCarrito();
  datos.forEach(([x, v]) => { if ($id(x) && v != null) $id(x).value = v; });
});
$id('carrito').addEventListener('submit', async (e) => {
  e.preventDefault();
  const campos = { nombre: $id('pedido-nombre'), tel: $id('pedido-tel'), dir: $id('pedido-dir') };
  const errores = {
    nombre: campos.nombre.value.trim().length < 3 ? 'Escribe tu nombre.' : '',
    tel: /^[0-9\s+()-]{7,20}$/.test(campos.tel.value.trim()) ? '' : 'Escribe un celular válido.',
    dir: campos.dir && campos.dir.value.trim().length < 6 ? 'Escribe la dirección completa.' : '',
  };
  Object.entries(errores).forEach(([k, v]) => { if (campos[k]) marcarError(campos[k], v); });
  const malo = Object.keys(errores).find((k) => errores[k]);
  if (malo) { campos[malo].focus(); return; }
  carrito.enviando = true; carrito.error = '';
  const valores = { nombre: campos.nombre.value.trim(), tel: campos.tel.value.trim(), dir: campos.dir ? campos.dir.value.trim() : '', notas: $id('pedido-notas').value.trim() };
  pintarCarrito();
  try {
    carrito.enviado = await db.rpc('crear_pedido', {
      p_nombre: valores.nombre, p_telefono: valores.tel, p_items: itemsCarrito(),
      p_entrega: carrito.entrega, p_direccion: valores.dir, p_notas: valores.notas,
    });
    carrito.items = [];
    guardarCarrito();
    medir('pedido', { valor: carrito.enviado.total, codigo: carrito.enviado.codigo });
  } catch (err) {
    carrito.error = err instanceof TypeError ? 'Sin conexión. Inténtalo de nuevo o escríbenos por WhatsApp.' : mensajeError(err);
    if (err.message === 'SIN_STOCK') cargarCatalogo().then(() => { pintarTienda(); }).catch(() => {});
  }
  carrito.enviando = false;
  pintarCarrito();
  if (!carrito.enviado) {
    $id('pedido-nombre').value = valores.nombre; $id('pedido-tel').value = valores.tel;
    if ($id('pedido-dir')) $id('pedido-dir').value = valores.dir;
    $id('pedido-notas').value = valores.notas;
  }
  pintarTienda();
});

// ----- TARJETAS DE REGALO -----
let valorRegalo = 100000;
const formRegalo = $id('form-regalo');
formRegalo.addEventListener('click', (e) => {
  const b = e.target.closest('[data-valor]');
  if (!b) return;
  valorRegalo = Number(b.dataset.valor);
  formRegalo.querySelectorAll('[data-valor]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  $id('muestra-valor').textContent = formatoCOP(valorRegalo);
});
$id('regalo-para').addEventListener('input', (e) => { $id('muestra-para').textContent = 'Para: ' + (e.target.value.trim() || 'alguien especial'); });
formRegalo.addEventListener('submit', async (e) => {
  e.preventDefault();
  const de = $id('regalo-de'); const para = $id('regalo-para'); const tel = $id('regalo-tel');
  const errores = [[de, de.value.trim().length < 2 ? 'Escribe tu nombre.' : ''], [para, para.value.trim().length < 2 ? '¿Para quién es?' : ''],
    [tel, /^[0-9\s+()-]{7,20}$/.test(tel.value.trim()) ? '' : 'Escribe un celular válido.']];
  errores.forEach(([c, t]) => marcarError(c, t));
  const malo = errores.find(([, t]) => t);
  if (malo) { malo[0].focus(); return; }
  const aviso = $id('regalo-error');
  aviso.hidden = true;
  try {
    const t = await db.rpc('solicitar_tarjeta_regalo', { p_valor: valorRegalo, p_de: de.value.trim(), p_para: para.value.trim(), p_telefono: tel.value.trim(), p_mensaje: $id('regalo-mensaje').value.trim() });
    const msg = `Hola ${SALON.nombre}, pedí la tarjeta de regalo ${t.codigo} de ${formatoCOP(t.valor)} para ${para.value.trim()}. ¿Cómo la pago?`;
    medir('tarjeta_regalo', { valor: t.valor, codigo: t.codigo });
    formRegalo.hidden = true;
    $id('regalo-listo').hidden = false;
    $id('regalo-listo').innerHTML = `<div class="regalo-listo">
      <h3>¡Tarjeta reservada!</h3>
      <p class="codigo-reserva">Código <b>${escaparHTML(t.codigo)}</b></p>
      <p>Para activarla, págala en el salón o por transferencia / Nequi y envíanos el comprobante. Cuando la activemos, la persona puede usarla hasta el ${fechaLegible(t.vence, { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
      ${botonPagoHTML('tarjeta', t.codigo)}
      <a class="btn" target="_blank" rel="noopener" href="https://wa.me/${SALON.whatsapp}?text=${encodeURIComponent(msg)}">Coordinar el pago por WhatsApp</a></div>`;
  } catch (err) {
    aviso.textContent = err instanceof TypeError ? 'Sin conexión. Inténtalo de nuevo.' : mensajeError(err);
    aviso.hidden = false;
  }
});
$id('form-saldo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const salida = $id('saldo-resultado');
  const codigo = $id('saldo-codigo').value.trim();
  if (!codigo) return;
  try {
    const s = await db.rpc('saldo_tarjeta', { p_codigo: codigo });
    const estados = { pendiente_pago: 'pendiente de pago', activa: 'activa', agotada: 'sin saldo', anulada: 'anulada' };
    salida.textContent = `Saldo: ${formatoCOP(s.saldo)} · ${estados[s.estado] || s.estado} · vence el ${fechaLegible(s.vence, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  } catch (err) {
    salida.textContent = err instanceof TypeError ? 'Sin conexión.' : (err.message === 'NO_EXISTE' ? 'No encontramos esa tarjeta. Revisa el código.' : mensajeError(err));
  }
});

// ----- OPINIONES VERIFICADAS -----
function pintarOpiniones(lista) {
  const grid = $id('grid-opiniones');
  if (!lista.length) {
    grid.innerHTML = `<div class="opinion opinion-vacia"><p>Aún no hay opiniones publicadas en la página.</p>
      <p>Cuando termines tu cita te enviamos un enlace para contarnos cómo te fue.</p>
      ${INTEGRACIONES.googleReviewUrl ? `<a class="enlace" href="${escaparHTML(INTEGRACIONES.googleReviewUrl)}" target="_blank" rel="noopener">Ver opiniones en Google</a>` : ''}</div>`;
    return;
  }
  const promedio = lista.reduce((t, r) => t + r.estrellas, 0) / lista.length;
  $id('resumen-opiniones').textContent = `${promedio.toLocaleString('es-CO', { maximumFractionDigits: 1 })} de 5 estrellas · ${lista.length} ${lista.length === 1 ? 'opinión' : 'opiniones'} de clientas que vinieron al salón`;
  grid.innerHTML = lista.slice(0, 9).map((r) => `
    <blockquote class="opinion">
      <div class="estrellas" aria-label="${r.estrellas} de 5 estrellas">${'★'.repeat(r.estrellas)}<span class="estrella-vacia">${'★'.repeat(5 - r.estrellas)}</span></div>
      ${r.texto ? `<p>"${escaparHTML(r.texto)}"</p>` : ''}
      <footer><span class="avatar">${escaparHTML(r.nombre.split(' ').map((x) => x[0]).join('').slice(0, 2))}</span>
        <div><strong>${escaparHTML(r.nombre)}</strong><small>${escaparHTML(r.servicio)} · ${capitalizar(new Date(r.creada).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }))}</small></div></footer>
    </blockquote>`).join('');
}

// ----- UBICACIÓN -----
function pintarUbicacion() {
  $id('ubicacion-direccion').textContent = SALON.direccion;
  $id('ubicacion-horario').textContent = SALON.horario || '';
  if (SALON.horario) $id('pie-horario').textContent = SALON.horario;
  $id('como-llegar').href = SALON.lat ? `https://www.google.com/maps/search/?api=1&query=${SALON.lat},${SALON.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SALON.direccion)}`;
  $id('ubicacion-wa').href = `https://wa.me/${SALON.whatsapp}`;
}
// El mapa se carga solo si la clienta lo pide (más rápido y sin rastreo)
$id('cargar-mapa').addEventListener('click', () => {
  const d = 0.004;
  const caja = [SALON.lng - d, SALON.lat - d, SALON.lng + d, SALON.lat + d].join(',');
  $id('mapa').innerHTML = `<iframe title="Mapa: ${escaparHTML(SALON.direccion)}" loading="lazy"
    src="https://www.openstreetmap.org/export/embed.html?bbox=${caja}&layer=mapnik&marker=${SALON.lat},${SALON.lng}"></iframe>`;
});

// ----- IDIOMA (español / inglés) -----
const INGLES = {
  saltar: 'Skip to content',
  'nav.servicios': 'Services', 'nav.equipo': 'Team', 'nav.disenos': 'Nail designs', 'nav.novias': 'Brides', 'nav.tienda': 'Shop',
  'nav.regalos': 'Gift cards', 'nav.opiniones': 'Reviews', 'nav.contacto': 'Contact', 'nav.reservar': 'Book now',
  'hero.sobre': 'Beauty salon & spa · Neiva, Colombia', 'hero.titulo': 'Book your <em>moment of calm</em>',
  'hero.texto': 'Sophisticated, relaxing care. Book online and enjoy a wellness experience designed to bring out your natural beauty.',
  'hero.reservar': 'Book an appointment', 'hero.servicios': 'See services',
  'servicios.sobre': 'What we do', 'servicios.titulo': 'Our services', 'servicios.texto': 'Prices in Colombian pesos. Pick one to start your booking.',
  'equipo.sobre': 'Choose your stylist', 'equipo.titulo': 'Our team', 'equipo.texto': 'See which days each professional works, their next free slot and how long each service takes.',
  'disenos.titulo': 'Nail design catalog', 'disenos.texto': 'Curated styles for an elegant, modern manicure · Lasts 20 to 25 days',
  'reservar.sobre': 'Online booking', 'reservar.titulo': 'Complete your booking', 'reservar.texto': 'Choose your service, professional and date, and add products if you like. (Booking steps are in Spanish.)',
  'trabajos.sobre': 'Made at the salon', 'trabajos.titulo': 'Our work', 'trabajos.texto': 'Real photos of our clients. Tap a photo to enlarge it; slide to compare before and after.',
  'novias.sobre': 'Weddings, quinceañeras and graduations', 'novias.titulo': 'Your special day, <em>unhurried</em>',
  'novias.texto': 'We get the bride and her party ready with time to spare, at the salon or at home in Neiva. It all starts with a makeup trial.',
  'novias.p1': 'Makeup trial', 'novias.p1t': 'We try the look, hairstyle and shades using your reference photos.',
  'novias.p2': 'Day plan', 'novias.p2t': 'We schedule everyone in the party so nobody is late.',
  'novias.p3': 'The big day', 'novias.p3t': 'Long-lasting makeup, hairstyle and a touch-up kit for the party.',
  'novias.reservar': 'Book a makeup trial', 'novias.cotizar': 'Get a wedding quote on WhatsApp',
  'tienda.sobre': 'For your routine at home', 'tienda.titulo': 'Shop', 'tienda.texto': 'Reserve your products and pick them up at the salon, or get delivery in Neiva. Pay on delivery.',
  'regalos.sobre': 'Give the gift of wellness', 'regalos.titulo': 'Gift cards',
  'regalos.texto': 'Valid for any service or product for one year. The card is activated once you pay at the salon or by bank transfer.',
  'regalos.de': 'From (your name)', 'regalos.para': 'To', 'regalos.tel': 'Your mobile / WhatsApp', 'regalos.mensaje': 'Message (optional)',
  'regalos.pedir': 'Request gift card', 'regalos.saldo': 'Check a gift card balance',
  'opiniones.sobre': 'Verified reviews', 'opiniones.titulo': 'What our clients say', 'opiniones.texto': 'Only clients who visited the salon can leave a review.',
  'consejos.sobre': 'Blog', 'consejos.titulo': 'Beauty tips (in Spanish)',
  'preguntas.sobre': 'Before you come', 'preguntas.titulo': 'Frequently asked questions (in Spanish)',
  'ubicacion.sobre': 'Getting here', 'ubicacion.titulo': 'Visit us', 'ubicacion.llegar': 'Open in Google Maps', 'ubicacion.mapa': 'Show map',
  'pie.horario': 'Opening hours', 'pie.domingo': 'Sundays and holidays: closed', 'pie.enlaces': 'Links', 'pie.miscitas': 'My appointments',
  'pie.preguntas': 'FAQ', 'pie.consejos': 'Beauty tips', 'pie.equipo': 'Staff login', 'pie.privacidad': 'Privacy policy', 'pie.terminos': 'Terms and conditions',
};
const CLAVE_IDIOMA = 'neivaBelleza.idioma';
const ORIGINAL = new Map();
function aplicarIdioma(idioma) {
  document.querySelectorAll('[data-i18n], [data-i18n-html]').forEach((el) => {
    const clave = el.dataset.i18n || el.dataset.i18nHtml;
    const html = Boolean(el.dataset.i18nHtml);
    if (!ORIGINAL.has(el)) ORIGINAL.set(el, html ? el.innerHTML : el.textContent);
    const texto = idioma === 'en' && INGLES[clave] ? INGLES[clave] : ORIGINAL.get(el);
    if (html) el.innerHTML = texto; else el.textContent = texto;
  });
  document.documentElement.lang = idioma === 'en' ? 'en' : 'es';
  const b = $id('boton-idioma');
  b.textContent = idioma === 'en' ? 'ES' : 'EN';
  b.setAttribute('aria-label', idioma === 'en' ? 'Cambiar a español' : 'Change language to English');
  b.title = idioma === 'en' ? 'Español' : 'English';
  guardarLocal(CLAVE_IDIOMA, idioma);
}
$id('boton-idioma').addEventListener('click', () => aplicarIdioma(document.documentElement.lang === 'en' ? 'es' : 'en'));

// ----- PAGO EN LÍNEA (Wompi: Nequi, PSE, tarjeta) -----
// Solo aparece cuando las llaves de Wompi están guardadas en el servidor.
const SERVIDOR = { wompi: false, whatsapp: false, asistente: false };
function botonPagoHTML(tipo, codigo) {
  if (!SERVIDOR.wompi) return '<p class="nota-enlace"><span class="pendiente-conectar">Pago en línea con Nequi, PSE o tarjeta: pendiente de conectar</span></p>';
  return `<button type="button" class="btn btn-ancho" data-pagar="${tipo}" data-codigo="${escaparHTML(codigo)}">Pagar en línea · Nequi, PSE o tarjeta</button>
    <p class="error-general" data-error-pago hidden></p>`;
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-pagar]');
  if (!b) return;
  b.disabled = true; b.textContent = 'Abriendo Wompi…';
  try {
    const volver = location.href.split(/[?#]/)[0] + '?pago=' + b.dataset.pagar;
    const r = await funcionServidor('/wompi/firma', { tipo: b.dataset.pagar, codigo: b.dataset.codigo, volver });
    location.href = r.url;
  } catch (err) {
    const aviso = b.parentElement.querySelector('[data-error-pago]');
    aviso.textContent = err instanceof TypeError ? 'Sin conexión.' : mensajeError(err);
    aviso.hidden = false;
    b.disabled = false; b.textContent = 'Pagar en línea · Nequi, PSE o tarjeta';
  }
});
// Al volver de Wompi (trae ?pago=…&id=transacción)
(() => {
  const p = new URLSearchParams(location.search);
  if (!p.get('pago') || !p.get('id')) return;
  const aviso = document.createElement('div');
  aviso.className = 'aviso-pago';
  aviso.setAttribute('role', 'status');
  aviso.innerHTML = `<strong>Recibimos tu pago.</strong> Wompi lo confirma en unos minutos y te avisamos por WhatsApp. Referencia: ${escaparHTML(p.get('id'))}
    <button type="button" aria-label="Cerrar">✕</button>`;
  aviso.querySelector('button').onclick = () => aviso.remove();
  document.body.prepend(aviso);
  history.replaceState(null, '', location.pathname + location.hash);
})();

// ----- MEDICIÓN (Google Analytics y píxel de Meta) -----
// Se cargan solo si la dueña puso sus códigos en el panel. Sin códigos no se carga nada de terceros.
let medicionLista = false;
function activarMedicion() {
  if (medicionLista) return;
  medicionLista = true;
  const ga = /^G-[A-Z0-9]{4,}$/.test(INTEGRACIONES.googleAnalyticsId || '') ? INTEGRACIONES.googleAnalyticsId : '';
  const pixel = /^\d{6,20}$/.test(INTEGRACIONES.metaPixelId || '') ? INTEGRACIONES.metaPixelId : '';
  if (ga) {
    const s = document.createElement('script');
    s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${ga}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', ga);
  }
  if (pixel) {
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', pixel);
    window.fbq('track', 'PageView');
  }
}
function medir(evento, datos = {}) {
  if (window.gtag) window.gtag('event', evento, { value: datos.valor, currency: 'COP', transaction_id: datos.codigo });
  if (window.fbq) {
    const meta = { reserva: 'Schedule', pedido: 'Purchase', tarjeta_regalo: 'Purchase' }[evento];
    if (meta) window.fbq('track', meta, { value: datos.valor, currency: 'COP' });
  }
}
window.addEventListener('neiva:reserva', (e) => medir('reserva', e.detail));

// ----- ASISTENTE VIRTUAL -----
const chat = { mensajes: [], enviando: false };
function montarAsistente() {
  if ($id('asistente-boton') || !(INTEGRACIONES.asistenteActivo && SERVIDOR.asistente)) return;
  const boton = document.createElement('button');
  boton.id = 'asistente-boton'; boton.type = 'button'; boton.className = 'asistente-boton';
  boton.setAttribute('aria-label', 'Preguntarle a la asistente virtual');
  boton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/></svg>';
  const panelChat = document.createElement('section');
  panelChat.id = 'asistente'; panelChat.className = 'asistente'; panelChat.hidden = true;
  panelChat.setAttribute('aria-label', 'Asistente virtual');
  panelChat.innerHTML = `<header><strong>Asistente de ${escaparHTML(SALON.nombre)}</strong><small>Responde con los precios y horarios reales · puede equivocarse</small>
      <button type="button" data-cerrar-chat aria-label="Cerrar">✕</button></header>
    <div class="asistente-mensajes" id="asistente-mensajes" aria-live="polite"><p class="msj asistente-msj">¡Hola! ¿En qué te ayudo? Pregúntame por precios, duración de servicios o quién trabaja qué día.</p></div>
    <form id="asistente-form"><input id="asistente-texto" maxlength="500" placeholder="Escribe tu pregunta" aria-label="Tu pregunta" autocomplete="off"><button class="btn btn-pequeno" type="submit">Enviar</button></form>`;
  document.body.append(boton, panelChat);
  boton.onclick = () => { panelChat.hidden = !panelChat.hidden; if (!panelChat.hidden) $id('asistente-texto').focus(); };
  panelChat.querySelector('[data-cerrar-chat]').onclick = () => { panelChat.hidden = true; boton.focus(); };
  $id('asistente-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const entrada = $id('asistente-texto');
    const texto = entrada.value.trim();
    if (!texto || chat.enviando) return;
    chat.mensajes.push({ role: 'user', content: texto });
    entrada.value = '';
    pintarChat(true);
    chat.enviando = true;
    try {
      // Al servidor solo va la conversación, sin los avisos de error
      const r = await funcionServidor('/asistente', { mensajes: chat.mensajes.filter((m) => !m.error).map(({ role, content }) => ({ role, content })) });
      chat.mensajes.push({ role: 'assistant', content: r.respuesta });
    } catch (err) {
      chat.mensajes.push({ role: 'assistant', content: err instanceof TypeError ? 'No hay conexión. Escríbenos por WhatsApp.' : mensajeError(err), error: true });
    }
    chat.enviando = false;
    pintarChat(false);
  });
}
function pintarChat(escribiendo) {
  const caja = $id('asistente-mensajes');
  caja.innerHTML = '<p class="msj asistente-msj">¡Hola! ¿En qué te ayudo? Pregúntame por precios, duración de servicios o quién trabaja qué día.</p>'
    + chat.mensajes.map((m) => `<p class="msj ${m.role === 'user' ? 'usuaria-msj' : 'asistente-msj'}">${escaparHTML(m.content)}</p>`).join('')
    + (escribiendo ? '<p class="msj asistente-msj escribiendo">Escribiendo…</p>' : '');
  caja.scrollTop = caja.scrollHeight;
}

// ----- ARRANQUE -----
function pintarExtras() {
  pintarNovias();
  pintarTienda();
  pintarUbicacion();
  if (!fotosGaleria.length || fotosGaleria.respaldo) { fotosGaleria = galeriaDeRespaldo(); fotosGaleria.respaldo = true; }
  pintarGaleria();
}
guardarCarrito();
pintarExtras();
pintarOpiniones([]);
if (leerLocal(CLAVE_IDIOMA, 'es') === 'en') aplicarIdioma('en');

(async () => {
  // Espera a que script.js termine de cargar el catálogo
  for (let i = 0; i < 100 && !ESTADO_CONEXION.cargado; i++) await new Promise((r) => setTimeout(r, 50));
  pintarExtras();
  activarMedicion();
  try {
    Object.assign(SERVIDOR, await funcionServidor('/estado', null, 'GET'));
    montarAsistente();
  } catch (e) { /* sin servidor: todo queda "pendiente de conectar" */ }
  try {
    const [fotos, resenas] = await Promise.all([
      db.leer('galeria', 'select=*&visible=eq.true&order=orden,creada.desc&limit=24'),
      db.leer('resenas', 'select=nombre,servicio,estrellas,texto,creada&aprobada=eq.true&order=creada.desc&limit=30'),
    ]);
    if (fotos.length) { fotosGaleria = fotos; pintarGaleria(); }
    pintarOpiniones(resenas);
  } catch (e) { /* sin conexión: se quedan las fotos del catálogo */ }
})();
