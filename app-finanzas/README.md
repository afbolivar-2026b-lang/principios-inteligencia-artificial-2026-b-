# NOVA: finanzas personales

App web para anotar gastos e ingresos escribiendo o dictando frases como
"gasté 20 mil en almuerzo" o "me pagaron 2 millones". Inspirada en Lukas
(control de gastos) y con el diseño NOVA, en modo oscuro y claro.

No necesita compilación: son archivos estáticos que se pueden publicar tal cual en Vercel.

## Qué hace

Está pensada como Lukas, pero todo es gratis y sin anuncios.

- **Inicio:** periodo con flechas (mes, quincena, semana…), balance del periodo con
  ingresos y gastos, aviso de déficit, **"Seguro para gastar"** (cuánto puedes gastar
  por día hasta el final del periodo), entrada rápida, registros comunes de un toque,
  presupuesto, meta, gastos de la semana y movimientos agrupados por día. El ojo de
  arriba oculta los valores.
- **NOVA IA (pestaña del centro):** lista de tus conversaciones con la IA (con buscador),
  lápiz para empezar una nueva, y un chat con preguntas sugeridas hechas con tus propios
  datos ("¿Cuánto he gastado en Comida los últimos 3 meses?", "¿Puedo gastar $ X hoy sin
  afectar mi presupuesto?"). Las conversaciones se guardan en tu cuenta (`fin_conversaciones`).
  Ajustes se abre con tu foto de la esquina.
- **Otras monedas:** al registrar un gasto o ingreso, toca la moneda (COP ▾) y elige entre
  35 monedas (dólar, euro, dólar canadiense, peso mexicano…). NOVA calcula los pesos con la
  tasa del día, que puedes corregir a mano. Guarda el valor original, la moneda y la tasa
  (`moneda`, `monto_original` y `tasa` en `fin_movimientos`); todo el análisis usa pesos.
  El teclado tiene coma para los centavos. Tasas: ExchangeRate-API (`open.er-api.com`,
  gratis y sin clave, una actualización al día), pedidas por la función `nova-ia` y
  guardadas 12 horas en el celular.
- **Modo conductor (Didi, Uber, inDrive, Cabify…):** se activa en Configuración. Crea las
  categorías de ganancias por app y de gastos del vehículo (gasolina, tinto y comida en ruta,
  peajes, parqueadero, lavado, mantenimiento y arreglos, repuestos, llantas, SOAT, tecnomecánica,
  impuesto, seguro, multas). Muestra "Mi jornada de hoy" en el inicio y la pantalla **Mi trabajo**:
  - ganancia neta (ganado con las apps menos gasolina, tinto, peajes, arreglos…) de hoy, la semana
    o el mes. Los **papeles y cuotas** (SOAT, tecnomecánica, impuesto, seguro y cuota de la moto) se
    muestran aparte para que un pago grande no deje en rojo un día bueno;
  - viajes anotados y ganancia por viaje, meta diaria con barra, ganancias por app y gastos del trabajo;
  - atajos de un toque para anotar una ganancia (eligiendo la app y los viajes) o un gasto;
  - **vencimientos del vehículo** (SOAT, tecnomecánica, seguro de la moto —cuota mensual o anual—,
    cuota de la moto, impuesto, licencia, aceite…). Al activar el modo conductor NOVA pide de una vez
    la fecha del SOAT y la de la tecnomecánica. Avisa en el inicio y, en la APK, con notificaciones
    del celular (al empezar el plazo, a los 15, 7, 3 y 1 días y el día del vencimiento) y, si ya se
    pasó, una notificación diaria durante una semana hasta que se renueve. Las cuotas mensuales
    avisan 5 días antes y, al pagarlas, la fecha corre un mes. "Renovar" abre el gasto ya con su categoría y costo, y al
    guardarlo corre la fecha al siguiente vencimiento.
  Los movimientos "pendientes" no cuentan. El chat con la IA también conoce estos datos.
- **Botón +:** Asistente inteligente (varios gastos a la vez, dictados, escritos o con
  foto), gasto o ingreso a mano y el chat con la IA.
- **Nuevo gasto o ingreso:** teclado de números con calculadora (`+ − × ÷`), fecha,
  descripción, categoría (con buscador, frecuentes y grupos), cuenta, etiquetas con
  sugerencias, **estado** (pagado o pendiente), **nota**, **hacer recurrente** y
  "guardar y agregar otro". Tocar un movimiento lo edita o lo borra.
- **Planes:** límites de gasto por categoría o generales (semanal a anual, que se
  renuevan solos) con su barra de avance, y metas de ahorro con abonos.
- **Análisis:** por ciclo y periodo, con vista rápida (promedio diario, categoría top,
  día que más gastas, cambio contra el periodo anterior), dona de gastos por categoría,
  gasto por etiqueta, ingresos contra gastos, tendencia y proyección del balance a 90
  días. Se pueden mostrar, ocultar y reordenar (⚙ Personalizar). Tocar una categoría
  abre sus movimientos.
- **Buscar:** por nombre, nota, categoría o etiqueta, con filtros (tipo, fechas,
  categoría, etiqueta, estado) y orden; se puede exportar el resultado a CSV.
- **Configuración:** período de presupuesto, **categorías** (crear, editar, borrar, con
  ícono, color y grupo), registros comunes, etiquetas (crear, renombrar, quitar),
  **programadas** (pagos que se registran solos al abrir la app), cuentas, "Seguro para
  gastar", ubicación de cada pago, **exportar** (CSV de movimientos, categorías y
  límites, respaldo JSON y reporte PDF) y tema.
