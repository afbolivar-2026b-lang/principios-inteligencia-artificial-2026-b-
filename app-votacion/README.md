# App de Campaña: registro, panel y encuestas

**Desarrollado por Opita Digital** — © Todos los derechos reservados (ver `LICENCIA.txt`).

Aplicativo web para armar la **base de datos de una campaña**, ver cómo va en un
**panel con estadísticas** y hacer **encuestas** a la comunidad.
Escrito en Node.js **sin dependencias externas**: las tipografías y las gráficas
vienen incluidas en la app.

## Cómo ejecutarla

Requiere Node.js 18 o superior.

```bash
cd app-votacion
ADMIN_PASSWORD="una-clave-segura" NOMBRE_CAMPANA="Nombre de la campaña" npm start
npm test           # ejecuta las pruebas
```

- Formulario público: `http://localhost:3000/`
- Panel del equipo: `http://localhost:3000/#/panel`

| Variable          | Por defecto            | Uso                                      |
|-------------------|------------------------|------------------------------------------|
| `ADMIN_PASSWORD`  | (aleatoria)            | Contraseña del panel. Si falta, se genera una temporal y se muestra en la consola |
| `NOMBRE_CAMPANA`  | `Mi Campaña`           | Nombre inicial de la campaña (después se cambia en Ajustes) |
| `AJUSTES_FILE`    | `data/ajustes.json`    | Archivo de los ajustes (diseño, nombre, eslogan, enlace) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | (vacío) | Activan "Entrar con Google" |
| `PORT`            | `3000`                 | Puerto del servidor                      |
| `REGISTROS_FILE`  | `data/registros.json`  | Archivo de los registros                 |
| `DATA_FILE`       | `data/encuestas.json`  | Archivo de las encuestas                 |

## Partes de la app

### Formulario público de registro (`/`)
Pide nombre, apellido, cédula, edad, teléfono, barrio, comuna y **firma**
(dibujada con el dedo o el mouse), más la autorización de tratamiento de datos
(Ley 1581 de 2012). Muestra cuántas personas se han sumado.

- Cédula de 6 a 10 dígitos (acepta puntos), edad de 18 a 120, teléfono de 7 a 10
  dígitos, nombre y apellido solo con letras.

**Sin información repetida:**
- No se puede registrar dos veces la misma **cédula** (con o sin puntos) ni el
  mismo **teléfono** (con o sin +57 o espacios). El formulario marca en rojo el campo repetido.
- Al escribir el barrio aparecen los **barrios ya registrados**; al elegir uno,
  la comuna se llena sola.
- Si un barrio se escribe distinto ("las granjas", "LAS GRANJAS", "Lás Granjas"),
  se guarda con la forma que ya existía, para que cuente como un solo barrio.
- "5", "comuna 5" y "COMUNA 5" se guardan igual: "Comuna 5".
- Los nombres escritos todo en minúsculas o mayúsculas se corrigen
  ("carlos RAMÍREZ" → "Carlos Ramírez").
- En el panel no se puede abrir una encuesta con la misma pregunta de otra que
  sigue abierta, ni repetir opciones.

### Panel del equipo (`/#/panel`)
Protegido con contraseña. La sesión dura 8 horas, usa una cookie `HttpOnly` y
se bloquea 15 minutos tras 10 intentos fallidos.

- **Inicio (tablero)**: foto del candidato; filtros por periodo, comuna y edad;
  8 indicadores (registrados, hoy, 7 días, crecimiento, edad promedio, comunas,
  barrios, votos) y gráficas de registros por día, crecimiento acumulado, día de
  la semana, hora del registro, comunas, edades, barrios, encuesta destacada y
  últimos registros. Botones **Excel** y **PDF** que descargan con los filtros
  puestos, y recuadro para compartir el registro con QR, enlace o WhatsApp.
- **Registros**: tabla con buscador, filtro por comuna, firma de cada persona,
  botón para eliminar un registro y descargas en Excel, PDF y CSV.
- **Encuestas**: crear encuestas, ver resultados en vivo, copiar el enlace y
  cerrar la votación.

