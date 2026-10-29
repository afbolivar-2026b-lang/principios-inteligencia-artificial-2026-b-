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
- **Modo demostración** con datos de ejemplo que no se guardan. Ahí el código `DEMO` activa Pro.

## NOVA Pro

| Función | Gratis | Pro |
|---|---|---|
| Registros escribiendo o hablando | Ilimitados | Ilimitados |
| Anuncios | Ninguno | Ninguno |
| Ciclo de presupuesto | Mensual | Semanal, quincenal, mensual, trimestral, semestral o anual |
| Registros frecuentes (un toque) | Hasta 3 | Ilimitados |
| Etiquetas `#` para filtrar | Hasta 3 distintas | Ilimitadas |
| Ubicación, mapa y "otros pagos aquí" | No | Sí |

Pro se activa con un **código promocional** en Perfil → NOVA Pro. Los códigos
están en la tabla `fin_codigos`: la app no puede leerlos y solo se canjean con
la función `canjear_codigo`, que comprueba los usos. El usuario no puede
cambiar su propio `es_pro`, porque la base de datos solo le deja editar
el presupuesto y la ubicación.

Para crear un código nuevo (por ejemplo, para un familiar), en el SQL Editor de Supabase:

```sql
insert into public.fin_codigos (codigo, usos_max) values ('NOVA-FAMILIA-2026', 1);
```

Todavía no hay cobro: el botón de pago dice "Pagos próximamente" hasta
conectar una pasarela (Wompi, Mercado Pago o Stripe). Registrar con foto del
recibo también está pendiente, porque necesita un servicio de IA con su propia clave.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Pantallas de la app |
| `estilos.css` | Diseño (oscuro y claro) |
| `app.js` | Lógica, sesión y conexión con Supabase |
| `parser.js` | Convierte la frase escrita o dictada en un movimiento |
| `periodos.js` | Calcula el periodo actual de cada ciclo de presupuesto |
| `*.test.js` | Pruebas: `node --test app-finanzas/*.test.js` |
| `config.js` | Nombre de la app y conexión a Supabase |
| `vendor/` | Biblioteca oficial `@supabase/supabase-js` 2.45.4 (licencia MIT), incluida para no depender de un CDN |

## Base de datos (Supabase)

Las tablas `fin_cuentas`, `fin_categorias`, `fin_movimientos`, `fin_metas`,
`fin_perfiles` y `fin_frecuentes` tienen
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