- **Entrada rápida:** entiende montos como `20 mil`, `15k`, `850.000`, `2 millones`,
  `30 lucas` o `2 palos`, decide gasto o ingreso, elige la categoría y reconoce "ayer".
  Antes de guardar muestra lo que entendió. También por voz y con foto del recibo.
- **Modo demostración** con datos de ejemplo que no se guardan.

La exportación y el PDF se descargan desde el navegador; dentro de la APK avisan que
hay que abrir la página web.

## Todo gratis

Todas las funciones están disponibles para todas las cuentas, sin pagos, códigos ni
anuncios: IA ilimitada (texto, voz, imagen y chat), ciclos de presupuesto, registros
comunes, programados y etiquetas sin límite, ubicación con mapa y exportación.

**Foto del recibo:** el botón de cámara lee la foto con la IA y, si no hay, en el
mismo celular con Tesseract (`vendor/tesseract/`, sin servicios externos ni costo).
`recibo.js` busca el TOTAL (ignora subtotal, IVA, efectivo y cambio) y el nombre del
negocio, y lo pasa a la entrada rápida para revisarlo antes de guardar.

## Registros con IA (Gemini)

Cuando hay sesión iniciada, la entrada rápida (texto o voz) y la foto del recibo
se mandan primero a la función `nova-ia` de Supabase
(`supabase/functions/nova-ia/index.ts`), que le pregunta a Gemini de Google y
devuelve tipo, valor, descripción, categoría, etiquetas y día. La vista previa
muestra la marca "✦ IA" cuando la respuesta viene de ahí.

- **Asistente inteligente:** mismo modo de la función con `varios: true`; devuelve
  hasta 30 movimientos de un texto, un dictado o varias líneas, y se revisan antes de guardar.
- **Tasas de cambio:** con `{ tasas: true }` devuelve las tasas con base en USD, sin gastar
  cupo de Gemini y sin necesitar la clave.
- **Pregúntale a NOVA:** el chat (pestaña NOVA IA, botón + o tarjeta del inicio) para hacerle preguntas a la IA
  ("¿en qué gasto más este mes?", "¿cuánto me queda del presupuesto?"). La app
  le manda un resumen de las cuentas, el mes, el presupuesto, las metas y los
  últimos 150 movimientos, más las últimas preguntas de la conversación. La
  conversación no se guarda: se borra al cerrar la app.
- **Clave:** la función lee el secreto `GEMINI_API_KEY` (Supabase → Edge
  Functions → Secrets). La clave gratuita se saca en https://aistudio.google.com
  → "Get API key". La app nunca ve la clave.
- **Modelo:** `gemini-flash-latest`; se puede cambiar con el secreto `GEMINI_MODEL`.
- **Sin clave, sin internet o sin cupo:** la app sigue funcionando con
  `parser.js` (texto) y Tesseract (fotos), como antes. En modo demostración
  nunca se usa la IA.
- **Privacidad:** con el plan gratuito, Google puede usar lo que se le envía
  para mejorar sus productos. No mandes fotos con datos sensibles.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Pantallas de la app |
| `estilos.css` | Diseño (oscuro y claro) |
| `app.js` | Lógica, sesión y conexión con Supabase |
| `parser.js` | Convierte la frase escrita o dictada en un movimiento |
| `periodos.js` | Calcula el periodo actual de cada ciclo de presupuesto |
| `recibo.js` | Saca el total y el negocio del texto leído en la foto de un recibo |
| `analisis.js` | Cálculos sin pantalla: periodos, análisis, búsqueda, calculadora, programados y CSV |
| `monedas.js` | Lista de monedas, búsqueda y cambio a pesos |
| `*.test.js` | Pruebas: `node --test app-finanzas/*.test.js` |
| `config.js` | Nombre de la app y conexión a Supabase |
| `vendor/` | `@supabase/supabase-js` 2.45.4 (MIT) y Tesseract.js 5.1.1 con el modelo en español (Apache-2.0), incluidos para no depender de un CDN |