- **Compartir**: anuncio listo con código QR en 3 tamaños (post 4:5, historia
  9:16 y cuadrado), enlace para copiar, botón de WhatsApp con el mensaje ya
  escrito, descarga del anuncio o del QR solo (PNG) e impresión.
- **Ajustes**: escoger el diseño (Opita, Moderno oscuro, Limpio o Popular) y
  cambiar el nombre de la campaña, el eslogan y el enlace público del QR.

### Encuestas públicas (`/#/encuestas`)
La gente vota una vez por navegador y ve los resultados al momento.

## Descargas

- **Excel con tablero** (`.xlsx`): hoja *Tablero* con filtros desplegables
  (comuna y rango de edad), 8 indicadores y 8 gráficas de Excel; hoja *Datos* con
  las fórmulas (CONTAR.SI.CONJUNTO, PROMEDIO.SI.CONJUNTO…) que alimentan las
  gráficas; y hoja *Registros* como tabla de Excel con filtros. Al cambiar un
  filtro o agregar filas, Excel recalcula todo.
- **Reporte PDF**: resumen con indicadores y gráficas, y listado de personas.
- **CSV** para otros programas.

## Marca de Opita Digital

- Marca de agua "OPITA DIGITAL · © Todos los derechos reservados" en todas las
  páginas y en cada anuncio con QR que se descarga.
- Firma "Desarrollado por Opita Digital", con logo y contactos, en el pie del
  formulario, en el acceso y en el menú del panel.
- Si alguien borra la marca de agua o la firma desde el navegador, la app las
  vuelve a poner.
- Avisos de derechos en el código, en `LICENCIA.txt` y en los metadatos de la página.
- Los datos de la empresa (WhatsApp, correo, web, redes) se editan en
  `marca.js`, y el logo va en `public/marca/`.

## Diseño

- Cinco diseños que se cambian desde el panel: **Elegante** (azul medianoche,
  dorado y montañas del Huila; el predeterminado), **Opita** (verde y amarillo del
  Huila, con la cinta del sombrero), **Moderno oscuro**, **Limpio** y **Popular**.
- Tipografías incluidas: Bricolage Grotesque (títulos), Public Sans (texto) e
  IBM Plex Mono (etiquetas y cifras), todas con licencia OFL (`public/fonts/LICENCIAS.txt`).
- Códigos QR generados dentro de la app con qrcode-generator (licencia MIT).
- Diseño adaptado a celular.
- Gráficas en SVG hechas a mano, sin librerías.

## API

| Método | Ruta                          | Acceso   | Uso |
|--------|-------------------------------|----------|-----|
| GET    | `/api/config`                 | público  | Nombre, eslogan, diseño, enlace, total de registros y datos de Opita Digital |
| PUT    | `/api/ajustes`                | equipo   | `{ tema, nombre, eslogan, urlPublica }` |
| POST   | `/api/registros`              | público  | `{ nombre, apellido, cedula, edad, telefono, barrio, comuna, firma, autorizacion: true }` |
| GET    | `/api/barrios`                | público  | Barrios ya registrados con su comuna (sin datos personales) |
| GET    | `/api/encuestas`              | público  | Lista de encuestas |
| GET    | `/api/encuestas/:id`          | público  | Una encuesta con sus resultados |
| POST   | `/api/encuestas/:id/votar`    | público  | `{ "opcion": 0 }` |
| GET/POST/DELETE | `/api/sesion`        | —        | Consultar, iniciar (`{ "clave": "..." }`) o cerrar la sesión |
| GET    | `/api/panel`                  | equipo   | Estadísticas del panel |
| GET    | `/api/registros`              | equipo   | Todos los registros |
| GET    | `/api/registros.csv`          | equipo   | Descarga para Excel |
| DELETE | `/api/registros/:id`          | equipo   | Eliminar un registro |
| GET    | `/api/tablero.xlsx`           | equipo   | Excel con tablero (`?periodo=&comuna=&edad=`) |
| GET    | `/api/reporte.pdf`            | equipo   | Reporte PDF (`?periodo=&comuna=&edad=`) |
| GET    | `/api/panel`                  | equipo   | Estadísticas con filtros (`?periodo=7|30|90|todo&comuna=&edad=`) |
| POST   | `/api/encuestas`              | equipo   | `{ "pregunta": "...", "opciones": ["A", "B"] }` |
| POST   | `/api/encuestas/:id/cerrar`   | equipo   | Cerrar la votación |

