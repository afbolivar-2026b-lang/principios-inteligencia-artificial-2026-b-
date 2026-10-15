// ===== PANEL: tienda, cupones, reseñas, tarjetas de regalo y galería =====
// Se agregan al menú del panel (admin.js) sin cambiar las secciones existentes.

Object.assign(ICONOS_MENU, {
  pedidos: '<path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  cupones: '<path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z"/><path d="M10 7v10" stroke-dasharray="2 2"/>',
  resenas: '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z"/>',
  regalos: '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M12 8c-2-4-6-4-6-1.5S10 8 12 8c2 0 6 1 6-1.5S14 4 12 8z"/>',
  galeria: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>',
});
SECCIONES.splice(SECCIONES.findIndex((s) => s.id === 'espera') + 1, 0,
  { id: 'pedidos', nombre: 'Pedidos de la tienda', roles: ['duena', 'recepcion'] },
  { id: 'regalos', nombre: 'Tarjetas de regalo', roles: ['duena', 'recepcion'] },
  { id: 'resenas', nombre: 'Reseñas', roles: ['duena', 'recepcion'] },
  { id: 'galeria', nombre: 'Galería de trabajos', roles: ['duena', 'recepcion', 'estilista'] });
SECCIONES.splice(SECCIONES.findIndex((s) => s.id === 'catalogo') + 1, 0,
  { id: 'cupones', nombre: 'Cupones', roles: ['duena'] });

const fechaCorta = (iso) => `${fechaLegible(fechaHoraColombia(iso).fecha, { day: 'numeric', month: 'short' })} ${horaDe(iso)}`;

// ----- PEDIDOS DE LA TIENDA -----
const ESTADOS_PEDIDO = { nuevo: ['Nuevo', 'estado-pendiente'], listo: ['Listo', 'estado-llego'], entregado: ['Entregado', 'estado-confirmada'], cancelado: ['Cancelado', 'estado-cancelada'] };
VISTAS.pedidos = async (vista) => {
  const lista = await db.leer('pedidos', 'select=*&order=creada.desc&limit=60');
  const abiertos = lista.filter((p) => ['nuevo', 'listo'].includes(p.estado));
  vista.innerHTML = `<header class="cabecera-vista"><div><h1>Pedidos de la tienda</h1>
      <p>${abiertos.length} por atender · al marcar "Entregado" se descuenta el inventario.</p></div></header>
    <section class="tarjeta-admin">${lista.length ? `<div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Pedido</th><th>Clienta</th><th>Productos</th><th class="num">Total</th><th>Estado</th><th></th></tr></thead>
      <tbody>${lista.map((p) => {
        const [t, c] = ESTADOS_PEDIDO[p.estado];
        const listoMsg = `Hola ${p.nombre.split(' ')[0]}, tu pedido ${p.codigo} de ${SALON.nombre} está listo${p.entrega === 'recoger' ? ' para recoger en el salón' : ' y va en camino'}. Total: ${formatoCOP(p.total)}.`;
        return `<tr style="${['entregado', 'cancelado'].includes(p.estado) ? 'opacity:.6' : ''}">
          <td><strong>${esc(p.codigo)}</strong><small>${fechaCorta(p.creada)}</small></td>
          <td><strong>${esc(p.nombre)}</strong><small>${esc(p.telefono)} · ${p.entrega === 'domicilio' ? 'Domicilio: ' + esc(p.direccion) : 'Recoge en el salón'}</small>${p.notas ? `<small>“${esc(p.notas)}”</small>` : ''}</td>
          <td>${p.items.map((i) => `${esc(i.nombre)} ×${i.cantidad}`).join('<br>')}</td>
          <td class="num">${formatoCOP(p.total)}</td>
          <td><span class="estado ${c}">${t}</span></td>
          <td><div class="fila-botones">
            <a class="boton-mini" target="_blank" rel="noopener" href="${enlaceWA(p.telefono, listoMsg)}">WhatsApp</a>
            ${p.estado === 'nuevo' ? `<button class="boton-mini" data-pedido="${p.id}" data-estado-pedido="listo">Listo</button>` : ''}
            ${['nuevo', 'listo'].includes(p.estado) ? `<button class="boton-mini ok" data-pedido="${p.id}" data-estado-pedido="entregado">Entregado</button>
              <button class="boton-mini peligro" data-pedido="${p.id}" data-estado-pedido="cancelado">Cancelar</button>` : ''}
          </div></td></tr>`;
      }).join('')}</tbody></table></div>` : '<p class="vacio">Todavía no hay pedidos desde la página.</p>'}</section>`;
  vista.querySelectorAll('[data-estado-pedido]').forEach((b) => b.onclick = async () => {
    await intentar(() => db.actualizar('pedidos', `id=eq.${b.dataset.pedido}`, { estado: b.dataset.estadoPedido }), `Pedido marcado como "${ESTADOS_PEDIDO[b.dataset.estadoPedido][0]}".`);
    if (b.dataset.estadoPedido === 'entregado') await cargarCatalogo().catch(() => {});
    refrescar();
  });
};

