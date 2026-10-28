# Backend de Nova

Nova casi no necesita servidor: los datos viven en el celular. El único servidor son **tres funciones pequeñas** que reciben una frase o una foto, se la mandan a la IA de Claude con **su** llave (escondida en el servidor) y devuelven un gasto ya armado para que usted lo revise.

País: Colombia, uso personal. No hay cuentas, pagos, facturación electrónica, correo ni WhatsApp, y por eso esas partes no aplican. (La DIAN no entra: la app no vende nada.)

## Qué hace cada función

| ruta | para qué | gasta IA |
| --- | --- | --- |
| `GET /api/estado` | dice si el código de acceso es correcto y si el servidor tiene la IA activada | no |
| `POST /api/interpretar` | convierte una frase (escrita o dictada) en un gasto o ingreso | sí, muy poco |
| `POST /api/recibo` | lee la foto de un recibo y propone el gasto | sí, un poco más (lleva una imagen) |

Código: `app/server/ia.ts` (la lógica) y `app/api/*.ts` (las tres rutas, de una línea cada una).

## Qué sale del celular y qué no

- **Sin IA:** nada. La frase se entiende en el propio celular (`src/entenderLocal.ts`).
- **Con IA:** sale la frase (o la foto reducida a 1280 px), los **nombres** de sus categorías y la fecha de hoy. Va a su función de Vercel y de ahí a Anthropic. No salen montos guardados, movimientos anteriores ni el respaldo.
- **Voz:** Chrome usa el reconocimiento de voz de Google para pasar la voz a texto; el audio pasa por Google. Si no quiere eso, escriba la frase.
- El servidor **no guarda ni registra** frases ni fotos (no hay `console.*` en `server/` ni `api/`).

## Cómo activarlo (solo usted puede hacerlo)

1. **Anthropic.** Cree una cuenta en console.anthropic.com. En *Settings → Limits* ponga un **límite de gasto mensual bajo** (por ejemplo USD 5): es la protección real contra gastos inesperados. En *API Keys* cree una llave y cópiela (empieza por `sk-ant-`). No se la pegue a nadie ni la suba a GitHub.
2. **Código de acceso.** Invente uno largo (20 o más letras y números, por ejemplo cuatro palabras sin relación y un número). Es la contraseña entre su celular y su servidor.
3. **Vercel.** Cree el proyecto desde este repositorio con *Root Directory* `app`. En *Settings → Environment Variables* agregue `ANTHROPIC_API_KEY` (la llave) y `CODIGO_ACCESO` (el código). Vuelva a desplegar.
4. **En la app.** Ajustes → Inteligencia artificial → escriba el código → *Probar conexión*. Debe decir "La IA está lista".

El precio por uso está en la página de precios de Anthropic; para frases y fotos sueltas son centavos de dólar al mes. Si no hace nada de esto, Nova funciona igual a mano y con el lector de frases local.

## Lista de verificación de seguridad

- [x] La llave solo vive en variables de entorno del servidor. Se comprobó que **no aparece en `dist/`** (lo que se publica), que no hay llaves en el código y que `.env*` está en `.gitignore` (solo se sube `.env.example`, sin valores).
- [x] Entrada validada en el servidor en cada ruta (tipo, largo, fecha, categorías, tipo y tamaño de imagen, base64 válido). 32 pruebas lo cubren.
- [x] Autorización: código de acceso comparado en tiempo constante. Sin código o con código malo no se llama a Anthropic (probado). No hay segundo usuario que probar.
- [x] Límites: 10 intentos fallidos por hora por IP, 60 usos de IA por hora, texto de 300 letras como máximo, foto de 3,5 MB en base64 como máximo, tiempo máximo de 25 s. **Son de mejor esfuerzo**: cada instancia del servidor cuenta aparte. El límite de gasto de la consola de Anthropic es el tope real.
- [x] Solo se aceptan llamadas de la propia página (se revisa el `Origin`) y la política CSP no permite scripts de otros sitios ni conexiones a otros dominios.
- [x] La IA solo puede devolver un movimiento: se le obliga a usar una herramienta con esquema fijo, la categoría debe estar en su lista, y lo que devuelve se vuelve a revisar (monto entero, fecha válida y no futura, texto limpio). El texto del usuario y la foto se tratan como datos, no como órdenes. Además usted siempre revisa antes de guardar.
- [x] Archivos: solo JPEG, PNG o WebP; la foto se reduce en el celular y no se guarda en ningún lado.
- [x] Sin datos de usuarios en URL ni en registros.
- [x] `npm audit --omit=dev`: 0 avisos en lo que se publica (7 en herramientas de desarrollo).
- [x] Cabeceras: CSP estricta, `nosniff`, `no-referrer`, `X-Frame-Options`, HSTS y permisos solo para micrófono y cámara propios (`app/vercel.json`).
- [ ] Política de privacidad: para uso personal basta esta página, que lista a los proveedores: **Anthropic** (frases y fotos si se usa la IA), **Vercel** (hosting y funciones) y **Google** (voz, mediante Chrome).
- [ ] **Verificar en un despliegue real** que las funciones de Vercel arrancan con los imports `.js` de TypeScript (en las pruebas funcionan, pero no se ha desplegado todavía).

## Límites conocidos (dicho con honestidad)

- El código de acceso queda guardado en el celular **sin cifrar** (en la base del navegador). Quien use su celular desbloqueado podría verlo. Si pasa algo, cambie `CODIGO_ACCESO` en Vercel y el código en la app. No sale en los respaldos.
- El nombre del modelo (`claude-haiku-5-5`) viene de la información de este entorno. Si Anthropic lo cambia o no está disponible para su cuenta, ponga otro en la variable `MODELO_IA`.
- Chrome en Android es donde mejor funciona la voz. En otros navegadores el botón "Hablar" puede no aparecer.
