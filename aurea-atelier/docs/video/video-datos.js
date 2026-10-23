/* Generado por generar-datos-video.js */
window.DATA = [
 {
  "titulo": "Primeros pasos y seguridad",
  "intro": "Aurea Atelier es un sistema privado. Nadie entra sin usuario y contraseña, cada persona ve solo lo que le corresponde y todo queda registrado. Este capítulo explica cómo entrar, cómo proteger la información y cómo crear los usuarios del equipo.",
  "pasos": [
   "Abra el sistema y escriba su usuario y contraseña. La primera vez use la clave de administradora que se entrega con el sistema.",
   "Vaya a Usuarios y roles y cambie las contraseñas iniciales por unas propias.",
   "Cree un usuario para la secretaria, para los vendedores del salón y para el jefe de taller, cada uno con su rol.",
   "Cuando se levante del computador, toque el candado de arriba para bloquear la pantalla.",
   "Si hay clientes cerca, toque el ojo para ocultar todos los valores en pesos."
  ],
  "imgs": [
   "01-ingreso",
   "43-bloqueo",
   "42-modo-privado",
   "20-usuarios"
  ],
  "imgsCap": [
   "Pantalla de ingreso privada",
   "Pantalla bloqueada",
   "Modo privado: los valores quedan ocultos",
   "Usuarios y roles"
  ],
  "fx": [
   [
    "Ingreso con usuario y contraseña",
    "Cada persona entra con su propio usuario; sin clave no se ve ninguna pantalla del sistema."
   ],
   [
    "Contraseñas cifradas con PBKDF2-SHA256 (120.000 iteraciones)",
    "Las claves nunca se guardan tal cual: se transforman con un cifrado bancario que no se puede revertir."
   ],
   [
    "Bloqueo tras 5 intentos fallidos",
    "Si alguien intenta adivinar la clave, el ingreso se bloquea un minuto después del quinto error."
   ],
   [
    "Bloqueo automático por inactividad",
    "Si nadie toca el sistema durante los minutos configurados, la pantalla se bloquea sola."
   ],
   [
    "Botón de bloqueo inmediato de pantalla",
    "El candado de la barra superior bloquea la pantalla al instante; para volver se pide la clave."
   ],
   [
    "Modo privado que oculta todos los valores",
    "El botón del ojo difumina todos los montos para que nadie alrededor vea cifras."
   ],
   [
    "Roles: administradora, secretaria, vendedor, jefe de taller",
    "Cuatro perfiles con permisos distintos según el trabajo de cada persona."
   ],
   [
    "Menú filtrado según el rol",
    "Cada usuario solo ve en el menú los módulos que su rol le permite abrir."
   ],
   [
    "Solo la administradora anula facturas",
    "La anulación de una factura queda reservada a la dueña para evitar errores o abusos."
   ],
   [
    "Política de contraseñas seguras",
    "Las claves nuevas deben tener mínimo 8 caracteres con mayúscula, minúscula y número."
   ],
   [
    "Aviso para cambiar claves iniciales",
    "Los usuarios con clave de fábrica aparecen marcados hasta que la cambien."
   ],
   [
    "Activar y desactivar usuarios",
    "Cuando alguien deja de trabajar, se desactiva su usuario sin borrar su historial."
   ],
   [
    "Registro de auditoría de cada acción",
    "Se guarda quién hizo qué y cuándo: ventas, abonos, cambios de precio, anulaciones y más."
   ],
   [
    "Registro de intentos de ingreso fallidos",
    "Los intentos de entrar con clave equivocada quedan anotados y resaltados en rojo."
   ],
   [
    "Respaldo cifrado AES-256 con contraseña",
    "Toda la información se puede guardar en un archivo protegido con contraseña."
   ],
   [
    "Restauración de respaldo",
    "Con el archivo de respaldo y su contraseña se recupera toda la información en otro equipo."
   ],
   [
    "Página oculta de buscadores (noindex)",
    "Google y otros buscadores no muestran el sistema en sus resultados."
   ],
   [
    "Sesión que se cierra al cerrar el navegador",
    "Al cerrar el navegador se cierra la sesión y hay que volver a ingresar."
   ]
  ]
 },
 {
  "titulo": "Panel principal",
  "intro": "Es lo primero que se ve al entrar: el estado completo del negocio en una sola pantalla. Muestra cuánto se vendió, cuánto le deben, qué hay en el taller y qué necesita atención hoy.",
  "pasos": [
   "Revise las cuatro tarjetas de arriba: ventas de hoy, ventas del mes, cartera y telas.",
   "Mire la agenda del día para saber qué citas y entregas hay.",
   "Atienda las alertas: telas, prendas o insumos por debajo del mínimo.",
   "Use los botones de arriba para vender en el salón o crear una cotización."
  ],
  "imgs": [
   "02-panel",
   "44-celular-panel"
  ],
  "imgsCap": [
   "El panel al ingresar",
   "El panel en el celular"
  ],
  "fx": [
   [
    "Ventas de hoy",
    "Suma de todas las facturas emitidas hoy, con IVA."
   ],
   [
    "Recaudo del día",
    "Lo que realmente entró hoy en efectivo, transferencias y abonos."
   ],
   [
    "Ventas del mes y comparación con el mes anterior",
    "Total del mes con una flecha que indica si va por encima o por debajo del mes pasado."
   ],
   [
    "Cartera por cobrar y vencida",
    "Cuánto deben los clientes en total y cuánto de eso ya está vencido."
   ],
   [
    "Metros de tela y valor en bodega",
    "Metros de tela disponibles y lo que valen a precio de compra."
   ],
   [
    "Gráfica de ventas de 12 meses",
    "Barras con las ventas de cada mes del último año; al pasar el dedo muestra el valor."
   ],
   [
    "Agenda del día",
    "Las citas, pruebas, entregas y llamadas programadas para hoy, por hora."
   ],
   [
    "Órdenes en el taller con avance",
    "Las órdenes de producción abiertas con su etapa, barra de avance y días para la entrega."
   ],
   [
    "Alertas de tela, stock e insumos",
    "Avisos de lo que hay que reponer antes de que se acabe."
   ],
   [
    "Mensajes sin responder",
    "Los últimos mensajes de clientes que todavía no tienen respuesta."
   ],
   [
    "Lo más vendido",
    "Las prendas con más unidades vendidas en el historial."
   ],
   [
    "Cartera por edad (al día, 30, 60, +60)",
    "El saldo pendiente separado según cuántos días lleva vencido."
   ],
   [
    "Saludo según la hora",
    "Da los buenos días, tardes o noches con el nombre de quien ingresó."
   ],
   [
    "Búsqueda global",
    "La barra superior busca a la vez en clientes, facturas, cotizaciones, prendas y telas."
   ]
  ]
 },
 {
  "titulo": "Salón de ventas",
  "intro": "Es la caja del salón. Se toca la prenda, se elige la talla y el sistema calcula el precio correcto, el descuento y el IVA. Al cobrar sale la factura y se descuenta el inventario.",
  "pasos": [
   "Busque la prenda por nombre o filtre por categoría.",
   "Tóquela, elija la talla y la cantidad.",
   "Elija el cliente: si es mayorista o empresa, el precio por mayor y su descuento se aplican solos.",
   "Elija el medio de pago y toque Cobrar y facturar.",
   "Envíe la factura por WhatsApp o imprímala."
  ],
  "imgs": [
   "03-pos"
  ],
  "imgsCap": [
   "Venta en el mostrador"
  ],
  "fx": [
   [
    "Catálogo visual por categoría",
    "Las prendas aparecen con su foto, precio al detal y precio por mayor."
   ],
   [
    "Búsqueda de prendas por nombre o código",
    "Escriba parte del nombre o el código para encontrar la prenda al instante."
   ],
   [
    "Selección de talla y cantidad",
    "Al tocar una prenda se elige la talla S, M, L o XL y cuántas unidades."
   ],
   [
    "Precio mayorista automático por cantidad",
    "Si la cantidad llega al mínimo de mayor, el precio cambia solo."
   ],
   [
    "Precio mayorista automático por tipo de cliente",
    "A los clientes mayoristas y empresas siempre se les cobra precio por mayor."
   ],
   [
    "Descuento fijo del cliente",
    "Si el cliente tiene un descuento pactado, se aplica al seleccionarlo."
   ],
   [
    "Descuento manual",
    "Se puede dar un descuento adicional en porcentaje hasta el 50%."
   ],
   [
    "Cálculo de IVA",
    "El IVA se calcula sobre el valor con descuento, con el porcentaje configurado."
   ],
   [
    "Efectivo, transferencia, Nequi, Daviplata, tarjeta",
    "Se registra cómo pagó el cliente para cuadrar la caja."
   ],
   [
    "Venta a crédito con cartera",
    "La venta a crédito queda en cartera con 30 días de plazo."
   ],
   [
    "Aviso de falta de stock",
    "Si se vende más de lo que hay en esa talla, el sistema avisa para programar producción."
   ],
   [
    "Guardar venta como cotización",
    "Lo que está en la venta se guarda como cotización para enviarla al cliente."
   ],
   [
    "Factura inmediata al cobrar",
    "Al cobrar se crea la factura con su número consecutivo."
   ],
   [
    "Descuento automático del inventario por talla",
    "Las unidades vendidas se restan del stock de esa talla."
   ]
  ]
 },
 {
  "titulo": "Catálogo visual",
  "intro": "Un catálogo elegante para mostrar las prendas en el celular o la tableta. Cada prenda tiene su ficha con fotos, tallas disponibles, precios y la tela; desde ahí se arma un pedido o una cotización.",
  "pasos": [
   "Entre a Catálogo y filtre por categoría o busque por color o colección.",
   "Toque una prenda para abrir su ficha.",
   "Para mostrarlo a un cliente active Vista para cliente: se ocultan costos y cantidades.",
   "Elija talla y cantidad y toque Agregar al pedido; luego conviértalo en cotización.",
   "Para subir la foto real, abra la ficha y toque Subir foto."
  ],
  "imgs": [
   "04-catalogo",
   "47-ficha-con-3d",
   "31-catalogo-cliente",
   "32-lista-precios"
  ],
  "imgsCap": [
   "Catálogo por colecciones",
   "Ficha de una prenda",
   "Vista para el cliente",
   "Lista de precios"
  ],
  "fx": [
   [
    "Catálogo por colecciones",
    "Las prendas se agrupan en colecciones como Dotación, Ejecutiva, Resort o Bioseguridad."
   ],
   [
    "Ilustración de cada prenda en su color",
    "Una prenda nueva sin foto se muestra con un dibujo en su color hasta que se le suba una."
   ],
   [
    "Fotos reales de las prendas desde el celular",
    "Desde la ficha se toma o se elige una foto y queda guardada en la prenda."
   ],
   [
    "Reducción automática del tamaño de la foto",
    "La foto se ajusta para que no ocupe mucho espacio y cargue rápido."
   ],
   [
    "Sellos de más vendido, últimas unidades y agotado",
    "Cada tarjeta muestra su estado de un vistazo."
   ],
   [
    "Filtro por categoría",
    "Botones para ver solo camisas, pantalones, gorras, overoles, tapabocas o dotación médica."
   ],
   [
    "Búsqueda por prenda, color o colección",
    "La búsqueda encuentra por nombre, por color o por colección."
   ],
   [
    "Orden por nombre, precio o disponibilidad",
    "Se puede ordenar el catálogo como sea más útil."
   ],
   [
    "Ficha de prenda con tallas disponibles",
    "La ficha muestra cada talla con las unidades que hay."
   ],
   [
    "Vista para cliente que oculta costos y stock",
    "Con un botón se esconden costos, márgenes y cantidades para mostrar sin preocupación."
   ],
   [
    "Pedido armado desde el catálogo",
    "Se agregan varias prendas y tallas a un pedido mientras se recorre el catálogo."
   ],
   [
    "Pedido convertido en cotización",
    "El pedido se convierte en cotización con el precio correcto según el cliente."
   ],
   [
    "Pedido enviado al salón de ventas",
    "El pedido pasa directo a la caja para cobrarlo."
   ],
   [
    "Ficha lista para enviar por WhatsApp",
    "Copia el nombre, precios y tallas de la prenda para pegarlo en un chat."
   ],
   [
    "Lista de precios detal y mayor",
    "Una tabla con todas las prendas y sus precios al detal y por mayor."
   ],
   [
    "Lista de precios exportable a Excel",
    "La lista de precios se descarga para abrirla en Excel."
   ]
  ]
 },
 {
  "titulo": "Probador 3D",
  "intro": "Al elegir una prenda se puede ver en 3D: la prenda en relieve que gira, la tela real ondeando con la luz y una lupa para ver la costura. Ayuda a que el cliente entienda la calidad sin tener la prenda en la mano.",
  "pasos": [
   "Abra la ficha de una prenda en el catálogo y toque Ver en 3D, o hágalo al elegir la talla en el salón.",
   "Arrastre con el dedo o el mouse para girar la prenda; use + y − para acercar.",
   "Toque Tela en 3D para ver el tejido real y su caída.",
   "Toque otro color de la lista para ver esa tela y cuántos metros hay en bodega.",
   "Toque Lupa y pase el dedo por la foto para ver los detalles de cerca.",
   "Toque Cotizar esta prenda para hacer la cotización desde ahí."
  ],
  "imgs": [
   "48-probador-3d-prenda",
   "49-probador-3d-girado",
   "52-probador-jean-tela",
   "51-probador-lupa"
  ],
  "imgsCap": [
   "Prenda en 3D",
   "Tela real en 3D",
   "Lupa sobre la tela"
  ],
  "seq": [
   "prenda",
   "tela",
   "lupa"
  ],
  "fx": [
   [
    "Vista 3D de cada prenda con relieve",
    "La foto de estudio se convierte en una pieza con volumen que se ve desde distintos ángulos."
   ],
   [
    "Girar la prenda arrastrando con el dedo o el mouse",
    "Se mueve la prenda hacia los lados y hacia arriba o abajo."
   ],
   [
    "Giro automático de exhibición",
    "Mientras nadie la toca, la prenda gira sola como en una vitrina."
   ],
   [
    "Acercar y alejar la prenda",
    "Los botones + y − o la rueda del mouse acercan la vista."
   ],
   [
    "Luz que sigue el movimiento del dedo",
    "La luz se mueve con el dedo y resalta pliegues y textura."
   ],
   [
    "Tela en 3D con el tejido real de cada tipo",
    "Se usa una foto macro real del drill, Oxford, lino, jean, gabardina o antifluido."
   ],
   [
    "Tela en movimiento para ver la caída",
    "La tela ondea suavemente para mostrar cómo cae y cómo refleja la luz."
   ],
   [
    "Cambiar la tela a los colores que hay en bodega",
    "Los colores disponibles de esa tela aparecen como botones para probarlos."
   ],
   [
    "Metros disponibles y ubicación del color elegido",
    "Al elegir un color se ve cuántos metros hay y en qué estante."
   ],
   [
    "Ficha técnica: composición, gramaje, tejido y cuidado",
    "Datos de la tela que el cliente suele preguntar, con instrucciones de lavado."
   ],
   [
    "Lupa para ver de cerca la costura y la tela",
    "Un círculo de aumento sigue el dedo sobre la foto de la prenda."
   ],
   [
    "Vista con relieve en equipos sin 3D",
    "Si el equipo no permite 3D, la foto se inclina con el dedo para dar sensación de volumen."
   ]
  ]
 },
 {
  "titulo": "Cotizaciones",
  "intro": "Las cotizaciones para empresas, colegios y mayoristas se arman en segundos. Cada una lleva su número, su vigencia y su estado, y con un clic se convierte en factura o en órdenes para el taller.",
  "pasos": [
   "Toque Nueva cotización y elija el cliente.",
   "Agregue las líneas: prenda, talla, cantidad. El precio se pone solo y se puede cambiar.",
   "Escriba las notas de bordado, colores o tiempos de entrega.",
   "Guarde: el documento con logo aparece listo para enviar por WhatsApp.",
   "Cuando el cliente apruebe, toque Facturar o Producir."
  ],
  "imgs": [
   "05-cotizaciones",
   "40-cotizacion-editor"
  ],
  "imgsCap": [
   "Lista de cotizaciones",
   "Armando una cotización"
  ],
  "fx": [
   [
    "Crear y editar cotizaciones",
    "Se crean desde cero, desde el catálogo o desde el salón, y se pueden corregir."
   ],
   [
    "Consecutivo automático",
    "Cada cotización recibe su número COT en orden."
   ],
   [
    "Estados: borrador, enviada, aprobada, rechazada, facturada",
    "Se sabe en qué va cada negocio."
   ],
   [
    "Vigencia en días",
    "Se define hasta qué fecha es válida la oferta."
   ],
   [
    "Notas de bordado y colores",
    "Espacio para los detalles que pide el cliente: logo, colores, tallas especiales."
   ],
   [
    "Documento elegante con logo",
    "La cotización sale con el membrete de lujo de la empresa."
   ],
   [
    "Enviar por WhatsApp con mensaje listo",
    "Abre WhatsApp con un mensaje cordial y el valor de la cotización."
   ],
   [
    "Convertir en factura con un clic",
    "La cotización aprobada se vuelve factura sin volver a escribir nada."
   ],
   [
    "Generar órdenes de producción desde la cotización",
    "Crea una orden para el taller por cada prenda de la cotización."
   ],
   [
    "Totales por estado",
    "Tarjetas arriba muestran cuánto hay en borrador, enviado, aprobado y rechazado."
   ]
  ]
 },
 {
  "titulo": "La cotización con su sello",
  "intro": "Cada cotización y factura sale con un membrete negro y dorado, el logo de la empresa y la foto de cada prenda. Incluye las condiciones comerciales, los datos bancarios y los espacios de firma, lista para enviar o imprimir.",
  "pasos": [
   "Vaya a Configuración y llene la tarjeta Cotizaciones y facturas: banco, cuenta, anticipo, días de entrega y condiciones.",
   "Cree una cotización o toque Cotizar esta prenda desde el catálogo o el probador 3D.",
   "Revise el documento y envíelo por WhatsApp, o guárdelo en PDF desde el computador."
  ],
  "imgs": [
   "53-cotizacion-lujo",
   "54-cotizacion-lujo-condiciones"
  ],
  "imgsCap": [
   "Cotización con membrete",
   "Condiciones, pago y firmas"
  ],
  "fx": [
   [
    "Membrete negro y dorado con el logo",
    "Encabezado de lujo con el logo, el número del documento y las fechas."
   ],
   [
    "Foto de cada prenda dentro de la cotización",
    "El cliente ve exactamente qué prenda está cotizando."
   ],
   [
    "Tela y color de cada línea",
    "Cada prenda indica su talla, la tela y el color."
   ],
   [
    "Valor total y anticipo calculados",
    "Muestra el total con IVA y el valor del anticipo según el porcentaje configurado."
   ],
   [
    "Condiciones comerciales editables",
    "Validez, anticipo, tiempo de entrega y condiciones propias de la empresa."
   ],
   [
    "Datos bancarios para el pago",
    "Banco, tipo de cuenta, número y titular para que el cliente consigne."
   ],
   [
    "Firma de la empresa y aceptación del cliente",
    "Dos espacios para firmar: el de la empresa y el de aprobación del cliente."
   ],
   [
    "Cotizar una prenda desde el catálogo o el probador 3D",
    "Un botón arma la cotización con la prenda que se está viendo."
   ],
   [
    "Factura con el mismo membrete de lujo",
    "Las facturas usan el mismo diseño, con pagado y saldo."
   ]
  ]
 },
 {
  "titulo": "Facturas",
  "intro": "Aquí están todas las facturas, de contado y a crédito, con su saldo y su estado. Se registran abonos, se anulan si hay un error y se envían al cliente.",
  "pasos": [
   "Toque Nueva factura o facture desde el salón o una cotización.",
   "Para registrar un pago parcial toque Abonar y escriba el valor.",
   "Para enviarla toque Ver y luego Enviar por WhatsApp.",
   "Si hubo un error, la administradora puede anularla; las prendas vuelven al inventario."
  ],
  "imgs": [
   "55-factura-lujo",
   "06-facturas"
  ],
  "imgsCap": [
   "Factura con membrete",
   "Lista de facturas"
  ],
  "fx": [
   [
    "Facturación de contado y a crédito",
    "La factura de contado queda pagada; la de crédito pasa a cartera."
   ],
   [
    "Plazos de 15, 30, 45, 60 y 90 días",
    "Se elige el plazo y el sistema calcula la fecha de vencimiento."
   ],
   [
    "Consecutivo y resolución configurables",
    "Número de factura en orden y texto de la resolución de facturación."
   ],
   [
    "Abonos parciales",
    "El cliente puede pagar por partes; cada abono baja el saldo."
   ],
   [
    "Historial de pagos",
    "Cada factura guarda la fecha, el valor y el medio de cada pago."
   ],
   [
    "Anulación con devolución al inventario",
    "Al anular, las prendas vuelven a su talla en el inventario."
   ],
   [
    "IVA generado del mes",
    "Cuánto IVA se ha facturado en el mes, útil para la declaración."
   ],
   [
    "Imprimir o guardar en PDF",
    "Desde el computador la factura se imprime o se guarda como PDF."
   ],
   [
    "Envío por WhatsApp",
    "Abre WhatsApp con el número de factura, el total y el saldo."
   ],
   [
    "Exportar a Excel",
    "La lista de facturas se descarga para abrirla en Excel."
   ]
  ]
 },
 {
  "titulo": "Cartera",
  "intro": "La cartera muestra quién debe, cuánto y desde hace cuántos días. Cobrar se vuelve fácil: el botón Recordar abre WhatsApp con un mensaje de cobro amable ya escrito.",
  "pasos": [
   "Entre a Cartera y ordene por días para ver primero lo más vencido.",
   "Toque Recordar para enviar el mensaje de cobro por WhatsApp.",
   "Cuando el cliente pague, toque Abonar."
  ],
  "imgs": [
   "07-cartera"
  ],
  "imgsCap": [
   "Cuentas por cobrar"
  ],
  "fx": [
   [
    "Cuentas por cobrar",
    "Todas las facturas con saldo pendiente en una sola lista."
   ],
   [
    "Días de vencimiento",
    "Cuántos días lleva vencida cada factura o cuántos faltan para que venza."
   ],
   [
    "Saldo por cliente",
    "Una gráfica muestra cuánto debe cada cliente."
   ],
   [
    "Recordatorio de cobro por WhatsApp",
    "Mensaje cordial con el número de factura, el saldo y los días."
   ],
   [
    "Registro de abonos desde la cartera",
    "Se registra el pago sin tener que buscar la factura."
   ],
   [
    "Cupo de crédito disponible por cliente",
    "Se sabe cuánto más se le puede vender a crédito a cada cliente."
   ],
   [
    "Alerta en el menú de facturas vencidas",
    "Un número rojo en el menú indica cuántas facturas están vencidas."
   ]
  ]
 },
 {
  "titulo": "Clientes",
  "intro": "La ficha de cada cliente al detal, mayorista o empresa, con sus datos, su cupo de crédito, su descuento, sus medidas y todo lo que ha comprado.",
  "pasos": [
   "Toque Nuevo cliente y llene los datos; elija si es detal, mayorista o empresa.",
   "Si tiene crédito, ponga el cupo; si tiene descuento pactado, el porcentaje.",
   "Toque Historial para ver sus compras y cotizaciones."
  ],
  "imgs": [
   "08-clientes"
  ],
  "imgsCap": [
   "Directorio de clientes"
  ],
  "fx": [
   [
    "Ficha de cliente detal, mayorista y empresa",
    "El tipo de cliente define qué precio se le cobra."
   ],
   [
    "Cédula o NIT, celular, correo, ciudad",
    "Los datos necesarios para facturar y contactar."
   ],
   [
    "Cupo de crédito",
    "Hasta cuánto se le puede vender a crédito."
   ],
   [
    "Descuento fijo",
    "Un porcentaje que se aplica solo en cada venta y cotización."
   ],
   [
    "Notas, medidas y preferencias",
    "Espacio para las medidas, el logo a bordar o cómo le gusta que lo atiendan."
   ],
   [
    "Historial de compras y cotizaciones",
    "Todas sus facturas y cotizaciones con su estado."
   ],
   [
    "Total comprado y deuda",
    "Cuánto ha comprado en total y cuánto debe hoy."
   ],
   [
    "Contacto directo por WhatsApp",
    "Un botón abre el chat con el cliente."
   ]
  ]
 },
 {
  "titulo": "Productos, telas e insumos",
  "intro": "El control de todo lo que hay en bodega: las prendas terminadas por talla, la tela por metro y los insumos del taller, con su valor y sus alertas.",
  "pasos": [
   "En Productos y precios cree cada prenda con su código, costo y precios.",
   "En Inventario y telas registre cada tela con sus metros, color y estante.",
   "Use Entrada / salida para registrar movimientos que no vengan de ventas o compras.",
   "Revise las cifras en rojo: son las que están por debajo del mínimo."
  ],
  "imgs": [
   "09-productos",
   "10-inventario"
  ],
  "imgsCap": [
   "Productos y precios",
   "Inventario de telas"
  ],
  "fx": [
   [
    "Prendas con código y categoría",
    "Cada prenda tiene su código propio y su categoría."
   ],
   [
    "Stock por talla S, M, L, XL",
    "Se sabe cuántas unidades hay de cada talla."
   ],
   [
    "Costo, precio detal y precio mayor",
    "Los tres valores de cada prenda en un solo lugar."
   ],
   [
    "Margen de ganancia",
    "El porcentaje que se gana en cada prenda al detal."
   ],
   [
    "Stock mínimo con alerta",
    "Cuando una prenda baja del mínimo, aparece la alerta."
   ],
   [
    "Telas por tipo, color y ubicación",
    "Drill, Oxford, lino, jean y demás, con su color y estante."
   ],
   [
    "Metros disponibles y valor en bodega",
    "Cuántos metros hay y cuánto valen."
   ],
   [
    "Rendimiento aproximado de cada tela",
    "Cuántas camisas salen, más o menos, con los metros que hay."
   ],
   [
    "Insumos: botones, hilos, reflectivos, cremalleras",
    "Lo que se usa en el taller, con su unidad y mínimo."
   ],
   [
    "Entradas, salidas y ajustes",
    "Movimientos manuales con su motivo."
   ],
   [
    "Historial de movimientos",
    "Todo lo que entró y salió, con fecha y referencia."
   ],
   [
    "Valor del inventario terminado",
    "Lo que valen las prendas listas a precio de costo."
   ]
  ]
 },
 {
  "titulo": "Reposición, conteo y etiquetas",
  "intro": "Herramientas para mantener el inventario al día sin esfuerzo: el sistema dice qué producir, compara el conteo físico con lo registrado, sube precios en bloque e imprime etiquetas.",
  "pasos": [
   "En Productos y precios toque Reponer stock para ver lo que falta y crear las órdenes.",
   "Una vez al mes toque Conteo físico, escriba lo que hay en bodega y confirme.",
   "Si sube la tela, use Ajustar precios con el porcentaje y la categoría.",
   "Toque Etiquetas para imprimir las etiquetas del salón."
  ],
  "imgs": [
   "34-reponer",
   "35-conteo",
   "33-etiquetas"
  ],
  "imgsCap": [
   "Reponer stock",
   "Conteo físico",
   "Etiquetas de precio"
  ],
  "fx": [
   [
    "Kardex de cada prenda",
    "En la ficha se ven las últimas entradas y salidas de esa prenda."
   ],
   [
    "Sugerencia de reposición por stock mínimo",
    "Lista de prendas bajo el mínimo con la cantidad sugerida a producir."
   ],
   [
    "Órdenes de producción de reposición en bloque",
    "Con un toque se crean las órdenes de todas las prendas que faltan."
   ],
   [
    "Conteo físico con diferencias por talla",
    "Se escribe lo contado y el sistema muestra lo que sobra o falta."
   ],
   [
    "Ajuste automático tras el conteo",
    "Al confirmar, el inventario queda igual a lo contado y se deja el registro."
   ],
   [
    "Ajuste de precios por porcentaje y categoría",
    "Sube o baja precios de una categoría o de todo el catálogo."
   ],
   [
    "Etiquetas de precio con logo y código",
    "Etiquetas con el logo, el precio y un código para colgar en las prendas."
   ],
   [
    "Costo y margen en la ficha de la prenda",
    "La ficha interna muestra el costo y el margen."
   ],
   [
    "Metros de tela por prenda",
    "Cada prenda guarda cuánta tela consume, para calcular producción."
   ]
  ]
 },
 {
  "titulo": "Producción en el taller",
  "intro": "Un tablero que muestra cada orden de producción en su etapa: corte, confección, bordado, terminación y listo. Calcula la tela, avisa los atrasos y suma las prendas al inventario al terminar.",
  "pasos": [
   "Toque Nueva orden, elija la prenda, la cantidad, la tela y la fecha de entrega.",
   "Revise el cálculo de tela: si no alcanza, el sistema lo dice.",
   "A medida que avanza el trabajo toque Avanzar en cada orden.",
   "Al llegar a Listo, las prendas entran solas al inventario."
  ],
  "imgs": [
   "11-produccion",
   "41-nueva-orden"
  ],
  "imgsCap": [
   "Tablero del taller",
   "Nueva orden de producción"
  ],
  "fx": [
   [
    "Órdenes de producción con consecutivo",
    "Cada orden recibe su número OP."
   ],
   [
    "Tablero por etapas: corte, confección, bordado, terminación, listo",
    "Se ve de un vistazo qué hay en cada etapa del taller."
   ],
   [
    "Cálculo de metros de tela por orden",
    "Multiplica la tela por prenda por la cantidad."
   ],
   [
    "Descuento automático de la tela",
    "Al crear la orden, los metros se restan del inventario de tela."
   ],
   [
    "Aviso si la tela no alcanza",
    "Si faltan metros, aparece en rojo antes de crear la orden."
   ],
   [
    "Responsable por orden",
    "Se asigna la modista o el operario a cargo."
   ],
   [
    "Fecha de entrega con alertas de atraso",
    "Las órdenes atrasadas o que vencen pronto se marcan."
   ],
   [
    "Barra de avance",
    "Cada orden muestra cuánto le falta."
   ],
   [
    "Entrada automática al inventario al terminar",
    "Las prendas terminadas se suman al stock."
   ]
  ]
 },
 {
  "titulo": "Compras y proveedores",
  "intro": "Cada compra de tela queda registrada y se suma sola al inventario. Las compras a crédito quedan como cuentas por pagar, y el directorio de proveedores muestra cuánto se le ha comprado a cada uno.",
  "pasos": [
   "Toque Registrar compra, elija proveedor, tela, metros y precio por metro.",
   "Indique si se pagó o quedó a crédito.",
   "Cuando pague una compra a crédito, toque Marcar pagada."
  ],
  "imgs": [
   "12-compras",
   "13-proveedores"
  ],
  "imgsCap": [
   "Compras de tela",
   "Proveedores"
  ],
  "fx": [
   [
    "Registro de compras de tela",
    "Cada compra con su número, fecha, proveedor y metros."
   ],
   [
    "Suma automática al inventario",
    "Los metros comprados se suman a la tela correspondiente."
   ],
   [
    "Actualización del costo por metro",
    "El costo de la tela se actualiza con el precio de la última compra."
   ],
   [
    "Compras a crédito y cuentas por pagar",
    "Se sabe cuánto se le debe a los proveedores."
   ],
   [
    "Directorio de proveedores",
    "Datos de contacto y qué materiales vende cada proveedor."
   ],
   [
    "Total comprado por proveedor",
    "Cuánto se le ha comprado en total a cada uno."
   ]
  ]
 },
 {
  "titulo": "Secretaría y mensajes",
  "intro": "El puesto de la secretaria: la agenda de la semana, las tareas del equipo y la bandeja de mensajes de WhatsApp, Instagram y correo con respuestas sugeridas.",
  "pasos": [
   "En Secretaría toque Agendar para crear citas, pruebas, entregas o llamadas.",
   "Marque las tareas cuando estén hechas.",
   "En Mensajes toque cada mensaje nuevo: el sistema propone la respuesta.",
   "Ajuste la respuesta si quiere y toque Abrir en WhatsApp o Guardar respuesta."
  ],
  "imgs": [
   "14-secretaria",
   "15-mensajes"
  ],
  "imgsCap": [
   "Agenda y tareas",
   "Mensajes con respuesta sugerida"
  ],
  "fx": [
   [
    "Agenda de 7 días",
    "Los compromisos de los próximos siete días, día por día."
   ],
   [
    "Citas, pruebas, entregas, llamadas y reuniones",
    "Cada compromiso con su tipo, hora y cliente."
   ],
   [
    "Tareas con prioridad y responsable",
    "Lista de pendientes con prioridad alta, media o baja."
   ],
   [
    "Bandeja de WhatsApp, Instagram, correo y llamadas",
    "Todos los mensajes de clientes en un solo lugar."
   ],
   [
    "Respuesta sugerida automática por palabras clave",
    "Si el mensaje pregunta por precios, tallas, envíos u horario, se propone la respuesta adecuada."
   ],
   [
    "Plantillas de respuesta editables",
    "Las respuestas modelo se pueden ver y adaptar."
   ],
   [
    "Responder abriendo WhatsApp",
    "Abre el chat del cliente con la respuesta ya escrita."
   ],
   [
    "Crear cliente desde un mensaje",
    "Si quien escribe es nuevo, se crea su ficha desde ahí."
   ],
   [
    "Accesos rápidos",
    "Botones para cotizar, cobrar, responder o crear cliente."
   ]
  ]
 },
 {
  "titulo": "Personal, gastos y caja",
  "intro": "El control del personal por salario o por destajo, los gastos del negocio y la caja del día, con el cierre que muestra si sobra o falta plata.",
  "pasos": [
   "Cree a cada persona e indique si gana salario o por prenda.",
   "Al final del día toque Registrar prendas para el personal a destajo.",
   "Registre cada gasto del negocio con su categoría.",
   "Al cerrar, toque Cierre de caja y escriba el efectivo contado."
  ],
  "imgs": [
   "16-empleados",
   "17-gastos"
  ],
  "imgsCap": [
   "Personal y destajo",
   "Gastos de la empresa y caja"
  ],
  "fx": [
   [
    "Empleados por salario o destajo",
    "Cada persona con su modalidad de pago."
   ],
   [
    "Registro de prendas por persona",
    "Cuántas prendas terminó cada modista y en qué orden."
   ],
   [
    "Pago de destajo calculado",
    "Prendas por tarifa: el sistema calcula lo que se le debe."
   ],
   [
    "Nómina estimada del mes",
    "La suma de salarios y destajos del mes."
   ],
   [
    "Gastos por categoría",
    "Arriendo, servicios, mantenimiento, transporte, publicidad y más."
   ],
   [
    "Ingresos y salidas del día",
    "Lo que entró y salió hoy."
   ],
   [
    "Efectivo esperado en caja",
    "La base más lo cobrado en efectivo menos los gastos en efectivo."
   ],
   [
    "Cierre de caja con faltantes y sobrantes",
    "Compara lo contado con lo esperado y lo deja registrado."
   ],
   [
    "Utilidad de caja del mes",
    "Lo recaudado menos los gastos y las compras pagadas del mes."
   ]
  ]
 },
 {
  "titulo": "Finanzas del hogar",
  "intro": "Un módulo privado, solo para la dueña, para llevar las cuentas de la casa sin mezclarlas con las de la empresa. La plata pasa del negocio a la casa como retiro de utilidades y queda registrada en ambos lados.",
  "pasos": [
   "Defina el presupuesto mensual de cada categoría en la pestaña Presupuesto.",
   "Registre los gastos de la casa a medida que ocurren.",
   "Cree los pagos fijos con su día; cuando pague, toque Pagar.",
   "Para pasar plata de la empresa a la casa use Retirar de la empresa para la casa.",
   "Cree metas de ahorro y abone cuando pueda."
  ],
  "imgs": [
   "18-hogar",
   "36-hogar-presupuesto",
   "37-hogar-fijos",
   "38-hogar-ahorro"
  ],
  "imgsCap": [
   "Resumen del hogar",
   "Presupuesto por categoría",
   "Pagos fijos",
   "Metas de ahorro"
  ],
  "fx": [
   [
    "Módulo privado solo para la administradora",
    "La secretaria y los demás usuarios no lo ven en el menú."
   ],
   [
    "Gastos de la casa por categoría",
    "Mercado, servicios, colegio, salud, transporte, recreación y más."
   ],
   [
    "Quién hizo cada gasto",
    "Se anota quién gastó para saber en qué se va la plata."
   ],
   [
    "Ingresos del hogar",
    "Retiros de la empresa, arriendos u otros ingresos de la familia."
   ],
   [
    "Disponible del mes",
    "Ingresos menos gastos de la casa en el mes."
   ],
   [
    "Presupuesto mensual por categoría",
    "Cuánto se quiere gastar en cada cosa."
   ],
   [
    "Alerta visual al pasarse del presupuesto",
    "La barra se pone amarilla al acercarse y roja al pasarse."
   ],
   [
    "Pagos fijos con día de vencimiento",
    "Arriendo, colegio, servicios, seguros, con el día en que se pagan."
   ],
   [
    "Pago fijo registrado con un toque",
    "Al tocar Pagar se marca el mes y se anota el gasto."
   ],
   [
    "Avisos de pagos vencidos y próximos",
    "Los pagos vencidos salen en rojo y los cercanos en amarillo."
   ],
   [
    "Metas de ahorro con avance",
    "Cada meta muestra cuánto se ha ahorrado y cuánto falta."
   ],
   [
    "Abonos a las metas de ahorro",
    "Se suma a la meta lo que se va ahorrando."
   ],
   [
    "Comparativo empresa y hogar del mes",
    "Lo que entró y salió en la empresa frente al gasto de la casa."
   ],
   [
    "Retiro de utilidades de la empresa a la casa",
    "Queda como gasto en la empresa y como ingreso en el hogar."
   ],
   [
    "Cuentas de la casa y la empresa sin mezclarse",
    "Cada lado lleva sus números; el retiro es el único puente."
   ],
   [
    "Gráfica de en qué se va la plata de la casa",
    "Barras con el gasto de cada categoría del mes."
   ]
  ]
 },
 {
  "titulo": "Dashboard de ventas",
  "intro": "El tablero gerencial: ocho indicadores clave y doce gráficas que muestran cómo van las ventas, por mes, canal, categoría, tipo de cliente, vendedor y método de pago. Se filtra por año, por meses y por vendedor.",
  "pasos": [
   "Entre a Análisis y luego a Dashboard de ventas.",
   "Elija el año y, si quiere, uno o varios meses.",
   "Toque el nombre de un vendedor para ver solo sus ventas; puede elegir varios.",
   "Pase el dedo por las gráficas para ver los valores exactos.",
   "Toque Meta mensual para fijar la meta de ventas."
  ],
  "imgs": [
   "57-dashboard",
   "57-dashboard-completo",
   "58-dashboard-filtrado"
  ],
  "imgsCap": [
   "Indicadores y filtros",
   "Las doce gráficas y el resumen mensual",
   "Filtrado por meses y vendedor"
  ],
  "fx": [
   [
    "Monto de ventas del período",
    "Total vendido con IVA según los filtros."
   ],
   [
    "Tasa de conversión de cotizaciones",
    "De cada 100 cotizaciones enviadas, cuántas se aprobaron."
   ],
   [
    "Crecimiento frente al año anterior",
    "Cuánto subieron o bajaron las ventas frente a los mismos meses del año pasado."
   ],
   [
    "Índice de satisfacción de clientes",
    "Calificación promedio de las encuestas, en porcentaje."
   ],
   [
    "Índice de reclamos",
    "Porcentaje de ventas que tuvieron un reclamo."
   ],
   [
    "Cumplimiento de la meta de ventas",
    "Lo vendido frente a la meta del período."
   ],
   [
    "Tiempo de ciclo del pedido a la entrega",
    "Días promedio desde el pedido hasta la entrega."
   ],
   [
    "Frecuencia de compra por cliente",
    "Cuántas veces compra en promedio cada cliente."
   ],
   [
    "Filtro por año",
    "Cambia todo el tablero al año elegido."
   ],
   [
    "Filtro por uno o varios meses",
    "Se pueden escoger meses sueltos, por ejemplo abril y agosto."
   ],
   [
    "Filtro por vendedor",
    "Muestra las ventas de uno o varios vendedores."
   ],
   [
    "Prendas vendidas por mes",
    "Unidades vendidas en cada mes."
   ],
   [
    "Ventas por categoría",
    "Cuánto vendió cada categoría de prenda."
   ],
   [
    "Ventas por canal",
    "Porcentaje vendido en salón, WhatsApp, visitas a empresas e Instagram."
   ],
   [
    "Ventas por tipo de cliente",
    "Ventas al detal, a mayoristas y a empresas."
   ],
   [
    "Monto de ventas por mes",
    "Línea con el valor vendido mes a mes."
   ],
   [
    "Ventas por vendedor",
    "Ranking de vendedores por valor vendido."
   ],
   [
    "Ventas por método de pago",
    "Porcentaje pagado por transferencia, efectivo, Nequi, crédito y tarjeta."
   ],
   [
    "Clientes totales y únicos por mes",
    "Compras del mes frente a clientes distintos que compraron."
   ],
   [
    "Costo de ventas por mes",
    "Lo que costaron las prendas vendidas cada mes."
   ],
   [
    "Tasa de conversión por mes",
    "La conversión de cotizaciones mes a mes."
   ],
   [
    "Crecimiento de ventas por mes",
    "Barras arriba o abajo de cero según cada mes frente al año anterior."
   ],
   [
    "Cumplimiento de meta por mes",
    "Cada mes frente a la línea de la meta del 100%."
   ],
   [
    "Resumen mensual con margen",
    "Tabla con ventas, prendas, costo, margen, clientes y meta de cada mes."
   ],
   [
    "Mejor vendedor del período",
    "Quién vendió más y qué parte del total representa."
   ],
   [
    "Meta mensual editable",
    "La meta de ventas se cambia cuando se quiera."
   ],
   [
    "Exportar las ventas filtradas a Excel",
    "Descarga el detalle de las ventas que se están viendo."
   ]
  ]
 },
 {
  "titulo": "Reportes y configuración",
  "intro": "Los reportes muestran la foto financiera del año. La configuración guarda los datos de la empresa, el IVA, los textos de los documentos y el respaldo cifrado. El sistema funciona en celular, tableta y computador, en tema oscuro o claro.",
  "pasos": [
   "En Configuración escriba el nombre, NIT, dirección y teléfono de la empresa.",
   "Llene los datos de cotizaciones y facturas.",
   "Cuando termine de probar, toque Empezar en limpio para borrar los datos de ejemplo.",
   "Cada semana cree un respaldo cifrado y guárdelo en un lugar seguro."
  ],
  "imgs": [
   "19-reportes",
   "22-config",
   "60-dashboard-claro"
  ],
  "imgsCap": [
   "Reportes del año",
   "Configuración y respaldo",
   "El sistema en tema claro"
  ],
  "fx": [
   [
    "Ventas netas del año",
    "Ventas del año sin IVA."
   ],
   [
    "Costo de prendas vendidas",
    "Lo que costó fabricar lo vendido."
   ],
   [
    "Utilidad y margen",
    "Lo que queda después de costos y gastos, y su porcentaje."
   ],
   [
    "Ventas por categoría",
    "Qué tipo de prenda deja más ingresos."
   ],
   [
    "Mejores clientes",
    "Los clientes que más han comprado."
   ],
   [
    "Detal vs. mayor vs. empresas",
    "Cuánto viene de cada tipo de cliente."
   ],
   [
    "Exportar ventas a Excel",
    "Todas las ventas con base, IVA, total y saldo para el contador."
   ],
   [
    "Tablas con búsqueda y orden",
    "Todas las tablas se buscan y se ordenan tocando el título de la columna."
   ],
   [
    "Exportar cualquier tabla",
    "Cada tabla tiene su botón para descargarla en Excel."
   ],
   [
    "Tema oscuro y claro",
    "El botón del sol cambia entre el tema negro y dorado y el tema claro."
   ],
   [
    "Funciona en celular, tableta y computador",
    "El diseño se acomoda al tamaño de la pantalla."
   ],
   [
    "Nombre y datos de la empresa editables",
    "El nombre, el NIT y los datos aparecen en todos los documentos."
   ],
   [
    "Empezar en limpio o cargar ejemplo",
    "Borra los datos de demostración o los vuelve a cargar."
   ]
  ]
 }
];
