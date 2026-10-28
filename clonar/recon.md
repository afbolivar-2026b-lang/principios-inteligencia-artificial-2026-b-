# Mapa de reconocimiento: Lukas – Control de gastos (Android, también iOS)

Alcance: el ciclo principal de registrar gastos e ingresos (a mano, por voz y por foto del recibo), presupuestos mensuales por categoría, metas de ahorro, reportes y respaldo. No se clonan la marca, los textos, el logo ni la cuota de IA del plan Pro.
Para: uso personal del dueño del repositorio, en Colombia. Sin anuncios y sin ventas.
Fecha: 2026-10-28

> **Advertencia sobre la evidencia.** Google Play, App Store y Reddit estaban bloqueados en la red de la nube. Este mapa se armó con las fichas públicas de las tiendas, leídas a través del buscador. No se vieron capturas, así que **las pantallas y los campos son inferidos** a partir de las funciones anunciadas. Hay que confirmarlos con capturas o con la cuenta del propio usuario antes de construir.

## Fuentes

| # | fuente | URL | notas |
| --- | --- | --- | --- |
| 1 | ficha de Google Play | https://play.google.com/store/apps/details?id=com.jhotech.smartspend&hl=en_US | "Lukas: AI Expense Tracker". Voz, foto, presupuestos, modo privacidad, bloqueo biométrico, local primero, sincronización cifrada opcional, PDF, "Safe to Spend". Gratis con plan Pro (más cuota de IA). 1.000+ descargas, anuncios y compras |
| 2 | ficha de App Store | https://apps.apple.com/us/app/lukas-control-de-gastos/id6758321769 | "Lukas - Control de gastos". Modo invitado sin cuenta, lenguaje natural, límites por categoría con alertas, metas de ahorro, 50+ monedas, modo oscuro. 2 calificaciones (5,0) |
| 3 | historial de versiones (App Store) | https://apps.apple.com/cl/app/lukas-control-de-gastos/id6758321769?l=en-GB | editar la descripción detectada antes de guardar; la app aprende de esas correcciones |
| 4 | centro de ayuda / documentación | — | no se encontró |
| 5 | página de precios | — | no se encontró; solo "Pro amplía la cuota de IA" |
| 6 | videos de recorrido | — | no se encontraron |
| 7 | cuenta del usuario | — | no se usó |
| 8 | quejas de la categoría | ver resumen de clonar-emprendedor | Monefy, Wallet, Money Manager, Fintonic |

## Ciclo principal

Anotar un gasto en segundos (hablando, con una foto del recibo o escribiendo una frase) y ver en todo momento cuánto queda del presupuesto del mes.

## Pantallas

Todas inferidas (confianza media), salvo donde se indica.

| ID | pantalla | ruta / cómo se llega | propósito | componentes clave | estados vistos |
| --- | --- | --- | --- | --- | --- |
| S01 | Bienvenida | primer arranque | empezar como invitado o con cuenta | botones, tarjetas de introducción | (no visto) |
| S02 | Inicio / resumen del mes | pestaña Inicio | saldo del mes, "puedes gastar", últimos movimientos | tarjeta de resumen, barra de presupuesto, lista de movimientos, botón flotante + | vacío, con datos |
| S03 | Agregar movimiento | botón + | escoger cómo anotar: escribir, voz o foto | hoja inferior con 3 opciones | (no visto) |
| S04 | Dictar por voz | S03 → voz | hablar el gasto | botón de micrófono, onda de audio, texto reconocido | escuchando, procesando, error de permiso |
| S05 | Foto del recibo | S03 → foto | tomar o elegir la foto del recibo | cámara, galería, recorte | procesando, no se pudo leer |
| S06 | Confirmar movimiento | después de S04/S05 o al escribir | revisar monto, categoría, fecha y descripción antes de guardar | campos, selector de categoría, selector de fecha, botón guardar | prellenado por IA, editado (fuente 3: confianza alta) |
| S07 | Lista de movimientos | pestaña Movimientos | ver, buscar y filtrar por mes y categoría | lista agrupada por día, filtros, buscador | vacío, con datos |
| S08 | Detalle / editar movimiento | toque en un movimiento | corregir o borrar | campos, botón borrar | con datos, confirmar borrado |
| S09 | Presupuestos | pestaña Presupuestos | límite mensual por categoría y avance | barras de progreso, alerta | sin presupuestos, dentro, cerca del límite, excedido |
| S10 | Metas de ahorro | pestaña o sección Metas | meta, monto ahorrado y avance mensual | tarjetas con progreso | vacío, con datos |
| S11 | Reportes | pestaña Reportes | gráficos por categoría y por mes; exportar PDF | gráfico de torta, barras, botón exportar | vacío, con datos |
| S12 | Categorías | Ajustes → Categorías | crear, editar y ordenar categorías | lista, ícono, color | (no visto) |
| S13 | Ajustes | pestaña Ajustes | moneda, modo oscuro, bloqueo, modo privacidad, respaldo/sincronización, cuenta | interruptores, filas de navegación | (no visto) |
| S14 | Bloqueo | al abrir la app si está activo | desbloquear con huella o PIN | teclado PIN, botón biométrico | bloqueado, error |

## Flujos

