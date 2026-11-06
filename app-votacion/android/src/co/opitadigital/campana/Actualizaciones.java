/* © Opita Digital — Todos los derechos reservados. */
package co.opitadigital.campana;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Revisa si hay una versión nueva de la app y avisa con una notificación. */
final class Actualizaciones {
    static final String CANAL = "actualizaciones";
    static final String ACCION_ACTUALIZAR = "co.opitadigital.campana.ACTUALIZAR";
    private static final int JOB_ID = 2026;

    /** Información de la última versión publicada en el servidor. */
    static final class Version {
        long codigo;
        String nombre;
        String notas;
        String apk;
    }

    static long versionInstalada(Context c) {
        try {
            PackageInfo pi = c.getPackageManager().getPackageInfo(c.getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode;
        } catch (Exception e) {
            return 0;
        }
    }

    /** Consulta /api/app/version. Se llama fuera del hilo principal. */
    static Version consultar(Context c) {
        String base = Config.url(c);
        if (base.isEmpty()) return null;
        HttpURLConnection con = null;
        try {
            con = (HttpURLConnection) new URL(base + "/api/app/version").openConnection();
            con.setConnectTimeout(10000);
            con.setReadTimeout(10000);
            if (con.getResponseCode() != 200) return null;
            InputStream in = con.getInputStream();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            JSONObject j = new JSONObject(out.toString("UTF-8"));
            if (!j.optBoolean("disponible", false)) return null;
            Version v = new Version();
            v.codigo = j.optLong("versionCode", 0);
            v.nombre = j.optString("versionName", "");
            v.notas = j.optString("notas", "");
            String apk = j.optString("apk", "/descargas/campana.apk");
            v.apk = apk.startsWith("http") ? apk : base + apk;
            return v;
        } catch (Exception e) {
            return null;
        } finally {
            if (con != null) con.disconnect();
        }
    }

    static void crearCanal(Context c) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel canal = new NotificationChannel(CANAL, "Actualizaciones de la app",
                    NotificationManager.IMPORTANCE_DEFAULT);
            canal.setDescription("Avisa cuando hay una versión nueva para descargar");
            c.getSystemService(NotificationManager.class).createNotificationChannel(canal);
        }
    }

    /** Muestra la notificación si la versión es nueva y no se había avisado antes. */
    static void avisarSiHayNueva(Context c, Version v) {
        if (v == null || v.codigo <= versionInstalada(c) || v.codigo <= Config.versionAvisada(c)) return;
        crearCanal(c);
        // Al tocar la notificación, la app descarga e instala la versión nueva
        Intent abrir = new Intent(c, MainActivity.class).setAction(ACCION_ACTUALIZAR)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 0, abrir,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(c, CANAL) : new Notification.Builder(c);
        String texto = (v.notas == null || v.notas.isEmpty() ? "" : v.notas + " ") + "Toque para actualizar.";
        b.setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setContentTitle("Nueva versión " + v.nombre + " disponible")
                .setContentText(texto)
                .setStyle(new Notification.BigTextStyle().bigText(texto))
                .setContentIntent(pi)
                .setAutoCancel(true);
        try {
            c.getSystemService(NotificationManager.class).notify(1, b.build());
            Config.marcarAvisada(c, v.codigo);
        } catch (SecurityException sinPermiso) {
            // El usuario no dio permiso de notificaciones: se avisa al abrir la app.
        }
    }

    /** Programa la revisión automática cada 6 horas (con internet). */
    static void programar(Context c) {
        JobScheduler js = c.getSystemService(JobScheduler.class);
        if (js == null) return;
        JobInfo job = new JobInfo.Builder(JOB_ID, new ComponentName(c, ActualizacionJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(6 * 60 * 60 * 1000L)
                .setPersisted(true)
                .build();
        js.schedule(job);
    }

    private Actualizaciones() {}
}
