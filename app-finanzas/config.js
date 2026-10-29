// Configuración de la app. Cambia estos valores sin tocar el resto del código.
//
// La clave publicable de Supabase está pensada para ir en el navegador: las
// reglas RLS hacen que cada usuario solo vea y edite sus propios datos, y los
// visitantes sin sesión no pueden leer nada. NUNCA pongas aquí la clave
// service_role ni la contraseña de la base de datos.
window.NOVA_CONFIG = {
  nombre: "NOVA",
  supabaseUrl: "https://bldimtnnvumcjakbgqta.supabase.co",
  supabaseKey: "sb_publishable_4sx5ZQwhC1WDEXAqy_NYYQ_wKJ7MgHl",
  // Dirección pública de la app: a ella lleva el enlace del correo para
  // cambiar la contraseña (también cuando se pide desde la app de Android).
  sitioUrl: "https://nova-finanzas.vercel.app",
  // APK para Android y su número de versión. Las publica el flujo de GitHub
  // Actions en la versión fija "nova-android" del repositorio, así el enlace
  // siempre da la última aunque la página no se haya vuelto a publicar.
  apkUrl: "https://github.com/afbolivar-2026b-lang/principios-inteligencia-artificial-2026-b-/releases/download/nova-android/NOVA.apk",
  apkVersionUrl: "https://github.com/afbolivar-2026b-lang/principios-inteligencia-artificial-2026-b-/releases/download/nova-android/version.json",
};
