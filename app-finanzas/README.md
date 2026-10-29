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

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Pantallas de la app |
| `estilos.css` | Diseño (oscuro y claro) |
| `app.js` | Lógica, sesión y conexión con Supabase |
| `parser.js` | Convierte la frase escrita o dictada en un movimiento |
| `parser.test.js` | Pruebas del intérprete: `node --test app-finanzas/parser.test.js` |
| `config.js` | Nombre de la app y conexión a Supabase |
| `vendor/` | Biblioteca oficial `@supabase/supabase-js` 2.45.4 (licencia MIT), incluida para no depender de un CDN |

## Base de datos (Supabase)

Las tablas `fin_cuentas`, `fin_categorias`, `fin_movimientos` y `fin_metas` tienen
RLS: cada usuario solo ve y edita sus propias filas, y un movimiento solo puede
apuntar a una cuenta y una categoría del mismo usuario. Los visitantes sin sesión
no pueden leer nada. En el primer inicio de sesión la app crea la cuenta
"Principal" y las categorías por defecto.

En `config.js` va solo la clave **publicable**. La clave `service_role` nunca
debe ir en el navegador.

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
