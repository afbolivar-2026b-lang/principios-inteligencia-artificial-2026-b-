/* © Opita Digital — Todos los derechos reservados. */
package co.opitadigital.campana;

import android.content.Context;
import android.content.SharedPreferences;

/** Dirección del servidor de la campaña guardada en el teléfono. */
final class Config {
    private static final String PREFS = "config";

    static String url(Context c) {
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String guardada = p.getString("url", "");
        if (guardada != null && !guardada.isEmpty()) return guardada;
        return limpiar(c.getString(R.string.url_inicial));
    }

    static void guardarUrl(Context c, String url) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("url", limpiar(url)).apply();
    }

    static long versionAvisada(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getLong("avisada", 0);
    }

    static void marcarAvisada(Context c, long version) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putLong("avisada", version).apply();
    }

    static String limpiar(String url) {
        if (url == null) return "";
        String u = url.trim();
        while (u.endsWith("/")) u = u.substring(0, u.length() - 1);
        return u;
    }

    private Config() {}
}
