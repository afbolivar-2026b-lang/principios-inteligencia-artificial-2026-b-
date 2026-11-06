/* App de campaña · © Opita Digital — Todos los derechos reservados. */
package co.opitadigital.campana;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.ContentValues;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;
import android.text.InputType;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final int ELEGIR_ARCHIVO = 10;
    private static final int COLOR_NOCHE = Color.rgb(14, 27, 44);
    private static final int COLOR_ORO = Color.rgb(201, 164, 92);
    private static final int COLOR_MARFIL = Color.rgb(244, 239, 230);
    private static final int COLOR_PAPEL = Color.rgb(244, 239, 230);

    private WebView web;
    private ValueCallback<Uri[]> archivoPendiente;

    // Actualización en curso
    private long descargaId = -1;
    private boolean esperandoPermisoInstalar = false;
    private Uri apkDescargado;

    private final BroadcastReceiver descargaTerminada = new BroadcastReceiver() {
        @Override
        public void onReceive(Context c, Intent i) {
            long id = i.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
            if (id != descargaId) return;
            DownloadManager dm = getSystemService(DownloadManager.class);
            Uri uri = dm.getUriForDownloadedFile(id);
            descargaId = -1;
            if (uri == null) {
                Toast.makeText(MainActivity.this, "No se pudo descargar la actualización", Toast.LENGTH_LONG).show();
                return;
            }
            apkDescargado = uri;
            instalar();
        }
    };

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        getWindow().setStatusBarColor(COLOR_NOCHE);
        Actualizaciones.crearCanal(this);
        Actualizaciones.programar(this);
        pedirPermisoNotificaciones();
        IntentFilter filtro = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(descargaTerminada, filtro, Context.RECEIVER_EXPORTED);
        else registerReceiver(descargaTerminada, filtro);

        if (Config.url(this).isEmpty()) mostrarConfiguracion(null);
        else abrirApp(getIntent());
    }

    @Override
    protected void onDestroy() {
        try { unregisterReceiver(descargaTerminada); } catch (Exception ignorado) { /* ya estaba */ }
        super.onDestroy();
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Volvió de los ajustes de Android después de permitir instalar actualizaciones
        if (esperandoPermisoInstalar && puedeInstalar()) {
            esperandoPermisoInstalar = false;
            if (apkDescargado != null) instalar();
            else iniciarActualizacion();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (web != null) manejarEnlace(intent);
        else abrirApp(intent);
    }

    // ---------- Primera vez: conectar con la página de la campaña ----------
    private void mostrarConfiguracion(String error) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(COLOR_PAPEL);
        LinearLayout pagina = new LinearLayout(this);
        pagina.setOrientation(LinearLayout.VERTICAL);
        pagina.setGravity(Gravity.CENTER_HORIZONTAL);
        pagina.setPadding(dp(18), dp(28), dp(18), dp(28));
        scroll.addView(pagina);

        LinearLayout tarjeta = new LinearLayout(this);
        tarjeta.setOrientation(LinearLayout.VERTICAL);
        tarjeta.setBackground(fondo(Color.rgb(252, 250, 245), dp(26), Color.rgb(228, 220, 203)));
        tarjeta.setClipToOutline(true);
        pagina.addView(tarjeta, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        // Franja con el logo
        LinearLayout banda = new LinearLayout(this);
        banda.setOrientation(LinearLayout.VERTICAL);
        banda.setGravity(Gravity.CENTER_HORIZONTAL);
        banda.setBackground(fondoArriba(COLOR_NOCHE, dp(26)));
        banda.setPadding(dp(24), dp(30), dp(24), dp(24));
        FrameLayout marco = new FrameLayout(this);
        marco.setBackground(fondo(Color.WHITE, dp(22), COLOR_ORO, dp(4)));
        marco.setPadding(dp(10), dp(10), dp(10), dp(10));
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.icono);
        marco.addView(logo, new FrameLayout.LayoutParams(dp(84), dp(84)));
        banda.addView(marco);
        TextView nombre = texto(getString(R.string.app_name).toUpperCase(), 24, COLOR_MARFIL, false);
        nombre.setTypeface(Typeface.SERIF);
        nombre.setLetterSpacing(0.12f);
        nombre.setGravity(Gravity.CENTER);
        nombre.setPadding(0, dp(16), 0, 0);
        banda.addView(nombre);
        TextView lema = texto("App de campaña", 14, COLOR_ORO, false);
        lema.setPadding(0, dp(6), 0, 0);
        banda.addView(lema);
        tarjeta.addView(banda);

        // Formulario
        LinearLayout form = new LinearLayout(this);
        form.setOrientation(LinearLayout.VERTICAL);
        form.setPadding(dp(24), dp(24), dp(24), dp(20));
        TextView titulo = texto("Conectar la app", 28, COLOR_NOCHE, false);
        titulo.setTypeface(Typeface.SERIF);
        TextView ayuda = texto("Escriba la dirección de la página de la campaña. Después entrará con su correo y contraseña.",
                15, Color.rgb(123, 130, 144), false);
        ayuda.setPadding(0, dp(6), 0, dp(18));
        TextView etiqueta = texto("DIRECCIÓN DE LA PÁGINA", 11, Color.rgb(59, 71, 89), true);
        etiqueta.setLetterSpacing(0.14f);
        etiqueta.setPadding(0, 0, 0, dp(6));

        final EditText campo = new EditText(this);
        campo.setHint("https://www.sucampana.com");
        campo.setText(Config.url(this));
        campo.setInputType(InputType.TYPE_TEXT_VARIATION_URI);
        campo.setSingleLine(true);
        campo.setTextColor(COLOR_NOCHE);
        campo.setBackground(fondo(Color.WHITE, dp(12), Color.rgb(228, 220, 203)));
        campo.setPadding(dp(14), dp(14), dp(14), dp(14));

        final TextView mensaje = texto(error == null ? "" : error, 14, Color.rgb(156, 122, 53), true);
        mensaje.setPadding(0, dp(10), 0, dp(10));

        Button conectar = new Button(this);
        conectar.setText("Conectar");
        conectar.setAllCaps(false);
        conectar.setTextSize(16);
        conectar.setTextColor(COLOR_MARFIL);
        conectar.setBackground(fondo(COLOR_NOCHE, dp(12), COLOR_ORO));
        conectar.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String url = Config.limpiar(campo.getText().toString());
                if (!url.startsWith("https://")) {
                    mensaje.setText("La dirección debe empezar por https://");
                    return;
                }
                Config.guardarUrl(MainActivity.this, url);
                abrirApp(getIntent());
            }
        });

        TextView firma = texto("Desarrollado por Opita Digital", 11, Color.rgb(160, 164, 172), false);
        firma.setGravity(Gravity.CENTER);
        firma.setPadding(0, dp(22), 0, 0);

        form.addView(titulo);
        form.addView(ayuda);
        form.addView(etiqueta);
        form.addView(campo, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        form.addView(mensaje);
        form.addView(conectar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(54)));
        form.addView(firma);
        tarjeta.addView(form);

        web = null;
        setContentView(scroll);
    }

    // ---------- La app web ----------
    private void abrirApp(Intent intent) {
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setUserAgentString(s.getUserAgentString() + " OpitaCampanaApp/" + Actualizaciones.versionInstalada(this));
        CookieManager.getInstance().setAcceptCookie(true);
        web.setBackgroundColor(COLOR_PAPEL);
        web.addJavascriptInterface(new Puente(), "AppCampana");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                boolean propio = esPropio(u);
                // "Entrar con Google" se abre en el navegador (Google no lo permite dentro de apps)
                if (propio && u.getPath() != null && u.getPath().startsWith("/auth/google") && u.getQueryParameter("app") == null) {
                    abrirFuera(u.buildUpon().appendQueryParameter("app", "1").build());
                    return true;
                }
                if (propio && !(u.getPath() != null && u.getPath().startsWith("/auth/google"))) return false;
                abrirFuera(u); // WhatsApp, redes, correo, teléfono, Google…
                return true;
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame()) {
                    mostrarConfiguracion("No se pudo abrir la página. Revise la conexión o la dirección.");
                }
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (archivoPendiente != null) archivoPendiente.onReceiveValue(null);
                archivoPendiente = callback;
                try {
                    startActivityForResult(params.createIntent(), ELEGIR_ARCHIVO);
                } catch (Exception e) {
                    archivoPendiente = null;
                    return false;
                }
                return true;
            }
        });

        web.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String agente, String disposicion, String tipo, long largo) {
                // Si es la APK de la misma app, se usa el actualizador
                if (url.endsWith("/descargas/campana.apk")) { iniciarActualizacion(); return; }
                descargar(url, disposicion, tipo);
            }
        });

        setContentView(web);
        if (!manejarEnlace(intent)) web.loadUrl(Config.url(this) + "/#/panel");
        // Si se abrió desde la notificación, manejarEnlace ya inició la actualización
        if (intent == null || !Actualizaciones.ACCION_ACTUALIZAR.equals(intent.getAction())) revisarVersionAlAbrir();
    }

    private boolean esPropio(Uri u) {
        Uri base = Uri.parse(Config.url(this));
        return u != null && "https".equals(u.getScheme()) && u.getHost() != null && u.getHost().equals(base.getHost());
    }

    /** opitacampana://sesion?t=... llega después de entrar con Google en el navegador. */
    private boolean manejarEnlace(Intent intent) {
        if (intent != null && Actualizaciones.ACCION_ACTUALIZAR.equals(intent.getAction())) {
            iniciarActualizacion();
            return false;
        }
        Uri datos = intent == null ? null : intent.getData();
        if (datos != null && "opitacampana".equals(datos.getScheme())) {
            String t = datos.getQueryParameter("t");
            if (t != null && t.matches("[A-Za-z0-9_-]{20,80}")) {
                web.loadUrl(Config.url(this) + "/auth/canje?t=" + t);
                return true;
            }
        }
        return false;
    }

    private void abrirFuera(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (Exception e) {
            Toast.makeText(this, "No hay una aplicación para abrir este enlace", Toast.LENGTH_SHORT).show();
        }
    }

    /** Lo que la página puede pedirle a la app (solo desde la página de la campaña). */
    private final class Puente {
        @JavascriptInterface
        public long version() {
            return Actualizaciones.versionInstalada(MainActivity.this);
        }

        @JavascriptInterface
        public void actualizar() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (web != null && esPropio(Uri.parse(web.getUrl()))) iniciarActualizacion();
                }
            });
        }
    }

    // ---------- Actualizar la app: descargar e instalar ----------
    private boolean puedeInstalar() {
        return Build.VERSION.SDK_INT < 26 || getPackageManager().canRequestPackageInstalls();
    }

    private void iniciarActualizacion() {
        if (descargaId != -1) {
            Toast.makeText(this, "La actualización se está descargando…", Toast.LENGTH_SHORT).show();
            return;
        }
        if (!puedeInstalar()) {
            esperandoPermisoInstalar = true;
            new AlertDialog.Builder(this)
                    .setTitle("Permitir actualizaciones")
                    .setMessage("Para actualizarse sola, Android le pedirá permitir que esta app instale su versión nueva. Active la opción y vuelva.")
                    .setPositiveButton("Continuar", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface d, int w) {
                            startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                    Uri.parse("package:" + getPackageName())));
                        }
                    })
                    .setNegativeButton("Ahora no", null)
                    .show();
            return;
        }
        String url = Config.url(this) + "/descargas/campana.apk";
        DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
        r.setTitle(getString(R.string.app_name) + ": actualización");
        r.setDescription("Descargando la versión nueva");
        r.setMimeType("application/vnd.android.package-archive");
        r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
        r.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, "campana-" + System.currentTimeMillis() + ".apk");
        apkDescargado = null;
        descargaId = getSystemService(DownloadManager.class).enqueue(r);
        Toast.makeText(this, "Descargando la actualización…", Toast.LENGTH_SHORT).show();
    }

    private void instalar() {
        if (!puedeInstalar()) { esperandoPermisoInstalar = true; iniciarActualizacion(); return; }
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(apkDescargado, "application/vnd.android.package-archive");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            startActivity(i);
        } catch (Exception e) {
            Toast.makeText(this, "No se pudo abrir el instalador", Toast.LENGTH_LONG).show();
        }
    }

    private void revisarVersionAlAbrir() {
        new Thread(new Runnable() {
            @Override
            public void run() {
                final Actualizaciones.Version v = Actualizaciones.consultar(MainActivity.this);
                if (v == null || v.codigo <= Actualizaciones.versionInstalada(MainActivity.this)) return;
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        new AlertDialog.Builder(MainActivity.this)
                                .setTitle("Hay una versión nueva (" + v.nombre + ")")
                                .setMessage((v.notas == null || v.notas.isEmpty() ? "" : v.notas + "\n\n")
                                        + "La app se descarga e instala sola; solo toque «Instalar» cuando Android lo pida.")
                                .setPositiveButton("Actualizar ahora", new DialogInterface.OnClickListener() {
                                    @Override
                                    public void onClick(DialogInterface d, int w) {
                                        iniciarActualizacion();
                                    }
                                })
                                .setNegativeButton("Después", null)
                                .show();
                    }
                });
            }
        }).start();
    }

    // ---------- Descargas: Excel, PDF, CSV, anuncios y QR ----------
    private void descargar(String url, String disposicion, String tipo) {
        try {
            if (url.startsWith("data:")) {
                int coma = url.indexOf(',');
                String cabecera = url.substring(5, coma);
                String mime = cabecera.split(";")[0];
                byte[] bytes = Base64.decode(url.substring(coma + 1), Base64.DEFAULT);
                String ext = mime.contains("png") ? ".png" : mime.contains("csv") ? ".csv" : "";
                guardarArchivo("campana-" + System.currentTimeMillis() + ext, mime, bytes);
                return;
            }
            DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
            r.addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url));
            r.addRequestHeader("User-Agent", web.getSettings().getUserAgentString());
            String nombre = URLUtil.guessFileName(url, disposicion, tipo);
            r.setTitle(nombre);
            r.setMimeType(tipo);
            r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, nombre);
            getSystemService(DownloadManager.class).enqueue(r);
            Toast.makeText(this, "Descargando " + nombre, Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "No se pudo descargar el archivo", Toast.LENGTH_LONG).show();
        }
    }

    private void guardarArchivo(String nombre, String mime, byte[] bytes) throws Exception {
        if (Build.VERSION.SDK_INT >= 29) {
            ContentValues cv = new ContentValues();
            cv.put(MediaStore.Downloads.DISPLAY_NAME, nombre);
            cv.put(MediaStore.Downloads.MIME_TYPE, mime);
            Uri destino = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
            try (OutputStream o = getContentResolver().openOutputStream(destino)) { o.write(bytes); }
        } else {
            File f = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), nombre);
            try (FileOutputStream o = new FileOutputStream(f)) { o.write(bytes); }
        }
        Toast.makeText(this, "Guardado en Descargas: " + nombre, Toast.LENGTH_LONG).show();
    }

    private void pedirPermisoNotificaciones() {
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
        }
    }

    @Override
    protected void onActivityResult(int pedido, int resultado, Intent datos) {
        if (pedido == ELEGIR_ARCHIVO && archivoPendiente != null) {
            archivoPendiente.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultado, datos));
            archivoPendiente = null;
            return;
        }
        super.onActivityResult(pedido, resultado, datos);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    // ---------- Utilidades ----------
    private TextView texto(String t, int sp, int color, boolean negrita) {
        TextView v = new TextView(this);
        v.setText(t);
        v.setTextSize(sp);
        v.setTextColor(color);
        if (negrita) v.setTypeface(Typeface.DEFAULT_BOLD);
        return v;
    }

    private GradientDrawable fondo(int color, int radio, int borde) {
        return fondo(color, radio, borde, dp(1));
    }

    private GradientDrawable fondo(int color, int radio, int borde, int grosor) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(radio);
        g.setStroke(grosor, borde);
        return g;
    }

    private GradientDrawable fondoArriba(int color, int radio) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadii(new float[]{radio, radio, radio, radio, 0, 0, 0, 0});
        return g;
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }
}
