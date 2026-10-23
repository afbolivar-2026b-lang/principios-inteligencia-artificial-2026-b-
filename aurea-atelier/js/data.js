/* Datos de ejemplo para la demostración. Se pueden borrar desde Configuración. */
window.AUREA_SEED = (function () {
  const today = new Date();
  const d = (offset) => { const x = new Date(today); x.setDate(x.getDate() + offset); return x.toISOString().slice(0, 10); };

  const clientes = [
    { id: 'c1', nombre: 'Dotaciones Industriales del Huila', tipo: 'Empresa', doc: '900.456.123-1', tel: '3105551020', email: 'compras@dotahuila.co', ciudad: 'Neiva', cupo: 25000000, descuento: 8, notas: 'Paga a 30 días. Pide bordado del logo.' },
    { id: 'c2', nombre: 'Almacén La Elegancia', tipo: 'Mayorista', doc: '1.075.234.889', tel: '3124448899', email: 'laelegancia@gmail.com', ciudad: 'Pitalito', cupo: 12000000, descuento: 12, notas: 'Compra camisas de salir cada mes.' },
    { id: 'c3', nombre: 'Constructora Magdalena S.A.S.', tipo: 'Empresa', doc: '901.222.876-4', tel: '3157773311', email: 'talento@cmagdalena.co', ciudad: 'Neiva', cupo: 30000000, descuento: 10, notas: 'Overoles y camisas drill con reflectivo.' },
    { id: 'c4', nombre: 'Clínica San Gabriel', tipo: 'Empresa', doc: '800.111.555-2', tel: '3001239876', email: 'admin@csangabriel.co', ciudad: 'Garzón', cupo: 15000000, descuento: 5, notas: 'Tapabocas industriales y antifluidos.' },
    { id: 'c5', nombre: 'María Fernanda Rojas', tipo: 'Detal', doc: '36.180.441', tel: '3209871234', email: 'mafe.rojas@hotmail.com', ciudad: 'Neiva', cupo: 0, descuento: 0, notas: 'Clienta del salón.' },
    { id: 'c6', nombre: 'Boutique Valentina', tipo: 'Mayorista', doc: '1.081.555.010', tel: '3186665544', email: 'boutiquevalentina@gmail.com', ciudad: 'La Plata', cupo: 8000000, descuento: 12, notas: '' },
    { id: 'c7', nombre: 'Colegio Santa Librada', tipo: 'Empresa', doc: '891.180.009-7', tel: '3112223344', email: 'rectoria@santalibrada.edu.co', ciudad: 'Neiva', cupo: 20000000, descuento: 7, notas: 'Gorras y camisetas para eventos.' },
    { id: 'c8', nombre: 'Carlos Andrés Perdomo', tipo: 'Detal', doc: '7.705.332', tel: '3014447788', email: '', ciudad: 'Neiva', cupo: 0, descuento: 0, notas: '' }
  ];

  const proveedores = [
    { id: 'pv1', nombre: 'Textiles Fabricato', nit: '890.900.308-3', tel: '6045558000', material: 'Drill, Oxford', ciudad: 'Medellín', contacto: 'Andrés Gómez' },
    { id: 'pv2', nombre: 'Lafayette Telas', nit: '860.001.022-9', tel: '6015559900', material: 'Antifluido, Lino', ciudad: 'Bogotá', contacto: 'Paula Ríos' },
    { id: 'pv3', nombre: 'Insumos El Botón', nit: '900.765.432-1', tel: '3165554411', material: 'Botones, hilos, cremalleras', ciudad: 'Neiva', contacto: 'Don Jairo' },
    { id: 'pv4', nombre: 'Denim Colombia', nit: '901.333.444-5', tel: '6025557711', material: 'Jean, Gabardina', ciudad: 'Cali', contacto: 'Luisa Mora' }
  ];

  const productos = [
    { id: 'p1', sku: 'CI-DRL-01', nombre: 'Camisa industrial drill manga larga', categoria: 'Camisa industrial', color: 'Azul oscuro', S: 18, M: 34, L: 29, XL: 12, costo: 32000, precioDetal: 62000, precioMayor: 48000, minMayor: 12, stockMin: 30, metrosPorUnidad: 1.6 },
    { id: 'p2', sku: 'CI-REF-02', nombre: 'Camisa industrial con reflectivo', categoria: 'Camisa industrial', color: 'Naranja', S: 6, M: 14, L: 10, XL: 4, costo: 38000, precioDetal: 74000, precioMayor: 56000, minMayor: 12, stockMin: 30, metrosPorUnidad: 1.7 },
    { id: 'p3', sku: 'CS-OXF-03', nombre: 'Camisa de salir Oxford slim', categoria: 'Camisa de salir', color: 'Blanco hueso', S: 12, M: 20, L: 16, XL: 8, costo: 41000, precioDetal: 98000, precioMayor: 69000, minMayor: 6, stockMin: 20, metrosPorUnidad: 1.5 },
    { id: 'p4', sku: 'CS-LIN-04', nombre: 'Camisa de lino guayabera', categoria: 'Camisa de salir', color: 'Beige', S: 5, M: 9, L: 7, XL: 3, costo: 52000, precioDetal: 135000, precioMayor: 92000, minMayor: 6, stockMin: 15, metrosPorUnidad: 1.6 },
    { id: 'p5', sku: 'PT-JEA-05', nombre: 'Pantalón jean industrial', categoria: 'Pantalón', color: 'Índigo', S: 10, M: 26, L: 22, XL: 14, costo: 39000, precioDetal: 79000, precioMayor: 58000, minMayor: 12, stockMin: 30, metrosPorUnidad: 1.3 },
    { id: 'p6', sku: 'PT-DRL-06', nombre: 'Pantalón drill cargo', categoria: 'Pantalón', color: 'Caqui', S: 8, M: 15, L: 12, XL: 6, costo: 36000, precioDetal: 72000, precioMayor: 54000, minMayor: 12, stockMin: 25, metrosPorUnidad: 1.3 },
    { id: 'p7', sku: 'GR-BRD-07', nombre: 'Gorra bordada con logo', categoria: 'Gorra', color: 'Negro', S: 0, M: 85, L: 0, XL: 0, costo: 9000, precioDetal: 25000, precioMayor: 16000, minMayor: 24, stockMin: 50, metrosPorUnidad: 0.25 },
    { id: 'p8', sku: 'TB-IND-08', nombre: 'Tapabocas industrial antifluido', categoria: 'Tapabocas', color: 'Azul', S: 0, M: 420, L: 0, XL: 0, costo: 1200, precioDetal: 4000, precioMayor: 2500, minMayor: 100, stockMin: 300, metrosPorUnidad: 0.05 },
    { id: 'p9', sku: 'OV-ENT-09', nombre: 'Overol enterizo reflectivo', categoria: 'Overol', color: 'Azul rey', S: 3, M: 7, L: 6, XL: 2, costo: 68000, precioDetal: 145000, precioMayor: 108000, minMayor: 6, stockMin: 15, metrosPorUnidad: 3.2 },
    { id: 'p10', sku: 'CH-ANT-10', nombre: 'Chaqueta antifluido', categoria: 'Dotación médica', color: 'Verde quirúrgico', S: 6, M: 11, L: 9, XL: 4, costo: 34000, precioDetal: 70000, precioMayor: 52000, minMayor: 10, stockMin: 20, metrosPorUnidad: 1.4 }
  ];

  const telas = [
    { id: 't1', codigo: 'TL-DRL-AZ', nombre: 'Drill 100% algodón', tipo: 'Drill', color: 'Azul oscuro', metros: 186, costoMetro: 14500, proveedorId: 'pv1', minimo: 120, ubicacion: 'Estante A1' },
    { id: 't2', codigo: 'TL-OXF-BH', nombre: 'Oxford premium', tipo: 'Oxford', color: 'Blanco hueso', metros: 64, costoMetro: 17800, proveedorId: 'pv1', minimo: 80, ubicacion: 'Estante A2' },
    { id: 't3', codigo: 'TL-ANT-VQ', nombre: 'Antifluido repelente', tipo: 'Antifluido', color: 'Verde quirúrgico', metros: 132, costoMetro: 12900, proveedorId: 'pv2', minimo: 100, ubicacion: 'Estante B1' },
    { id: 't4', codigo: 'TL-LIN-BG', nombre: 'Lino importado', tipo: 'Lino', color: 'Beige', metros: 28, costoMetro: 31000, proveedorId: 'pv2', minimo: 40, ubicacion: 'Estante B2' },
    { id: 't5', codigo: 'TL-JEA-IN', nombre: 'Jean 14 oz', tipo: 'Jean', color: 'Índigo', metros: 210, costoMetro: 16200, proveedorId: 'pv4', minimo: 120, ubicacion: 'Estante C1' },
    { id: 't6', codigo: 'TL-DRL-NA', nombre: 'Drill alta visibilidad', tipo: 'Drill', color: 'Naranja', metros: 74, costoMetro: 15900, proveedorId: 'pv1', minimo: 90, ubicacion: 'Estante A3' },
    { id: 't7', codigo: 'TL-GAB-CQ', nombre: 'Gabardina stretch', tipo: 'Gabardina', color: 'Caqui', metros: 98, costoMetro: 13400, proveedorId: 'pv4', minimo: 80, ubicacion: 'Estante C2' }
  ];

  const insumos = [
    { id: 'i1', nombre: 'Botón 4 huecos camisa', unidad: 'Gruesa', cantidad: 42, costo: 6500, minimo: 20 },
    { id: 'i2', nombre: 'Hilo poliéster 5000 yd', unidad: 'Cono', cantidad: 18, costo: 9800, minimo: 25 },
    { id: 'i3', nombre: 'Cinta reflectiva 2"', unidad: 'Metro', cantidad: 340, costo: 2100, minimo: 200 },
    { id: 'i4', nombre: 'Cremallera metálica 18 cm', unidad: 'Unidad', cantidad: 260, costo: 900, minimo: 150 },
    { id: 'i5', nombre: 'Elástico tapabocas', unidad: 'Rollo', cantidad: 9, costo: 22000, minimo: 6 },
    { id: 'i6', nombre: 'Marquilla tejida de marca', unidad: 'Unidad', cantidad: 1200, costo: 180, minimo: 500 }
  ];

  const empleados = [
    { id: 'e1', nombre: 'Rosa Elena Cuéllar', cargo: 'Modista / confección', tel: '3134445566', modo: 'Destajo', salario: 0, tarifa: 3500, ingreso: '2019-03-01' },
    { id: 'e2', nombre: 'Yolanda Trujillo', cargo: 'Cortadora', tel: '3145556677', modo: 'Salario', salario: 1600000, tarifa: 0, ingreso: '2020-07-15' },
    { id: 'e3', nombre: 'Luz Mery Andrade', cargo: 'Modista / confección', tel: '3156667788', modo: 'Destajo', salario: 0, tarifa: 3500, ingreso: '2021-01-10' },
    { id: 'e4', nombre: 'Jhon Fredy Ospina', cargo: 'Bordado y estampado', tel: '3167778899', modo: 'Salario', salario: 1750000, tarifa: 0, ingreso: '2022-05-02' },
    { id: 'e5', nombre: 'Daniela Vargas', cargo: 'Secretaria / ventas', tel: '3178889900', modo: 'Salario', salario: 1800000, tarifa: 0, ingreso: '2023-02-20' }
  ];

  const line = (pid, talla, cant, precio) => {
    const p = productos.find(x => x.id === pid);
    return { productoId: pid, desc: p.nombre, talla, cant, precio };
  };

  // Facturas de los últimos meses para que las gráficas tengan historia.
  const facturas = [];
  let n = 1001;
  const plan = [
    [-330, 'c1', [['p1','M',40,48000],['p7','M',40,16000]], 'Crédito'],
    [-300, 'c2', [['p3','M',24,69000]], 'Contado'],
    [-270, 'c3', [['p2','L',36,56000],['p9','L',12,108000]], 'Crédito'],
    [-240, 'c4', [['p8','M',1500,2500]], 'Contado'],
    [-210, 'c6', [['p3','S',18,69000],['p4','M',8,92000]], 'Contado'],
    [-180, 'c1', [['p1','L',60,48000],['p5','L',60,58000]], 'Crédito'],
    [-150, 'c7', [['p7','M',200,16000]], 'Crédito'],
    [-120, 'c2', [['p3','L',30,69000],['p4','L',10,92000]], 'Contado'],
    [-95, 'c3', [['p1','XL',50,48000],['p6','L',50,54000]], 'Crédito'],
    [-70, 'c4', [['p10','M',40,52000],['p8','M',2000,2500]], 'Crédito'],
    [-48, 'c6', [['p3','M',20,69000]], 'Contado'],
    [-40, 'c1', [['p2','M',48,56000],['p7','M',48,16000]], 'Crédito'],
    [-25, 'c7', [['p1','S',30,48000]], 'Crédito'],
    [-14, 'c3', [['p9','M',20,108000],['p5','M',40,58000]], 'Crédito'],
    [-6, 'c2', [['p4','S',12,92000],['p3','XL',12,69000]], 'Contado'],
    [-2, 'c5', [['p3','M',2,98000]], 'Contado'],
    [0, 'c8', [['p5','L',1,79000],['p7','M',1,25000]], 'Contado']
  ];
  plan.forEach(([off, cli, items, forma]) => {
    const its = items.map(i => line(...i));
    const subtotal = its.reduce((s, i) => s + i.cant * i.precio, 0);
    const iva = Math.round(subtotal * 0.19);
    const total = subtotal + iva;
    const plazo = forma === 'Crédito' ? 30 : 0;
    let abonos = [];
    if (forma === 'Contado') abonos = [{ fecha: d(off), valor: total, medio: 'Efectivo' }];
    else if (off < -60) abonos = [{ fecha: d(off + 28), valor: total, medio: 'Transferencia' }];
    else if (off === -40) abonos = [{ fecha: d(off + 10), valor: Math.round(total * 0.4), medio: 'Transferencia' }];
    else if (off === -14) abonos = [{ fecha: d(off + 3), valor: Math.round(total * 0.5), medio: 'Nequi' }];
    facturas.push({ id: 'f' + n, num: 'FE-' + n, fecha: d(off), clienteId: cli, items: its, descuento: 0, ivaPct: 19, forma, plazo, vence: d(off + plazo), abonos, anulada: false, vendedor: 'admin' });
    n++;
  });

  const cotizaciones = [
    { id: 'q1', num: 'COT-301', fecha: d(-3), clienteId: 'c3', items: [line('p2','L',80,56000), line('p9','L',30,108000)], descuento: 5, ivaPct: 19, estado: 'Enviada', vence: d(12), notas: 'Incluye bordado del logo en pecho izquierdo.' },
    { id: 'q2', num: 'COT-302', fecha: d(-1), clienteId: 'c4', items: [line('p10','M',60,52000), line('p8','M',3000,2500)], descuento: 0, ivaPct: 19, estado: 'Borrador', vence: d(14), notas: '' },
    { id: 'q3', num: 'COT-300', fecha: d(-9), clienteId: 'c7', items: [line('p7','M',350,16000)], descuento: 8, ivaPct: 19, estado: 'Aprobada', vence: d(6), notas: 'Gorras para jornada deportiva.' },
    { id: 'q4', num: 'COT-299', fecha: d(-20), clienteId: 'c6', items: [line('p4','M',15,92000)], descuento: 0, ivaPct: 19, estado: 'Rechazada', vence: d(-5), notas: '' }
  ];

  const produccion = [
    { id: 'o1', num: 'OP-118', productoId: 'p2', cantidad: 80, telaId: 't6', estado: 'Corte', responsable: 'Yolanda Trujillo', entrega: d(9), clienteId: 'c3', avance: 15 },
    { id: 'o2', num: 'OP-117', productoId: 'p7', cantidad: 350, telaId: 't1', estado: 'Bordado', responsable: 'Jhon Fredy Ospina', entrega: d(4), clienteId: 'c7', avance: 60 },
    { id: 'o3', num: 'OP-116', productoId: 'p3', cantidad: 40, telaId: 't2', estado: 'Confección', responsable: 'Rosa Elena Cuéllar', entrega: d(6), clienteId: 'c2', avance: 45 },
    { id: 'o4', num: 'OP-115', productoId: 'p10', cantidad: 60, telaId: 't3', estado: 'Confección', responsable: 'Luz Mery Andrade', entrega: d(3), clienteId: 'c4', avance: 70 },
    { id: 'o5', num: 'OP-114', productoId: 'p5', cantidad: 50, telaId: 't5', estado: 'Terminación', responsable: 'Rosa Elena Cuéllar', entrega: d(1), clienteId: 'c3', avance: 90 },
    { id: 'o6', num: 'OP-113', productoId: 'p1', cantidad: 60, telaId: 't1', estado: 'Listo', responsable: 'Luz Mery Andrade', entrega: d(-1), clienteId: 'c1', avance: 100 }
  ];

  const compras = [
    { id: 'cp1', num: 'OC-045', fecha: d(-35), proveedorId: 'pv1', telaId: 't1', metros: 300, costoMetro: 14500, pagado: true },
    { id: 'cp2', num: 'OC-046', fecha: d(-21), proveedorId: 'pv2', telaId: 't3', metros: 200, costoMetro: 12900, pagado: true },
    { id: 'cp3', num: 'OC-047', fecha: d(-8), proveedorId: 'pv4', telaId: 't5', metros: 250, costoMetro: 16200, pagado: false },
    { id: 'cp4', num: 'OC-048', fecha: d(-2), proveedorId: 'pv1', telaId: 't6', metros: 120, costoMetro: 15900, pagado: false }
  ];

  const gastos = [
    { id: 'g1', fecha: d(-27), categoria: 'Arriendo', desc: 'Arriendo local y taller', valor: 3200000, medio: 'Transferencia' },
    { id: 'g2', fecha: d(-20), categoria: 'Servicios', desc: 'Energía (máquinas)', valor: 685000, medio: 'Transferencia' },
    { id: 'g3', fecha: d(-12), categoria: 'Mantenimiento', desc: 'Mantenimiento fileteadora', valor: 180000, medio: 'Efectivo' },
    { id: 'g4', fecha: d(-5), categoria: 'Transporte', desc: 'Envío pedido a Pitalito', valor: 95000, medio: 'Efectivo' },
    { id: 'g5', fecha: d(-1), categoria: 'Publicidad', desc: 'Pauta Instagram', valor: 150000, medio: 'Tarjeta' }
  ];

  const agenda = [
    { id: 'a1', fecha: d(0), hora: '09:00', titulo: 'Toma de medidas — Constructora Magdalena', tipo: 'Cita', clienteId: 'c3', hecho: false },
    { id: 'a2', fecha: d(0), hora: '11:40', titulo: 'Presentación de la nueva plataforma', tipo: 'Reunión', clienteId: '', hecho: false },
    { id: 'a3', fecha: d(0), hora: '15:30', titulo: 'Prueba de camisas de lino — María Fernanda', tipo: 'Prueba', clienteId: 'c5', hecho: false },
    { id: 'a4', fecha: d(1), hora: '10:00', titulo: 'Entrega OP-114 pantalones jean', tipo: 'Entrega', clienteId: 'c3', hecho: false },
    { id: 'a5', fecha: d(2), hora: '08:30', titulo: 'Llamar a Fabricato por drill naranja', tipo: 'Llamada', clienteId: '', hecho: false },
    { id: 'a6', fecha: d(4), hora: '14:00', titulo: 'Entrega gorras Colegio Santa Librada', tipo: 'Entrega', clienteId: 'c7', hecho: false }
  ];

  const tareas = [
    { id: 'k1', titulo: 'Enviar cotización COT-302 a Clínica San Gabriel', prioridad: 'Alta', asignado: 'Secretaria', hecho: false },
    { id: 'k2', titulo: 'Cobrar saldo FE-1012 a Dotaciones del Huila', prioridad: 'Alta', asignado: 'Secretaria', hecho: false },
    { id: 'k3', titulo: 'Pedir 2 rollos de lino beige', prioridad: 'Media', asignado: 'Administración', hecho: false },
    { id: 'k4', titulo: 'Subir fotos de camisas Oxford a Instagram', prioridad: 'Baja', asignado: 'Secretaria', hecho: true }
  ];

  const mensajes = [
    { id: 'm1', canal: 'WhatsApp', de: 'Almacén La Elegancia', tel: '3124448899', fecha: d(0) + ' 08:12', texto: 'Buenos días, ¿qué precio tiene la camisa Oxford por mayor? Necesito 30.', respondido: false, hilo: [] },
    { id: 'm2', canal: 'Instagram', de: '@juliana.mz', tel: '', fecha: d(0) + ' 07:45', texto: 'Hola! ¿Tienen la guayabera de lino en talla M? ¿Hacen envíos?', respondido: false, hilo: [] },
    { id: 'm3', canal: 'WhatsApp', de: 'Clínica San Gabriel', tel: '3001239876', fecha: d(-1) + ' 17:30', texto: 'Necesitamos tapabocas industriales, ¿cuál es el mínimo para precio mayorista?', respondido: false, hilo: [] },
    { id: 'm4', canal: 'Correo', de: 'talento@cmagdalena.co', tel: '', fecha: d(-1) + ' 10:05', texto: 'Por favor confirmar fecha de entrega de los pantalones jean de la OP-114.', respondido: true, hilo: [{ me: true, texto: 'Buen día. La entrega está programada para mañana a las 10:00 a.m. Gracias por su confianza.', fecha: d(-1) + ' 10:40' }] },
    { id: 'm5', canal: 'WhatsApp', de: 'Carlos Andrés Perdomo', tel: '3014447788', fecha: d(-2) + ' 19:02', texto: '¿Cuál es el horario del salón el sábado?', respondido: false, hilo: [] }
  ];

  const plantillas = [
    { id: 'r1', clave: 'precio, mayor, mayorista, por mayor', titulo: 'Precios por mayor', texto: 'Hola {nombre}, gracias por escribirnos. Manejamos precio mayorista desde 12 unidades en dotación y 6 unidades en camisas de salir. Con gusto le enviamos la cotización formal hoy mismo. ¿Me confirma tallas y colores?' },
    { id: 'r2', clave: 'talla, tallas, medida', titulo: 'Tallas disponibles', texto: 'Hola {nombre}, manejamos tallas S, M, L y XL, y confeccionamos sobre medida. Puede venir al salón para la toma de medidas sin costo.' },
    { id: 'r3', clave: 'envío, envíos, domicilio, enviar', titulo: 'Envíos', texto: 'Hola {nombre}, hacemos envíos a todo el país por transportadora. En Neiva el domicilio es gratis en compras superiores a $200.000.' },
    { id: 'r4', clave: 'horario, abren, sábado, domingo, hora', titulo: 'Horario del salón', texto: 'Hola {nombre}, nuestro salón atiende de lunes a viernes de 8:00 a.m. a 6:00 p.m. y los sábados de 9:00 a.m. a 2:00 p.m.' },
    { id: 'r5', clave: 'entrega, fecha, cuándo, listo', titulo: 'Estado de pedido', texto: 'Hola {nombre}, ya revisamos su pedido en producción. Le confirmamos la fecha de entrega en un momento. Gracias por su paciencia.' },
    { id: 'r6', clave: 'tapabocas, antifluido, dotación', titulo: 'Dotación industrial', texto: 'Hola {nombre}, fabricamos dotación industrial completa: camisas drill, reflectivos, overoles, pantalones, tapabocas y antifluidos, con bordado de su logo. ¿Para cuántas personas sería?' }
  ];

  const destajo = [
    { id: 'dj1', fecha: d(-4), empleadoId: 'e1', prendas: 42, ref: 'OP-114' },
    { id: 'dj2', fecha: d(-3), empleadoId: 'e3', prendas: 38, ref: 'OP-115' },
    { id: 'dj3', fecha: d(-2), empleadoId: 'e1', prendas: 35, ref: 'OP-116' },
    { id: 'dj4', fecha: d(-1), empleadoId: 'e3', prendas: 40, ref: 'OP-115' }
  ];

  return { clientes, proveedores, productos, telas, insumos, empleados, facturas, cotizaciones, produccion, compras, gastos, agenda, tareas, mensajes, plantillas, destajo };
})();
