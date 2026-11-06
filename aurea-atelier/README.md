# Aurea Atelier

Sistema privado de gestión para un taller de confección que vende al detal y por mayor: camisas industriales, camisas de salir, pantalones, gorras, overoles, tapabocas y dotación.

## Cómo abrirlo

```bash
cd aurea-atelier
npx http-server -p 8080
# abrir http://localhost:8080
```

Usuarios de demostración (cámbielos en *Usuarios y roles*):

| Rol | Usuario | Contraseña |
|---|---|---|
| Administradora | `admin` | `Aurea2026*` |
| Secretaria | `secretaria` | `Secre2026*` |

## Módulos

Panel · Salón de ventas · Catálogo visual · Probador con maniquí · Probador 3D (prenda en relieve, tela real en movimiento, lupa) · Cotización de lujo con logo · Cotizaciones · Facturas · Cartera · Clientes · Productos y precios (reposición, conteo físico, ajuste de precios, etiquetas) · Inventario y telas · Producción · Compras · Proveedores · Secretaría · Mensajes · Personal y destajo · Gastos de la empresa y caja · Finanzas del hogar (solo administradora) · Dashboard de ventas (8 indicadores, 12 gráficas, filtros por año, mes y vendedor) · Reportes · Usuarios y roles · Auditoría · Configuración · Funciones (lista completa de 244 funciones).

### Probador con maniquí

Maniquí de vitrina en foto de estudio (`js/maniqui.js`, fotos en `img/maniqui/`). Al tocar una prenda el maniquí aparece con ella puesta y al tocarla otra vez se la quita. Hay 34 fotos: los 10 conjuntos de camisa o chaqueta con pantalón y el overol, de frente y de espaldas; 11 versiones con gorra, tapabocas o ambos; y el maniquí sin ropa. Si falta la parte de arriba o la de abajo, la foto se completa con una prenda marcada «de muestra». Si el conjunto no tiene foto con la gorra o el tapabocas, aparece una etiqueta «También lleva…». Se voltea deslizando el dedo y se acerca al torso, las piernas o la cabeza. Las fotos son imágenes de ejemplo generadas con IA. Una prenda nueva necesita su propia foto y, mientras no la tenga, se muestra la foto del producto.

El maniquí aparece en:

- el panel, con lo más vendido;
- el catálogo, con el botón «Ponérsela» en cada prenda;
- la ficha, el visor 3D y la elección de talla;
- el salón de ventas, vestido con lo que lleva el cliente;
- el inventario, para ver cualquier tela de la bodega puesta;
- productos y precios.

Desde el probador se cotiza el conjunto con la foto del maniquí dentro de la cotización, se agrega al pedido o a la venta y se descarga la foto.

## Seguridad

- Contraseñas guardadas con PBKDF2-SHA256 y sal aleatoria, nunca en texto plano.
- Bloqueo de 60 s tras 5 intentos fallidos, bloqueo por inactividad y botón de bloqueo inmediato.
- Roles con menú filtrado, registro de auditoría y modo privado que oculta los valores.
- Respaldo cifrado AES-256-GCM con contraseña.

## Limitación actual

Los datos se guardan en el navegador del equipo donde se usa. Para que la secretaria y la dueña vean la misma información desde varios equipos o celulares hace falta conectarlo a una base de datos en la nube (por ejemplo Supabase); la estructura de datos ya está separada para ese paso.

Capturas en `docs/capturas/`. Documentos para el cliente:

- `docs/Aurea-Atelier-Video-Guia-Completa.mp4`: video de 14 minutos con los 19 capítulos, los 80 pasos con foto y las 228 funciones, con música (escenas en `docs/video/guia-video-completa.html`, datos con `node docs/video/generar-datos-video.js`). Se grabó antes del probador con maniquí.
- `docs/Aurea-Atelier-Video-Guia.mp4`: versión corta de 3 minutos y medio, con música (escenas en `docs/video/guia-video.html`, música original en `docs/video/musica.py`, render con `docs/video/renderizar.js`).
- `docs/Aurea-Atelier-Guia-Completa.pdf`: guía de 20 capítulos, con el probador con maniquí incluido, cada paso en foto y cada función explicada (fotos de los pasos con `node docs/guia/capturar-pasos.js`, PDF con `node docs/guia/generar-guia.js`).
- `docs/Aurea-Atelier-Presentacion.pdf`: presentación (`node docs/brochure/generar-pdf.js`).
- `docs/Cotizacion-COT-301-ejemplo.pdf`: cotización de muestra.
- `docs/aurea-atelier-pelicula.mp4` y `docs/aurea-atelier-recorrido.mp4`: videos anteriores.
