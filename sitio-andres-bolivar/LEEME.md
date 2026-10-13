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

## 5. Videos en la página (opcional)

Los videos de presentación pesan mucho para la base de datos, por eso se guardan en **Firebase Storage**.

1. En Firebase, abra **Storage** y toque **Comenzar** (necesita el plan Blaze, el mismo del asistente).
2. Abra `storage.rules`, cambie `PEGUE_SU_CORREO` por su correo y publíquelas: `firebase deploy --only storage`.

Sin Storage, el video se puede crear y **descargar** igual, para mandarlo por WhatsApp o subirlo a Instagram; solo no aparece en la página.

## 6. Cómo se usa

- **Proyectos → Publicar con IA**: suba hasta 6 archivos del proyecto (pantallazos, fotos, el PDF de la propuesta o el archivo de la página) y toque **Analizar con IA**. La IA escribe el nombre, para quién es, la descripción y las funciones, y sugiere el precio (mínimo, recomendado y máximo), el tiempo de entrega y el soporte mensual. La página arma una **portada** con su primer pantallazo dentro de un marco de computador o de celular. Revise, corrija lo que quiera y toque **Guardar proyecto**. El precio es privado: nunca se publica en la página.
  - Sin la IA activada, use **Seguir sin IA**: la portada se arma igual y el precio sale de su calculadora.
  - La IA no dibuja fotos nuevas: la portada siempre usa sus pantallazos reales. Si no sube ninguno, se arma una portada solo con texto.
  - **Tomar foto** abre la cámara del celular o del computador; la foto entra directo a los archivos.
  - Si sube un **video**, la página saca 3 fotos de él para que la IA lo entienda (la IA no ve videos).
  - **Crear video** arma un video de unos 20 segundos: portada, sus pantallazos en marco de computador o celular, las funciones y un cierre con su WhatsApp. Las frases las escribe la IA. Se puede descargar y, con Storage activado, mostrar en la página.
- **Proyectos → Nuevo proyecto**: suba la foto, el nombre, para quién es y las funciones. Marque **Publicado en mi página** y guarde. Aparece de primero en la sección *Casos*.
- Desde una propuesta **Aprobada**, el botón **Publicar como proyecto** llena el formulario automáticamente.
- **Asistente → ¿En cuánto lo vendo?**: escoja el tipo y las funciones; le da el precio mínimo, recomendado y máximo, el tiempo y el soporte mensual. **Crear propuesta con este precio** arma la propuesta lista para editar.
- **Ajustar mis precios**: cambie las tarifas base a las suyas. Los valores de fábrica son solo un punto de partida.