## Base de datos (Supabase)

Las tablas `fin_cuentas`, `fin_categorias` (con color y grupo), `fin_movimientos`
(con nota, estado y programación de origen), `fin_metas`, `fin_perfiles`,
`fin_frecuentes`, `fin_programados`, `fin_limites`, `fin_conversaciones` y `fin_documentos` tienen
RLS: cada usuario solo ve y edita sus propias filas, y un movimiento solo puede
apuntar a una cuenta y una categoría del mismo usuario. Los visitantes sin sesión
no pueden leer nada. En el primer inicio de sesión la app crea la cuenta
"Principal" y las categorías por defecto.

En `config.js` va solo la clave **publicable**. La clave `service_role` nunca
debe ir en el navegador.

## Inicio de sesión

- **Candado** en el campo de contraseña para verla u ocultarla.
- **Crear cuenta** y **¿Olvidaste tu contraseña?** mandan un **código** al correo de la persona,
  que se escribe en la app (verificar la cuenta, o elegir la contraseña nueva). Hay "Reenviar el
  código" con una espera de un minuto, y los enlaces de correos viejos siguen funcionando. Las
  plantillas de los correos están en `supabase/plantillas-correo.md` y se pegan en el panel de
  Supabase.
- **Continuar con Google:** entra sin contraseña (y sirve para recuperar la cuenta). El botón aparece
  solo cuando Google está activado en Supabase; los pasos están en `supabase/google-login.md`.
  En la APK se abre el navegador del celular y se vuelve a NOVA por `co.novafinanzas.app://login-callback`.
- Supabase manda pocos correos por hora con su servidor de correo gratuito.

## App para Android (APK)

Cada vez que cambia `app-finanzas/` o `app-android-nova/`, el flujo de GitHub Actions
`.github/workflows/apk-nova.yml` arma la APK con Capacitor y la guarda en
`app-finanzas/descargas/NOVA.apk`. La pantalla de inicio y el Perfil muestran
"Descargar la app para Android" cuando el archivo existe. Dentro de la app
instalada no se muestra.

- **Enlace fijo a la última APK:** el flujo también la sube, con `version.json`,
  a la versión de GitHub `nova-android` (`apkUrl` y `apkVersionUrl` en
  `config.js`). Los botones de descarga de la página llevan ahí, así que dan la
  APK más nueva aunque la página no se haya vuelto a publicar.
- **Aviso de actualización:** la APK lleva su número en `version-app.json`. Al
  abrirla (y al volver a ella) compara ese número con `version.json`; si hay una
  más nueva, muestra arriba "Hay una versión nueva de NOVA" con el botón para
  descargarla e instalarla encima.
- **Ícono y pantalla de inicio:** el logo de NOVA en `app-android-nova/recursos/res/`.
  Se generan desde un dibujo, así que cambiarlos es cambiar esas imágenes.
- **Firma:** `app-android-nova/firma/debug.keystore` es una firma de depuración
  (contraseña `android`, la estándar). Se guarda en el repositorio y se le pasa
  a Gradle para que cada versión nueva se instale encima de la anterior; el
  flujo comprueba la huella antes de publicar. Las APK 1.1 a 1.6 salieron con
  otra firma: quien tenga una de esas debe desinstalarla una vez. Para publicar en Google Play
  hace falta una firma propia y secreta.
- **Avisos de vencimientos:** `@capacitor/local-notifications` programa las notificaciones de
  `fin_documentos` cada vez que se abre la app o cambia algo. En Android 13 o más pide permiso.
- **Voz y cámara en la APK:** el dictado usa el reconocimiento de voz del
  celular (`@capacitor-community/speech-recognition`), y la foto del recibo usa
  la cámara. La APK pide permiso de micrófono, cámara y ubicación la primera vez.

## Probar en tu ordenador

```
npx serve app-finanzas
```

## Publicar en Vercel

```
cd app-finanzas
vercel          # vista previa
vercel --prod   # producción
```

Después de publicar, abre Supabase → Authentication → URL Configuration y pon
la dirección de Vercel en **Site URL**. Así el enlace del correo de
confirmación lleva a tu app.
