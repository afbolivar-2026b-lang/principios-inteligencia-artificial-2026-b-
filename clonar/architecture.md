# Arquitectura: app de gastos personal (una reconstrucción de las funciones principales de Lukas – Control de gastos)

Nombre provisional: "Mis Gastos". El nombre definitivo lo pone `/clonar-marca`.

## Países

Lanzamiento en: Colombia (uso personal)  Después: ninguno
Datos tomados de `paises.md` el 2026-10-28. Verificados por el usuario: no aplica, porque no hay cobros ni ventas.

| país | moneda | métodos de pago | pasarela | facturación electrónica | impuesto en el precio | WhatsApp |
| --- | --- | --- | --- | --- | --- | --- |
| Colombia | peso colombiano (COP), sin centavos | no aplica: la app no cobra | ninguna | no aplica: no hay ventas | no aplica | no como canal de atención. Anotar gastos por WhatsApp queda como idea futura (could) |

Los medios de pago de Colombia (efectivo, tarjeta, Nequi, Daviplata, PSE) aparecen solo como **etiquetas** para clasificar de dónde salió cada gasto. La app no mueve dinero.

## Stack

La app es para una sola persona, debe funcionar sin internet y debe ser gratis de mantener. Por eso se aparta del stack por defecto (Next.js + Supabase): no necesita servidor de base de datos ni cuentas de usuario.

| capa | elección | por qué |
| --- | --- | --- |
| web | app web instalable (PWA) con Vite + React + TypeScript | se instala en el celular Android desde el navegador como si fuera una app, sin Google Play, y funciona sin internet |
| estilos | Tailwind con los tokens de `/clonar-diseno` | rápido y consistente |
| móvil | la misma PWA | evita publicar en tiendas; Expo queda como alternativa si algún día se quiere una app nativa |
| base de datos | IndexedDB en el propio celular, con Dexie | local primero: los datos nunca salen del teléfono si no se quiere; cero costo |
| autenticación | ninguna; bloqueo con PIN o huella (WebAuthn) dentro de la app | un solo usuario, no hace falta crear cuenta (igual que el modo invitado del original) |
| respaldo | exportar e importar un archivo cifrado; opcional: guardarlo en Google Drive del usuario | arregla la queja nº 1 de la categoría (datos que se pierden al cambiar de celular) sin montar un servidor |
| inteligencia artificial | una sola función en el servidor que llama a la API de Claude (modelo `claude-haiku-5-5`) con la llave del usuario | entiende frases ("almuerzo 18 mil") y fotos de recibos; la llave queda escondida en el servidor, no en el celular |
| voz | reconocimiento de voz del navegador (Web Speech API, en español) | gratis en Chrome para Android; convierte la voz en texto y ese texto va a la misma función de IA |
| pagos | ninguno | uso personal |
| facturación electrónica | ninguna | uso personal |
| correo | ninguno | no hace falta |
| WhatsApp | ninguno en la versión 1 | se puede agregar después |
| tareas (recordatorios) | notificaciones locales del navegador al abrir la app, y gastos fijos que se crean solos cada mes | sin servidor de tareas |
| hosting | Vercel, plan gratis (sitio + la función de IA) | gratis para uso personal, con HTTPS, que es obligatorio para instalar la PWA y usar el micrófono y la cámara |

Costo estimado: $0 de hosting. La IA cuesta por uso; una frase o una foto cuesta fracciones de centavo de dólar con un modelo pequeño. Hay que confirmar los precios vigentes en la página de Anthropic.

## Esquema

Tablas: 7. Reglas de acceso: no hay servidor de datos; todo vive en el celular del usuario, protegido por el bloqueo de la app. Si algún día se activa la sincronización (could), estas mismas tablas van a Postgres en Supabase con row level security por `user_id`.

El SQL de referencia está en `clonar/schema.sql`. En la versión 1, Dexie guarda las mismas tablas y campos en IndexedDB.

