# Registro de construcción

Referencia de diseño: imágenes "NOVA" del usuario (`clonar/design/referencia/`). Nombre provisional: **Nova** (revisar marca registrada en `/clonar-marca`).

| ID | pantalla | fecha | estado | qué falta | lo más difícil |
| --- | --- | --- | --- | --- | --- |
| S01 | Bienvenida y tutorial | — | pendiente | todo | — |
| S02 | Inicio | 2026-10-28 | terminada | tarjeta de metas (hoy dice "Sin metas todavía"), campana de recordatorios | degradado verde en claro y vidrio oscuro en oscuro, sin colores sueltos |
| S03+S06 | Agregar y editar movimiento | 2026-10-28 | terminada (manual) | frase con IA, voz y foto | un botón reutilizado por el navegador cerraba la ventana al tocar "No" (corregido, ver abajo) |
| S07 | Movimientos | 2026-10-28 | terminada | — | — |
| S08 | Editar y borrar | 2026-10-28 | terminada | — | "Deshacer" tanto después de editar como de borrar |
| S09 | Presupuestos | 2026-10-28 | terminada | — | decidir que el límite se repite cada mes hasta cambiarlo |
| S11 | Análisis | 2026-10-28 | terminada | — | que ingresos y gastos no se vean del mismo verde (los gastos pasaron a ámbar) |
| S12 | Categorías | 2026-10-28 | terminada | color propio por categoría | — |
| S13 | Ajustes y respaldo | 2026-10-28 | terminada | borrar todos los datos, bloqueo con PIN o huella, modo privacidad | respaldo cifrado y validar archivos de fuera |
| S10 | Metas de ahorro | — | pendiente | todo | — |
| S04, S05 | Voz y foto | — | pendiente | necesitan la función de IA | — |
| S14 | Bloqueo | — | pendiente | todo | — |

## Decisiones tomadas al seguir la imagen de referencia
- Pestañas: Inicio, Análisis, Presupuestos, Metas, Ajustes (la imagen decía Home, Analytics, Card, Goals, Profile; "Card" y "Profile" no aplican). La lista completa de movimientos se abre con "Ver todo" en Inicio.
- No se usa la foto de perfil (no hay cuentas) ni los logos de Starbucks y Spotify (cada categoría usa un ícono genérico).
- El balance es ingresos menos gastos del mes; en vez del "% del mes" hay dos chips (Ingresos y Gastos).
- La imagen repetía "Tue" y "Fri" en el gráfico semanal (error de la imagen); aquí son los 7 días.
- Presupuestos: un límite rige desde el mes en que se pone hasta que se cambie o se quite. Quitarlo borra el historial de ese límite.
- Alertas: al guardar un gasto, si su categoría llega al umbral (70 a 100 %) o se pasa, sale un aviso en el momento. En Inicio se muestran las 2 más graves y se cuenta cuántas más hay.
- Respaldo: JSON con todos los datos. Con clave se cifra con AES-GCM de 256 bits (clave derivada con PBKDF2-SHA256, 600.000 vueltas). Al recuperar se valida cada dato del archivo; "Sumar" junta las categorías con el mismo nombre y no duplica movimientos.
- El tema (Automático, Claro, Oscuro) se aplica antes de pintar la pantalla, para que no parpadee.

## Errores encontrados y corregidos al probar
1. Al tocar "No" en "¿Borrar este gasto?" (y en "¿Quitar este límite?") se cerraba la ventana y se guardaba: el navegador reutilizaba el botón "No" como botón "Guardar" mientras terminaba el clic. Solución: cada botón del pie lleva su propia clave. Lo cubre la prueba de punta a punta.
2. Escape no cerraba la hoja si el cursor aún no había entrado a ella. Ahora el cursor entra al abrir y Escape funciona en toda la pantalla.
3. El botón Guardar quedaba escondido al fondo de una hoja larga. Ahora está fijo abajo.
4. Ingresos y gastos se veían casi del mismo verde en "Mes a mes". Los gastos ahora son ámbar.

## Pruebas
- 62 pruebas unitarias (dinero, fechas, estadísticas, datos, categorías, presupuestos, reportes, avisos y respaldo): `cd app && npm test`.
- Pruebas de punta a punta con navegador real (`app/e2e/`): `prueba-basica.cjs` (10 comprobaciones) e `imprescindibles.cjs` (19 comprobaciones, incluye respaldo con clave, recuperar en un "celular nuevo", modo sin internet y pantalla de 390 y 1440 px). Todas pasan.
- Pendiente para `/clonar-probar`: lector de pantalla, solo teclado a fondo y prueba en un celular real.

## Pendientes de seguridad y mantenimiento
- `npm audit` marca 7 avisos, todos en herramientas de desarrollo (vitest, workbox-build). En lo que viaja al celular hay 0.
