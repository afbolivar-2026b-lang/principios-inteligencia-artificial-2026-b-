# Nova · Gastos

App personal para llevar los gastos. Funciona en el celular como una app instalada (PWA), **sin internet, sin anuncios y sin cuenta**. Los datos quedan en el propio celular.

```bash
npm install      # instala las herramientas (una vez)
npm run dev      # para trabajar: http://localhost:5173
npm run build    # arma la versión final en dist/
npm run preview  # prueba la versión final: http://localhost:4173
npm test         # pruebas del dinero, las fechas y los datos
```

- Con `?demo` al final de la dirección (por ejemplo `http://localhost:4173/?demo`) se ven datos de ejemplo. Usa otra base de datos, así que **no toca los datos reales**.
- El diseño sale de `../clonar/design/` (colores, tipografía y componentes). Si cambian los colores, se copia `tokens.css` a `src/tokens.css`.
- El plan completo está en `../clonar/architecture.md`.