// ----- TARJETAS DE REGALO -----
const ESTADOS_TARJETA = { pendiente_pago: ['Pendiente de pago', 'estado-pendiente'], activa: ['Activa', 'estado-confirmada'], agotada: ['Sin saldo', 'estado-cancelada'], anulada: ['Anulada', 'estado-cancelada'] };
VISTAS.regalos = async (vista) => {
  const lista = await db.leer('tarjetas_regalo', 'select=*&order=creada.desc&limit=80');
  vista.innerHTML = `<header class="cabecera-vista"><div><h1>Tarjetas de regalo</h1><p>Actívala cuando la clienta pague. Para cobrar con una tarjeta usa "Bono" en la caja.</p></div>
      <div class="acciones-vista"><button class="btn btn-pequeno" data-vender-tarjeta>+ Vender tarjeta en el salón</button></div></header>
    <section class="tarjeta-admin">${lista.length ? `<div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Código</th><th>De → Para</th><th class="num">Valor</th><th class="num">Saldo</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
      <tbody>${lista.map((t) => {
        const [e, c] = ESTADOS_TARJETA[t.estado];
        return `<tr><td><strong>${esc(t.codigo)}</strong><small>${fechaCorta(t.creada)}</small></td>
          <td>${esc(t.de)} → <strong>${esc(t.para)}</strong><small>${esc(t.telefono)}${t.mensaje ? ' · “' + esc(t.mensaje) + '”' : ''}</small></td>
          <td class="num">${formatoCOP(t.valor_inicial)}</td><td class="num">${formatoCOP(t.saldo)}</td>
          <td>${fechaLegible(t.vence, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
          <td><span class="estado ${c}">${e}</span></td>
          <td><div class="fila-botones">${t.estado === 'pendiente_pago' ? `<button class="boton-mini ok" data-activar="${t.codigo}">Pagada: activar</button>` : ''}
            ${t.estado === 'activa' ? `<a class="boton-mini" target="_blank" rel="noopener" href="${enlaceWA(t.telefono, `¡Tu tarjeta de regalo de ${SALON.nombre} está activa! Código ${t.codigo} por ${formatoCOP(t.saldo)} para ${t.para}. Válida hasta el ${fechaLegible(t.vence, { day: 'numeric', month: 'long', year: 'numeric' })}.`)}">Enviar código</a>` : ''}
            ${['pendiente_pago', 'activa'].includes(t.estado) && esDuena() ? `<button class="boton-mini peligro" data-anular-tarjeta="${t.codigo}">Anular</button>` : ''}</div></td></tr>`;
      }).join('')}</tbody></table></div>` : '<p class="vacio">No hay tarjetas de regalo todavía.</p>'}</section>`;
  vista.querySelectorAll('[data-activar]').forEach((b) => b.onclick = async () => {
    await intentar(() => db.actualizar('tarjetas_regalo', `codigo=eq.${b.dataset.activar}`, { estado: 'activa' }), 'Tarjeta activada.');
    refrescar();
  });
  vista.querySelectorAll('[data-anular-tarjeta]').forEach((b) => b.onclick = async () => {
    if (!confirm('¿Anular esta tarjeta? Ya no se podrá usar.')) return;
    await intentar(() => db.actualizar('tarjetas_regalo', `codigo=eq.${b.dataset.anularTarjeta}`, { estado: 'anulada' }), 'Tarjeta anulada.');
    refrescar();
  });
  vista.querySelector('[data-vender-tarjeta]').onclick = () => {
    abrirModal('Vender tarjeta de regalo', `
      <div class="form-grid">
        <div class="campo"><label for="tr-valor">Valor</label><input id="tr-valor" type="number" min="20000" step="10000" value="100000"></div>
        <div class="campo"><label for="tr-tel">Celular de quien compra</label><input id="tr-tel" type="tel" maxlength="20"></div>
        <div class="campo"><label for="tr-de">De</label><input id="tr-de" maxlength="60"></div>
        <div class="campo"><label for="tr-para">Para</label><input id="tr-para" maxlength="60"></div>
        <div class="campo ancho"><label for="tr-msg">Mensaje</label><input id="tr-msg" maxlength="200"></div>
      </div><p class="nota-enlace">Queda activa de una vez (pagada en el salón). Registra el pago en la caja.</p>`,
    '<button class="btn" data-guardar>Crear y activar</button>');
    $('modal-contenido').querySelector('[data-guardar]').onclick = async () => {
      const t = await intentar(() => db.rpc('solicitar_tarjeta_regalo', {
        p_valor: Number($('tr-valor').value), p_de: $('tr-de').value, p_para: $('tr-para').value, p_telefono: $('tr-tel').value, p_mensaje: $('tr-msg').value,
      })).catch(() => null);
      if (!t) return;
      await intentar(() => db.actualizar('tarjetas_regalo', `codigo=eq.${t.codigo}`, { estado: 'activa' }), `Tarjeta ${t.codigo} creada y activa.`);
      cerrarModal(); refrescar();
    };
  };
};

