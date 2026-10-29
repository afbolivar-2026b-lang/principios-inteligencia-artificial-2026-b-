# Bugs encontrados y arreglados en Nova

Severidad: S1 pérdida de datos o seguridad · S2 función rota sin alternativa · S3 rota con alternativa o visiblemente mal · S4 cosmético.
Todos se reprodujeron en navegador antes de arreglarlos y cada uno quedó con una prueba que lo vigila.

| ID | Sev | Qué pasaba | Pasos | Estado | Prueba |
| --- | --- | --- | --- | --- | --- |
| BUG-001 | S1 | Un dato dañado en el almacenamiento dejaba la app en blanco | meter un movimiento sin monto en IndexedDB y abrir | Arreglado: se deja fuera, se avisa cuántos son y se puede bajar una copia sin revisar | calidad E10, validacion.test.ts |
| BUG-002 | S1 | Cualquier error de pantalla tumbaba toda la app sin salida | forzar un error al dibujar | Arreglado: pantalla de error con "Recargar" y copia de datos | calidad E10 |
| BUG-003 | S2 | Con el botón Atrás del celular se salía de la app y se perdía lo escrito | abrir "Nuevo gasto" y tocar Atrás | Arreglado: Atrás cierra la ventana o la pantalla de arriba | calidad E9 |
| BUG-004 | S2 | "No" en la confirmación de borrar cerraba la ventana y guardaba | borrar un movimiento y tocar "No" | Arreglado (cada botón del pie con clave propia) | imprescindibles |
| BUG-005 | S2 | Doble toque rápido en Guardar podía crear dos movimientos | tocar Guardar dos veces seguidas | Arreglado | calidad E7 |
| BUG-006 | S2 | La fecha "2026-13-45" de un respaldo lanzaba un error | importar un respaldo con esa fecha | Arreglado | dates.test.ts |
| BUG-007 | S3 | Con la ventana abierta, un lector de pantalla leía lo de atrás | recorrer con el lector | Arreglado (`inert` + ventana fuera del contenido) | calidad K3 |
| BUG-008 | S3 | Montos de 12 cifras rompían la tarjeta de balance y el donut | guardar $999.999.999.999 | Arreglado (la letra se achica) | calidad E1 |
| BUG-009 | S3 | Nombres largos de categoría desbordaban la lista | categoría de 30 letras anchas | Arreglado | calidad E3 |
| BUG-010 | S3 | La búsqueda no encontraba con tildes o mayúsculas distintas | buscar "cafe" para "Café" | Arreglado (`busqueda.ts`) | busqueda.test.ts, calidad E4 |
| BUG-011 | S3 | Se podían guardar fechas del año 1 o del futuro | escribir 01/01/0001 | Arreglado (mínimo 2000, no futuro) | db.test.ts, calidad E6 |
| BUG-012 | S3 | Letra al 200 % desbordaba en Análisis | agrandar la letra del celular | Arreglado | calidad E12 |
| BUG-013 | S3 | Escape no cerraba la ventana antes de que el foco entrara | abrir y tocar Escape | Arreglado | prueba-basica |
| BUG-014 | S3 | El botón Guardar quedaba escondido en ventanas largas | formulario con teclado abierto | Arreglado (pie fijo) | imprescindibles |
| BUG-015 | S3 | Ingresos y gastos del mismo verde en "Mes a mes" | abrir Análisis | Arreglado (gastos en ámbar) | accesibilidad |
| BUG-016 | S3 | Los botones de archivo ocultos se leían como botones repetidos | recorrer con lector | Arreglado (`hidden`) | accesibilidad |
| BUG-017 | S3 | Formulario dentro de otro formulario (frase dentro del gasto) | revisar con axe | Arreglado | accesibilidad |

## Resumen

- S1 abiertos: **0**. S2 abiertos: **0**. S3 abiertos: **0**.
- Casos ejecutados: 152 de unidades + 5 recorridos en navegador (prueba-basica, imprescindibles, ia, accesibilidad = 46 pantallas, calidad = 16 casos). Todos pasan.
- Pendientes de "por revisar": ver `test-plan.md`.
