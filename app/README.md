# Nova · Gastos

App personal para llevar los gastos. Funciona en el celular como una app instalada (PWA), **sin internet, sin anuncios y sin cuenta**. Los datos quedan en el propio celular.

```bash
npm install      # instala las herramientas (una vez)
npm run dev      # para trabajar: http://localhost:5173
npm run build    # arma la versión final en dist/
npm run preview  # prueba la versión final: http://localhost:4173
npm test         # 62 pruebas del dinero, las fechas, los datos, los presupuestos y el respaldo
```

- Con `?demo` al final de la dirección (por ejemplo `http://localhost:4173/?demo`) se ven datos de ejemplo. Usa otra base de datos, así que **no toca los datos reales**.
- El diseño sale de `../clonar/design/` (colores, tipografía y componentes). Si cambian los colores, se copia `tokens.css` a `src/tokens.css`.
- El plan completo está en `../clonar/architecture.md`.

## Pruebas con navegador

En `e2e/` hay dos pruebas de punta a punta (Playwright). Se corren con la app armada y en marcha (`npm run build && npx vite preview --port 4173`), con `node e2e/prueba-basica.cjs` y `node e2e/imprescindibles.cjs`.

## Respaldo

En Ajustes se descarga un archivo con todos los datos, con clave opcional (cifrado AES-GCM). Si olvidas la clave, no hay forma de recuperarlo. Recuperarlo en otro celular se hace desde el mismo lugar.
