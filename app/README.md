# Nova · Gastos

App personal para llevar los gastos. Funciona en el celular como una app instalada (PWA), **sin internet, sin anuncios y sin cuenta**. Los datos quedan en el propio celular.

```bash
npm install      # instala las herramientas (una vez)
npm run dev      # para trabajar: http://localhost:5173
npm run build    # arma la versión final en dist/
npm run preview  # prueba la versión final: http://localhost:4173
npm test         # 130 pruebas: dinero, fechas, datos, presupuestos, respaldo, lector de frases y servidor de la IA
```

- Con `?demo` al final de la dirección (por ejemplo `http://localhost:4173/?demo`) se ven datos de ejemplo. Usa otra base de datos, así que **no toca los datos reales**.
- El diseño sale de `../clonar/design/` (colores, tipografía y componentes). Si cambian los colores, se copia `tokens.css` a `src/tokens.css`.
- El plan completo está en `../clonar/architecture.md`.

## Pruebas con navegador

En `e2e/` hay tres pruebas de punta a punta (Playwright). `prueba-basica.cjs` e `imprescindibles.cjs` se corren con la app armada y en marcha (`npm run build && npx vite preview --port 4173`). `ia.cjs` usa `servidor-de-prueba.mjs` (puerto 4174), que sirve la app con las mismas cabeceras de seguridad que Vercel y simula la IA, sin gastar dinero.

## Respaldo

En Ajustes se descarga un archivo con todos los datos, con clave opcional (cifrado AES-GCM). Si olvidas la clave, no hay forma de recuperarlo. Recuperarlo en otro celular se hace desde el mismo lugar.

## Inteligencia artificial (opcional)

Sin IA, Nova entiende lo básico de una frase («almuerzo 18 mil en Nequi») en el propio celular. Con IA también entiende frases libres y lee fotos de recibos. Las funciones están en `api/` y la lógica en `server/ia.ts`. La guía para activarla paso a paso (llave de Anthropic, código de acceso y variables en Vercel) está en `../clonar/backend.md`. Las variables van en `.env.example` (sin valores).
