# 🗳️ App de Campaña: registro y votación

Aplicativo web para armar la **base de datos de una campaña** (registro de
personas con firma) y hacer **encuestas/votaciones**. Escrito en Node.js
**sin dependencias externas**.

## Registro de la campaña (`/#/registro`, página de inicio)

Formulario con: **nombre, apellido, cédula, edad, teléfono, barrio, comuna y
firma** (se dibuja con el dedo o el mouse), más la casilla obligatoria de
autorización de tratamiento de datos personales (Ley 1581 de 2012).

- Validaciones: cédula de 6 a 10 dígitos (acepta puntos), edad de 18 a 120,
  teléfono de 7 a 10 dígitos, nombre y apellido solo con letras.
- No se permite registrar dos veces la misma cédula.
- Los datos se guardan en `data/registros.json` (solo lectura del dueño del servidor).

## Panel de administrador (`/#/admin`)

- Protegido con la contraseña `ADMIN_PASSWORD`. Si no se define, el servidor
  genera una temporal y la muestra en la consola al arrancar.
- Tabla con todas las personas registradas, su firma y la fecha; buscador por
  nombre, cédula, barrio o comuna.
- Botón **Descargar Excel (CSV)** con todos los registros (abre bien en Excel,
  con tildes y ñ).
- Bloqueo de 15 minutos tras 10 contraseñas incorrectas.

## Encuestas (`/#/`)

- Crear encuestas con una pregunta y de 2 a 10 opciones.
- Un voto por persona (por navegador), usando una cookie anónima `HttpOnly`.
- Resultados con barras y porcentajes que se actualizan cada 3 segundos.
- Quien crea la encuesta recibe una clave de administración (guardada en su
  navegador) para **cerrar la votación**; al cerrarse se marca la opción ganadora 🏆.
- Lista de encuestas recientes.
- Modo claro/oscuro automático y diseño adaptable a celular.
- Los datos se guardan en `data/encuestas.json`.

## Cómo ejecutarla

Requiere Node.js 18 o superior.

```bash
cd app-votacion
ADMIN_PASSWORD="una-clave-segura" npm start   # abre http://localhost:3000
npm test           # ejecuta las pruebas
```

Variables opcionales:

| Variable    | Por defecto              | Uso                          |
|-------------|--------------------------|------------------------------|
| `PORT`      | `3000`                   | Puerto del servidor          |
| `DATA_FILE` | `data/encuestas.json`    | Archivo de las encuestas     |
| `REGISTROS_FILE` | `data/registros.json` | Archivo de los registros de la campaña |
| `ADMIN_PASSWORD` | (aleatoria)       | Contraseña del panel de administrador |

## API

| Método | Ruta                              | Cuerpo                              |
|--------|-----------------------------------|-------------------------------------|
| GET    | `/api/encuestas`                  | —                                   |
| POST   | `/api/encuestas`                  | `{ "pregunta": "...", "opciones": ["A", "B"] }` |
| GET    | `/api/encuestas/:id`              | —                                   |
| POST   | `/api/encuestas/:id/votar`        | `{ "opcion": 0 }`                   |
| POST   | `/api/encuestas/:id/cerrar`       | `{ "claveAdmin": "..." }`           |
| POST   | `/api/registros`                  | `{ nombre, apellido, cedula, edad, telefono, barrio, comuna, firma, autorizacion: true }` |
| GET    | `/api/registros`                  | Requiere `Authorization: Bearer <ADMIN_PASSWORD>` |
| GET    | `/api/registros.csv`              | Requiere `Authorization: Bearer <ADMIN_PASSWORD>` |

## Estructura

```
app-votacion/
├── server.js        # servidor HTTP y rutas de la API
├── store.js         # lógica de encuestas, validación y persistencia
├── registros.js     # registro de la campaña (datos personales y firma)
├── public/          # interfaz (HTML, CSS, JS)
└── test/            # pruebas con node:test
```

## Seguridad

- Todo el texto del usuario se muestra con `textContent` (sin inyección HTML).
- Política CSP estricta y cabeceras de seguridad.
- Las peticiones POST de otros orígenes se rechazan.
- La identidad del votante y la clave de administración se guardan como hash.
- Límite de 16 KB en el cuerpo de las peticiones.

> Nota: "un voto por navegador" evita votos dobles accidentales, pero no es
> una garantía fuerte (alguien puede borrar sus cookies). Para votaciones
> oficiales haría falta autenticación de usuarios.

## Datos personales (importante)

La base de datos contiene información personal (cédula, teléfono, firma). Si
se publica en internet:

- Use **HTTPS** y una contraseña de administrador larga.
- Respalde y proteja la carpeta `data/`: **no la suba a GitHub** (ya está en `.gitignore`).
- Tenga una política de tratamiento de datos y atienda solicitudes de
  consulta, corrección o eliminación, como exige la Ley 1581 de 2012.
