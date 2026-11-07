/* © Opita Digital — Todos los derechos reservados. */
package co.opitadigital.campana;

import android.app.job.JobParameters;
import android.app.job.JobService;

/** Tarea en segundo plano que busca versiones nuevas de la app. */
public class ActualizacionJob extends JobService {
    @Override
    public boolean onStartJob(final JobParameters params) {
        final JobService yo = this;
        new Thread(new Runnable() {
            @Override
            public void run() {
                Actualizaciones.avisarSiHayNueva(yo, Actualizaciones.consultar(yo));
                jobFinished(params, false);
            }
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }
}
