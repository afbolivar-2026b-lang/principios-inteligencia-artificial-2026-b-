# Guía para publicar Nova gratis en Vercel (paso a paso)

Nova funciona sin internet y sin IA. Esta guía la deja en una dirección web para instalarla en el celular. Sin la parte de IA (pasos 5 y 6) la app funciona igual a mano.

1. **Cuenta de Vercel (gratis).** Entre a vercel.com → *Sign Up* → *Continue with GitHub*. Use la misma cuenta de GitHub donde está este repositorio. Elija el plan **Hobby** (gratis, uso personal).
2. **Dar acceso al repositorio.** Vercel pide permiso para ver GitHub. Elija *Only select repositories* y marque `principios-inteligencia-artificial-2026-b-`.
3. **Crear el proyecto.** *Add New → Project* → importe el repositorio. En **Root Directory** escriba `app` (muy importante). Framework: Vite (lo detecta solo). Antes de publicar, la rama debe estar fusionada (PR #13) o elija la rama `claude/jev-experiments-overview-sdqq2x` en *Production Branch*.
4. **Publicar.** Toque *Deploy*. A los 1–2 minutos Vercel da una dirección como `nova-xxxx.vercel.app`. Ábrala en el celular.
5. **(Opcional) Llave de IA.** En console.anthropic.com cree una cuenta, ponga un **límite de gasto mensual bajo** (Settings → Limits) y cree una llave (API Keys). **No la escriba en el chat.**
6. **(Opcional) Variables en Vercel.** *Settings → Environment Variables*: `ANTHROPIC_API_KEY` = su llave y `CODIGO_ACCESO` = un código largo que usted invente (20+ letras y números). *Deployments → Redeploy*. Luego, en Nova: Ajustes → Inteligencia artificial → escriba el mismo código.
7. **Instalar en el celular.** Abra la dirección en Chrome (Android) → menú ⋮ → *Instalar app* / *Añadir a pantalla de inicio*. En iPhone: Safari → Compartir → *Añadir a pantalla de inicio*.
8. **Primer respaldo.** En Nova: Ajustes → Respaldo → descargar. Los datos viven solo en el celular.

Qué hago yo después de que usted termine: abrir la dirección, revisar errores (Chrome DevTools) y comprobar que las funciones de IA responden (la parte que falta probar en Vercel real).
