// Configuración de la tienda. Cambia estos valores sin tocar index.html.
//
// La clave publicable de Supabase está pensada para ir en el navegador:
// las reglas RLS de la base de datos solo dejan leer categorías y productos
// activos. NUNCA pongas aquí la clave service_role ni la contraseña de la base.
window.TIENDA_CONFIG = {
  nombre: "Mercado Opita",
  supabaseUrl: "https://bldimtnnvumcjakbgqta.supabase.co",
  supabaseKey: "sb_publishable_4sx5ZQwhC1WDEXAqy_NYYQ_wKJ7MgHl",
  // Número de WhatsApp de la tienda en formato internacional, solo dígitos
  // (por ejemplo "573001234567"). Si se deja vacío, el pedido solo se copia.
  whatsapp: "",
};
