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
- El formulario **Cotice su proyecto** de la página guarda cada solicitud en `solicitudes`. Cualquier visitante puede enviar una, pero solo usted las puede leer. Las reglas revisan que no traigan campos de más ni textos gigantes.
- Las propuestas que envía **por enlace** quedan en `enlaces`. Solo quien tenga el enlace puede abrir esa propuesta, y nadie puede listar las demás. El cliente solo puede marcarla como vista y aprobarla con su firma, una sola vez, y no puede cambiar ni el precio ni el texto.
- Los **nombres** de sus formas de pago (Nequi, Transferencia…) se guardan en `sitio/pagos` para mostrarlos en la página. Los números de cuenta, llaves y enlaces de pago siguen siendo privados.

Recomendado: en **Authentication → Configuración → Acciones del usuario**, desactive la creación de cuentas nuevas, para que nadie más pueda registrarse.

## 3. Antes de publicar: su dirección y su horario

- **Su dirección web.** En `index.html`, `robots.txt`, `sitemap.xml` y `llms.txt` aparece `SU-DOMINIO`. Cámbielo por la dirección real de su página (por ejemplo `andresbolivar.com.co`), sin `https://` ni `/` al final. Así Google y WhatsApp muestran bien su página y la imagen al compartir (`og.jpg`).
- **Su horario.** En `index.html`, busque `const HORARIO` y ponga sus días y horas reales. La página muestra "Disponible ahora" o "Le respondo en horario de atención" según la hora de Colombia.
- **Precios de referencia.** La calculadora pública "¿Cuánto cuesta?" usa los valores de `TARIFAS_BASE` en `index.html`. Si cambia sus precios en Mi oficina, cambie también esos valores para que la página pública muestre rangos parecidos.
- **Planes de soporte.** La sección *Soporte mensual* usa `PLANES_SOPORTE` en `index.html`. Ponga sus precios y lo que de verdad incluye cada plan.
- **Google Maps y reseñas (opcional).** Si tiene ficha de Google Business, pegue en `GOOGLE_MAPS` el enlace de su ficha, y en `GOOGLE_RESENA` el enlace para escribir una reseña (en su perfil de Google, *Pedir reseñas*). Así aparecen los botones en *Contacto*. Mientras estén vacíos, no se muestran.
- **Meta y garantía.** `META_NEGOCIOS` es la meta de la página (100 negocios). Cuenta los proyectos de *Casos*. `GARANTIA_DIAS` son los días del carnet de garantía.
- **Tratamiento de datos.** `privacidad.html` es una base general según la Ley 1581: revísela con un abogado antes de publicarla.

## 3b. Publicar la página

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

Durante el despliegue le pedirá dos datos:

- `CORREO_DUENO`: el mismo correo con el que entra a Mi oficina. Solo esa cuenta podrá usar el asistente.
- `LIMITE_DIARIO`: cuántos usos del asistente permite por día. Si lo deja vacío, son 60. Una pregunta en el chat cuenta como 1 y analizar un proyecto cuenta como 3. Así un error o un abuso no le gasta la cuenta de Anthropic. Se renueva cada día a medianoche, hora de Colombia.

Al terminar, la consola muestra la dirección de la función (algo como `https://asistente-xxxxx-uc.a.run.app`). Cópiela en `index.html`:

```js
const ASISTENTE_URL = "https://asistente-xxxxx-uc.a.run.app";
```

Vuelva a publicar la página (`firebase deploy --only hosting`) y el chat queda activo.

**Diagnóstico gratis con IA para sus visitantes (opcional).** La misma publicación crea una segunda función, `diagnostico`. Copie su dirección (algo como `https://diagnostico-xxxxx-uc.a.run.app`) en `DIAGNOSTICO_URL` de `index.html`. Como cualquiera puede usarla, tiene dos límites que puede cambiar al publicar:

- `DIAGNOSTICOS_POR_PERSONA`: diagnósticos por día desde una misma conexión. Si lo deja vacío, son 5.
- `DIAGNOSTICOS_DIA`: diagnósticos por día en total. Si lo deja vacío, son 100.

Mientras `DIAGNOSTICO_URL` esté vacía, el diagnóstico de la página funciona igual, con reglas sencillas y sin IA.

