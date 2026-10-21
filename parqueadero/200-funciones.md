# 200 funciones nuevas para Control de Parqueadero

Ninguna repite lo que la app ya tiene: entradas y salidas, tipos de vehículo, foto, mensualidades, convenios, tienda, inventario, caja, historial, Excel/PDF, clientes, turnos, roles, comprobante con código de barras, servicios, tarifas de día y de noche, IVA, cierre de sesión automático y tema claro u oscuro.

**Marcas:**
- ✅ ya está hecha en `index.html` (fase 1).
- 📴 funciona sin internet, una vez que el modo sin internet (sección A) esté instalado.
- 🌐 necesita internet.
- ⚡ es fácil de hacer (menos de un día).

---

## A. Funcionar sin internet (1–25)

**Lo que la app ya hace:** guarda los datos de Firestore en el equipo (`enablePersistence`). Si se va el internet con la app abierta, se pueden seguir registrando entradas y salidas, y se suben solas cuando vuelve la conexión. También muestra el aviso "Sin conexión".

**Lo que falta:** si se cierra o se recarga la página sin internet, la app no abre, porque descarga Firebase de internet y no tiene un *service worker*. Iniciar sesión también necesita internet. Las funciones 1–5 resuelven esto y van primero.

1. ✅ 📴 **Instalar la app como PWA** (manifest e ícono). Se abre desde el escritorio o el celular como una app normal.
2. ✅ 📴 **Service worker que guarda la app en el equipo** (HTML y los archivos de Firebase). Así abre aunque no haya internet.
3. ✅ 📴 **Mantener la sesión iniciada sin internet**: se usa la sesión guardada de Firebase Auth y no se pide clave otra vez.
4. ✅ 📴 **PIN local de 4 dígitos por trabajador** para cambiar de turno sin internet. Se valida contra un hash guardado en el equipo.
5. ✅ 📴 ⚡ **Contador de cambios pendientes por subir**, por ejemplo "12 cambios esperando internet".
6. ✅ 📴 ⚡ **Hora de la última sincronización** visible en la barra superior.
7. 📴 **Consecutivo de comprobante sin internet**: se reserva un bloque de números por equipo, por ejemplo del 1001 al 1100, para que no se repitan.
8. 📴 **Imprimir ticket y comprobante sin internet**. Ya funciona con `window.print`; solo hay que asegurar que el código de barras se genera en el equipo.
9. 📴 **Calcular el cobro sin internet** con las tarifas guardadas en el equipo.
10. ✅ 📴 **Respaldo automático en el equipo**: un archivo JSON diario que se descarga solo.
11. 📴 **Restaurar desde un respaldo JSON** si se daña el equipo.
12. 📴 **Exportar a Excel o CSV sin internet** con lo que está guardado en el equipo.
13. 📴 **Resolver conflictos**: si dos equipos registraron la misma placa sin internet, se muestra un aviso para elegir el registro bueno.
14. 📴 **Cola de fotos**: las fotos de los vehículos se guardan en IndexedDB y se suben cuando vuelve la conexión.
15. ✅ 📴 ⚡ **Alerta sonora** cuando se va o vuelve el internet.
16. 📴 **Modo "solo este equipo"**: todo funciona en local con IndexedDB, para parqueaderos que nunca tienen internet.
17. 📴 **Sincronizar entre dos equipos por la red wifi local**, sin internet (WebRTC o código QR).
18. 📴 **Pasar datos con código QR** de un celular a otro, por ejemplo la lista de vehículos dentro.
19. 📴 **Guardar los WhatsApp pendientes**: se arma el mensaje y se envía cuando hay conexión.
20. 📴 ⚡ **Hora local confiable**: avisar si la hora del equipo está mal, porque eso cambia los cobros.
21. 📴 **Verificar la integridad de los datos** guardados en el equipo al abrir la app.
22. 📴 **Límite de almacenamiento**: avisar cuando el equipo se está quedando sin espacio.
23. 📴 **Copia en USB**: exportar el respaldo directamente a una memoria USB.
24. ✅ 📴 ⚡ **Página "Estoy sin internet"** con lo que se puede y lo que no se puede hacer.
25. ✅ 📴 **Actualizar la app sola** cuando vuelve el internet, sin perder los datos.

