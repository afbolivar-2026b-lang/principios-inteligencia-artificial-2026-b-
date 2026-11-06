# App de Campaña: registro, panel y encuestas

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
| `NOMBRE_CAMPANA`  | `Mi Campaña`           | Nombre que aparece en el logo y los títulos |
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

- **Inicio**: personas registradas, registros de hoy, últimos 7 días comparados
  con la semana anterior, edad promedio, registros por día de los últimos 30 días
  (con detalle al pasar el mouse), registros por comuna, por rango de edad,
  barrios más fuertes, últimos registros y estado de las encuestas.
- **Registros**: tabla con buscador, filtro por comuna, firma de cada persona,
  botón para eliminar un registro y descarga a Excel (CSV con tildes y ñ).
- **Encuestas**: crear encuestas, ver resultados en vivo, copiar el enlace y
  cerrar la votación.

### Encuestas públicas (`/#/encuestas`)
La gente vota una vez por navegador y ve los resultados al momento.

## Diseño

- Estilo de cartel de campaña: papel cálido, tinta oscura y un rojo de acento.
- Tipografías incluidas: Bricolage Grotesque (títulos), Public Sans (texto) e
  IBM Plex Mono (etiquetas y cifras), todas con licencia OFL (`public/fonts/LICENCIAS.txt`).
- Modo oscuro automático y diseño adaptado a celular.
- Gráficas en SVG hechas a mano, sin librerías.

## API

| Método | Ruta                          | Acceso   | Uso |
|--------|-------------------------------|----------|-----|
| GET    | `/api/config`                 | público  | Nombre de la campaña y total de registros |
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
