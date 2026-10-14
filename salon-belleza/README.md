# Neiva Belleza: página web y panel de un salón de belleza

Sitio estático en HTML, CSS y JavaScript, sin librerías ni servidor. Usa un estilo nude/rosa empolvado con letras serif finas.

## Cómo verla
- **Página pública:** abre `index.html` en el navegador (doble clic).
- **Panel del salón:** abre `admin.html`, o haz clic en el ícono de persona del menú.

## Qué tiene
| Página | Secciones |
|---|---|
| `index.html` | Portada · Servicios con precios en COP · **Nuestro equipo con la agenda de cada profesional** (días que trabaja, próximo cupo, duración de cada servicio, cupos por día y hora de fin) · Catálogo de diseños de uñas con filtros · **Reserva en 5 pasos** (servicio → profesional → fecha y hora → productos → confirmar por WhatsApp) · Opiniones · Contacto |
| `admin.html` | Indicadores del día · Citas de hoy · Inventario con alertas · Gráfica de ingresos de la semana · Servicios más pedidos · Reservas que llegan desde la página (confirmar, cancelar o escribir por WhatsApp) |

## Archivos
- `datos.js`: **lo que más vas a editar**. Contiene servicios, precios, diseños, profesionales, productos, horarios y datos del salón (WhatsApp, dirección). Lo usan las dos páginas.
- `script.js`: lógica de la página pública: menú del celular, filtros del catálogo y flujo de reserva.
- `admin.js`: lógica del panel.
- `styles.css` y `admin.css`: diseño. Los colores están como variables en `:root`.
- `img/`: fotos de los diseños de uñas, la portada y los productos.

## Personalizar
- **WhatsApp del salón:** cambia `whatsapp` y `whatsappVisible` en `datos.js`.
- **Precios, servicios y duración:** edita `CATEGORIAS` (cada servicio tiene `minutos`), `DISENOS` y `PRODUCTOS` en `datos.js`.
- **Equipo y horarios:** en `PROFESIONALES` cambia `dias` (0 = domingo … 6 = sábado) y `horario` (entrada y salida) de cada persona.
- **Fotos:** reemplaza los archivos de `img/`, idealmente por fotos reales de tus trabajos, o cambia el campo `foto` en `datos.js`.

## Importante
- Las fotos actuales se recortaron de las imágenes de referencia que se crearon con Meta AI. Para un negocio real conviene usar fotos propias.
- Las reservas se guardan en el **navegador** (`localStorage`) y se envían por **WhatsApp**. El panel solo ve las reservas hechas en el mismo navegador. Para que el salón reciba reservas desde cualquier celular hace falta un servidor o base de datos (por ejemplo, Supabase o Firebase).
- En el panel, las citas, los ingresos y los servicios más pedidos son **datos de ejemplo**. Las reservas web son reales.
- Las citas ya ocupadas de cada profesional se simulan (siempre las mismas para el mismo día), pero las reservas reales hechas en la página sí bloquean ese horario.

Las capturas de cada etapa están en `../capturas/`. Para regenerarlas: `node capturas/reserva.js`, `node capturas/agenda.js` y `node capturas/panel.js`.
