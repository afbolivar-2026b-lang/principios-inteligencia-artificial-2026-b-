## Reglas
- Siempre usar Read o Grep antes de Edit/Write.
- Nunca asumir la estructura de un archivo: verificarla.

## Tono
- Respuestas directas, sin saludos ni cierres.
- Nunca decir "¡Claro!" o "¡Excelente pregunta!".
- Nunca resumir lo que acabás de hacer después de hacerlo.

## Edits
- Usar siempre la herramienta Edit con old_string/new_string para cambios chicos.
- Solo usar Write cuando el archivo es nuevo o requiere rewrite completo justificado.

## Contexto
- Si un archivo ya fue leído en esta conversación y no cambió, no volverlo a leer.
- Para búsquedas en más de 3 archivos, usar el subagente Explore.
- Si el contexto se llena, usar /compact en lugar de abrir una conversación nueva.

## Respuestas
- Una oración si alcanza con una oración.
- Sin markdown innecesario (listas de 1 item, headers para 2 líneas).

## Convenciones
- El proyecto vive en `whatsapp-business-jaspers-market/` (Node.js + Express).
- Usamos npm (hay package-lock.json), no pnpm ni yarn.
- CommonJS: `require`/`module.exports` con `"use strict";`, rutas relativas (`./services/...`). No usar `import` ni alias.
- Tests con el runner nativo de Node (`node:test` + `node:assert/strict`), no Jest ni Vitest. Correr con `npm test` dentro de `whatsapp-business-jaspers-market/`.
- Variables de entorno en `.env` (ver `.sample.env`). Nunca commitear secretos.
