# Neiva Belleza: página web y panel del salón

Página para clientas (reservas, tienda, regalos) y panel interno para el equipo del salón.
Usa HTML, CSS y JavaScript sin librerías. La base de datos real está en **Supabase**.

## 1. Publicar la página

### Opción A: Netlify Drop (sin instalar nada)
1. Entra a <https://app.netlify.com/drop> con tu cuenta.
2. Arrastra esta carpeta `salon-belleza` completa.
3. Netlify te da el enlace en segundos. El proyecto `neiva-belleza` ya está creado; para usarlo, sube la carpeta desde su pestaña **Deploys**.
4. En **Project configuration → Visitor access**, quita la opción que pide iniciar sesión, porque los proyectos nuevos quedan privados.

### Opción B: Netlify o Vercel conectado a GitHub
- Importa este repositorio y pon como carpeta base `salon-belleza`. No necesita comando de compilación.
- Cada cambio que se suba a GitHub se publica solo.
- Los archivos `netlify.toml` y `vercel.json` ya traen los encabezados de seguridad.

### Después de publicar
- En Supabase → **Authentication → URL Configuration**:
  - pon la dirección de la página en **Site URL**;
  - agrega `https://TU-DOMINIO/admin.html` en **Redirect URLs**.
  - Así funcionan los correos de confirmar cuenta y recuperar contraseña.
- Si el dominio no es `neiva-belleza.netlify.app`, cámbialo en `sitemap.xml`, `robots.txt` y en las etiquetas `og:` y `canonical` de `index.html`.

## 2. Primer ingreso al panel
1. Abre `admin.html` y elige **"Soy nueva en el equipo: crear cuenta"** con el correo **anfebolivar@gmail.com**. Ese correo queda como **dueña** automáticamente.
2. Las demás personas crean su cuenta igual. Les aparece "espera aprobación" hasta que la dueña, en **Inicio** o en **Equipo**, les asigne un rol:
   - **Recepción**: agenda, clientas, caja, inventario, pedidos, regalos y reseñas.
   - **Estilista**: solo su agenda, sus comisiones y la galería.

## 3. Conexiones (se activan cuando pongas las llaves)
Mientras falte una llave, esa función aparece como **"Pendiente de conectar"** y la página sigue funcionando sin ella. No se simula nada.

| Servicio | Para qué | Dónde se pone |
|---|---|---|
| Google Analytics | Contar visitas y reservas | Panel → Configuración (ID `G-…`) |
| Píxel de Meta | Anuncios de Facebook/Instagram | Panel → Configuración |
| Reseñas de Google | Enlace "déjanos tu reseña" | Panel → Configuración |
| **Wompi** | Pagos en línea (Nequi, PSE, tarjeta) de tarjetas de regalo y pedidos | Supabase → Edge Functions → Secrets: `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`. En Wompi, URL de eventos: `https://zhnwkyjoyixriasoxirf.supabase.co/functions/v1/integraciones/wompi/evento` |
| **WhatsApp Business API** | Recordatorios automáticos el día antes | Secrets: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` y, si quieres, `WHATSAPP_PLANTILLA` (por defecto `recordatorio_cita`, con 4 variables: nombre, hora, profesional, enlace) |
| **Asistente virtual** | Chat que responde con precios y horarios reales | Secret `ANTHROPIC_API_KEY`. Luego, en el panel, marca "Mostrar el asistente" |
| Facturación DIAN | Factura electrónica | Pendiente: hay que elegir un proveedor autorizado (Alegra, Siigo, etc.) |

Panel → Configuración muestra el estado de cada conexión.

## 4. Archivos
| Archivo | Qué es |
|---|---|
| `index.html`, `script.js`, `extras.js`, `styles.css` | Página pública: reserva, tienda, regalos, opiniones, galería, novias, preguntas, mapa, inglés |
| `cita.html`, `cita.js` | "Mi cita": confirmar, cambiar, cancelar y dejar opinión |
| `admin.html`, `admin.js`, `admin-extras.js`, `admin.css` | Panel del salón |
| `api.js` | Conexión con Supabase (base de datos, cuentas, fotos y funciones) |
| `datos.js` | Datos de respaldo si no hay internet y cálculos compartidos (horarios, duraciones) |
| `supabase/functions/integraciones/` | Función del servidor para Wompi, WhatsApp y el asistente. Ya está publicada en Supabase |
| `manifest.webmanifest`, `sw.js` | Para instalar la página en el celular y abrirla sin señal |
| `terminos.html`, `privacidad.html` | Términos y política de datos (Ley 1581) |

Los precios, servicios, equipo, horarios, festivos y fotos se cambian desde el panel, sin tocar código.

## 5. Pruebas
```bash
node capturas/pruebas/tanda1.js   # reservas
node capturas/pruebas/tanda2.js   # panel completo y roles
node capturas/pruebas/tanda3.js   # tienda, regalos, cupón, reseñas, galería, inglés, celular
```
Usan Playwright con un simulador de Supabase, así que no tocan la base real. Las capturas quedan en `capturas/`.

## 6. Limpieza pendiente
Quedaron 3 clientas de prueba ("Prueba Uno", "Prueba Cinco", "Prueba Siete"). Para borrarlas, en Supabase → SQL Editor:
```sql
delete from public.auditoria where registro_id in (select r.id::text from public.reservas r join public.clientas c on c.id = r.clienta_id where c.nombre like 'Prueba %');
delete from public.reservas where clienta_id in (select id from public.clientas where nombre like 'Prueba %');
delete from public.clientas where nombre like 'Prueba %';
```