```
F01 Anotar un gasto escribiendo
    S02 -> S03 -> S06 (escribe "almuerzo 18 mil") -> S02
    clics del camino feliz: 3 (estimado)
    límite: monto sin moneda, frase ambigua, sin categoría reconocida

F02 Anotar un gasto por voz
    S02 -> S03 -> S04 -> S06 -> S02
    clics del camino feliz: 4 (estimado)
    límite: permiso de micrófono negado, ruido, sin internet (la IA necesita conexión: suposición)

F03 Anotar un gasto con foto del recibo
    S02 -> S03 -> S05 -> S06 -> S02
    clics del camino feliz: 4 (estimado)
    límite: foto borrosa, recibo largo, varios montos, permiso de cámara negado

F04 Fijar un presupuesto por categoría
    S02 -> S09 -> (elegir categoría, poner límite) -> S09
    límite: categoría sin gastos, cambio de mes, alerta al 80 % y al 100 %

F05 Crear una meta de ahorro y abonar
    S10 -> nueva meta -> S10 -> abonar
    límite: meta cumplida, meta vencida

F06 Revisar reportes y exportar PDF
    S11 -> elegir mes -> exportar
    límite: mes sin datos

F07 Corregir o borrar un movimiento
    S07 -> S08 -> guardar o borrar -> S07

F08 Activar respaldo y recuperar en otro celular
    S13 -> respaldo -> (otro celular) S01 -> recuperar
    límite: sin internet, dos celulares editando a la vez
```

## Componentes

| componente | variantes | estados | se usa en |
| --- | --- | --- | --- |
| Botón | primario, secundario, fantasma, peligro | normal, presionado, deshabilitado, cargando | todas |
| Botón flotante + | — | normal, presionado | S02, S07 |
| Hoja inferior | — | abierta, cerrada | S03 |
| Campo de monto | — | vacío, con valor, error | S06, S08, S09, S10 |
| Selector de categoría | lista, cuadrícula de íconos | seleccionado | S06, S08, S09, S12 |
| Selector de fecha | — | hoy, otra fecha | S06, S08 |
| Fila de movimiento | gasto, ingreso | normal, monto oculto (modo privacidad) | S02, S07 |
| Barra de progreso | normal, alerta, excedido | — | S02, S09, S10 |
| Tarjeta de resumen | — | con datos, oculto | S02 |
| Gráfico | torta, barras | vacío, con datos | S11 |
| Grabadora de voz | — | escuchando, procesando, error | S04 |
| Visor de cámara | — | listo, procesando, error | S05 |
| Interruptor | — | encendido, apagado | S13 |
| Teclado PIN | — | normal, error | S14 |
| Aviso (toast) | éxito, error | — | todas |
| Barra de pestañas | — | pestaña activa | principal |

## Modelo de datos inferido

```
Movimiento  id, tipo (gasto | ingreso), monto, moneda, categoria_id, fecha,
            descripcion, origen (manual | voz | foto), foto_url?, creado_en, editado_en
            evidencia: fuentes 1, 2 y 3; S06
            confianza: alta (tipo, monto, categoría, fecha, descripción); suposición (origen, foto_url)

Categoria   id, nombre, icono, color, orden, archivada
            evidencia: "detecta la categoría" (fuentes 1 y 2); S12
            confianza: media

Presupuesto id, categoria_id, mes (AAAA-MM), limite, umbral_alerta
            evidencia: "límites mensuales por categoría con alertas" (fuente 2)
            confianza: alta

Meta        id, nombre, monto_objetivo, monto_ahorrado, fecha_limite?
            evidencia: "metas de ahorro, avance mes a mes" (fuente 2)
            confianza: media

Ajustes     moneda_principal, modo_oscuro, bloqueo_biometrico, modo_privacidad, sincronizacion_activa
            evidencia: fuentes 1 y 2
            confianza: alta

Correccion  id, texto_original, campo, valor_corregido
            evidencia: "la app aprende de las correcciones" (fuente 3)
            confianza: suposición
```

Relaciones: Categoria 1-n Movimiento, Categoria 1-n Presupuesto (uno por mes). Meta es independiente. Un solo usuario por dispositivo; la cuenta es opcional (modo invitado).

## Matriz de funciones

Ver `features.csv`. Must: 15, should: 10, could: 5, skip: 3. Incluye las filas nuevas con `original = no` que vienen de las quejas de la categoría.

## Fuera del alcance (no se puede o no se debe clonar)

- El nombre "Lukas", su logo, sus textos y sus íconos: son de Jotatech.
- Los anuncios: el usuario no los quiere.
- El plan Pro, la cuota de IA y las compras dentro de la app: es para uso personal.
- El modelo de IA propio de Lukas: el clon usa un servicio de IA propio del usuario, con su propia llave.
- Las tasas de cambio en vivo de 50+ monedas: basta con pesos colombianos (COP), y otras monedas opcionales después.

## Tamaño

Pantallas 14, flujos 8, entidades 6. Partes difíciles: la lectura de voz y de fotos con IA (necesita un servicio externo y una llave), el funcionamiento sin internet con respaldo y sincronización opcional, y el bloqueo biométrico en el celular. Tamaño: **M** (unas semanas). Para uso personal se puede empezar por una versión S (un fin de semana) con F01, F04, F06 y F07, y agregar la voz y la foto después.