## B. Entrada y salida de vehículos (26–45)
26. 📴 ⚡ Reconocer el formato de placa colombiana (carro ABC123, moto ABC12D) y avisar si está mal escrita.
27. 🌐 Leer la placa con la cámara (OCR con Tesseract.js; también puede funcionar sin internet si se guarda el modelo en el equipo).
28. 📴 Escanear el código de barras del ticket con la cámara del celular para dar la salida.
29. 📴 ⚡ Botón "Salida rápida" para cobrar en efectivo justo y cerrar con un clic.
30. 📴 Asignar puesto o celda (A-12) y verlo en el ticket.
31. 📴 Mapa visual del parqueadero con los puestos libres y ocupados.
32. 📴 ⚡ Nota libre por vehículo, por ejemplo "rayón en la puerta" o "deja las llaves".
33. 📴 Revisión de daños al entrar: dibujo del carro donde se marcan los golpes.
34. 📴 Varias fotos por vehículo: frente, atrás y laterales.
35. 📴 Registrar las llaves entregadas (valet) con el número del gancho.
36. 📴 ⚡ Registrar cascos y objetos guardados de las motos.
37. 📴 Entrada por reserva: la placa ya llega con el pago adelantado.
38. 📴 Aviso de vehículo con más de X horas dentro (posible abandono).
39. 📴 ⚡ Deshacer la última entrada o salida durante 1 minuto.
40. 📴 Corregir la placa con registro de quién la cambió.
41. 📴 Marcar un vehículo como "No dejar salir" (por ejemplo, por deuda o por orden de la policía).
42. 📴 Lista negra de placas con alerta al entrar.
43. 📴 Lista VIP con tarifa especial automática.
44. 📴 Registrar el conductor (nombre y cédula) cuando el negocio lo exige.
45. ✅ 📴 ⚡ Atajos de teclado: F2 para entrada, F4 para salida y F8 para la tienda.

## C. Cobros y pagos (46–70)
46. 📴 Tarifa plana por día (24 horas) con tope máximo.
47. 📴 Tarifa por evento, por ejemplo un concierto con un valor fijo.
48. 📴 Primeros X minutos gratis con compra en la tienda.
49. 📴 Cupones de descuento con código.
50. 📴 Sellos de comercios aliados ("validación" de un almacén vecino).
51. 📴 Pago dividido: parte en efectivo y parte con tarjeta.
52. 🌐 Pago con QR de Nequi o Daviplata con el monto exacto.
53. 🌐 Confirmación automática de pagos por transferencia (Bre-B).
54. 📴 Calculadora de billetes: el cajero pone los billetes recibidos y la app saca la devuelta.
55. 📴 Fiado o crédito a clientes conocidos, con saldo pendiente.
56. 📴 Abonos parciales a la deuda de un cliente.
57. 📴 Tarjeta prepago o monedero por placa (recargas).
58. 📴 ⚡ Redondeo automático a $100 o $50.
59. 📴 Propina para el valet, registrada aparte.
60. 📴 Cobro de multa por ticket perdido.
61. 📴 Cobro extra por pernoctar.
62. 📴 Recargo en días festivos con el calendario de festivos de Colombia.
63. 📴 Tarifas por temporada (diciembre, Semana Santa).
64. 📴 Simulador de tarifa: "¿cuánto paga alguien que entra a las 7 pm y sale a las 2 am?".
65. 📴 Historial de cambios de tarifa con fecha.
66. 📴 Anular un cobro con motivo y permiso del administrador.
67. 📴 Devoluciones de la tienda que regresan el stock.
68. 🌐 Factura electrónica conectada a Alegra, Siigo o Factus.
69. 📴 Retención y autorretención en los comprobantes para empresas.
70. 📴 Cotización para empresas (cuántos cupos al mes y cuánto valen).