**Protección contra robots con App Check (opcional, recomendado cuando la página ya esté publicada).**

1. En Firebase → **App Check** → su app web → registre **reCAPTCHA v3** (Google le da una «clave del sitio» y una «clave secreta»; la secreta se pega en Firebase, no en la página).
2. Copie la **clave del sitio** en `index.html`:

   ```js
   const APPCHECK_SITE_KEY = "6Lc…";
   ```

3. Publique la página y revise en App Check → **Métricas** que las visitas salen como «verificadas».
4. Cuando lo vea bien, active la protección del diagnóstico: `firebase deploy --only functions` y responda `si` cuando pida `EXIGIR_APPCHECK`. Desde ese momento solo su página puede usar el diagnóstico con IA.

Ojo: **no** active «Aplicar» (*Enforce*) para Firestore en App Check si usa la app de Android, porque la app no lleva el sello de reCAPTCHA y dejaría de cargar sus datos. La página web sí lo lleva siempre.

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
- **Mis datos → Formas de pago**: escriba su Nequi, Daviplata, llave Bre-B, cuenta de banco y, si los tiene, sus enlaces de pago de Wompi, Bold, Mercado Pago o PayPal.me (los crea en la cuenta de cada servicio). Puede subir la imagen de su QR de pago. Deje vacío lo que no use. Si marca **Mostrar en mi página**, la sección *Contacto* dice qué formas de pago recibe, solo los nombres.
- **Propuesta → Pagos y cobros**: registre cada abono con su valor, fecha y cómo pagó. La página calcula lo pagado y el saldo. Desde ahí:
  - **Cobrar por WhatsApp** arma el mensaje con el saldo y sus formas de pago;
  - **Cuenta de cobro PDF** descarga una cuenta de cobro numerada, con su QR;
  - en cada abono, **Recibo** descarga el recibo en PDF y **Confirmar** arma el mensaje de "recibí su pago".
- **Panel**: muestra **Por cobrar** (la suma de los saldos de las propuestas aprobadas) y **Cobrado este mes**. Las recomendaciones le avisan a quién cobrarle primero.
- **Panel → Centro de funciones**: aquí están las 1000 funciones con su estado: *Funcionando*, *Próximamente* (solo página o con Firebase), *Necesita la IA* o *Necesita cuenta externa*, que dice qué cuenta hace falta. Puede buscar, filtrar, marcar con ★ las que quiere primero y **Copiar mis favoritas** para pedírmelas.
- **Los pagos no se cobran solos.** La página no recibe la plata ni guarda tarjetas: el cliente paga por su Nequi, su banco o el enlace de Wompi/Bold/Mercado Pago, y usted registra el abono. Cobrar con tarjeta dentro de la página o facturar electrónicamente ante la DIAN necesita un contrato con esa empresa (funciones 🟠 de la lista).
- **Cotice su proyecto (página → Mi oficina)**: lo que un visitante llena en el formulario le llega a **Clientes → Solicitudes de su página**, con un aviso rojo en la pestaña. Desde ahí puede:
  - **Responder por WhatsApp** con un mensaje ya escrito;
  - **Pasar a clientes**: crea el cliente con todo lo que escribió y un recordatorio para hoy;
  - **Descartar**.

  Sin Firebase, el formulario abre WhatsApp con la solicitud ya escrita.
- **Embudo de clientes**: en **Clientes** se ve cuántos hay en cada etapa (prospecto, cotizado, aprobado, en desarrollo, entregado). Toque una etapa para ver solo esos. La etapa sale sola según sus propuestas, o la puede escoger usted en el cliente.
- **Recordatorios de seguimiento**: en cada cliente, *Etapa y seguimiento*. Ponga la fecha y qué tiene que hacer. El día que toca, el Panel se lo recuerda de primero. Use *Ya lo hice* cuando termine.
- **Propuesta por enlace con firma**: en la propuesta, **Crear enlace y enviar por WhatsApp**. El cliente:
  - abre la propuesta en el celular, sin instalar nada;
  - la puede descargar en PDF;
  - la aprueba con su nombre, su cédula y su firma con el dedo.

  Usted ve cuándo la abrió. Cuando firma, la propuesta pasa sola a **Aprobada** y la firma sale al final del PDF. Si cambia la propuesta después de enviarla, toque **Enviar de nuevo**. Una propuesta ya firmada no se puede cambiar por el enlace.
