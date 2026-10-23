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

Panel · Salón de ventas · Catálogo visual · Cotizaciones · Facturas · Cartera · Clientes · Productos y precios (reposición, conteo físico, ajuste de precios, etiquetas) · Inventario y telas · Producción · Compras · Proveedores · Secretaría · Mensajes · Personal y destajo · Gastos de la empresa y caja · Finanzas del hogar (solo administradora) · Reportes · Usuarios y roles · Auditoría · Configuración · Funciones (lista completa de 180 funciones).

## Seguridad

- Contraseñas guardadas con PBKDF2-SHA256 y sal aleatoria, nunca en texto plano.
- Bloqueo de 60 s tras 5 intentos fallidos, bloqueo por inactividad y botón de bloqueo inmediato.
- Roles con menú filtrado, registro de auditoría y modo privado que oculta los valores.
- Respaldo cifrado AES-256-GCM con contraseña.

## Limitación actual

Los datos se guardan en el navegador del equipo donde se usa. Para que la secretaria y la dueña vean la misma información desde varios equipos o celulares hace falta conectarlo a una base de datos en la nube (por ejemplo Supabase); la estructura de datos ya está separada para ese paso.

Capturas en `docs/capturas/`, video del recorrido en `docs/aurea-atelier-recorrido.mp4` y presentación en `docs/Aurea-Atelier-Presentacion.pdf` (se regenera con `node docs/brochure/generar-pdf.js`).