Las rutas del equipo aceptan la cookie de sesión o la cabecera
`Authorization: Bearer <ADMIN_PASSWORD>`.

## Estructura

```
app-votacion/
├── server.js        # servidor HTTP, sesiones y rutas de la API
├── registros.js     # registros de la campaña, estadísticas y CSV
├── store.js         # encuestas y votos
├── ajustes.js       # diseño, nombre, eslogan y enlace público
├── marca.js         # datos de Opita Digital (firma y marca de agua)
├── exportar/        # Excel (.xlsx con gráficas) y PDF, sin librerías
├── public/          # interfaz (HTML, CSS, JS, tipografías)
└── test/            # pruebas con node:test
```

## Seguridad

- Todo el texto del usuario se muestra con `textContent` (sin inyección HTML).
- Política CSP estricta (solo recursos propios) y cabeceras de seguridad.
- Las peticiones que modifican datos desde otros orígenes se rechazan.
- El CSV escapa celdas que empiezan con `=`, `+`, `-` o `@` (evita fórmulas maliciosas en Excel).
- El archivo de registros se guarda con permisos `600`.

> "Un voto por navegador" evita votos dobles accidentales, pero no es una
> garantía fuerte (alguien puede borrar sus cookies).

## Datos personales (importante)

La base de datos contiene información personal (cédula, teléfono, firma). Si
se publica en internet:

- Use **HTTPS** y una contraseña de administrador larga.
- Respalde y proteja la carpeta `data/`: **no la suba a GitHub** (ya está en `.gitignore`).
- Tenga una política de tratamiento de datos y atienda solicitudes de
  consulta, corrección o eliminación, como exige la Ley 1581 de 2012. El botón
  de eliminar del panel sirve para atender las solicitudes de supresión.

## App Android (APK)

En el **Inicio** del panel aparece la franja *Aplicación Android* con el botón
**Descargar APK**, un código QR para bajarla al celular y los pasos para instalarla.

- La APK abre la app de la campaña completa (registro, encuestas y panel),
  descarga Excel, PDF y QR, y permite subir fotos.
- La primera vez pide la dirección de la página (debe empezar por `https://`).
- **Avisos de actualización:** cada 6 horas la app consulta `/api/app/version`; si
  hay una versión nueva, muestra una notificación y, al abrirla, un aviso para
  descargarla.

Para publicar una versión nueva:

```bash
export ANDROID_HOME=/ruta/al/android-sdk   # build-tools 34 y platforms android-34
android/construir.sh --version-code 2 --version-name 1.1 \
  --nombre "Nombre de la campaña" --url https://www.sucampana.com \
  --notas "Qué cambió en esta versión"
```

El script deja `public/descargas/campana.apk` y `version.json`; al subirlos al
servidor, todas las apps instaladas reciben el aviso.

> **Importante:** la firma de la app está en `android/firma/` (no se sube a
> GitHub). Guarde una copia segura: sin ella no se pueden publicar
> actualizaciones que se instalen encima de la app anterior.

## Entrar con Google

1. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   cree un **ID de cliente de OAuth** de tipo *Aplicación web*.
2. En *URI de redireccionamiento autorizados* agregue
   `https://SU-DOMINIO/auth/google/callback`.
3. Inicie el servidor con `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
4. En **Panel → Ajustes → Correos de Google del equipo**, escriba los correos que
   pueden entrar. Cualquier otro correo es rechazado.

En la app Android, "Entrar con Google" se abre en el navegador (Google no lo
permite dentro de apps) y vuelve a la app con un enlace de un solo uso.
