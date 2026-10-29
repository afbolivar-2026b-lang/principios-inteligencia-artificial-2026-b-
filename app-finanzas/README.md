# NOVA: finanzas personales

App web para anotar gastos e ingresos escribiendo o dictando frases como
"gasté 20 mil en almuerzo" o "me pagaron 2 millones". Inspirada en Lukas
(control de gastos) y con el diseño NOVA, en modo oscuro y claro.

No necesita compilación: son archivos estáticos que se pueden publicar tal cual en Vercel.

## Qué hace

- **Inicio:** balance disponible y su cambio en el mes, meta de ahorro principal,
  gastos de la semana contra la semana pasada, gráfico de lunes a domingo y
  actividad reciente.
- **Entrada rápida:** entiende montos como `20 mil`, `15k`, `850.000`,
  `2 millones`, `1,5 millones`, `30 lucas` o `2 palos`. También sabe si es gasto o
  ingreso, elige la categoría y reconoce "ayer". Antes de guardar muestra lo que
  entendió y deja cambiar la categoría.
- **Dictado por voz** en navegadores que lo permiten (Chrome, Edge, Safari).
- **Análisis** del mes por categoría y lista de todos los movimientos, con opción de borrar.
- **Cuentas** (Nequi, banco, efectivo…) con su saldo, y **metas de ahorro** con abonos.
- **Modo demostración** con datos de ejemplo que no se guardan.

## Todo gratis

Todas las funciones están disponibles para todas las cuentas, sin pagos ni códigos:

- Registros escribiendo, hablando o con foto del recibo, sin límite.
- Presupuesto semanal, quincenal, mensual, trimestral, semestral o anual.
- Registros frecuentes de un toque, sin límite.
- Etiquetas `#` para filtrar, sin límite.
- Ubicación de cada pago con enlace al mapa y "otros pagos aquí".

**Foto del recibo:** el botón de cámara lee la foto en el mismo celular con
Tesseract (`vendor/tesseract/`, sin servicios externos ni costo). `recibo.js` busca
el TOTAL (ignora subtotal, IVA, efectivo y cambio) y el nombre del negocio, y lo
pasa a la entrada rápida para revisarlo antes de guardar. Funciona mejor con
fotos de cerca, con buena luz y el recibo derecho.

## Registros con IA (Gemini)

Cuando hay sesión iniciada, la entrada rápida (texto o voz) y la foto del recibo
se mandan primero a la función `nova-ia` de Supabase
(`supabase/functions/nova-ia/index.ts`), que le pregunta a Gemini de Google y
devuelve tipo, valor, descripción, categoría, etiquetas y día. La vista previa
muestra la marca "✦ IA" cuando la respuesta viene de ahí.

- **Pregúntale a NOVA:** en Inicio hay un chat para hacerle preguntas a la IA
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
| `*.test.js` | Pruebas: `node --test app-finanzas/*.test.js` |
| `config.js` | Nombre de la app y conexión a Supabase |
| `vendor/` | `@supabase/supabase-js` 2.45.4 (MIT) y Tesseract.js 5.1.1 con el modelo en español (Apache-2.0), incluidos para no depender de un CDN |

## Base de datos (Supabase)

Las tablas `fin_cuentas`, `fin_categorias`, `fin_movimientos`, `fin_metas`,
`fin_perfiles` y `fin_frecuentes` tienen
RLS: cada usuario solo ve y edita sus propias filas, y un movimiento solo puede
apuntar a una cuenta y una categoría del mismo usuario. Los visitantes sin sesión
no pueden leer nada. En el primer inicio de sesión la app crea la cuenta
"Principal" y las categorías por defecto.

En `config.js` va solo la clave **publicable**. La clave `service_role` nunca
debe ir en el navegador.

## Inicio de sesión

- **Candado** en el campo de contraseña para verla u ocultarla.
- **¿Olvidaste tu contraseña?** envía un correo con un enlace. Ese enlace abre
  la app en `sitioUrl` (de `config.js`) y pide la contraseña nueva dos veces.
  Si el enlace venció, la app lo dice y deja pedir otro.
- **Crear cuenta** envía un correo de verificación al correo de la persona. Su
  enlace abre la app, que muestra "¡Tu correo quedó verificado!". Si no llega,
  aparece "Reenviar el correo de verificación".
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