- **Carnet de garantía**: en una propuesta aprobada, **Carnet de garantía** descarga un PDF con la fecha de entrega, hasta cuándo va la garantía, qué cubre y un código QR para pedir soporte por WhatsApp.
- **Impuestos**: en **Mis datos → Formas de pago**, escriba el porcentaje que quiere apartar de cada pago. Al registrar un abono le dice cuánto guardar, y el Panel muestra cuánto apartar del mes. Pregúntele a su contador el porcentaje correcto.
- **Antes y después**: en un proyecto, suba la **foto de antes** (el cuaderno o el Excel del cliente). En la página sale un deslizador para comparar el antes con el sistema nuevo.
- **En la página pública** también hay:
  - una **demo** donde el visitante escribe el nombre de su negocio y ve cómo se vería su app;
  - los **planes de soporte**;
  - la **guía gratis** en 5 pasos, que se descarga en PDF o se comparte por WhatsApp;
  - la **meta** de 100 negocios.
- **Avance del proyecto y portal del cliente**: cuando una propuesta queda **Aprobada**, se crea sola con sus etapas (las de "Plan de trabajo" o, si no hay, Diseño, Desarrollo, Pruebas y Entrega). Marque cada etapa como *Pendiente*, *En curso* o *Lista* y toque **Actualizar y avisar al cliente**: le llega el enlace por WhatsApp y ve el porcentaje y las etapas. El Panel muestra los **proyectos en curso** con su avance.
- **Testimonios verificados**: cuando todas las etapas están *Lista*, el cliente puede dejar su opinión y sus estrellas en el mismo enlace. Solo quien firmó la propuesta puede opinar, y solo una vez. Usted la ve en la propuesta y, si el cliente lo autorizó, toca **Publicar en mi página**. Sale en la sección *Testimonios* como «Cliente verificado».
- **Mi lista de precios**: en **Asistente → Mi lista de precios** escriba sus servicios con su precio. Con **Llenar con mis tarifas** arranca de las tarifas de la calculadora. Después, en cada propuesta, use **Agregar de mi lista de precios** y el servicio entra solo a la inversión.
- **Propuestas desde plantilla**: en **Propuestas → Empezar desde una plantilla**, escoja el tipo de negocio (tienda, restaurante, parqueadero, finca, vigilancia, veterinaria o página web). La propuesta sale con el alcance, las etapas y el precio calculado con sus tarifas.
- **Programa de revendedores**: en **Mis datos → Programa de revendedores**:
  - ponga el porcentaje de comisión y agregue a cada revendedor con su WhatsApp;
  - cada uno recibe un enlace con su código (`?ref=…`), y las solicitudes que lleguen por ahí salen con la etiqueta «Recomendado por…»;
  - la página le calcula la comisión de lo que se apruebe;
  - si marca **Invitar en mi página**, aparece la sección «Gane recomendando».
- **Grabar pantalla**: en **Publicar con IA**, **Grabar pantalla** graba su sistema funcionando, en computador con Chrome o Edge. La grabación queda en los archivos del proyecto (la página saca 3 fotos de ella) y la puede descargar. En celular este botón no aparece, porque los celulares no permiten grabar la pantalla desde una página.
- **Más ayudas de la IA** (cuando active el asistente): informe del mes, práctica de ventas con un cliente difícil y textos de Instagram, desde las sugerencias del chat o con el botón **Texto para Instagram con IA** en cada proyecto.
- **Lo que falta**: está guardado, en orden, en `PENDIENTES.md`.
- **Diagnóstico gratis** (página pública): el visitante responde 6 preguntas, y la pregunta del problema la puede **dictar con la voz**. Recibe:
  - lo que hoy le cuesta y lo que le conviene;
  - un rango de precio con sus tarifas;
  - qué hacer esta semana;
  - el proyecto suyo que más se parece a su caso.

  Lo puede descargar en PDF o tocar **Quiero esto**, que le llena el formulario de cotización.
