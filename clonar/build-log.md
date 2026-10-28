# Registro de construcción

Referencia de diseño: imágenes "NOVA" del usuario (`clonar/design/referencia/`). Nombre provisional: **Nova** (revisar marca registrada en `/clonar-marca`).

| ID | pantalla | fecha | estado | qué falta | lo más difícil |
| --- | --- | --- | --- | --- | --- |
| S01 | Bienvenida | — | pendiente | todo | — |
| S02 | Inicio | 2026-10-28 | terminada | las metas (tarjeta con aviso "Sin metas todavía"), la campana de recordatorios | el degradado verde en claro y el vidrio oscuro con brillo en oscuro, sin colores sueltos en los componentes |
| S03+S06 | Agregar movimiento | 2026-10-28 | terminada (formulario manual) | frase con IA, voz y foto; el botón Guardar se dejó fijo al fondo porque en celulares pequeños quedaba escondido | cerrar con Escape aunque el cursor esté fuera de la hoja (corregido) |
| S07 | Movimientos | 2026-10-28 | parcial | pantalla completa con filtros; hoy solo salen los últimos 6 en Inicio | — |
| S04, S05 | Voz y foto | — | pendiente | necesitan la función de IA | — |
| S08–S14 | Editar, presupuestos, metas, reportes, categorías, ajustes, bloqueo | — | pendientes (pestañas con aviso claro) | todo | — |

## Decisiones tomadas al seguir la imagen de referencia
- Pestañas: Inicio, Análisis, Presupuestos, Metas, Ajustes (la imagen decía Home, Analytics, Card, Goals, Profile; "Card" y "Profile" no aplican: no hay tarjetas ni cuentas).
- La foto de perfil de la imagen no se usa (no hay cuentas).
- Los logos de Starbucks y Spotify de la imagen oscura **no se copian**: cada categoría usa un ícono genérico (Lucide).
- La imagen no tenía botón de agregar: se agregó el botón + flotante, como pedía el plan.
- El balance es ingresos menos gastos del mes. La "variación del mes" de la imagen se reemplazó por dos chips (Ingresos y Gastos), porque no hay un mes anterior para comparar.
- La imagen repetía "Tue" y "Fri" en el gráfico de la semana (error de la imagen); aquí son los 7 días, de lunes a domingo.

## Pruebas
- 39 pruebas unitarias (dinero, fechas, estadísticas y base de datos): todas pasan. `cd app && npm test`.
- Prueba de punta a punta (`app/e2e/prueba-basica.cjs`): estado vacío, validaciones, guardar, deshacer, balance, Escape, **sin internet** (abrir y guardar) y consola sin errores. Todo pasa.
- Pendiente para `/clonar-probar`: lector de pantalla, solo teclado a fondo y pantalla de 1440 px.

## Pendientes de seguridad y mantenimiento
- `npm audit` marca 7 avisos, todos en herramientas de desarrollo (vitest, workbox-build). En lo que viaja al celular hay 0.
