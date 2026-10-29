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
};