## D. Mensualidades y clientes (71–95)
71. 🌐 Recordatorio automático por WhatsApp 3 días antes del vencimiento.
72. 📴 ⚡ Lista de mensualidades vencidas hoy o esta semana.
73. 📴 Renovar con un clic, extendiendo el mismo periodo.
74. 📴 Varias placas en una sola mensualidad (familia o empresa).
75. 📴 Mensualidad solo de día o solo de noche.
76. 📴 Control de entradas incluidas (por ejemplo, 20 entradas al mes).
77. 📴 Congelar la mensualidad (vacaciones).
78. 📴 Puesto fijo reservado para el abonado.
79. 📴 Carné digital del abonado con QR.
80. 📴 Contrato firmado en pantalla con el dedo.
81. 📴 Puntos de fidelidad por visita.
82. 📴 "La visita 10 es gratis".
83. 📴 Cumpleaños del cliente con descuento.
84. 📴 Etiquetas de cliente (taxi, domiciliario, vecino, empresa).
85. 📴 Ficha del cliente con todas sus visitas y gastos.
86. 🌐 Enviar el comprobante por correo.
87. 🌐 Portal del cliente para ver su mensualidad y pagar.
88. 🌐 Encuesta de satisfacción por WhatsApp.
89. 📴 Clientes inactivos (que dejaron de venir) para recuperarlos.
90. 🌐 Mensajes masivos de promoción por WhatsApp a los clientes que lo aceptaron.
91. 📴 Registrar la autorización de tratamiento de datos (Ley 1581).
92. 📴 Borrar los datos de un cliente si lo pide (derecho de supresión).
93. 📴 Unir clientes duplicados.
94. 📴 Importar clientes desde Excel.
95. 📴 Convenios con un tope mensual de horas por empresa.

## E. Tienda e inventario (96–120)
96. 📴 Lector de código de barras (USB o cámara) para vender productos.
97. 📴 Combos (gaseosa y papas a un precio especial).
98. 📴 Precio por cantidad (3 por $5.000).
99. 📴 Proveedores con teléfono y lo que se les debe.
100. 📴 Órdenes de compra a proveedores.
101. 📴 Sugerencia de pedido según lo que se vende por semana.
102. 📴 Fechas de vencimiento por lote con alerta.
103. 📴 Inventario físico: contar y ajustar, viendo las diferencias.
104. 📴 Mermas (producto dañado o vencido) con motivo.
105. 📴 Productos más vendidos y menos vendidos.
106. 📴 Margen de ganancia por producto.
107. 📴 Cambiar varios precios a la vez (por ejemplo, subir 5 %).
108. 📴 Fotos de los productos en la tienda.
109. 📴 Vender servicios de la tienda (recargas, minutos) sin stock.
110. 📴 Agregar productos de la tienda a la cuenta del parqueo y cobrar todo junto.
111. 📴 Venta en espera (dejar una venta abierta y atender a otro cliente).
112. 📴 Varias bodegas o neveras.
113. 📴 Historial de cambios de costo.
114. 📴 Alerta de producto sin moverse en 30 días.
115. 📴 Etiquetas de precio para imprimir.
116. 📴 Importar productos desde Excel.
117. 📴 Impuesto al consumo o IVA por producto.
118. 📴 Ventas por hora del día.
119. 📴 Gastos menores del negocio (aseo, papelería, servicios públicos).
120. 📴 Ganancia neta: ingresos menos costos y gastos.

## F. Caja, turnos y control (121–145)
121. 📴 Base de caja al iniciar el turno.
122. 📴 Arqueo al cerrar el turno: contar los billetes por denominación y ver si sobra o falta.
123. 📴 Retiros de caja durante el turno (mandar plata a la oficina).
124. 📴 Entrega de turno con firma del que entrega y del que recibe.
125. 📴 Cuadre de turno impreso en la impresora de tickets.
126. 📴 Alerta de faltante mayor a X pesos.
127. 📴 Bitácora de todo lo que hizo cada usuario (auditoría).
128. 📴 Avisar cuando alguien borra o anula registros.
129. 📴 Horario permitido por trabajador.
130. 📴 Registro de entrada y salida del personal (asistencia).
131. 📴 Horas trabajadas para calcular el pago.
132. 📴 Comisión por ventas de la tienda para los trabajadores.
133. 📴 Metas diarias con barra de progreso.
134. 📴 Notas entre turnos ("llamar al de la placa XYZ").
135. 📴 Tareas de aseo y revisión por turno, con lista de chequeo.
136. 📴 Reporte de incidentes (choques, robos) con foto.
137. 📴 Libro de objetos perdidos.
138. 📴 Permisos más finos: por ejemplo, la secretaria puede anular, pero no borrar.
139. 🌐 Verificación en dos pasos para el administrador.
140. ✅ 📴 Bloquear la pantalla con PIN sin cerrar la sesión.
141. 📴 Modo cajero de solo cobro, con la pantalla simplificada.
142. 📴 Modo supervisor de solo lectura.
143. 🌐 Ver varios parqueaderos (sedes) desde una sola cuenta.
144. 🌐 Comparar las sedes entre sí.
145. 🌐 Pasar abonados de una sede a otra.

