# 🗳️ App de Votación

Aplicativo web sencillo para crear encuestas, compartir el enlace y ver los
resultados en vivo. Escrito en Node.js **sin dependencias externas**.

## Funcionalidades

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
npm start          # abre http://localhost:3000
npm test           # ejecuta las pruebas
```

Variables opcionales:

| Variable    | Por defecto              | Uso                          |
|-------------|--------------------------|------------------------------|
| `PORT`      | `3000`                   | Puerto del servidor          |
| `DATA_FILE` | `data/encuestas.json`    | Archivo donde se guardan los datos |

## API

| Método | Ruta                              | Cuerpo                              |
|--------|-----------------------------------|-------------------------------------|
| GET    | `/api/encuestas`                  | —                                   |
| POST   | `/api/encuestas`                  | `{ "pregunta": "...", "opciones": ["A", "B"] }` |
| GET    | `/api/encuestas/:id`              | —                                   |
| POST   | `/api/encuestas/:id/votar`        | `{ "opcion": 0 }`                   |
| POST   | `/api/encuestas/:id/cerrar`       | `{ "claveAdmin": "..." }`           |

## Estructura

```
app-votacion/
├── server.js        # servidor HTTP y rutas de la API
├── store.js         # lógica de encuestas, validación y persistencia
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
