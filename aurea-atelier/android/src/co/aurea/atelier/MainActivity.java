package co.aurea.atelier;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/* App de Aurea Atelier: abre el sistema publicado y le agrega lo que el navegador del celular no hace solo:
   guardar descargas en la carpeta Descargas, imprimir, elegir fotos y abrir WhatsApp. */
public class MainActivity extends Activity {
    static final String SITIO = "https://aurea-atelier-six.vercel.app/";
    static final String HOST = "aurea-atelier-six.vercel.app";
    static final String VERSION = "1.0.0";
    static final int ELEGIR_ARCHIVO = 7;

    WebView web;
    ValueCallback<Uri[]> archivos;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        getWindow().setStatusBarColor(Color.rgb(15, 13, 11));
        getWindow().setNavigationBarColor(Color.rgb(15, 13, 11));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(15, 13, 11));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " AureaAtelierApp/" + VERSION);

        web.addJavascriptInterface(new Puente(), "AureaApp");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                String h = u.getHost();
                if ("https".equals(u.getScheme()) && h != null && (h.equals(HOST) || h.endsWith(".supabase.co"))) return false;
                abrirFuera(u);
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (archivos != null) archivos.onReceiveValue(null);
                archivos = cb;
                try {
                    startActivityForResult(p.createIntent(), ELEGIR_ARCHIVO);
                } catch (Exception e) {
                    archivos = null;
                    return false;
                }
                return true;
            }
        });
        web.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String ua, String cd, String mime, long largo) {
                if (url.startsWith("http")) abrirFuera(Uri.parse(url));
            }
        });
        if (estado != null) web.restoreState(estado);
        else web.loadUrl(SITIO);
    }

    void abrirFuera(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (Exception e) {
            Toast.makeText(this, "No hay una aplicación para abrir este enlace", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int pedido, int resultado, Intent datos) {
        if (pedido == ELEGIR_ARCHIVO && archivos != null) {
            archivos.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultado, datos));
            archivos = null;
            return;
        }
        super.onActivityResult(pedido, resultado, datos);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle estado) {
        super.onSaveInstanceState(estado);
        web.saveState(estado);
    }

    /* Funciones que la página llama como window.AureaApp. */
    class Puente {
        @JavascriptInterface
        public String version() {
            return VERSION;
        }

        @JavascriptInterface
        public void abrir(final String url) {
            runOnUiThread(new Runnable() {
                public void run() {
                    abrirFuera(Uri.parse(url));
                }
            });
        }

        @JavascriptInterface
        public void imprimir() {
            runOnUiThread(new Runnable() {
                public void run() {
                    PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                    pm.print("Aurea Atelier", web.createPrintDocumentAdapter("Aurea Atelier"), null);
                }
            });
        }

        /* Guarda en Descargas un archivo que llega en base64 y lo abre. */
        @JavascriptInterface
        public void guardar(String base64, final String nombre, final String mime) {
            try {
                byte[] datos = Base64.decode(base64, Base64.DEFAULT);
                Uri destino;
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, nombre);
                    cv.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                    cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Aurea Atelier");
                    destino = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    OutputStream os = getContentResolver().openOutputStream(destino);
                    os.write(datos);
                    os.close();
                } else {
                    File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "Aurea Atelier");
                    dir.mkdirs();
                    File f = new File(dir, nombre);
                    FileOutputStream os = new FileOutputStream(f);
                    os.write(datos);
                    os.close();
                    destino = null; // En Android 9 o antes solo se avisa dónde quedó: abrir un archivo directo no está permitido.
                }
                final Uri abrir = destino;
                runOnUiThread(new Runnable() {
                    public void run() {
                        Toast.makeText(MainActivity.this, "Guardado en Descargas/Aurea Atelier: " + nombre, Toast.LENGTH_LONG).show();
                        if (abrir == null) return;
                        try {
                            Intent i = new Intent(Intent.ACTION_VIEW);
                            i.setDataAndType(abrir, mime);
                            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            startActivity(i);
                        } catch (Exception e) {
                            // Sin una app para abrirlo: queda guardado en Descargas.
                        }
                    }
                });
            } catch (final Exception e) {
                runOnUiThread(new Runnable() {
                    public void run() {
                        Toast.makeText(MainActivity.this, "No se pudo guardar: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    }
                });
            }
        }
    }
}
