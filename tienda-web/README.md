# Tienda web (Supabase + Vercel)

Página estática que muestra el catálogo guardado en Supabase y arma un pedido
que el cliente envía por WhatsApp o copia. No necesita instalar nada ni compilar.

## Archivos

- `index.html`: la tienda.
- `config.js`: nombre de la tienda, conexión a Supabase y número de WhatsApp.

## Base de datos

Tablas en Supabase: `categorias`, `productos`, `clientes`, `pedidos`,
`pedido_items` y la vista `pedidos_resumen`. Todas tienen RLS:

- Cualquier visitante puede leer categorías y productos activos.
- Un cliente con sesión iniciada solo puede leer sus propios pedidos.
- Crear o cambiar datos solo se hace con la clave `service_role` (bot o panel
  de administración), que nunca va en esta web.

Los productos de prueba dicen `EJEMPLO` en la descripción y la web los marca
con la etiqueta "Ejemplo".

## Probar en tu ordenador

```
npx serve tienda-web
```

## Publicar en Vercel

```
cd tienda-web
vercel          # vista previa
vercel --prod   # producción
```
