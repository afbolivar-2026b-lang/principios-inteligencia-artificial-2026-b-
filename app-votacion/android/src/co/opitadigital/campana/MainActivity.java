/* App de campaña · © Opita Digital — Todos los derechos reservados. */
package co.opitadigital.campana;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.text.InputType;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
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
import android.widget.LinearLayout;
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

    private WebView web;
    private ValueCallback<Uri[]> archivoPendiente;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        getWindow().setStatusBarColor(COLOR_NOCHE);
        Actualizaciones.crearCanal(this);
        Actualizaciones.programar(this);
        pedirPermisoNotificaciones();

        if (Config.url(this).isEmpty()) mostrarConfiguracion(null);
        else abrirApp(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (web != null) manejarEnlace(intent);
        else abrirApp(intent);
    }

    // ---------- Primera vez: dirección de la app ----------
    private void mostrarConfiguracion(String error) {
        LinearLayout caja = new LinearLayout(this);
        caja.setOrientation(LinearLayout.VERTICAL);
        caja.setGravity(Gravity.CENTER_VERTICAL);
        caja.setBackgroundColor(COLOR_NOCHE);
        int p = dp(28);
        caja.setPadding(p, p, p, p);

        TextView sobre = texto("APP DE CAMPAÑA", 12, COLOR_ORO, true);
        sobre.setLetterSpacing(0.2f);
        TextView titulo = texto("Conecte la app", 32, COLOR_MARFIL, false);
        titulo.setTypeface(Typeface.SERIF);
        TextView ayuda = texto("Escriba la dirección donde está publicada la página de la campaña.", 15,
                Color.argb(200, 244, 239, 230), false);
        ayuda.setPadding(0, dp(8), 0, dp(20));

        final EditText campo = new EditText(this);
        campo.setHint("https://www.sucampana.com");
        campo.setText(Config.url(this));
        campo.setInputType(InputType.TYPE_TEXT_VARIATION_URI);
        campo.setSingleLine(true);
        campo.setTextColor(Color.BLACK);
        campo.setBackgroundColor(Color.WHITE);
        campo.setPadding(dp(14), dp(14), dp(14), dp(14));

        final TextView mensaje = texto(error == null ? "" : error, 14, Color.rgb(255, 140, 120), false);
        mensaje.setPadding(0, dp(10), 0, dp(10));

        Button conectar = new Button(this);
        conectar.setText("Conectar");
        conectar.setAllCaps(false);
        conectar.setTextColor(COLOR_NOCHE);
        conectar.setBackgroundColor(COLOR_ORO);
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

        TextView firma = texto("Desarrollado por Opita Digital", 11, Color.argb(120, 244, 239, 230), false);
        firma.setPadding(0, dp(40), 0, 0);
        firma.setGravity(Gravity.CENTER);

        caja.addView(sobre);
        caja.addView(titulo);
        caja.addView(ayuda);
        caja.addView(campo, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        caja.addView(mensaje);
        caja.addView(conectar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(52)));
        caja.addView(firma);
        web = null;
        setContentView(caja);
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
        web.setBackgroundColor(COLOR_NOCHE);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                Uri base = Uri.parse(Config.url(MainActivity.this));
                boolean propio = "https".equals(u.getScheme()) && u.getHost() != null && u.getHost().equals(base.getHost());
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

        web.setDownloadListener(new android.webkit.DownloadListener() {
            @Override
            public void onDownloadStart(String url, String agente, String disposicion, String tipo, long largo) {
                descargar(url, disposicion, tipo);
            }
        });

        setContentView(web);
        if (!manejarEnlace(intent)) web.loadUrl(Config.url(this) + "/");
        revisarVersionAlAbrir();
    }

    /** opitacampana://sesion?t=... llega después de entrar con Google en el navegador. */
    private boolean manejarEnlace(Intent intent) {
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

    // ---------- Actualizaciones ----------
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
                                .setMessage(v.notas == null || v.notas.isEmpty() ? "Descárguela para tener las últimas mejoras." : v.notas)
                                .setPositiveButton("Descargar", new android.content.DialogInterface.OnClickListener() {
                                    @Override
                                    public void onClick(android.content.DialogInterface d, int w) {
                                        abrirFuera(Uri.parse(v.apk));
                                    }
                                })
                                .setNegativeButton("Después", null)
                                .show();
                    }
                });
            }
        }).start();
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

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }
}