// ----- RESEÑAS -----
VISTAS.resenas = async (vista) => {
  const lista = await db.leer('resenas', 'select=*&order=creada.desc&limit=100');
  const pendientes = lista.filter((r) => !r.aprobada);
  const promedio = lista.length ? (lista.reduce((t, r) => t + r.estrellas, 0) / lista.length).toLocaleString('es-CO', { maximumFractionDigits: 1 }) : '—';
  const fila = (r) => `<tr><td><span class="estrellas-panel" aria-label="${r.estrellas} de 5">${'★'.repeat(r.estrellas)}<span>${'★'.repeat(5 - r.estrellas)}</span></span>
      <strong>${esc(r.nombre)}</strong><small>${esc(r.servicio)} · ${r.profesional_id ? esc(nombreProfesional(r.profesional_id)) + ' · ' : ''}${fechaCorta(r.creada)}</small></td>
    <td>${r.texto ? esc(r.texto) : '<span class="vacio" style="padding:0">Sin comentario</span>'}</td>
    <td><div class="fila-botones">${r.aprobada ? `<button class="boton-mini" data-ocultar="${r.id}">Ocultar</button>` : `<button class="boton-mini ok" data-publicar="${r.id}">Publicar</button>`}
      ${esAdmin() ? `<button class="boton-mini peligro" data-borrar-resena="${r.id}">Borrar</button>` : ''}</div></td></tr>`;
  vista.innerHTML = `<header class="cabecera-vista"><div><h1>Reseñas</h1><p>Solo pueden opinar clientas con una cita terminada. Tú decides cuáles se publican.</p></div></header>
    <section class="kpis"><article class="kpi"><small>Promedio</small><strong>${promedio} ★</strong><span class="detalle">${lista.length} reseñas</span></article>
      <article class="kpi"><small>Por revisar</small><strong>${pendientes.length}</strong><span class="detalle ${pendientes.length ? 'alerta' : 'positivo'}">${pendientes.length ? 'esperan tu aprobación' : 'Todo revisado'}</span></article></section>
    <section class="tarjeta-admin">${lista.length ? `<div class="tabla-scroll"><table class="tabla"><tbody>${[...pendientes, ...lista.filter((r) => r.aprobada)].map(fila).join('')}</tbody></table></div>`
      : '<p class="vacio">Aún no hay reseñas. En el detalle de una cita terminada usa "Pedir reseña por WhatsApp".</p>'}</section>`;
  const cambiar = (id, aprobada, texto) => intentar(() => db.actualizar('resenas', `id=eq.${id}`, { aprobada }), texto).then(refrescar).catch(() => {});
  vista.querySelectorAll('[data-publicar]').forEach((b) => b.onclick = () => cambiar(b.dataset.publicar, true, 'Reseña publicada en la página.'));
  vista.querySelectorAll('[data-ocultar]').forEach((b) => b.onclick = () => cambiar(b.dataset.ocultar, false, 'Reseña oculta.'));
  vista.querySelectorAll('[data-borrar-resena]').forEach((b) => b.onclick = async () => {
    if (!confirm('¿Borrar esta reseña?')) return;
    await intentar(() => db.borrar('resenas', `id=eq.${b.dataset.borrarResena}`), 'Reseña borrada.');
    refrescar();
  });
};

