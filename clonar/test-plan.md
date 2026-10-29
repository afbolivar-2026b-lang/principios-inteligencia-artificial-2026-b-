# Plan de pruebas: Nova (app de gastos personal)

Qué se prueba: la app `app/`, nunca la app original. Todo corre contra el servidor local (`4173` = app terminada, `4174` = servidor de prueba con IA simulada, sin gastar dinero).
Cómo se corre: `npm test` (unidades) y `node e2e/<archivo>.cjs` (navegador real, Chromium).

## Flujos (de `recon.md`) y casos

| Flujo | Caso | Qué debe pasar | Automatizado en |
| --- | --- | --- | --- |
| F01 anotar escribiendo | F01-H1 camino feliz | guarda, aparece en Inicio y el balance cambia | prueba-basica.cjs |
| | F01-H2 frase "almuerzo 18 mil en efectivo" | llena monto, categoría y medio; nada se guarda solo | imprescindibles.cjs, ia.cjs, entenderLocal.test.ts |
| | F01-E1 monto vacío o 0 | mensaje de error, no guarda | prueba-basica.cjs |
| | F01-E2 monto de 12 cifras | guarda y no rompe el diseño | calidad.cjs (E1) |
| | F01-E3 descripción de 120 letras sin espacios | no desborda | calidad.cjs (E2) |
| | F01-E4 emoji, acentos, otros alfabetos, HTML | se guarda y muestra como texto | calidad.cjs (E4, E5) |
| | F01-E5 fecha muy vieja o futura | se rechaza con mensaje | calidad.cjs (E6), db.test.ts |
| | F01-E6 doble toque en Guardar | un solo movimiento | calidad.cjs (E7) |
| | F01-E7 botón Atrás con la hoja abierta | cierra la hoja, no sale de la app | calidad.cjs (E9) |
| | F01-E8 solo teclado | se completa el flujo; el foco no se escapa | calidad.cjs (K1, K2) |
| | F01-E9 sin internet | abre y guarda | prueba-basica.cjs |
| | F01-E10 11:30 p. m. en Bogotá | el gasto es de hoy | calidad.cjs (E11), dates.test.ts |
| | F01-N1 la IA no responde o el código no sirve | avisa y sigue con el lector local | ia.cjs |
| F02 voz | F02-H1 dictar | el texto pasa por el mismo lector | ia.cjs (voz simulada) |
| | F02-N1 micrófono negado o sin soporte | mensaje claro y formulario manual | ia.cjs |
| F03 foto | F03-H1 foto de recibo | se reduce a 1280 px y llena el formulario | ia.cjs |
| | F03-N1 foto ilegible o IA caída | mensaje y formulario manual | ia.cjs |
| F04 presupuesto | F04-H1 fijar, editar y quitar límite | barra y texto correctos | imprescindibles.cjs, presupuestos.test.ts |
| | F04-E1 80 % y 100 % | alerta con ícono y texto, no solo color | avisos.test.ts, imprescindibles.cjs |
| F05 metas | — | pendiente (no construida): se muestra "llega en un próximo paso" | prueba-basica.cjs |
| F06 reportes | F06-H1 dona, barras, tabla oculta | números iguales a los de la lista | imprescindibles.cjs, stats.test.ts |
| | F06-E1 mes sin datos | estado vacío | imprescindibles.cjs |
| F07 editar o borrar | F07-H1 editar, borrar, deshacer | la lista y el balance cambian | imprescindibles.cjs |
| F08 respaldo | F08-H1 con y sin clave, sumar y reemplazar | los datos llegan al "celular nuevo" | imprescindibles.cjs, respaldo.test.ts |
| | F08-N1 clave mala o archivo ajeno | se rechaza con mensaje | imprescindibles.cjs |
| | F08-E1 datos dañados en el almacenamiento | la app abre y avisa cuántos datos dejó fuera | calidad.cjs (E10), validacion.test.ts |

## Transversales

- Accesibilidad con axe en 23 pantallas × claro/oscuro, incluidas las ventanas abiertas: `accesibilidad.cjs`.
- Árbol de accesibilidad: botones con nombre, un solo título principal por pantalla, idioma `es`: `calidad.cjs` (K4).
- Tamaño táctil mínimo 44 px, contraste AA en los dos temas: medidos en `accesibilidad.cjs` y en `clonar/design`.
- 390 px y 1440 px sin desborde horizontal; letra al 200 % sin desborde: `imprescindibles.cjs`, `calidad.cjs` (E12).
- Sin errores en la consola, incluida la política de seguridad (CSP): todas las pruebas.

## Por revisar (no reproducido como falla)

- Con las flechas del teclado no se mueve entre las opciones de un grupo (categoría, medio de pago): hoy se recorre con Tab. (S4)
- Si se recarga con la hoja abierta, lo escrito se pierde (no hay borrador). (S3)
- Voz y cámara reales: solo se probaron simuladas; falta una pasada en un celular Android.
- Las dos funciones de IA no se han corrido en Vercel de verdad (importaciones con `.js`).
