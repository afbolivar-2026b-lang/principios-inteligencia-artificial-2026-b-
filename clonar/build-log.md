# Registro de construcción

Referencia de diseño: imágenes "NOVA" del usuario (`clonar/design/referencia/`). Nombre provisional: **Nova** (revisar marca registrada en `/clonar-marca`).

| ID | pantalla | fecha | estado | qué falta | lo más difícil |
| --- | --- | --- | --- | --- | --- |
| S01 | Bienvenida y tutorial | — | pendiente (es opcional, "should") | todo | — |
| S02 | Inicio | 2026-10-28 | terminada | tarjeta de metas (hoy dice "Sin metas todavía"), campana de recordatorios | degradado verde en claro y vidrio oscuro en oscuro, sin colores sueltos |
| S03+S06 | Agregar y editar movimiento | 2026-10-28 | terminada | — | un botón reutilizado por el navegador cerraba la ventana al tocar "No" (corregido, ver abajo) |
| S07 | Movimientos | 2026-10-28 | terminada | — | — |
| S08 | Editar y borrar | 2026-10-28 | terminada | — | "Deshacer" tanto después de editar como de borrar |
| S09 | Presupuestos | 2026-10-28 | terminada | — | decidir que el límite se repite cada mes hasta cambiarlo |
| S11 | Análisis | 2026-10-28 | terminada | — | que ingresos y gastos no se vean del mismo verde (los gastos pasaron a ámbar) |
| S12 | Categorías | 2026-10-28 | terminada | color propio por categoría | — |
| S13 | Ajustes y respaldo | 2026-10-28 | terminada | borrar todos los datos, bloqueo con PIN o huella, modo privacidad | respaldo cifrado y validar archivos de fuera |
| S10 | Metas de ahorro | — | pendiente | todo | — |
| S04 | Voz (dentro de la hoja de anotar) | 2026-10-28 | terminada | solo funciona en navegadores con reconocimiento de voz (Chrome en Android) | que el micrófono simulado de la prueba reemplazara también la versión sin prefijo que trae Chrome |
| S05 | Foto del recibo (dentro de la hoja) | 2026-10-28 | terminada | solo con IA; sin IA avisa cómo activarla | reducir la foto en el celular antes de mandarla |
| API | `/api/estado`, `/api/interpretar`, `/api/recibo` | 2026-10-28 | terminada y probada con IA simulada | verificar en un despliegue real de Vercel | límites y validaciones sin depender de una base de datos |
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

## Decisiones del backend (hito 3)
- El servidor son tres funciones sueltas de Vercel; la lógica está en `app/server/ia.ts`, que se prueba sin Vercel. Usa `fetch` directo a la API de Anthropic, sin librerías.
- La IA se obliga a responder con una herramienta de esquema fijo (`registrar_movimiento`) y su respuesta se vuelve a revisar en el servidor.
- Sin IA, `src/entenderLocal.ts` entiende lo básico (monto, categoría, medio de pago, fecha, ingreso o gasto) en el propio celular. Así "la frase" funciona gratis y sin internet; la IA la mejora y es la única que lee fotos.
- Si la IA falla (ocupada, sin internet, código malo), la app lo dice con una razón corta y sigue con el lector local.
- El código de acceso vive en Ajustes (solo en el celular, fuera de los respaldos). Los respaldos recuerdan el origen de cada gasto (manual, frase, voz, foto).
- El script del tema pasó a un archivo propio (`public/tema.js`) para poder usar una política de seguridad (CSP) sin scripts en línea.

## Errores encontrados y corregidos al probar
1. Al tocar "No" en "¿Borrar este gasto?" (y en "¿Quitar este límite?") se cerraba la ventana y se guardaba: el navegador reutilizaba el botón "No" como botón "Guardar" mientras terminaba el clic. Solución: cada botón del pie lleva su propia clave. Lo cubre la prueba de punta a punta.
2. Escape no cerraba la hoja si el cursor aún no había entrado a ella. Ahora el cursor entra al abrir y Escape funciona en toda la pantalla.
3. El botón Guardar quedaba escondido al fondo de una hoja larga. Ahora está fijo abajo.
4. Ingresos y gastos se veían casi del mismo verde en "Mes a mes". Los gastos ahora son ámbar.
5. El campo oculto para subir archivos aparecía como un segundo botón "Foto del recibo" para un lector de pantalla. Ahora está oculto de verdad.
6. Había un formulario dentro de otro en la hoja de anotar (no es válido en HTML). Se quitó: Enter en la frase la entiende, y no guarda el gasto.
7. El aviso "No pude usar la IA" mostraba el mensaje largo del servidor en minúsculas y con puntos dentro del paréntesis. Ahora da una razón corta.
8. El lector local desalineaba la descripción con frases como "35 lucas" (el texto normalizado y el original tenían distinto largo). Corregido y probado.

## Pruebas
- 130 pruebas unitarias (dinero, fechas, estadísticas, datos, categorías, presupuestos, reportes, avisos, respaldo, lector local de frases, cliente de la IA, servidor de la IA y rutas `/api`): `cd app && npm test`.
- Pruebas de punta a punta con navegador real (`app/e2e/`): `prueba-basica.cjs` (10 comprobaciones), `imprescindibles.cjs` (19, incluye respaldo con clave, recuperar en un "celular nuevo", modo sin internet y pantalla de 390 y 1440 px) e `ia.cjs` (14: frase sin IA, con IA, voz, foto, fallas, sin internet y el código fuera de los respaldos, con la política CSP real). La IA es simulada con `servidor-de-prueba.mjs`, así que no se gasta dinero. Todas pasan.
- Pendiente para `/clonar-probar`: lector de pantalla, solo teclado a fondo y prueba en un celular real.

## Pendientes de seguridad y mantenimiento
- `npm audit` marca 7 avisos, todos en herramientas de desarrollo (vitest, workbox-build). En lo que viaja al celular hay 0.