- **Dictar una propuesta** (Propuestas): hable o escriba lo que conversó con el cliente. Con la IA activada sale la propuesta completa: alcance, etapas, cliente y precio con sus tarifas. Sin IA, sale un borrador con sus notas.
- **Foto del cuaderno a tabla** (Asistente, con IA): la IA lee la letra y arma una tabla. La puede descargar para Excel o **Crear estos clientes** si trae nombres.
- **Aviso de datos personales** (Publicar con IA): si la IA ve teléfonos, nombres o cédulas en los pantallazos, le avisa antes de publicar.
- **Tablero** (Panel): gráfica de lo aprobado y lo cobrado en los últimos 6 meses, embudo de clientes, lo que viene (por cobrar, propuestas sin respuesta, soporte posible) y sus mejores clientes.
- **Cotización rápida** (Asistente): con el precio de la calculadora, escriba para quién es y descárguela en PDF de una página, o mándela por WhatsApp. Es válida por 15 días.

- **Contrato y forma de cobro** (en cada propuesta): toque **Crear contrato**.
  - Escoja cómo cobra: 50 % y 50 %, por etapas, 3 cuotas, un solo pago o a su manera. Ve cada pago con su valor exacto y cuándo se paga, y la página le avisa si los porcentajes no suman 100 %.
  - Ponga la fecha de inicio, los días de espera antes de pausar por un pago atrasado, el valor de la hora para cambios, los días de garantía y el soporte mensual.
  - El contrato se arma solo con la propuesta: partes, alcance, entregas, pagos, cambios, garantía, de quién queda el código, datos personales y terminación. Al principio lleva **«Así se cobra, en palabras sencillas»** para el cliente.
  - **Explicarle el cobro por WhatsApp** manda esa explicación con los valores exactos.
  - **Mejorar con IA** redacta el contrato más claro y escribe la explicación y el mensaje, sin cambiar valores, fechas ni medios de pago. Revíselo siempre antes de enviarlo.
  - Si envía la propuesta por enlace, el contrato va con ella: el cliente lo lee, lo descarga y lo firma junto con la propuesta.
  - Es una base general: revísela con un abogado.

- **Sistemas y mensualidades** (Proyectos → **Sistemas y mensualidades**): los sistemas que ya entregó y mantiene.
  - Ponga la dirección, el cliente, el plan de soporte (el valor se llena solo), el **día de cobro** de cada mes y desde qué mes cobra.
  - Ve si cada página está **en línea** o **no responde**, cuánto recibe fijo cada mes y quién está atrasado.
  - **Registrar pago** anota el mes más viejo que falta. **Cobrar por WhatsApp** manda el recordatorio con los meses, el total y sus formas de pago.
  - Anote cuándo se vencen el **dominio** y el **hosting**: 30 días antes le aparece el aviso, y en el Panel salen las mensualidades atrasadas en «El asistente recomienda».
  - Lo cobrado en mensualidades suma en «Cobrado este mes». No guarde contraseñas aquí.

## 7. App para Android (APK)

La página también es una app para Android. Cada vez que se cambia algo de la página en GitHub, un proceso automático (`.github/workflows/apk.yml`) arma la app de nuevo y la deja en `descargas/andres-bolivar.apk`. Cuando publique la página, aparecen solos los botones **Descargar la app para Android**, en la portada y en Contacto. En **Mis datos → App para su celular** están los pasos para instalarla.

- **Cómo se instala:** descargue la APK en el celular, ábrala y, si Android lo pide, permita *instalar apps de esta fuente*. Queda el ícono negro con la B.
- **Firebase:** la app trae adentro la página tal como está en GitHub. Después de pegar su `firebaseConfig`, la próxima APK que se arme ya entra a Mi oficina. En Firebase, *Authentication → Dominios autorizados* debe incluir `localhost`, que viene por defecto.
- **Al actualizar:** esta APK de prueba se firma con una llave nueva en cada armado. Por eso, para instalar una versión nueva quizá tenga que desinstalar la anterior antes. Para publicarla en Play Store hace falta una llave propia; es la función 726 de la lista.
- **iPhone:** no usa APK. En Safari toque *Compartir → Agregar a pantalla de inicio*.
