# Sitio de Andrés Bolívar: cómo dejarlo funcionando

La página tiene tres partes:

1. **Página pública**: lo que ven sus clientes. Funciona sola.
2. **Mi oficina** (botón *Ingresar*): clientes, propuestas, proyectos y asistente. Necesita Firebase.
3. **Chat con IA** dentro del Asistente: opcional. Necesita la función `asistente` y una clave de Anthropic.

La calculadora de precios y las recomendaciones funcionan sin la IA.

---

## 1. Conectar Firebase (obligatorio para Mi oficina)

1. Entre a <https://console.firebase.google.com> y cree un proyecto.
2. En **Authentication → Método de acceso**, active **Correo electrónico/contraseña**.
3. En **Authentication → Usuarios**, cree su usuario con su correo y una contraseña.
4. Cree la base de datos en **Firestore Database** (modo producción).
5. En **Configuración del proyecto → Tus apps → App web**, copie el bloque `firebaseConfig`.
6. Abra `index.html`, busque `const firebaseConfig` y reemplace cada `"PEGUE_AQUI"` por sus datos.

## 2. Reglas de seguridad (muy importante)

Las reglas deciden quién puede ver y cambiar los datos. Sin ellas, cualquiera podría leer sus clientes.

1. Abra `firestore.rules` y cambie `PEGUE_SU_CORREO` por el correo con el que entra a Mi oficina.
2. Copie todo el contenido en **Firestore Database → Reglas** y toque **Publicar**.

Con estas reglas:

- Sus clientes, propuestas y precios solo los ve usted.
- Los proyectos marcados como **Publicado** los ve cualquier persona en su página.
- Solo su correo puede crear, editar o borrar proyectos.

Recomendado: en **Authentication → Configuración → Acciones del usuario**, desactive la creación de cuentas nuevas, para que nadie más pueda registrarse.

## 3. Publicar la página

Puede subir `index.html` a Firebase Hosting, Netlify o cualquier hosting. Con Firebase:

```bash
npm install -g firebase-tools
firebase login
cd sitio-andres-bolivar
firebase use --add            # elija su proyecto
firebase deploy --only hosting,firestore
```

Después, en **Authentication → Configuración → Dominios autorizados**, agregue la dirección de su página.

## 4. Activar el chat con IA (opcional)

El chat usa Claude, de Anthropic. La clave queda guardada como **secreto** en Firebase y nunca aparece en la página; por eso pasa por la función `functions/index.js`.

Necesita:

- El plan **Blaze** de Firebase (pago por uso). Las funciones no corren en el plan gratuito.
- Una clave de API de Anthropic: <https://console.anthropic.com> → *API Keys*. Cada pregunta tiene un costo pequeño que se cobra en su cuenta de Anthropic.

Pasos:

```bash
cd sitio-andres-bolivar
firebase functions:secrets:set ANTHROPIC_API_KEY     # pegue su clave cuando la pida
firebase deploy --only functions
```

Durante el despliegue le pedirá `CORREO_DUENO`: escriba el mismo correo con el que entra a Mi oficina. Solo esa cuenta podrá usar el asistente.

Al terminar, la consola muestra la dirección de la función (algo como `https://asistente-xxxxx-uc.a.run.app`). Cópiela en `index.html`:

```js
const ASISTENTE_URL = "https://asistente-xxxxx-uc.a.run.app";
```

Vuelva a publicar la página (`firebase deploy --only hosting`) y el chat queda activo.

## 5. Cómo se usa

- **Proyectos → Nuevo proyecto**: suba la foto, el nombre, para quién es y las funciones. Marque **Publicado en mi página** y guarde. Aparece de primero en la sección *Casos*.
- Desde una propuesta **Aprobada**, el botón **Publicar como proyecto** llena el formulario automáticamente.
- **Asistente → ¿En cuánto lo vendo?**: escoja el tipo y las funciones; le da el precio mínimo, recomendado y máximo, el tiempo y el soporte mensual. **Crear propuesta con este precio** arma la propuesta lista para editar.
- **Ajustar mis precios**: cambie las tarifas base a las suyas. Los valores de fábrica son solo un punto de partida.