// ----- CUPONES -----
VISTAS.cupones = async (vista) => {
  const lista = await db.leer('cupones', 'select=*&order=creada.desc');
  vista.innerHTML = `<header class="cabecera-vista"><div><h1>Cupones</h1>
      <p>La clienta escribe el código al reservar. También puedes compartir el enlace: la página lo llena sola.</p></div></header>
    <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Nuevo cupón</h2></div></div>
      <div class="form-grid">
        <div class="campo"><label for="cu-codigo">Código (letras y números)</label><input id="cu-codigo" maxlength="20" placeholder="MAYO15" style="text-transform:uppercase"></div>
        <div class="campo"><label for="cu-desc">Descripción que ve la clienta</label><input id="cu-desc" maxlength="80" placeholder="15% en todos los servicios"></div>
        <div class="campo"><label for="cu-tipo">Tipo</label><select id="cu-tipo"><option value="porcentaje">Porcentaje (%)</option><option value="valor">Valor fijo ($)</option></select></div>
        <div class="campo"><label for="cu-valor">Descuento</label><input id="cu-valor" type="number" min="1" value="10"></div>
        <div class="campo"><label for="cu-minimo">Compra mínima ($)</label><input id="cu-minimo" type="number" min="0" step="1000" value="0"></div>
        <div class="campo"><label for="cu-usos">Máximo de usos (vacío = sin límite)</label><input id="cu-usos" type="number" min="1"></div>
        <div class="campo"><label for="cu-desde">Válido desde</label><input id="cu-desde" type="date"></div>
        <div class="campo"><label for="cu-hasta">Válido hasta</label><input id="cu-hasta" type="date"></div>
      </div>
      <button class="btn btn-pequeno" data-crear-cupon>Crear cupón</button></section>
    <section class="tarjeta-admin">${lista.length ? `<div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Código</th><th>Descuento</th><th>Vigencia</th><th class="num">Usos</th><th>Activo</th><th></th></tr></thead>
      <tbody>${lista.map((c) => `<tr style="${c.activo ? '' : 'opacity:.55'}"><td><strong>${esc(c.codigo)}</strong><small>${esc(c.descripcion)}</small></td>
        <td>${c.tipo === 'porcentaje' ? c.valor + '%' : formatoCOP(c.valor)}${c.minimo ? `<small>desde ${formatoCOP(c.minimo)}</small>` : ''}</td>
        <td>${c.desde || c.hasta ? `${c.desde ? fechaLegible(c.desde, { day: 'numeric', month: 'short' }) : '…'} – ${c.hasta ? fechaLegible(c.hasta, { day: 'numeric', month: 'short' }) : '…'}` : 'Siempre'}</td>
        <td class="num">${c.usos}${c.usos_max ? ' / ' + c.usos_max : ''}</td>
        <td>${c.activo ? 'Sí' : 'No'}</td>
        <td><div class="fila-botones"><button class="boton-mini" data-copiar="${esc(c.codigo)}">Copiar enlace</button>
          <button class="boton-mini ${c.activo ? 'peligro' : 'ok'}" data-activo="${esc(c.codigo)}" data-valor="${!c.activo}">${c.activo ? 'Pausar' : 'Activar'}</button></div></td></tr>`).join('')}</tbody></table></div>`
      : '<p class="vacio">No hay cupones.</p>'}</section>`;
  vista.querySelector('[data-crear-cupon]').onclick = async () => {
    const codigo = $('cu-codigo').value.trim().toUpperCase();
    const valor = Number($('cu-valor').value);
    if (!/^[A-Z0-9]{3,20}$/.test(codigo)) { toast('El código debe tener de 3 a 20 letras o números, sin espacios.', true); return; }
    if (!valor || ($('cu-tipo').value === 'porcentaje' && valor > 100)) { toast('Revisa el valor del descuento.', true); return; }
    await intentar(() => db.insertar('cupones', {
      codigo, descripcion: $('cu-desc').value.trim(), tipo: $('cu-tipo').value, valor, minimo: Number($('cu-minimo').value) || 0,
      usos_max: Number($('cu-usos').value) || null, desde: $('cu-desde').value || null, hasta: $('cu-hasta').value || null,
    }), `Cupón ${codigo} creado.`).catch(() => {});
    refrescar();
  };
  vista.querySelectorAll('[data-activo]').forEach((b) => b.onclick = async () => {
    await intentar(() => db.actualizar('cupones', `codigo=eq.${encodeURIComponent(b.dataset.activo)}`, { activo: b.dataset.valor === 'true' }), 'Guardado.').catch(() => {});
    refrescar();
  });
  vista.querySelectorAll('[data-copiar]').forEach((b) => b.onclick = async () => {
    const enlace = `${urlBase()}index.html?cupon=${encodeURIComponent(b.dataset.copiar)}#reservar`;
    try { await navigator.clipboard.writeText(enlace); toast('Enlace copiado: pégalo en Instagram o WhatsApp.'); } catch (e) { prompt('Copia este enlace:', enlace); }
  });
};

