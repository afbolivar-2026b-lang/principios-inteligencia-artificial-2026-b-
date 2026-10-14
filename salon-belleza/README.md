# Bella Rosa — Página de salón de belleza

Página web estática (HTML + CSS + JavaScript, sin librerías) para un salón de belleza.

## Cómo verla
Abre `index.html` en el navegador (doble clic).

## Archivos
- `index.html` — estructura: menú, portada, servicios, galería, opiniones, reservas y pie de página.
- `styles.css` — diseño, colores (variables en `:root`), animaciones y versión para celular.
- `script.js` — menú del celular, validación del formulario, envío de la reserva por WhatsApp y animaciones al hacer scroll.

## Personalizar
- **Número de WhatsApp:** cambia `WHATSAPP_SALON` en `script.js` y el enlace del botón flotante en `index.html`.
- **Colores:** edita las variables `--rosa`, `--dorado`, `--ciruela` en `styles.css`.
- **Fotos reales:** en la galería, reemplaza los degradados `.g1`…`.g5` por `background: url('tu-foto.jpg') center/cover;`.

Las capturas de cada etapa están en `../capturas/`.
