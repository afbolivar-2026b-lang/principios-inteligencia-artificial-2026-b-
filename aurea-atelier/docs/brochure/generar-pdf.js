/* Genera la presentación en PDF (A4 horizontal) a partir de las capturas en docs/capturas.
   Uso: node docs/brochure/generar-pdf.js  (requiere Playwright) */
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const DIR = __dirname;
const FUNCIONES = JSON.parse(fs.readFileSync(path.join(DIR, 'funciones.json'), 'utf8'));
const TOTAL = Object.values(FUNCIONES).reduce((s, l) => s + l.length, 0);
const img = (n) => `../capturas/${n}.png`;
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const LOGO = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
  <defs><linearGradient id="g${size}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1dca6"/><stop offset=".55" stop-color="#c9a45c"/><stop offset="1" stop-color="#8f6a2b"/></linearGradient></defs>
  <circle cx="32" cy="32" r="30" fill="none" stroke="url(#g${size})" stroke-width="1.2"/>
  <circle cx="32" cy="32" r="26.5" fill="none" stroke="url(#g${size})" stroke-width=".6" stroke-dasharray="1.6 2.4"/>
  <path d="M32 12 L18 50" stroke="url(#g${size})" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M32 12 L46 50" stroke="url(#g${size})" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M22.5 37 H41.5" stroke="url(#g${size})" stroke-width="1.4" stroke-dasharray="2.4 2" stroke-linecap="round"/>
  <circle cx="32" cy="12" r="2.6" fill="url(#g${size})"/>
  <g fill="url(#g${size})"><circle cx="30.6" cy="27.4" r=".9"/><circle cx="33.4" cy="27.4" r=".9"/><circle cx="30.6" cy="30.2" r=".9"/><circle cx="33.4" cy="30.2" r=".9"/></g></svg>`;

/* Cada sección: número, título, texto, imagen principal, imagen secundaria opcional y puntos clave. */
const S = [
  ['Panel principal', 'Al entrar, la dueña ve el estado completo del negocio en una sola pantalla: cuánto se vendió hoy y en el mes, cuánto le deben, cuánta tela hay en bodega, qué hay en el taller y qué necesita atención.', '02-panel', null,
    ['Ventas del día y recaudo', 'Ventas del mes frente al mes anterior', 'Cartera por cobrar y vencida', 'Gráfica de ventas de 12 meses', 'Agenda del día y mensajes sin responder', 'Alertas de tela, stock e insumos']],
  ['Salón de ventas', 'Para vender en el mostrador: se toca la prenda, se elige la talla y el sistema pone el precio correcto. Si el cliente es mayorista o lleva la cantidad mínima, aplica el precio por mayor automáticamente.', '03-pos', null,
    ['Catálogo visual por categoría', 'Precio mayorista automático', 'Descuento fijo del cliente', 'Efectivo, transferencia, Nequi, Daviplata, tarjeta o crédito', 'Factura inmediata y descuento del inventario por talla', 'Guardar la venta como cotización']],
  ['Catálogo visual', 'Un catálogo elegante, organizado por colecciones, para mostrar en tableta o celular. Cada prenda tiene su ficha con tallas disponibles, precios al detal y por mayor, y se le puede subir la foto real tomada con el celular.', '04-catalogo', '30-ficha-prenda',
    ['Colecciones: Dotación, Ejecutiva, Resort, Bioseguridad, Marca propia', 'Sellos de más vendido, últimas unidades y agotado', 'Fotos reales de las prendas', 'Ficha con tallas, costo, margen y kardex', 'Pedido armado desde el catálogo', 'Ficha lista para enviar por WhatsApp']],
  ['Vista para cliente y lista de precios', 'Con un botón el catálogo cambia a vista para cliente: oculta costos, márgenes y cantidades exactas, para mostrarlo sin preocupación. La lista de precios sale lista para copiar en WhatsApp o exportar a Excel.', '31-catalogo-cliente', '32-lista-precios',
    ['Vista segura para mostrar al cliente', 'Lista de precios detal y mayor', 'Copiar lista para WhatsApp', 'Exportar a Excel', 'Pedido convertido en cotización', 'Pedido enviado al salón de ventas']],
  ['Probador 3D', 'Al elegir una prenda se abre el probador: la foto de estudio se convierte en una pieza con relieve que gira sola y se mueve con el dedo o el mouse. La luz sigue el movimiento y deja ver los pliegues y el volumen de la prenda.', '48-probador-3d-prenda', '49-probador-3d-girado',
    ['Prenda con relieve en 3D', 'Giro automático de exhibición', 'Girar arrastrando con el dedo', 'Acercar y alejar', 'Luz que sigue el movimiento', 'Botón para cotizar la prenda']],
  ['Tela real en 3D y lupa', 'La pestaña Tela en 3D muestra una foto macro real del tejido sobre una tela que ondea, para ver la textura, el brillo y la caída. Se puede cambiar a los colores de esa tela que hay en bodega, con sus metros disponibles. La lupa acerca la costura y los botones.', '52-probador-jean-tela', '51-probador-lupa',
    ['Foto real del tejido de cada tela', 'Tela en movimiento con luz', 'Colores disponibles en bodega', 'Metros y estante de cada color', 'Ficha técnica: composición, gramaje y cuidado', 'Lupa para ver de cerca']],
  ['Cotización de lujo', 'Cada cotización sale con membrete negro y dorado, el logo, la foto de cada prenda, la tela y el color, el valor total y el anticipo, las condiciones comerciales, los datos bancarios y los espacios de firma. Se envía por WhatsApp o se guarda en PDF.', '53-cotizacion-lujo', '40-cotizacion-editor',
    ['Membrete con logo y fotos de las prendas', 'Anticipo y condiciones comerciales', 'Datos bancarios y firma', 'Convertir en factura con un clic', 'Generar órdenes de producción', 'Enviar por WhatsApp o guardar en PDF']],
  ['Facturas', 'Facturas de contado o a crédito con el logo de la empresa, resolución de facturación, abonos parciales y saldo. Se imprimen, se guardan en PDF o se envían por WhatsApp.', '55-factura-lujo', '06-facturas',
    ['Contado y crédito de 15 a 90 días', 'Abonos parciales e historial de pagos', 'Anulación con devolución al inventario', 'IVA generado del mes', 'Documento elegante con logo', 'Exportar a Excel']],
  ['Cartera', 'Muestra quién debe, cuánto y desde hace cuántos días. El botón Recordar abre WhatsApp con un mensaje de cobro cordial ya escrito.', '07-cartera', null,
    ['Cuentas por cobrar con días de vencimiento', 'Saldo por cliente', 'Recordatorio de cobro por WhatsApp', 'Registro de abonos', 'Cupo de crédito disponible', 'Aviso en el menú de facturas vencidas']],
  ['Clientes', 'Ficha de cada cliente al detal, mayorista o empresa, con cupo de crédito, descuento fijo, medidas, preferencias e historial completo de compras y cotizaciones.', '08-clientes', null,
    ['Detal, mayoristas y empresas', 'Cupo de crédito y descuento', 'Notas y medidas', 'Historial de compras', 'Total comprado y deuda', 'Contacto directo por WhatsApp']],
  ['Productos, precios y etiquetas', 'El inventario de prendas por talla con costos, precios y margen. Incluye ajuste de precios en bloque cuando sube la tela y etiquetas de precio con logo para el salón.', '09-productos', '33-etiquetas',
    ['Stock por talla S, M, L y XL', 'Costo, precio detal, precio mayor y margen', 'Ajuste de precios por porcentaje', 'Etiquetas con logo y código', 'Stock mínimo con alerta', 'Exportar a Excel']],
  ['Inventario de telas e insumos', 'Toda la tela que se compra queda controlada por metro, tipo, color y estante, con su valor y cuántas prendas rinde. También los insumos: botones, hilos, reflectivos, cremalleras y marquillas.', '10-inventario', null,
    ['Metros por referencia y ubicación', 'Valor del inventario en telas', 'Rendimiento aproximado', 'Insumos con mínimos', 'Entradas, salidas y ajustes', 'Historial de movimientos']],
  ['Reposición y conteo físico', 'El sistema detecta las prendas por debajo del mínimo y crea las órdenes de producción para reponerlas. El conteo físico compara lo que hay en bodega con el sistema y ajusta las diferencias.', '34-reponer', '35-conteo',
    ['Sugerencia de reposición', 'Órdenes de reposición en bloque', 'Cálculo de tela necesaria', 'Conteo físico por talla', 'Diferencias resaltadas', 'Ajuste con registro']],
  ['Producción', 'Tablero del taller por etapas: corte, confección, bordado, terminación y listo. Calcula la tela de cada orden, la descuenta, avisa si no alcanza y marca los pedidos atrasados.', '11-produccion', '41-nueva-orden',
    ['Órdenes con consecutivo', 'Cinco etapas con avance', 'Consumo y costo de tela', 'Aviso si la tela no alcanza', 'Responsable y fecha de entrega', 'Entrada al inventario al terminar']],
  ['Compras y proveedores', 'Cada compra de tela se suma sola al inventario y actualiza el costo por metro. Las compras a crédito quedan como cuentas por pagar.', '12-compras', '13-proveedores',
    ['Registro de compras de tela', 'Suma automática al inventario', 'Cuentas por pagar', 'Directorio de proveedores', 'Total comprado por proveedor', 'Costo por metro actualizado']],
  ['Secretaría', 'La agenda de la semana con citas de toma de medidas, pruebas, entregas y llamadas, más las tareas del equipo con prioridad y responsable.', '14-secretaria', null,
    ['Agenda de 7 días', 'Citas, pruebas, entregas y llamadas', 'Tareas con prioridad', 'Marcar como hecho', 'Accesos rápidos', 'Rol de secretaria con acceso limitado']],
  ['Mensajes y contestación', 'Los mensajes de WhatsApp, Instagram y correo en una bandeja. El sistema lee la pregunta y propone la respuesta: precios por mayor, tallas, envíos, horario o estado del pedido.', '15-mensajes', null,
    ['Bandeja unificada', 'Respuesta sugerida automática', 'Plantillas editables', 'Responder abriendo WhatsApp', 'Crear cliente desde un mensaje', 'Mensajes sin responder en el menú']],
  ['Personal y destajo', 'Control del personal por salario o por destajo. Se registran las prendas que entrega cada modista y el sistema calcula lo que se le debe pagar.', '16-empleados', null,
    ['Salario o destajo', 'Prendas por persona', 'Pago calculado automáticamente', 'Nómina estimada del mes', 'Datos de contacto', 'Exportar a Excel']],
  ['Gastos de la empresa y caja', 'Los gastos del negocio por categoría, lo que entró y salió en el día, el efectivo que debe haber en caja y el cierre con faltantes o sobrantes.', '17-gastos', null,
    ['Gastos por categoría', 'Entradas y salidas del día', 'Efectivo esperado en caja', 'Cierre de caja', 'Utilidad de caja del mes', 'Historial de cierres']],
  ['Finanzas del hogar', 'Un módulo privado, solo para la dueña, para controlar los gastos de la casa sin mezclarlos con los de la empresa. La plata pasa del negocio a la casa como retiro de utilidades y queda registrada en ambos lados.', '18-hogar', '36-hogar-presupuesto',
    ['Gastos de la casa por categoría', 'Presupuesto mensual con alertas', 'Ingresos del hogar y disponible', 'Comparativo empresa y hogar', 'Retiro de utilidades', 'Visible solo para la administradora']],
  ['Pagos fijos y ahorro', 'Los pagos de cada mes con su día de vencimiento (arriendo, colegio, servicios, seguros) se pagan con un toque. Las metas de ahorro muestran cuánto falta para cada sueño.', '37-hogar-fijos', '38-hogar-ahorro',
    ['Pagos fijos con día del mes', 'Avisos de vencidos y próximos', 'Pago registrado con un toque', 'Metas de ahorro', 'Abonos a las metas', 'Avance visual']],
  ['Reportes', 'La foto financiera del año: ventas netas, costo de las prendas, gastos, utilidad y margen, más los mejores clientes y las ventas por categoría y tipo de cliente.', '19-reportes', null,
    ['Ventas netas y utilidad', 'Margen del negocio', 'Ventas por categoría', 'Mejores clientes', 'Detal, mayor y empresas', 'Exportar ventas a Excel']],
  ['Dashboard de ventas', 'Un tablero gerencial con ocho indicadores y doce gráficas: monto vendido, conversión de cotizaciones, crecimiento frente al año anterior, satisfacción, reclamos, cumplimiento de la meta, tiempo de ciclo y frecuencia de compra. Se filtra por año, por meses y por vendedor.', '57-dashboard', '58-dashboard-filtrado',
    ['8 indicadores clave', '12 gráficas por mes, canal, categoría y vendedor', 'Filtros por año, mes y vendedor', 'Meta mensual editable', 'Resumen mensual con margen', 'Exportar a Excel']],
  ['Seguridad y privacidad', 'Nadie entra sin usuario y contraseña. Las claves se guardan cifradas, la pantalla se bloquea sola, cada rol ve solo lo suyo y el modo privado oculta los valores con un toque.', '01-ingreso', '42-modo-privado',
    ['Contraseñas cifradas', 'Bloqueo tras 5 intentos fallidos', 'Bloqueo por inactividad', 'Modo privado', 'Página oculta de buscadores', 'Respaldo cifrado AES-256']],
  ['Usuarios, roles y auditoría', 'Cuatro roles: administradora, secretaria, vendedor y jefe de taller. La auditoría registra quién hizo qué y cuándo, incluidos los intentos de entrada fallidos.', '20-usuarios', '21-auditoria',
    ['Cuatro roles con permisos', 'Activar y desactivar usuarios', 'Contraseñas seguras obligatorias', 'Registro de cada acción', 'Intentos fallidos registrados', 'Solo la administradora anula facturas']],
  ['Configuración y respaldo', 'Los datos de la empresa, el IVA, la resolución de facturación y el tiempo de bloqueo se cambian aquí. El respaldo cifrado guarda toda la información protegida con contraseña.', '22-config', '43-bloqueo',
    ['Nombre, NIT y datos editables', 'IVA y resolución', 'Tiempo de bloqueo', 'Respaldo cifrado', 'Restauración', 'Empezar en limpio']]
];

const css = `
@page { size: A4 landscape; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Jost", "Avenir Next", system-ui, sans-serif; color: #efe7d8; background: #0f0d0b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 297mm; height: 210mm; position: relative; overflow: hidden; page-break-after: always; background: #0f0d0b; padding: 16mm 18mm; }
.page:last-child { page-break-after: auto; }
h1, h2, h3 { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 600; margin: 0; }
.eyebrow { text-transform: uppercase; letter-spacing: .26em; font-size: 8.5pt; color: #a39782; font-weight: 500; }
.gold { color: #e3c98f; }
.foot { position: absolute; left: 18mm; right: 18mm; bottom: 9mm; display: flex; justify-content: space-between; font-size: 8pt; color: #7d7262; letter-spacing: .18em; text-transform: uppercase; border-top: 1px solid #2e281f; padding-top: 3mm; }
.cover { display: grid; grid-template-columns: 1.1fr 1fr; padding: 0; }
.cover .l { padding: 22mm 20mm; display: flex; flex-direction: column; justify-content: space-between;
  background: radial-gradient(900px 500px at 20% 10%, rgba(201,164,92,.18), transparent 60%), repeating-linear-gradient(45deg, rgba(201,164,92,.06) 0 1px, transparent 1px 14px), repeating-linear-gradient(-45deg, rgba(201,164,92,.05) 0 1px, transparent 1px 14px), #17140f; border-right: 1px solid #2e281f; }
.cover .r { display: grid; place-items: center; padding: 16mm; background: #0f0d0b; }
.cover .r img { width: 100%; border-radius: 4mm; border: 1px solid #2e281f; box-shadow: 0 20px 60px rgba(0,0,0,.6); }
.brand { display: flex; align-items: center; gap: 6mm; }
.brand .n { font-family: "Cormorant Garamond", serif; font-size: 34pt; letter-spacing: .3em; font-weight: 600; line-height: 1; }
.brand .s { font-size: 8pt; letter-spacing: .4em; color: #a39782; text-transform: uppercase; margin-top: 2mm; }
.cover h1 { font-size: 46pt; line-height: 1.02; font-weight: 500; }
.cover h1 em { color: #c9a45c; }
.stitch { border-top: 1px dashed rgba(201,164,92,.6); width: 40mm; margin: 6mm 0; }
.sec { display: grid; grid-template-columns: 1.55fr 1fr; gap: 10mm; height: 100%; padding-bottom: 12mm; }
.sec .shots { position: relative; display: grid; align-content: center; }
.sec .shots img.main { width: 100%; border-radius: 3mm; border: 1px solid #2e281f; box-shadow: 0 16px 40px rgba(0,0,0,.55); }
.sec .shots img.inset { position: absolute; width: 52%; right: -6mm; bottom: 4mm; border-radius: 2.5mm; border: 1px solid #c9a45c; box-shadow: 0 16px 40px rgba(0,0,0,.7); }
.sec .txt { display: flex; flex-direction: column; justify-content: center; gap: 5mm; }
.sec .num { font-family: "Cormorant Garamond", serif; font-size: 44pt; color: #c9a45c; line-height: .9; font-weight: 500; }
.sec h2 { font-size: 28pt; line-height: 1.05; }
.sec p { font-size: 11pt; line-height: 1.55; color: #d9cfbd; margin: 0; }
.sec ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 2.2mm; font-size: 10pt; }
.sec li { display: flex; gap: 3mm; align-items: baseline; }
.sec li::before { content: ""; width: 5mm; border-top: 1px dashed #c9a45c; flex: none; transform: translateY(-1mm); }
.grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6mm; margin-top: 6mm; }
.stat { border: 1px solid #2e281f; border-radius: 3mm; padding: 6mm; background: #17140f; }
.stat b { font-family: "Cormorant Garamond", serif; font-size: 34pt; color: #e3c98f; display: block; line-height: 1; font-weight: 600; }
.stat span { font-size: 9.5pt; color: #a39782; }
.mods { columns: 3; column-gap: 8mm; margin-top: 6mm; font-size: 9.5pt; }
.mods div { break-inside: avoid; padding: 1.3mm 0; border-bottom: 1px solid #2e281f; display: flex; justify-content: space-between; }
.mods div span { color: #a39782; font-variant-numeric: tabular-nums; }
.brandpage { display: grid; grid-template-columns: 1fr 1.1fr; gap: 14mm; align-items: center; height: 100%; padding-bottom: 12mm; }
.logo-hero { display: grid; place-items: center; aspect-ratio: 1; border: 1px solid #2e281f; border-radius: 4mm; background: radial-gradient(closest-side, rgba(201,164,92,.14), transparent), #17140f; }
.swatches { display: flex; gap: 4mm; margin-top: 4mm; }
.sw { width: 22mm; }
.sw i { display: block; height: 14mm; border-radius: 2mm; border: 1px solid #2e281f; }
.sw small { display: block; font-size: 7.5pt; color: #a39782; margin-top: 1.5mm; }
.flist { columns: 4; column-gap: 7mm; font-size: 8.2pt; line-height: 1.34; margin-top: 4mm; }
.flist .g { break-inside: avoid; margin-bottom: 3.5mm; }
.flist h3 { font-size: 11.5pt; color: #e3c98f; margin-bottom: 1mm; }
.flist ol { margin: 0; padding-left: 7mm; }
.flist li::marker { color: #c9a45c; }
.phones { display: flex; justify-content: center; gap: 10mm; margin-top: 8mm; }
.phones img { height: 140mm; border-radius: 6mm; border: 2px solid #2e281f; box-shadow: 0 16px 40px rgba(0,0,0,.6); }
.close { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; height: 100%; align-items: center; padding-bottom: 12mm; }
.box { border: 1px solid #2e281f; border-radius: 3mm; padding: 7mm; background: #17140f; font-size: 10.5pt; line-height: 1.6; }
.box h3 { font-size: 18pt; margin-bottom: 3mm; }
`;

const foot = (n) => `<div class="foot"><span>Aurea Atelier · Sistema de gestión</span><span>${n}</span></div>`;
let page = 1;
const pages = [];

pages.push(`<section class="page cover"><div class="l">
  <div class="brand">${LOGO(120)}<div><div class="n">AUREA</div><div class="s">Atelier · Confección</div></div></div>
  <div><div class="eyebrow">Presentación del sistema de gestión</div><div class="stitch"></div>
  <h1>Cada puntada,<br><em>cada peso,</em><br>en su lugar.</h1>
  <p style="max-width:120mm;color:#cfc4b0;font-size:11.5pt;line-height:1.6;margin-top:6mm">Ventas en el salón, catálogo, cotizaciones, facturas, cartera, telas, taller, secretaría, gastos de la empresa y finanzas del hogar en una sola plataforma privada.</p></div>
  <div class="eyebrow">Neiva, Huila · ${new Date().getFullYear()}</div></div>
  <div class="r"><img src="${img('02-panel')}" alt=""></div></section>`);

page++;
pages.push(`<section class="page"><div class="eyebrow">En resumen</div><h2 style="font-size:34pt;margin-top:2mm">Todo el negocio, y la casa, en un solo lugar</h2>
  <p style="max-width:200mm;font-size:12pt;line-height:1.6;color:#d9cfbd">Aurea Atelier está pensado para un taller que confecciona y vende al detal y por mayor: camisas industriales, camisas de salir, pantalones, gorras, overoles, tapabocas y dotación médica. Funciona en computador, tableta y celular.</p>
  <div class="grid4"><div class="stat"><b>${S.length}</b><span>secciones explicadas en esta presentación</span></div><div class="stat"><b>${TOTAL}</b><span>funciones listas para usar</span></div><div class="stat"><b>4</b><span>roles con permisos distintos</span></div><div class="stat"><b>AES-256</b><span>respaldo cifrado con contraseña</span></div></div>
  <div class="mods">${S.map((s, i) => `<div>${esc(s[0])}<span>${String(i + 4).padStart(2, '0')}</span></div>`).join('')}<div>En el celular<span>${String(S.length + 4).padStart(2, '0')}</span></div><div>Lista completa de funciones<span>${String(S.length + 5).padStart(2, '0')}</span></div></div>
  ${foot(String(page).padStart(2, '0'))}</section>`);

page++;
pages.push(`<section class="page"><div class="brandpage"><div class="logo-hero">${LOGO(300)}</div>
  <div><div class="eyebrow">La marca</div><h2 style="font-size:34pt;margin:2mm 0 5mm">Un logo nuevo, hecho del oficio</h2>
  <p style="font-size:11.5pt;line-height:1.65;color:#d9cfbd">La letra <b class="gold">A</b> de Aurea está formada por las dos hojas de una tijera de sastre abiertas. Una puntada cruza la letra como el travesaño, y en el centro hay un botón de cuatro huecos. El doble círculo, uno sólido y otro en puntadas, cierra el sello como una etiqueta de alta costura.</p>
  <p style="font-size:11.5pt;line-height:1.65;color:#d9cfbd">El dorado champaña sobre negro cálido da el tono luxury; la tipografía Cormorant Garamond aporta la elegancia clásica y Jost la claridad moderna para los números.</p>
  <div class="swatches"><div class="sw"><i style="background:#0f0d0b"></i><small>Negro atelier</small></div><div class="sw"><i style="background:#17140f"></i><small>Carbón</small></div><div class="sw"><i style="background:#c9a45c"></i><small>Dorado champaña</small></div><div class="sw"><i style="background:#e3c98f"></i><small>Oro claro</small></div><div class="sw"><i style="background:#efe7d8"></i><small>Marfil</small></div><div class="sw"><i style="background:#7a2e3a"></i><small>Vino</small></div></div>
  <div class="brand" style="margin-top:9mm">${LOGO(54)}<div><div class="n" style="font-size:24pt">AUREA</div><div class="s">Atelier · Confección</div></div></div></div></div>
  ${foot(String(page).padStart(2, '0'))}</section>`);

S.forEach((s, i) => {
  page++;
  const [title, text, main, inset, bullets] = s;
  pages.push(`<section class="page"><div class="sec"><div class="shots"><img class="main" src="${img(main)}" alt="">${inset ? `<img class="inset" src="${img(inset)}" alt="">` : ''}</div>
    <div class="txt"><div class="num">${String(i + 1).padStart(2, '0')}</div><h2>${esc(title)}</h2><p>${esc(text)}</p><ul>${bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div></div>
    ${foot(String(page).padStart(2, '0'))}</section>`);
});

page++;
pages.push(`<section class="page"><div class="eyebrow">Donde esté</div><h2 style="font-size:32pt;margin-top:2mm">También en el celular</h2>
  <div class="phones"><img src="${img('44-celular-panel')}" alt=""><img src="${img('45-celular-catalogo')}" alt=""><img src="${img('56-celular-probador')}" alt=""></div>
  ${foot(String(page).padStart(2, '0'))}</section>`);

let n = 0;
const groups = Object.entries(FUNCIONES);
const PAGS = 3, halves = Array.from({ length: PAGS }, () => []);
let acc = 0;
groups.forEach(g => { halves[Math.min(PAGS - 1, Math.floor(acc / (TOTAL / PAGS)))].push(g); acc += g[1].length; });
halves.forEach((h, k) => {
  page++;
  pages.push(`<section class="page"><div class="eyebrow">Todo lo que incluye · ${k + 1} de ${PAGS}</div><h2 style="font-size:30pt;margin-top:2mm">${TOTAL} funciones</h2>
  <div class="flist">${h.map(([g, list]) => `<div class="g"><h3>${esc(g)}</h3><ol start="${n + 1}">${list.map(x => { n++; return `<li>${esc(x)}</li>`; }).join('')}</ol></div>`).join('')}</div>
  ${foot(String(page).padStart(2, '0'))}</section>`);
});

page++;
pages.push(`<section class="page"><div class="close"><div><div class="brand">${LOGO(90)}<div><div class="n">AUREA</div><div class="s">Atelier · Confección</div></div></div>
  <h2 style="font-size:36pt;margin-top:10mm;line-height:1.05">Listo para empezar a<br><span class="gold" style="font-style:italic">vestir el negocio.</span></h2></div>
  <div class="grid" style="display:grid;gap:6mm"><div class="box"><h3>Cómo empezar</h3>1. Entrar con el usuario de la administradora.<br>2. Cambiar las contraseñas de demostración.<br>3. Poner el nombre, NIT y datos de la empresa.<br>4. Borrar los datos de ejemplo y cargar clientes, telas y prendas.<br>5. Crear el usuario de la secretaria.</div>
  <div class="box"><h3>Siguiente paso recomendado</h3>Hoy la información se guarda en el equipo donde se usa. Para que la dueña y la secretaria vean lo mismo desde varios celulares y computadores, el siguiente paso es conectarlo a una base de datos segura en internet.</div></div></div>
  ${foot(String(page).padStart(2, '0'))}</section>`);

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Aurea Atelier · Presentación</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Jost:wght@300;400;500;600&display=swap">
<style>${css}</style></head><body>${pages.join('\n')}</body></html>`;

(async () => {
  const file = path.join(DIR, 'presentacion.html');
  fs.writeFileSync(file, html);
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + file, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const out = path.join(DIR, '..', 'Aurea-Atelier-Presentacion.pdf');
  await p.pdf({ path: out, format: 'A4', landscape: true, printBackground: true, preferCSSPageSize: true });
  await b.close();
  console.log('PDF:', out, 'páginas:', pages.length);
})();