## G. Reportes y estadísticas (146–165)
146. 📴 Gráfico de ocupación por hora (cuándo se llena).
147. 📴 Mapa de calor por día de la semana y hora.
148. 📴 Tiempo promedio de permanencia por tipo de vehículo.
149. 📴 Ingresos por tipo de vehículo en gráfico.
150. 📴 Comparar este mes con el mes anterior.
151. 📴 Comparar este año con el año anterior.
152. 📴 Proyección de ingresos del mes.
153. 📴 Rotación de cupos (cuántas veces se usa cada puesto al día).
154. 📴 Horas pico para planear el personal.
155. 📴 Reporte para el contador en un Excel organizado.
156. 🌐 Reporte diario enviado solo por WhatsApp o correo al dueño.
157. 📴 Panel de TV para la oficina con los datos en vivo.
158. 📴 Reporte de descuentos y convenios entregados.
159. 📴 Reporte de anulaciones.
160. 📴 Reporte de clientes nuevos y clientes que regresan.
161. 📴 Ingresos por medio de pago en gráfico.
162. 📴 Reporte personalizado eligiendo columnas y fechas.
163. 📴 Guardar filtros favoritos del historial.
164. 📴 Reporte de turnos con sobrantes y faltantes.
165. 📴 Indicador de "días sin faltantes".

## H. Experiencia del cliente y del público (166–180)
166. 📴 Pantalla pública de "cupos disponibles" para la entrada.
167. 🌐 Página web pública con los cupos disponibles en vivo.
168. 🌐 Reservas en línea con pago.
169. 🌐 El cliente consulta lo que va a pagar escaneando el QR del ticket.
170. 🌐 Pagar antes de llegar a la salida, desde el celular.
171. 🌐 Aviso al cliente: "su carro está listo" (lavado o valet).
172. 🌐 Pedir el carro al valet desde el celular.
173. 📴 Ticket con publicidad de la tienda.
174. 📴 Ticket en inglés para turistas.
175. 🌐 Google Maps y reseñas: botón de "califíquenos".
176. 📴 Turnos de lavado con hora estimada.
177. 🌐 Notificación al abonado cuando su puesto fijo está ocupado.
178. 📴 Cartel imprimible de tarifas generado desde Ajustes.
179. 📴 Avisos legales en el ticket (responsabilidad, horario).
180. 🌐 Chat del parqueadero por WhatsApp Business.

## I. Hardware e integraciones (181–192)
181. 📴 Impresión directa en impresora térmica (WebUSB o ESC/POS) sin el cuadro de impresión.
182. 📴 Abrir el cajón de dinero al cobrar.
183. 📴 Abrir la talanquera (barrera) con un relé USB o wifi.
184. 📴 Lector de tarjetas RFID o TAG para abonados.
185. 📴 Pantalla secundaria para el cliente con el valor a pagar.
186. 🌐 Cámara IP en la entrada que toma la foto sola.
187. 📴 Balanza para vender productos por peso.
188. 🌐 Integración con datáfono (Bold, Wompi, SumUp).
189. 🌐 Exportar a Siigo o Alegra para la contabilidad.
190. 🌐 Integración con Google Sheets para reportes.
191. 🌐 API o webhook para otros sistemas.
192. 🌐 Respaldo automático en Google Drive.

## J. Ajustes y comodidad (193–200)
193. 📴 Asistente de configuración inicial paso a paso.
194. 📴 Cambiar el logo del negocio para el ticket y el menú.
195. ✅ 📴 Elegir uno de los 200 diseños de la galería como tema de la app.
196. 📴 Tamaño de letra grande para personas mayores.
197. 📴 Modo zurdo o modo tableta con botones grandes.
198. 📴 Idioma inglés.
199. 📴 Tutorial interactivo para trabajadores nuevos.
200. 📴 ⚡ Página de ayuda con preguntas frecuentes y videos cortos.

---

## Por dónde empezar (recomendado)
1. **1, 2, 3 y 5**: que la app abra y trabaje sin internet aunque se recargue. Es lo más importante para no perder ventas.
2. **7**: consecutivos que no se repitan sin internet.
3. **122**: arqueo de caja al cerrar el turno.
4. **181 y 182**: impresión térmica directa y apertura del cajón.
5. **71**: recordatorios de mensualidad por WhatsApp.