// ----- GALERÍA DE TRABAJOS -----
VISTAS.galeria = async (vista) => {
  const lista = await db.leer('galeria', 'select=*&order=orden,creada.desc');
  vista.innerHTML = `<header class="cabecera-vista"><div><h1>Galería de trabajos</h1><p>Fotos reales que aparecen en la página. Pide permiso a la clienta antes de subir su foto.</p></div></header>
    <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Subir foto</h2><small>JPG, PNG o WEBP de máximo 5 MB. La foto "antes" es opcional.</small></div></div>
      <div class="form-grid">
        <div class="campo"><label for="ga-foto">Foto del resultado</label><input id="ga-foto" type="file" accept="image/jpeg,image/png,image/webp"></div>
        <div class="campo"><label for="ga-antes">Foto de antes (opcional)</label><input id="ga-antes" type="file" accept="image/jpeg,image/png,image/webp"></div>
        <div class="campo"><label for="ga-titulo">Título</label><input id="ga-titulo" maxlength="60" placeholder="Balayage miel"></div>
        <div class="campo"><label for="ga-cat">Categoría</label><select id="ga-cat"><option value="unas">Uñas</option><option value="cabello">Cabello</option><option value="maquillaje">Maquillaje</option><option value="spa">Spa</option></select></div>
      </div>
      <button class="btn btn-pequeno" data-subir>Subir a la página</button></section>
    <section class="tarjeta-admin">${lista.length ? `<div class="galeria-panel">${lista.map((f) => `<figure style="${f.visible ? '' : 'opacity:.5'}">
        <img src="${esc(urlFotoGaleria(f.foto))}" alt="${esc(f.titulo)}" loading="lazy">
        <figcaption><strong>${esc(f.titulo || 'Sin título')}</strong><small>${f.foto_antes ? 'Con antes y después · ' : ''}${f.profesional_id ? esc(nombreProfesional(f.profesional_id)) : ''}</small>
          <div class="fila-botones"><button class="boton-mini" data-visible="${f.id}" data-valor="${!f.visible}">${f.visible ? 'Ocultar' : 'Mostrar'}</button>
          ${esAdmin() ? `<button class="boton-mini peligro" data-quitar-foto="${f.id}">Quitar</button>` : ''}</div></figcaption></figure>`).join('')}</div>`
      : '<p class="vacio">Aún no hay fotos. Mientras tanto la página muestra las fotos del catálogo de diseños.</p>'}</section>`;
  vista.querySelector('[data-subir]').onclick = async (e) => {
    const foto = $('ga-foto').files[0];
    const antes = $('ga-antes').files[0];
    if (!foto) { toast('Elige la foto del resultado.', true); return; }
    if ([foto, antes].some((f) => f && f.size > 5 * 1024 * 1024)) { toast('Cada foto debe pesar menos de 5 MB.', true); return; }
    e.target.disabled = true; e.target.textContent = 'Subiendo…';
    try {
      const ruta = await intentar(() => subirArchivo('galeria', foto));
      const rutaAntes = antes ? await intentar(() => subirArchivo('galeria', antes)) : null;
      await intentar(() => db.insertar('galeria', {
        foto: ruta, foto_antes: rutaAntes, titulo: $('ga-titulo').value.trim(), categoria: $('ga-cat').value,
        profesional_id: sesion.perfil.profesional_id || null,
      }), 'Foto publicada en la página.');
    } catch (err) { /* el aviso ya se mostró */ }
    refrescar();
  };
  vista.querySelectorAll('[data-visible]').forEach((b) => b.onclick = async () => {
    await intentar(() => db.actualizar('galeria', `id=eq.${b.dataset.visible}`, { visible: b.dataset.valor === 'true' }), 'Guardado.').catch(() => {});
    refrescar();
  });
  vista.querySelectorAll('[data-quitar-foto]').forEach((b) => b.onclick = async () => {
    if (!confirm('¿Quitar esta foto de la página?')) return;
    await intentar(() => db.borrar('galeria', `id=eq.${b.dataset.quitarFoto}`), 'Foto quitada.').catch(() => {});
    refrescar();
  });
};
function urlFotoGaleria(ruta) {
  return /^(https?:|img\/)/.test(ruta) ? ruta : `${SUPABASE.url}/storage/v1/object/public/galeria/${encodeURI(ruta)}`;
}