Decisiones:
- **Dinero:** entero en pesos (COP no usa centavos en la práctica). Columna `moneda` por si después se agrega otra.
- **Fechas:** `fecha` es el día del gasto en hora de Colombia (`date`); `creado_en` y `editado_en` son `timestamptz` en UTC.
- **Presupuesto:** uno por categoría y por mes (índice único).
- **Gastos fijos:** una regla (`recurrente`) genera un movimiento por mes; un índice único (`recurrente_id`, `fecha`) evita duplicados.

## API

Todo lo demás pasa dentro del celular. Solo hay dos rutas en el servidor, y las dos únicamente interpretan; no guardan nada.

| método ruta | hace | quién | entrada | salida | flujo |
| --- | --- | --- | --- | --- | --- |
| POST /api/interpretar | convierte una frase (escrita o dictada) en un movimiento | la app del usuario, con un código secreto propio | `{ texto, categorias[], hoy }` | `{ tipo, monto, categoria, fecha, descripcion, medio_pago, confianza }` | F01, F02 |
| POST /api/recibo | lee la foto de un recibo y propone el movimiento | igual | foto (JPG, máximo 4 MB) + categorías | lo mismo que la anterior | F03 |

Webhooks de entrada: ninguno. Webhooks de salida: ninguno.
Tareas: al abrir la app, (1) crear los gastos fijos del mes que falten y (2) mostrar los recordatorios de pagos que vencen en los próximos 3 días.

Seguridad de las rutas: un código secreto propio en una variable de entorno (para que nadie más gaste su cuota de IA), un límite de 60 solicitudes por hora y fotos de máximo 4 MB.

## Las partes que muerden

- **Zonas horarias:** Colombia no tiene horario de verano (UTC−5). El día del gasto se guarda como fecha local, para que un gasto de las 11 p. m. no salte al día siguiente.
- **Idempotencia:** el botón "Guardar" se desactiva al tocarlo, y los gastos fijos usan un índice único por mes para no crearse dos veces.
- **Condiciones de carrera:** un solo usuario en un solo celular; casi no aplica. Al importar un respaldo se pregunta si se reemplaza o se combina.
- **Modo sin conexión:** todo funciona sin internet, salvo voz, foto y frase con IA. Sin conexión, la app abre el formulario normal para anotar a mano.
- **Montos en pesos:** "18 mil", "18.000", "18k" y "dieciocho mil" deben dar 18000. Se prueban en `/clonar-probar`.
- **Límites de archivo:** las fotos se reducen en el celular antes de enviarlas.
- **Llave de la IA:** nunca va en el código ni en el celular, solo en las variables de entorno de Vercel.
- **Pérdida de datos:** si el usuario borra los datos del navegador, se pierde todo. Por eso el respaldo es imprescindible (must) y la app recuerda hacerlo cada semana.
- **Pagos asíncronos y facturación por país:** no aplican.

## Orden de construcción

1. **Corte vertical:** anotar un gasto escribiendo y verlo en el inicio. Pantallas S02, S03 y S06 (formulario manual). Tablas `categorias` y `movimientos`. Sin IA. Prueba que la PWA se instala en el celular y guarda sin internet.
2. **Imprescindibles (must):** lista y edición (S07, S08); categorías (S12); presupuestos con alerta (S09); reportes (S11); resumen del mes (S02); respaldo exportar e importar (S13); funcionamiento sin internet; sin anuncios; pesos sin centavos; frase con IA (`/api/interpretar`).
3. **Deseables (should):** voz (S04); foto del recibo (S05, `/api/recibo`); "cuánto puedo gastar"; metas (S10); modo privacidad; bloqueo con PIN o huella (S14); modo oscuro; tutorial (S01); recordatorios y gastos fijos.
4. **Opcionales (could) y arreglos de clonar-emprendedor:** exportar PDF; medios de pago como etiqueta; respaldo en Google Drive; la IA aprende de las correcciones; varias monedas.
